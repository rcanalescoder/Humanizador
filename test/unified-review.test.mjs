import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createServer} from 'node:http';
import {createApp} from '../server/api.mjs';
import {openDatabase,claimJob,finishJob} from '../server/db.mjs';
import {examplePdf} from '../core/example.mjs';
import {extractPdf} from '../server/extract.mjs';
import {reviewLocal} from '../server/ollama.mjs';
import {hash,canonical} from '../core/changes.mjs';

test('pending replacement and note survive unified export without becoming approved operations',async()=>{
 const db=openDatabase(':memory:'),server=createApp(db);await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${server.address().port}/api/documents`;
 const req=(url,body,method='POST')=>fetch(url,{method,headers:{'x-humanizador-request':'1','content-type':Buffer.isBuffer(body)?'application/pdf':'application/json'},body:Buffer.isBuffer(body)?body:JSON.stringify(body)});
 try{
  const pdf=examplePdf(),{id}=await(await req(base,pdf)).json(),result=await extractPdf(pdf,{genre:'Ensayo'}),job=claimJob(db);finishJob(db,id,job.token,result);
  const f=result.findings[0],detail=await(await fetch(base+'/'+id)).json();
  const saved=await req(base+'/'+id+'/decisions',{finding_id:f.id,revision:detail.revision,status:'pending',replacement:'Propuesta aún sin aprobar.',note:'Contrastar con el párrafo anterior.'});assert.equal(saved.status,200);
  const edition=await(await fetch(base+'/'+id+'/export?format=edition')).json(),decision=edition.automatic_review.findings.find(x=>x.id===f.id).decision;
  assert.equal(decision.status,'pending');assert.equal(decision.replacement,'Propuesta aún sin aprobar.');assert.equal(decision.note,'Contrastar con el párrafo anterior.');
  const pkg=await(await fetch(base+'/'+id+'/export?format=changes')).json();assert.equal(pkg.operations.length,0);
 }finally{await new Promise(r=>server.close(r));db.close();}
});

test('learned fidelity rules reach all local stages and mechanical losses withhold only the rewrite',async()=>{
 const source='En mi caso, esta herramienta podría ahorrar 20 minutos.',replacement='Esta herramienta ahorra 40 minutos.';
 const candidate={quote:source,rule_id:'HES-075',reason:'La relación causal del ahorro no está explicada en el contexto.',preserve:'Conservar la experiencia y el alcance de la afirmación.',replacement};
 let stages=0;
 const server=createServer(async(req,res)=>{
  res.setHeader('content-type','application/json');
  if(req.url==='/api/tags')return res.end(JSON.stringify({models:[{name:'test:local',digest:'abc'}]}));
  if(req.url==='/api/show')return res.end('{}');
  let data='';for await(const c of req)data+=c;const body=JSON.parse(data);stages++;
  assert.match(body.messages[0].content,/AUT-02/);assert.match(body.messages[0].content,/AUT-07/);
  const content=body.format.properties.reviews?{reviews:[{index:0,rule_id:'HES-075',reason:'El mecanismo que lleva al ahorro necesita explicarse.',action:'keep',replacement_reason:'El evaluador simulado da por fiel el cambio.',replacement_action:'keep'}]}:body.format.properties.checks?{checks:[{index:0,reason:'El evaluador simulado no detecta la pérdida de matices.',faithful:true}]}:{findings:[candidate]};
  res.end(JSON.stringify({done:true,done_reason:'stop',message:{content:JSON.stringify(content)}}));
 }).listen(0,'127.0.0.1');await once(server,'listening');
 try{
  const b={id:'p0001-b0001',page:1,text:source,sha256:hash(source),segments:[]};
  const result=await reviewLocal({blocks:[b],findings:[],analysis:{}},{genre:'Ensayo',local_model:{model:'test:local',digest:'abc'}},{},{enabled:true,model:'test:local',url:`http://127.0.0.1:${server.address().port}`});
  assert.equal(stages,3);assert.equal(result.findings.length,1);assert.equal(result.findings[0].replacement,null);assert.ok(result.findings[0].author_safeguards.some(w=>w.code==='quantities'));assert.equal(result.analysis.local_review.prompt_version,'es-ES-editor-10');
 }finally{await new Promise(r=>server.close(r));}
});
