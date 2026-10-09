import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { reviewChunks, validateSuggestions, validateReviews, validateFidelity, reviewLocal, modelStatus } from '../server/ollama.mjs';
import { hash, documentHash, makePackage } from '../core/changes.mjs';
import { openDatabase } from '../server/db.mjs';
import { analyzeBlocks } from '../core/rules.mjs';

const text = '🙂 Mi experiencia cuenta. Cabe destacar que este resultado es crucial. «No cambies esta cita concreta». Fin.';
const block = { id: 'b', page: 1, text, sha256: hash(text) };
const provenance = { model: 'test:local', digest: 'abc' };
const candidate = { rule_id: 'HES-069', quote: 'Cabe destacar que este resultado es crucial.', reason: 'El énfasis no explica qué resultado cambia ni su consecuencia.', preserve: 'Conservar si la frase anterior demuestra esa importancia.', replacement: 'Este resultado cambia la decisión.' };
const decision = { index: 0, action: 'keep', rule_id: 'HES-077', reason: 'No se explica la importancia del resultado en este fragmento.', replacement_action: 'keep', replacement_reason: 'Conserva el significado.' };
test('local suggestions require an exact unique unprotected source and Unicode offsets', () => {
  const chunk = reviewChunks([block])[0];
  const checked = validateSuggestions({ findings: [candidate, {...candidate,quote:'Una frase que no existe en el original'}, {...candidate,quote:'No cambies esta cita concreta'}] }, chunk, provenance);
  assert.equal(checked.findings.length, 1); assert.equal(checked.rejected.length, 2);
  const f = checked.findings[0];
  assert.equal([...text].slice(f.start,f.end).join(''), candidate.quote);
  assert.equal(f.start, [...text.slice(0,text.indexOf(candidate.quote))].length);
  const result = { blocks: [block], findings: [f], pages: [], canonical_document_sha256: documentHash([block]), source_pdf_sha256: 'abc', analysis: {}, extraction: {} };
  assert.equal(makePackage(result, []).operations.length, 0);
  const decisions = [{ finding_id: f.id, status: 'approved', replacement: f.replacement }];
  assert.deepEqual(makePackage(result, decisions), makePackage(result, decisions));
  assert.equal(makePackage(result, decisions).operations[0].expected_text, candidate.quote);
  assert.equal(block.text, text);
});
test('ambiguous repeated quotes and excluded pages do not become suggestions', () => {
  const text = candidate.quote + '\n' + candidate.quote;
  const b = {...block,text,sha256:hash(text)};
  assert.equal(validateSuggestions({findings:[candidate]},reviewChunks([b])[0],provenance).findings.length,0);
  assert.deepEqual(reviewChunks([{...block,excluded:true},{...block,protected:true}]),[]);
  const nominal = validateSuggestions({findings:[{...candidate,rule_id:'HES-072'}]},reviewChunks([block])[0],provenance);
  assert.deepEqual(nominal.entries[0].warnings,['nominalization_requires_editorial_evidence']);
});
test('new literal rules respect word boundaries, quotations and exact source offsets', () => {
  const input = '🙂 Los expertos coinciden en que hace sentido. «Los expertos coinciden». No puedo generarte nada.';
  const b = {...block,text:input,sha256:hash(input)};
  const findings = analyzeBlocks([b],{rule_ids:['HES-063','HES-064','HES-068']});
  assert.deepEqual(findings.map(f=>f.rule_id),['HES-064','HES-068']);
  for(const f of findings) assert.equal([...input].slice(f.start,f.end).join(''),f.phrase);
});
test('Ollama integration checkpoints, resumes, records provenance and rejects changed models', async () => {
  let calls = 0;
  const server = createServer(async (req,res) => {
    res.setHeader('Content-Type','application/json');
    if (req.url === '/api/tags') return res.end(JSON.stringify({models:[{name:'test:local',digest:'abc',size:123}]}));
    if (req.url === '/api/show') return res.end('{}');
    let data=''; for await (const c of req) data+=c;
    const body = JSON.parse(data); calls++;
    assert.equal(body.stream,false); assert.equal(body.think,false); assert.equal(body.format.type,'object');
    assert.equal(JSON.parse(body.messages[1].content).fragmento,text);
    if (body.format.properties.reviews) return res.end(JSON.stringify({done:true,message:{content:JSON.stringify({reviews:[decision]})}}));
    if (body.format.properties.checks) return res.end(JSON.stringify({done:true,message:{content:JSON.stringify({checks:[{index:0,faithful:true,reason:'Conserva todas las acciones y sus condiciones.'}]})}}));
    assert.match(body.messages[0].content,/dato no fiable/);
    res.end(JSON.stringify({done:true,done_reason:'stop',message:{content:JSON.stringify({findings:[candidate]})},total_duration:1000000000,eval_count:100}));
  }).listen(0,'127.0.0.1'); await once(server,'listening');
  const config={enabled:true,model:'test:local',url:`http://127.0.0.1:${server.address().port}`};
  const profile={genre:'Ensayo',local_model:provenance};
  const cache=new Map(), hooks={load:key=>cache.get(key),save:(key,value)=>cache.set(key,value)};
  try {
    const result=await reviewLocal({blocks:[block],findings:[],analysis:{}},profile,hooks,config);
    assert.equal(result.findings.length,1); assert.equal(result.analysis.local_review.completed_chunks,1);
    assert.equal(result.analysis.local_review.digest,'abc'); assert.equal(result.analysis.local_review.inference_ms,1000);
    assert.equal(result.analysis.local_review.stage_metrics.generation.output_tokens,100);
    assert.equal(result.analysis.local_review.stage_metrics.editorial.calls,1);
    assert.equal(result.analysis.local_review.stage_metrics.fidelity.calls,1);
    const resumed=await reviewLocal({blocks:[block],findings:[],analysis:{}},profile,hooks,config);
    assert.equal(calls,3); assert.equal(resumed.analysis.local_review.cached_chunks,1);
    assert.deepEqual(result.findings,resumed.findings);
    assert.deepEqual(result.analysis.local_review.trace[0].initial,[candidate]);
    assert.equal(result.findings[0].rule_id,'HES-077');
    assert.equal(resumed.analysis.local_review.trace[0].cached,true);
    assert.equal(resumed.analysis.local_review.stage_metrics.generation.calls,0);
    assert.equal(resumed.analysis.local_review.generated_tokens,0);
    const deterministic={...result.findings[0],id:'literal',origin:undefined};
    const combined=await reviewLocal({blocks:[block],findings:[deterministic],analysis:{}},profile,hooks,config);
    assert.equal(combined.findings.length,2);
    assert.equal(calls,3);
    await assert.rejects(reviewLocal({blocks:[block],findings:[],analysis:{}},{local_model:{...provenance,digest:'changed'}},hooks,config),/ha cambiado/);
    const controller=new AbortController(); controller.abort();
    await assert.rejects(reviewLocal({blocks:[block],findings:[],analysis:{}},profile,{signal:controller.signal},config),{name:'AbortError'});
  } finally { await new Promise(resolve=>server.close(resolve)); }
});
test('unavailable models are reported and checkpoints cascade with document deletion', async () => {
  assert.equal((await modelStatus({enabled:false,model:'test:local'})).ready,false);
  const db=openDatabase(':memory:');
  try {
    db.prepare('INSERT INTO documents(id,name,sha256,pdf,created_at,profile,status) VALUES(?,?,?,?,?,?,?)').run('test','test.pdf','abc',Buffer.from('test'),'now','{}','queued');
    db.prepare('INSERT INTO local_review_chunks VALUES(?,?,?)').run('test','cache','{}');
    db.prepare('DELETE FROM documents WHERE id=?').run('test');
    assert.equal(db.prepare('SELECT COUNT(*) n FROM local_review_chunks').get().n,0);
  } finally {db.close();}
});

