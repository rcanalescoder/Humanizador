import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'node:net';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {openDatabase,claimJob,finishJob} from '../server/db.mjs';
import {pauseJobs} from '../server/pause.mjs';
import {createApp} from '../server/api.mjs';
import {examplePdf} from '../core/example.mjs';

test('pause fences children, keeps cache, and requires explicit continuation; manual upload does not queue',async()=>{
 const db=openDatabase(':memory:'),server=createApp(db);await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url=`http://127.0.0.1:${server.address().port}/api/documents`;
 const headers={'x-humanizador-request':'1'};
 try{
  const {id}=await(await fetch(url+'?start_analysis=false',{method:'POST',headers:{...headers,'content-type':'application/pdf'},body:examplePdf()})).json();
  assert.equal(claimJob(db),null);assert.equal(db.prepare('SELECT status FROM documents WHERE id=?').get(id).status,'ready');
  db.prepare("UPDATE documents SET status='queued' WHERE id=?").run(id);
  const job=claimJob(db);db.prepare('INSERT INTO local_review_chunks VALUES(?,?,?)').run(id,'validated','{}');
  assert.equal(pauseJobs(db),1);assert.equal(claimJob(db),null);
  assert.equal(db.prepare('SELECT claim_token FROM documents WHERE id=?').get(id).claim_token,null);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM local_review_chunks').get().n,1);
  // An obsolete child cannot overwrite the paused state, even by direct update.
  assert.equal(db.prepare("UPDATE documents SET status='failed' WHERE id=? AND claim_token=?").run(id,job.token).changes,0);
  const resume=await fetch(url+'/'+id+'/retry',{method:'POST',headers:{...headers,'content-type':'application/json'},body:'{}'});assert.equal(resume.status,202);
  assert.equal(claimJob(db).id,id);
 }finally{await new Promise(r=>server.close(r));db.close();}
});

test('launcher selects an alternate port, restarts only its instance, pauses and opens a diagnostic on failure',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'humanizador-start-'));
 const blocker=createServer();await new Promise(r=>blocker.listen(0,'127.0.0.1',r));
 const port=blocker.address().port;
 const env={...process.env,HUMANIZADOR_DATA_DIR:dir,HUMANIZADOR_SKIP_BUILD:'1',HUMANIZADOR_NO_BROWSER:'1',PORT:String(port)};
 const run=(action,extra={})=>new Promise((resolve,reject)=>{const p=spawn(process.execPath,['tools/lifecycle.mjs',action],{env:{...env,...extra}});let output='';p.stdout.on('data',x=>output+=x);p.stderr.on('data',x=>output+=x);p.on('error',reject);p.on('close',code=>resolve({code,output}));});
 const state=async()=>JSON.parse(await readFile(join(dir,'runtime/instance.json'),'utf8'));
 try{
  assert.equal((await run('start')).code,0);const first=await state();assert.notEqual(first.port,port);assert.ok(blocker.listening);
  const session=await(await fetch(first.url+'api/session')).json();assert.match(session.start_notice,/ocupado/);
  const db=openDatabase(join(dir,'humanizador.sqlite'));
  db.prepare('INSERT INTO documents(id,name,sha256,pdf,created_at,profile,status,claim_token,lease_until) VALUES(?,?,?,?,?,?,?,?,?)').run('interrupted','x','hash',Buffer.from('pdf'),'today','{}','analyzing','old',Date.now()+60000);db.close();
  assert.equal((await run('start')).code,0);const second=await state();assert.notEqual(first.pid,second.pid);
  const check=openDatabase(join(dir,'humanizador.sqlite'));assert.equal(check.prepare('SELECT status FROM documents').get().status,'paused');check.close();
  assert.equal((await run('stop')).code,0);assert.equal((await run('stop')).code,0);assert.ok(blocker.listening);
  assert.equal((await run('start')).code,0);const abrupt=await state();process.kill(abrupt.pid,'SIGKILL');await delay(200);
  assert.equal((await run('stop')).code,0);assert.ok(blocker.listening);
  const fail=await run('start',{PORT:'invalid'});assert.equal(fail.code,1);assert.match(fail.output,/file:.*problema/);
 }finally{await run('stop');await new Promise(r=>blocker.close(r));await rm(dir,{recursive:true,force:true});}
});
