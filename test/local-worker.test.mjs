import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { setTimeout as delay } from 'node:timers/promises';
import { openDatabase } from '../server/db.mjs';
import { hash } from '../core/changes.mjs';
import { examplePdf } from '../core/example.mjs';

test('the background worker invokes local review and cancellation fences a waiting model', async () => {
  const dir=await mkdtemp(join(tmpdir(),'humanizador-local-'));
  const db=openDatabase(join(dir,'humanizador.sqlite'));
  let worker,waiting=false,closed=false,hold=false,invalid=false;
  const server=createServer(async(req,res)=>{
    res.setHeader('Content-Type','application/json');
    if(req.url==='/api/tags')return res.end(JSON.stringify({models:[{name:'test:local',digest:'abc'}]}));
    if(req.url==='/api/show')return res.end('{}');
    let body='';for await(const c of req)body+=c;
    const input=JSON.parse(body);
    if(hold){waiting=true;res.on('close',()=>{closed=true;});return;}
    if(invalid){
      const payload=input.format.properties.reviews?{reviews:[{index:99,rule_id:'HES-069',action:'reject',reason:'Esta frase cumple una función válida en el párrafo.',replacement_action:'remove',replacement_reason:'No se conserva el diagnóstico'}]}:{findings:[{rule_id:'HES-069',quote:'Cabe destacar que el servidor guarda los documentos en privado.',reason:'El anuncio de importancia no añade una acción reconocible.',preserve:'Conservar si orienta una comparación entre dos opciones.',replacement:null}]};
      return res.end(JSON.stringify({done:true,message:{content:JSON.stringify(payload)}}));
    }
    res.end(JSON.stringify({done:true,done_reason:'stop',message:{content:'{"findings":[]}'}}));
  }).listen(0,'127.0.0.1');await once(server,'listening');
  const insert=id=>db.prepare('INSERT INTO documents(id,name,sha256,pdf,created_at,profile,status) VALUES(?,?,?,?,?,?,?)').run(id,id+'.pdf',hash(id),examplePdf(),new Date().toISOString(),JSON.stringify({review_mode:'local',genre:'Ensayo',local_model:{model:'test:local',digest:'abc'},rule_ids:['HES-001']}),'queued');
  const until=async(predicate)=>{for(let n=0;n<120;n++){if(predicate())return;await delay(50);}throw Error('Worker did not reach expected state');};
  try {
    insert('complete');
    worker=spawn(process.execPath,['server/worker.mjs'],{env:{...process.env,HUMANIZADOR_DATA_DIR:dir,HUMANIZADOR_OLLAMA_ENABLED:'1',HUMANIZADOR_OLLAMA_MODEL:'test:local',HUMANIZADOR_OLLAMA_URL:`http://127.0.0.1:${server.address().port}`},stdio:'pipe'});
    worker.stdout.resume();worker.stderr.resume();
    await until(()=>db.prepare('SELECT status FROM documents WHERE id=?').get('complete').status==='completed');
    const result=JSON.parse(db.prepare('SELECT result FROM documents WHERE id=?').get('complete').result);
    assert.equal(result.analysis.local_review.completed_chunks,2);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM local_review_chunks').get().n,2);
    invalid=true;insert('invalid');
    await until(()=>db.prepare('SELECT status FROM documents WHERE id=?').get('invalid').status==='failed');
    const failure=db.prepare('SELECT diagnostics,result FROM documents WHERE id=?').get('invalid');
    const diagnostic=JSON.parse(failure.diagnostics);
    assert.equal(failure.result,null);assert.equal(diagnostic.page,1);assert.equal(diagnostic.stage,'editorial');
    assert.equal(diagnostic.error.code,'invalid_review_indexes');assert.deepEqual(diagnostic.received_indexes,[99]);
    assert.ok(db.prepare('SELECT message FROM events WHERE document_id=? ORDER BY id DESC LIMIT 1').get('invalid').message.includes('página 1'));
    invalid=false;
    hold=true;insert('cancel');await until(()=>waiting);
    assert.equal(JSON.parse(db.prepare('SELECT diagnostics FROM documents WHERE id=?').get('cancel').diagnostics).stage,'generation');
    db.prepare("UPDATE documents SET status='cancelled',claim_token=NULL,lease_until=NULL WHERE id='cancel'").run();
    await until(()=>closed);
    const row=db.prepare("SELECT status,result FROM documents WHERE id='cancel'").get();
    assert.equal(row.status,'cancelled');assert.equal(row.result,null);
  } finally {
    if(worker?.exitCode===null){const exited=once(worker,'exit');worker.kill('SIGTERM');await exited;}
    server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
    db.close();await rm(dir,{recursive:true,force:true});
  }
});