test('layout-only quote recovery restores immutable Unicode source and rejects ambiguity or changed words', () => {
  const text = '🙂 Inicio. La pues-\nta en marcha\n  del servicio exige revisar el plan. Fin.';
  const b = {...block,text,sha256:hash(text)}, chunk=reviewChunks([b])[0];
  const c = {...candidate,quote:'La puesta en marcha del servicio exige revisar el plan.',replacement:null};
  const checked=validateSuggestions({findings:[c]},chunk,provenance);
  assert.equal(checked.entries[0].quote_recovered,true);
  const f=checked.findings[0];
  assert.equal([...text].slice(f.start,f.end).join(''),'La pues-\nta en marcha\n  del servicio exige revisar el plan.');
  assert.equal(f.start,10);
  assert.equal(validateSuggestions({findings:[{...c,quote:c.quote.replace('exige','permite')}]},chunk,provenance).findings.length,0);
  const repeated=text+'\nLa puesta en marcha\n del servicio exige revisar el plan.';
  assert.equal(validateSuggestions({findings:[c]},reviewChunks([{...b,text:repeated,sha256:hash(repeated)}])[0],provenance).findings.length,0);
  const quoted='«La pues-\nta en marcha del servicio exige revisar el plan.»';
  assert.deepEqual(validateSuggestions({findings:[c]},reviewChunks([{...b,text:quoted,sha256:hash(quoted)}])[0],provenance).rejected,['protected_quote']);
  assert.throws(()=>validateSuggestions({findings:[c]},{...chunk,block:{...b,sha256:'changed'}},provenance),/ha cambiado/);
});

