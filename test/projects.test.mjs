import test from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase, DEFAULT_PROJECT_ID, claimJob, finishJob } from '../server/db.mjs';
import { createApp } from '../server/api.mjs';
import { extractPdf } from '../server/extract.mjs';
import { examplePdf } from '../core/example.mjs';

test('projects isolate documents, preserve decisions on move, and aggregate measured statistics', async () => {
  const db=openDatabase(':memory:');
  const server=createApp(db);
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base=`http://127.0.0.1:${server.address().port}`;
  const request=(path,method='GET',data)=>fetch(base+'/api'+path,{method,headers:{'x-humanizador-request':'1','Content-Type':Buffer.isBuffer(data)?'application/pdf':'application/json'},body:data===undefined?undefined:Buffer.isBuffer(data)?data:JSON.stringify(data)});
  try {
    assert.equal((await (await request('/session')).json()).limits.upload_mb,100);
    const make=async name=>{const res=await request('/projects','POST',{name});assert.equal(res.status,201);return res.json();};
    const a=await make('Libro'), b=await make('Artículos');
    assert.equal((await request('/projects','POST',{name:' '})).status,400);
    const pdf=examplePdf();
    const uploaded=await request('/documents?project_id='+a.id,'POST',pdf);
    assert.equal(uploaded.status,202);const {id}=await uploaded.json();
    const doc=await (await request('/documents/'+id)).json();
    assert.equal(doc.project_id,a.id);
    assert.equal((await (await request('/documents?project_id='+b.id)).json()).length,0);
    const row=db.prepare('SELECT queued_at_ms,profile FROM documents WHERE id=?').get(id);
    const job=claimJob(db,row.queued_at_ms+100);
    const result=await extractPdf(pdf,JSON.parse(row.profile));
    finishJob(db,id,job.token,result,row.queued_at_ms+1100);
    let detail=await (await request('/documents/'+id)).json();
    const decision=await request('/documents/'+id+'/decisions','POST',{finding_id:result.findings[0].id,status:'kept',revision:detail.revision});
    assert.equal(decision.status,200);
    let projects=await (await request('/projects')).json();let stats=projects.find(p=>p.id===a.id).statistics;
    assert.equal(stats.documents,1);assert.equal(stats.size_bytes,pdf.length);assert.equal(stats.pages,2);
    assert.ok(stats.sentences>5);assert.equal(stats.findings,result.findings.length);
    assert.equal(stats.pending,result.findings.length-1);assert.equal(stats.kept,1);
    assert.equal(stats.processing_ms,1000);assert.equal(stats.average_processing_ms,1000);assert.equal(stats.queue_ms,100);
    assert.equal(stats.rules.reduce((n,r)=>n+r.count,0),result.findings.length);
    assert.equal((await request('/documents/'+id,'PATCH',{project_id:b.id})).status,200);
    detail=await (await request('/documents/'+id)).json();assert.equal(detail.decisions.length,1);assert.equal(detail.result.source_pdf_sha256,result.source_pdf_sha256);
    projects=await (await request('/projects')).json();
    assert.equal(projects.find(p=>p.id===a.id).statistics.documents,0);assert.equal(projects.find(p=>p.id===b.id).statistics.kept,1);
    assert.equal((await request('/projects/'+b.id,'PATCH',{name:'Ensayos',description:'En paralelo'})).status,200);
    assert.equal((await request('/documents?project_id=invalid','POST',pdf)).status,404);
    assert.equal((await request('/documents/'+id,'PATCH',{project_id:DEFAULT_PROJECT_ID})).status,200);
    assert.throws(()=>createApp(db,{maxUploadMb:NaN}),/HUMANIZADOR_MAX/);
  } finally {await new Promise(r=>server.close(r));db.close();}
});

test('configured upload boundary is advertised and enforced',async()=>{
  const db=openDatabase(':memory:'),server=createApp(db,{maxUploadMb:1});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  try {
    const base=`http://127.0.0.1:${server.address().port}/api`;
    assert.equal((await (await fetch(base+'/session')).json()).limits.upload_mb,1);
    const exact=Buffer.alloc(1024*1024);examplePdf().copy(exact);
    assert.equal((await fetch(base+'/documents',{method:'POST',headers:{'x-humanizador-request':'1','Content-Type':'application/pdf'},body:exact})).status,202);
    const response=await fetch(base+'/documents',{method:'POST',headers:{'x-humanizador-request':'1','Content-Type':'application/pdf'},body:Buffer.alloc(1024*1024+1)});
    assert.equal(response.status,413);
  } finally {await new Promise(r=>server.close(r));db.close();}
});

test('migration of a v0.1 database preserves the PDF, result and decisions without inventing timings', async()=>{
  const {DatabaseSync}=await import('node:sqlite');
  const {mkdtemp,rm}=await import('node:fs/promises');
  const {tmpdir}=await import('node:os');const {join}=await import('node:path');
  const dir=await mkdtemp(join(tmpdir(),'humanizador-migration-')),path=join(dir,'old.sqlite');
  let db=new DatabaseSync(path);
  const pdf=examplePdf(), result=await extractPdf(pdf,{rule_ids:['HES-001']});
  const serialized=JSON.stringify(result);
  db.exec(`CREATE TABLE documents(id TEXT PRIMARY KEY,name TEXT NOT NULL,sha256 TEXT NOT NULL,pdf BLOB NOT NULL,
    created_at TEXT NOT NULL,profile TEXT NOT NULL,status TEXT NOT NULL,progress INTEGER NOT NULL DEFAULT 0,
    total INTEGER NOT NULL DEFAULT 0,error TEXT,result TEXT,lease_until INTEGER,claim_token TEXT,
    attempts INTEGER NOT NULL DEFAULT 0,revision INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE decisions(document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,finding_id TEXT NOT NULL,
    status TEXT NOT NULL,replacement TEXT,note TEXT NOT NULL DEFAULT '',updated_at TEXT NOT NULL,PRIMARY KEY(document_id,finding_id));`);
  db.prepare('INSERT INTO documents(id,name,sha256,pdf,created_at,profile,status,result) VALUES(?,?,?,?,?,?,?,?)')
    .run('old','Original.pdf',result.source_pdf_sha256,pdf,'2026-10-06','{}','completed',serialized);
  db.prepare('INSERT INTO decisions(document_id,finding_id,status,note,updated_at) VALUES(?,?,?,?,?)')
    .run('old',result.findings[0].id,'kept','Mantener voz','2026-10-06');
  db.close();db=openDatabase(path);
  try {
    const row=db.prepare("SELECT * FROM documents WHERE id='old'").get();
    assert.equal(row.project_id,DEFAULT_PROJECT_ID);assert.equal(row.size_bytes,pdf.length);
    assert.deepEqual(Buffer.from(row.pdf),pdf);assert.equal(row.result,serialized);
    assert.equal(row.processing_ms,null);assert.equal(row.started_at_ms,null);
    assert.ok(JSON.parse(row.statistics).sentences>5);
    assert.equal(db.prepare("SELECT note FROM decisions WHERE document_id='old'").get().note,'Mantener voz');
    db.close();db=openDatabase(path);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM projects').get().n,1);
    assert.equal(db.prepare("SELECT result FROM documents WHERE id='old'").get().result,serialized);
  } finally {db.close();await rm(dir,{recursive:true,force:true});}
});
