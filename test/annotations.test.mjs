import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/api.mjs';
import { openDatabase, claimJob, finishJob } from '../server/db.mjs';
import { createAnchor, exportEdition } from '../server/annotations.mjs';
import { extractPdf } from '../server/extract.mjs';
import { examplePdf } from '../core/example.mjs';
import { pageText } from '../core/pdf-text.mjs';
import { hash, canonical } from '../core/changes.mjs';
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aQ1kAAAAASUVORK5CYII=';

test('manual notes work before analysis, validate anchors, survive reprocessing and export images',async()=>{
  const db=openDatabase(':memory:'),server=createApp(db);
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base=`http://127.0.0.1:${server.address().port}`;
  const req=(path,method='GET',body)=>fetch(base+'/api'+path,{method,headers:{'x-humanizador-request':'1',...(body?{'Content-Type':Buffer.isBuffer(body)?'application/pdf':'application/json'}:{})},body:body?(Buffer.isBuffer(body)?body:JSON.stringify(body)):undefined});
  try{
    const pdf=examplePdf({emptyPage:true}),result=await extractPdf(pdf,{genre:'Ensayo'});
    const uploaded=await(await req('/documents?name=Notas.pdf','POST',pdf)).json(),id=uploaded.id;
    const block=result.blocks[0],quote='el servidor guarda los documentos en privado.';
    const start=[...block.text.slice(0,block.text.indexOf(quote))].length;
    const input={source_pdf_sha256:hash(pdf),page:1,kind:'text',rects:[[40,630,500,675]],start,end:start+[...quote].length,quote,note:'Precisar quién puede acceder.',preview:png};
    const path=`/documents/${id}`;
    assert.equal((await req(path+'/annotations','POST',{...input,source_pdf_sha256:hash('wrong')})).status,409);
    for(const bad of [{quote:'texto inventado'},{rects:[[0,0,9999,9999]]},{rects:[[4,4,1,1]]},{page:4},{note:' '},{preview:'data:image/svg+xml;base64,PHN2Zz4='}])assert.equal((await req(path+'/annotations','POST',{...input,...bad})).status,400,JSON.stringify(bad));
    const created=await req(path+'/annotations','POST',input);assert.equal(created.status,201);
    let note=await created.json();assert.equal(note.anchor.text.quote,quote);assert.equal(note.anchor.text.block_sha256,block.sha256);assert.equal(note.version,1);
    assert.ok(!('image' in note));assert.equal(note.has_preview,true);
    const image=await req(path+`/annotations/${note.id}/preview`);assert.equal(image.headers.get('content-type'),'image/png');assert.equal(hash(Buffer.from(await image.arrayBuffer())),hash(Buffer.from(png.split(',')[1],'base64')));
    const region=await(await req(path+'/annotations','POST',{source_pdf_sha256:hash(pdf),page:3,kind:'region',rects:[[20,20,200,200]],note:'Añadir un diagrama aquí.',preview:png})).json();
    assert.equal(region.page,3);assert.equal(region.anchor.text,undefined); // No text and no OCR needed.
    let exported=await(await req(path+'/export?format=edition')).json();assert.equal(exported.counts.annotations,2);assert.equal(exported.automatic_review,null);
    assert.equal(exported.document.source_pdf_sha256,hash(pdf));assert.equal(exported.annotations[0].image.provenance,'browser_pdf_canvas_crop');
    const {export_sha256,...unsigned}=exported;assert.equal(hash(canonical(unsigned)),export_sha256);
    assert.throws(()=>exportEdition({sha256:hash('another')},exported.annotations),/otro PDF/);
    const corrupt=structuredClone(exported.annotations);corrupt[0].image.data_base64='AAAA';assert.throws(()=>exportEdition({sha256:hash(pdf)},corrupt),/captura/);
    const changes=await Promise.all([req(path+`/annotations/${note.id}`,'PUT',{version:1,note:'Aclarar el acceso.',status:'resolved'}),req(path+`/annotations/${note.id}`,'PUT',{version:1,note:'Otro cambio',status:'open'})]);
    assert.deepEqual(changes.map(r=>r.status).sort(),[200,409]);
    const notes=await(await req(path+'/annotations')).json();note=notes.find(a=>a.id===note.id);assert.deepEqual(note.anchor,exported.annotations[0].anchor);
    const job=claimJob(db);finishJob(db,id,job.token,result);
    const full=await(await req(path+'/export?format=findings')).json();assert.equal(full.format,'humanizador.findings');assert.equal(full.manual_edition.counts.annotations,2);assert.ok(full.findings.length);
    let detail=await(await req(path)).json();
    assert.equal((await req(path+'/reprocess','POST',{revision:detail.revision})).status,202);
    assert.equal((await(await req(path+'/annotations')).json()).length,2);
    exported=await(await req(path+'/export?format=edition')).json();assert.equal(exported.automatic_review,null);assert.equal(exported.annotations[0].anchor.text.quote,quote);
    assert.equal(exported.format_version,'1.1');assert.equal(exported.previous_reviews.length,1);assert.ok(exported.previous_reviews[0].review.findings.length);assert.equal(exported.editorial_principles.rules.length,8);
    assert.ok(exported.previous_reviews[0].review.findings.every(f=>f.anchor.source_pdf_sha256===hash(pdf)));
    const {export_sha256:fullHash,...fullBody}=exported;assert.equal(fullHash,hash(canonical(fullBody)));
    assert.equal(hash(db.prepare('SELECT pdf FROM documents WHERE id=?').get(id).pdf),hash(pdf));
    assert.equal((await req(path+`/annotations/${note.id}`,'DELETE',{version:1})).status,409);
    assert.equal((await req(path+`/annotations/${note.id}`,'DELETE',{version:note.version})).status,200);
    await req(path+'/cancel','POST',{});assert.equal((await req(path,'DELETE')).status,200);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM annotations').get().n,0);
  }finally{await new Promise(r=>server.close(r));db.close();}
});

test('native page geometry survives rotation and Unicode offsets use normalized code points',async()=>{
  const pdf=examplePdf({rotation:90});
  const a=await createAnchor(pdf,{page:1,kind:'region',rects:[[20,30,100,200]]});
  assert.equal(a.rotation,90);assert.deepEqual(a.rects,[[20,30,100,200]]);assert.deepEqual(a.page_view,[0,0,595,842]);
  const item=str=>({str,transform:[12,0,0,12,50,700],width:100,height:12,hasEOL:true});
  const page=pageText({items:[item('🙂 Cafe\u0301'),item('Otra frase'),item('')]});
  assert.equal(page.text,'🙂 Café\nOtra frase');assert.equal(page.items[1].start,7);
  assert.equal([...page.text].slice(page.items[1].start,page.items[1].end).join(''),'Otra frase');
});