test('critic decisions must cover each mechanically valid original index exactly once', () => {
  const entries=[{index:0,rejection:'invalid_fields'},{index:1,rejection:null}];
  assert.deepEqual(validateReviews({reviews:[{...decision,index:1}]},entries),[{...decision,index:1}]);
  for(const reviews of [[],[decision],[{...decision,index:1},{...decision,index:1}],[{...decision,index:1,reason:'No'}]]) {
    assert.throws(()=>validateReviews({reviews},entries),/comprobación editorial/);
  }
});

test('a demonstrated issue survives an unfaithful rewrite; stages and rejected originals survive cache', async () => {
  const text='🙂 El despliegue de la puesta en marcha del arranque requiere el seguimiento del plan.';
  const b={...block,text,sha256:hash(text)};
  const good={...candidate,rule_id:'HES-072',quote:text.slice(3),replacement:'Ana arrancará el servicio el lunes.',reason:'La cadena repite arranque y puesta en marcha y oculta la acción.'};
  const invalid={...good,quote:'Una oración inexistente en este documento.'};
  const bad={...good,rule_id:'HES-076',reason:'Otro diagnóstico inicial que la comprobación considera infundado.'};
  const reviews=[{...decision,index:1,rule_id:'HES-072'},{...decision,index:2,action:'reject',reason:'El contexto explica el referente y no existe ese segundo problema.'}];
  let calls=0;
  const server=createServer(async(req,res)=>{
    res.setHeader('Content-Type','application/json');
    if(req.url==='/api/tags')return res.end(JSON.stringify({models:[{name:'test:local',digest:'abc'}]}));
    if(req.url==='/api/show')return res.end('{}');
    let data='';for await(const c of req)data+=c;
    const body=JSON.parse(data);calls++;
    if(body.format.properties.reviews){
      assert.deepEqual(JSON.parse(body.messages[1].content).propuestas.map(p=>p.index),[0,1]);
      return res.end(JSON.stringify({done:true,message:{content:JSON.stringify({reviews:reviews.map((r,index)=>({...r,index}))})}}));
    }
    if(body.format.properties.checks){
      assert.deepEqual(JSON.parse(body.messages[1].content).proposals.map(p=>p.index),[0]);
      return res.end(JSON.stringify({done:true,message:{content:JSON.stringify({checks:[{index:0,faithful:false,reason:'Inventa a Ana y el lunes, que no aparecen en el original.'}]})}}));
    }
    res.end(JSON.stringify({done:true,message:{content:JSON.stringify({findings:[invalid,good,bad]})}}));
  }).listen(0,'127.0.0.1');await once(server,'listening');
  const config={enabled:true,model:'test:local',url:`http://127.0.0.1:${server.address().port}`};
  const cache=new Map(), hooks={load:k=>cache.get(k),save:(k,v)=>cache.set(k,v)};
  try {
    const run=()=>reviewLocal({blocks:[b],findings:[],analysis:{}},{genre:'Ensayo',local_model:provenance},hooks,config);
    const result=await run(), report=result.analysis.local_review;
    assert.equal(result.findings.length,1);assert.equal(result.findings[0].replacement,null);
    assert.equal(result.findings[0].fidelity_check.faithful,false);
    assert.equal(report.initial_suggestions,3);assert.equal(report.mechanical_rejected,1);
    assert.equal(report.editorial_rejected,1);assert.equal(report.rejected_suggestions,2);
    assert.equal(report.removed_replacements,1);assert.equal(report.trace[0].initial.length,3);
    const resumed=await run();assert.equal(calls,3);
    assert.deepEqual(result.findings,resumed.findings);
    const pkg=makePackage({...result,pages:[],canonical_document_sha256:documentHash([b]),source_pdf_sha256:'abc',extraction:{}},[]);
    assert.equal(pkg.operations.length,0);
  } finally {await new Promise(resolve=>server.close(resolve));}
});

test('fidelity requires every retained edit and rejects missing or invented indexes', () => {
  const check={index:2,faithful:false,reason:'El texto nuevo cambia la condición de la acción.'};
  assert.deepEqual(validateFidelity({checks:[check]},[2]),[check]);
  for(const checks of [[],[{...check,index:0}],[check,check],[{...check,faithful:'false'}]]) {
    assert.throws(()=>validateFidelity({checks},[2]),/fidelidad/);
  }
});
