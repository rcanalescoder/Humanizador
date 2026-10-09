import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { openDatabase,claimJob,finishJob,DEFAULT_PROJECT_ID } from '../server/db.mjs';
import { createApp } from '../server/api.mjs';
import { extractPdf } from '../server/extract.mjs';
import { examplePdf } from '../core/example.mjs';
import { hash } from '../core/changes.mjs';
import { activeRules } from '../core/rules.mjs';

test('a hash prevents concurrent renamed duplicates, and reprocessing archives decisions without another PDF',async()=>{
 const db=openDatabase(':memory:'),server=createApp(db);await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${server.address().port}/api`;
 const req=(path,method='GET',data)=>fetch(base+path,{method,headers:{'x-humanizador-request':'1','Content-Type':Buffer.isBuffer(data)?'application/pdf':'application/json'},body:data===undefined?undefined:Buffer.isBuffer(data)?data:JSON.stringify(data)});
 try{
  const responses=await Promise.all([req('/documents?name=Uno.pdf','POST',examplePdf()),req('/documents?name=Renombrado.pdf','POST',examplePdf())]);
  assert.deepEqual(responses.map(r=>r.status).sort(),[200,202]);const payloads=await Promise.all(responses.map(r=>r.json()));
  const id=payloads[0].id;assert.equal(payloads[1].id,id);assert.equal(db.prepare('SELECT COUNT(*) n FROM documents').get().n,1);
  const before=db.prepare('SELECT pdf,sha256 FROM documents WHERE id=?').get(id),claim=claimJob(db);
  const result=await extractPdf(examplePdf(),{rule_ids:['HES-001']});assert.equal(finishJob(db,id,claim.token,result),true);
  let detail=await (await req('/documents/'+id)).json();
  assert.equal((await req(`/documents/${id}/decisions`,'POST',{revision:detail.revision,finding_id:result.findings[0].id,status:'kept',note:'Conservar mi voz'})).status,200);
  detail=await(await req('/documents/'+id)).json();const oldRevision=detail.revision;
  assert.equal((await req(`/documents/${id}/reprocess`,'POST',{revision:oldRevision})).status,202);
  assert.equal((await req(`/documents/${id}/reprocess`,'POST',{revision:oldRevision})).status,409);
  let current=await(await req('/documents/'+id)).json();assert.equal(current.status,'queued');assert.equal(current.runs.length,1);assert.equal(current.decisions.length,0);
  assert.deepEqual(current.profile.rule_ids,activeRules.map(r=>r.id));assert.equal(current.result,null);
  const saved=await(await req(`/documents/${id}/runs/${current.runs[0].id}`)).json();
  assert.deepEqual(saved.document.result,result);assert.equal(saved.decisions[0].note,'Conservar mi voz');assert.ok(!('pdf' in saved.document));
  const next=claimJob(db);assert.equal(finishJob(db,id,next.token,result),true);
  assert.equal((await req(`/documents/${id}/decisions`,'POST',{revision:oldRevision,finding_id:result.findings[0].id,status:'kept'})).status,409);
  assert.deepEqual(db.prepare('SELECT pdf,sha256 FROM documents WHERE id=?').get(id),before);
  const p=await(await req('/projects','POST',{name:'Otro trabajo'})).json();
  assert.equal((await req('/documents?project_id='+p.id,'POST',examplePdf())).status,202);
  assert.equal((await req('/documents/'+id,'PATCH',{project_id:p.id})).status,409);
  assert.equal(db.prepare('SELECT project_id FROM documents WHERE id=?').get(id).project_id,DEFAULT_PROJECT_ID);
  assert.equal((await req('/projects/'+DEFAULT_PROJECT_ID,'DELETE')).status,200);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM document_runs').get().n,0);
 }finally{await new Promise(r=>server.close(r));db.close();}
});

test('existing duplicates merge with an archived analysis and both sets of decisions preserved',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'humanizador-dedup-')),path=join(dir,'old.sqlite');let db=openDatabase(path);
 try{
  db.exec('DROP INDEX documents_project_hash');
  const pdf=examplePdf(),result=await extractPdf(pdf,{rule_ids:['HES-001']}),a=randomUUID(),b=randomUUID();
  for(const [id,date,note] of [[a,'2026-10-01','Primera decisión'],[b,'2026-10-02','Segunda decisión']]){
   db.prepare('INSERT INTO documents(id,name,sha256,pdf,created_at,profile,status,result,project_id) VALUES(?,?,?,?,?,?,?,?,?)').run(id,'Original.pdf',hash(pdf),pdf,date,JSON.stringify({rule_ids:['HES-001']}),'completed',JSON.stringify(result),DEFAULT_PROJECT_ID);
   db.prepare('INSERT INTO decisions(document_id,finding_id,status,note,updated_at) VALUES(?,?,?,?,?)').run(id,result.findings[0].id,'kept',note,date);
  }
  db.close();db=openDatabase(path);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM documents').get().n,1);assert.equal(db.prepare('SELECT id FROM documents').get().id,a);
  assert.equal(db.prepare('SELECT note FROM decisions').get().note,'Segunda decisión');
  const archive=JSON.parse(db.prepare('SELECT snapshot FROM document_runs').get().snapshot);
  assert.equal(archive.decisions[0].note,'Primera decisión');assert.deepEqual(archive.document.result,result);
  assert.deepEqual(Buffer.from(db.prepare('SELECT pdf FROM documents').get().pdf),pdf);
  db.close();db=openDatabase(path);assert.equal(db.prepare('SELECT COUNT(*) n FROM document_runs').get().n,1);
 }finally{db.close();await rm(dir,{recursive:true,force:true});}
});
