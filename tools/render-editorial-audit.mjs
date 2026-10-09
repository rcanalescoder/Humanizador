// Render private, source-backed comparisons; no publishing and no inference.
// node tools/render-editorial-audit.mjs directory
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { hash } from '../core/changes.mjs';
const directory=process.argv[2];
if(!directory)throw Error('Indica el directorio privado de la auditoría.');
const read=async name=>JSON.parse(await readFile(join(directory,name),'utf8'));
const [sample,before,after,assessment]=await Promise.all(['sample.json','before.json','after.json','assessment.json'].map(read));
const sampleHash=hash(await readFile(join(directory,'sample.json')));
assert.equal(before.sample_sha256,sampleHash);assert.equal(after.sample_sha256,sampleHash);
assert.equal(before.model.digest,after.model.digest);
assert.equal(before.status,'completed');assert.equal(after.status,'completed');
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalize=text=>text.replace(/(\p{L})-[ \t]*\n[ \t]*(?=\p{Ll})/gu,'$1').replace(/\s+/gu,' ').trim();
const overlaps=(f,c)=>f.block_id===c.block_id&&f.start<c.end&&f.end>c.start;
const initialOverlaps=(raw,c,target)=>{
  if(typeof raw?.quote!=='string')return false;
  const text=normalize(target.text), quote=normalize(raw.quote), focus=normalize(c.quote);
  const start=text.indexOf(quote), focusStart=text.indexOf(focus);
  return start>=0&&focusStart>=0&&start<focusStart+focus.length&&start+quote.length>focusStart;
};
function stages(run,item,c){
  const s=run.samples.find(s=>s.id===item.id), target=item.blocks.find(b=>b.id===item.target_block_id);
  const initial=[];
  for(const st of s.stages)for(const [index,p] of st.initial.entries()) {
    if(!initialOverlaps(p,c,target))continue;
    const mechanical=st.mechanical[index];
    const review=st.critique?.reviews?.find(r=>r.index===index);
    initial.push({index,proposal:p,mechanical_rejections:mechanical.rejected,
      fidelity:s.analysis.trace?.find(t=>t.start===st.start)?.fidelity?.find(f=>f.index===index)??null,
      editorial:review??(st.critique?.keep?{action:st.critique.keep.includes(index)?'keep':'reject',reason:'La versión anterior no guardaba motivos.'}:null)});
  }
  return {deterministic:s.deterministic.filter(f=>overlaps(f,c)),initial,
    final:s.final.filter(f=>f.origin==='ollama'&&overlaps(f,c))};
}
const rows=sample.cases.map(c=>{
  const item=sample.samples.find(s=>s.case_ids.includes(c.id));
  return {...c,contexts:undefined,before:stages(before,item,c),after:stages(after,item,c),assessment:assessment.cases[c.id]};
});
let supplemental=null;
try {
  const extra=await read('suffix-sample.json');
  const extraBefore=await read('suffix-before.json'),extraAfter=await read('suffix-after.json');
  const extraHash=hash(await readFile(join(directory,'suffix-sample.json')));
  assert.equal(extraBefore.sample_sha256,extraHash);assert.equal(extraAfter.sample_sha256,extraHash);
  assert.equal(extraBefore.model.digest,extraAfter.model.digest);
  assert.equal(extraBefore.status,'completed');assert.equal(extraAfter.status,'completed');
  supplemental={sample_sha256:extraHash,before:extraBefore,after:extraAfter};
  for(const c of extra.cases){
    const item=extra.samples.find(s=>s.case_ids.includes(c.id));
    rows.push({...c,sample_set:'suffix',before:stages(extraBefore,item,c),after:stages(extraAfter,item,c),assessment:assessment.cases[c.id]});
  }
} catch(error) {if(error.code!=='ENOENT')throw error;}
function stageHTML(s){
  const initial=s.initial.length?s.initial.map(p=>`<details><summary>${esc(p.proposal.rule_id)}: ${esc(p.proposal.reason)}</summary><blockquote>${esc(p.proposal.quote)}</blockquote><p>Sustitución: ${p.proposal.replacement===null?'sin texto propuesto':esc(p.proposal.replacement)}</p><p>Mecánica: ${esc(p.mechanical_rejections.join(', ')||'admisible')}</p><p>Comprobación: ${esc(p.editorial?.action||'no ejecutada')} · ${esc(p.editorial?.reason||'')}</p>${p.editorial?.replacement_reason?`<p>Sustitución: ${esc(p.editorial.replacement_reason)}</p>`:''}${p.fidelity?`<p>Fidelidad: ${p.fidelity.faithful?'conservada':'sustitución retirada'} · ${esc(p.fidelity.reason)}</p>`:''}</details>`).join(''):'Sin propuesta inicial sobre este pasaje.';
  return `<p>Deterministas: ${esc(s.deterministic.map(f=>f.rule_id).join(', ')||'0')}</p>${initial}<p><strong>Final: ${s.final.length}</strong>${s.final.map(f=>` · ${esc(f.rule_id)}${f.replacement===null?' (sin sustitución)':''}`).join('')}</p>`;
}
const summary=run=>({samples:run.samples.length,initial:run.samples.flatMap(s=>s.stages.flatMap(st=>st.initial)).length,
  mechanical_ineligible:run.samples.reduce((n,s)=>n+s.stages.reduce((n,st)=>n+st.mechanical.filter(m=>m.rejected.length).length,0),0),
  editorial_rejected:run.samples.reduce((n,s)=>n+s.stages.reduce((n,st)=>n+(st.critique?.reviews?.filter(r=>r.action==='reject').length??(st.critique?.keep?st.initial.length-st.critique.keep.length:0)),0),0),
  final_local:run.samples.reduce((n,s)=>n+s.final.filter(f=>f.origin==='ollama').length,0),
  deterministic:run.samples.reduce((n,s)=>n+s.deterministic.length,0),elapsed_ms:run.samples.reduce((n,s)=>n+s.elapsed_ms,0)});
