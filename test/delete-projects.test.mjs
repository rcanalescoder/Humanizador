import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase, DEFAULT_PROJECT_ID, claimJob, finishJob } from '../server/db.mjs';
import { createApp } from '../server/api.mjs';
import { examplePdf } from '../core/example.mjs';
import { extractPdf } from '../server/extract.mjs';

test('deleting a project removes its revisions and active claims, preserving other projects', async () => {
  const db = openDatabase(':memory:'), server = createApp(db);
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const request = (path, method='GET', data) => fetch(base+path, {method, headers:{'x-humanizador-request':'1','Content-Type':Buffer.isBuffer(data)?'application/pdf':'application/json'}, body:data===undefined?undefined:Buffer.isBuffer(data)?data:JSON.stringify(data)});
  try {
    const a = await (await request('/projects','POST',{name:'Proyecto que se borra'})).json();
    const b = await (await request('/projects','POST',{name:'Proyecto que se conserva'})).json();
    const upload = async (project,variant='') => (await (await request('/documents?project_id='+project,'POST',Buffer.concat([examplePdf(),Buffer.from(variant)]))).json()).id;
    const completed = await upload(a.id);
    const first = claimJob(db);
    const result = await extractPdf(examplePdf(), {rule_ids:['HES-001']});
    assert.equal(finishJob(db,completed,first.token,result),true);
    const detail = await (await request('/documents/'+completed)).json();
    assert.equal((await request('/documents/'+completed+'/decisions','POST',{finding_id:result.findings[0].id,status:'kept',revision:detail.revision})).status,200);
    const running = await upload(a.id,'\n% segundo documento'), claim = claimJob(db);
    assert.equal(claim.id,running);
    const untouched = await upload(b.id);
    const before = db.prepare('SELECT * FROM documents WHERE id=?').get(untouched);
    assert.equal((await fetch(base+'/projects/'+a.id,{method:'DELETE'})).status,403);
    const response = await request('/projects/'+a.id,'DELETE');
    assert.equal(response.status,200);assert.equal((await response.json()).deleted_documents,2);
    assert.equal((await request('/documents/'+completed)).status,404);
    assert.equal((await request('/documents/'+running)).status,404);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM decisions WHERE document_id=?').get(completed).n,0);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM events WHERE document_id IN (?,?)').get(completed,running).n,0);
    assert.equal(finishJob(db,running,claim.token,result),false);
    assert.deepEqual(db.prepare('SELECT * FROM documents WHERE id=?').get(untouched),before);
    assert.equal((await request('/projects/'+a.id,'DELETE')).status,404);
  } finally { await new Promise(r=>server.close(r));db.close(); }
});

test('the last project can be deleted and does not reappear when the database reopens', async () => {
  const dir = await mkdtemp(join(tmpdir(),'humanizador-project-delete-')), path = join(dir,'test.sqlite');
  let db = openDatabase(path), server = createApp(db);
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  try {
    assert.equal((await fetch(base+'/projects/'+DEFAULT_PROJECT_ID,{method:'DELETE',headers:{'x-humanizador-request':'1'}})).status,200);
    assert.deepEqual(await (await fetch(base+'/projects')).json(),[]);
    assert.equal((await fetch(base+'/documents',{method:'POST',headers:{'x-humanizador-request':'1','Content-Type':'application/pdf'},body:examplePdf()})).status,409);
    await new Promise(r=>server.close(r));server=null;db.close();db=openDatabase(path);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM projects').get().n,0);
    db.prepare('INSERT INTO projects(id,name,created_at) VALUES(?,?,?)').run('replacement','Nuevo proyecto',new Date().toISOString());
    assert.equal(db.prepare('SELECT COUNT(*) n FROM projects').get().n,1);
  } finally {if(server)await new Promise(r=>server.close(r));db.close();await rm(dir,{recursive:true,force:true});}
});
