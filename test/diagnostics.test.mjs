import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {openDatabase,claimJob} from '../server/db.mjs';
import {analysisProgress,failAnalysis} from '../server/diagnostics.mjs';
import {createApp} from '../server/api.mjs';

test('diagnostics explain a failed stage, are private, downloadable, and fenced against stale workers',async()=>{
  const db=openDatabase(':memory:'),id=randomUUID();
  db.prepare('INSERT INTO documents(id,name,sha256,pdf,created_at,profile,status) VALUES(?,?,?,?,?,?,?)').run(id,'Privado.pdf','hash',Buffer.from('private-pdf'),'now',JSON.stringify({review_mode:'local'}),'queued');
  const job=claimJob(db);
  analysisProgress(db,id,job.token,{phase:'local',stage:'editorial',page:117,chunk:117,completed:116,total:288});
  const error=new Error('Ollama: los índices no corresponden.');error.diagnostic={code:'invalid_review_indexes',expected_indexes:[0,1,2],received_indexes:[0,1,9]};
  assert.equal(failAnalysis(db,id,'stale',error),false);
  assert.equal(failAnalysis(db,id,job.token,error),true);
  assert.equal(analysisProgress(db,id,job.token,{phase:'local',page:200}),false);
  const server=createApp(db,{password:'private-diagnostic-password'});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base=`http://127.0.0.1:${server.address().port}`;
  try{
    const path=`/api/documents/${id}/export?format=diagnostics`;
    assert.equal((await fetch(base+path)).status,401);
    const login=await fetch(base+'/api/session',{method:'POST',headers:{'Content-Type':'application/json','x-humanizador-request':'1'},body:JSON.stringify({password:'private-diagnostic-password'})});
    const headers={Cookie:login.headers.get('set-cookie').split(';')[0]};
    const response=await fetch(base+path,{headers}),data=await response.json();
    assert.equal(response.status,200);assert.equal(data.format,'humanizador.analysis-diagnostic');
    assert.equal(data.diagnostics.page,117);assert.equal(data.diagnostics.stage,'editorial');
    assert.deepEqual(data.diagnostics.expected_indexes,[0,1,2]);assert.equal(data.diagnostics.error.code,'invalid_review_indexes');
    assert.ok(data.events.some(e=>e.message.includes('Análisis detenido')));
    assert.ok(!JSON.stringify(data).includes('private-pdf'));
    assert.equal((await fetch(base+'/api/example',{headers})).status,404);
    const retry=await fetch(base+`/api/documents/${id}/retry`,{method:'POST',headers:{...headers,'x-humanizador-request':'1'}});
    assert.equal(retry.status,202);assert.equal(db.prepare('SELECT diagnostics FROM documents WHERE id=?').get(id).diagnostics,null);
    const retried=await(await fetch(base+path,{headers})).json();
    assert.equal(retried.diagnostics.recent_failures[0].error.code,'invalid_review_indexes');
  } finally{await new Promise(r=>server.close(r));db.close();}
});