const output={sample_sha256:sampleHash,model_digest:before.model.digest,before:summary(before),after:summary(after),
  final_run_reused_replies:after.reused_replies??0,final_run_live_requests:after.live_requests??null,
  conclusions:assessment.conclusions,cases:rows,additional:assessment.additional};
if(supplemental)output.supplemental={sample_sha256:supplemental.sample_sha256,before:summary(supplemental.before),after:summary(supplemental.after)};
await writeFile(join(directory,'comparison.json'),JSON.stringify(output,null,2)+'\n',{mode:0o600});
const html=`<!doctype html><html lang="es"><meta charset="utf-8"><title>Humanizador · Auditoría editorial</title><style>body{font:16px/1.5 system-ui,sans-serif;color:#202c35;margin:32px;background:#faf9f6}h1{font-size:28px}table{width:100%;border-collapse:collapse;background:white}td,th{vertical-align:top;text-align:left;border:1px solid #cdd3d5;padding:14px}th{background:#eaf1f2}td{min-width:230px}blockquote{white-space:pre-wrap;margin:10px 0;border-left:3px solid #aaa;padding-left:10px}summary{cursor:pointer}details{margin:12px 0}code{overflow-wrap:anywhere}article{max-width:1100px}small{color:#50616d}.scroll{overflow:auto}p{margin:8px 0}tr[data-judgment=problema] td:first-child{border-left:5px solid #b55234}</style><body><article><h1>Auditoría editorial de Humanizador</h1><p>Muestra congelada: ${sample.cases.length} casos (candidatos anteriores, hallazgos guardados, controles y textos sintéticos), en ${sample.samples.length} fragmentos de ejecución. Si está disponible, se añade un caso reducido separado para comprobar el filtro de sufijos, con su propia muestra idéntica antes/después. Los juicios son editoriales y discutibles; esta muestra intencional no estima precisión sobre libros nuevos.</p><p>${esc(sample.scope)}</p>${assessment.conclusions.map(p=>`<p>${esc(p)}</p>`).join('')}<p>Modelo en ambas pasadas: <code>${esc(before.model.model)}</code>. Mismo digest, misma muestra y mismos contextos. Comprobaciones deterministas: ${before.rule_count} antes y ${after.rule_count} después.</p><p><small>PDF: ${esc(sample.source_pdf_sha256)}<br>Muestra: ${sampleHash}<br>Modelo: ${esc(before.model.digest)}</small></p><p>Antes: ${output.before.initial} propuestas iniciales, ${output.before.mechanical_ineligible} no admisibles mecánicamente, ${output.before.editorial_rejected} rechazos del crítico y ${output.before.final_local} resultados locales. Después: ${output.after.initial}, ${output.after.mechanical_ineligible}, ${output.after.editorial_rejected} y ${output.after.final_local}, respectivamente. En la versión anterior, fallos mecánicos y rechazos editoriales pueden referirse a la misma propuesta: no deben sumarse.</p></article><div class="scroll"><table><thead><tr><th>Pasaje y juicio independiente</th><th>Antes: cada etapa</th><th>Después: cada etapa</th><th>Discrepancia, causa y corrección</th></tr></thead><tbody>${rows.map(c=>`<tr data-judgment="${esc(c.judgment)}"><td><strong>${esc(c.id)}${c.page?` · p. ${c.page}`:''} · ${esc(c.judgment)}</strong><blockquote>${esc(c.quote)}</blockquote><p>${esc(c.evidence)}</p>${c.previous_reading_disagreement?`<p>Lectura anterior: ${esc(c.previous_reading_disagreement)}</p>`:''}<p>Propuesta independiente: ${c.proposed_replacement===null?'conservar / decidir con el autor':c.proposed_replacement===''?'retirar únicamente el pasaje citado':esc(c.proposed_replacement)}</p><small>Offsets Unicode: ${c.start}–${c.end}. Contexto editorial: ${esc(c.context_pages.join(', '))}.</small></td><td>${stageHTML(c.before)}</td><td>${stageHTML(c.after)}</td><td>${esc(c.assessment)}</td></tr>`).join('')}</tbody></table></div><article><h2>Resultados fuera de los pasajes señalados</h2>${assessment.additional.map(p=>`<p>${esc(p)}</p>`).join('')}<p>Las peticiones y respuestas completas, hashes, comprobaciones, muestras y trazas están en los JSON de este directorio privado. No se aplicó ninguna corrección al PDF ni a las decisiones existentes.</p></article></body></html>`;
await writeFile(join(directory,'report.html'),html,{mode:0o600});
console.log(JSON.stringify({before:output.before,after:output.after,cases:rows.length}));
