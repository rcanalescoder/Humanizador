import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeBlocks, activeRules, sources, rules } from '../core/rules.mjs';
import { hash, documentHash, makePackage, applyPackage } from '../core/changes.mjs';
const run=(text,ids,genre='Ensayo')=>analyzeBlocks([{id:'p1',page:1,text,sha256:hash(text)}],{rule_ids:ids,genre});
test('structural candidates detect repeated starts and short sequences, preserving literary exceptions',()=>{
 assert.equal(run('El equipo revisa las cuentas. El equipo explica los cambios. El equipo prepara el informe.',['HES-016']).length,1);
 assert.equal(run('El equipo revisa las cuentas. Ana explica los cambios. Luis prepara el informe.',['HES-016']).length,0);
 assert.equal(run('Todo funciona. Hay avances. Quedan dudas. Falta tiempo.',['HES-020']).length,1);
 assert.equal(run('Todo funciona. Hay avances. Quedan dudas. Falta tiempo.',['HES-020'],'Narrativa').length,0);
 assert.equal(run('Todo funciona. Hay avances.\n\nQuedan dudas. Falta tiempo.',['HES-020']).length,0);
});
test('PDF dehyphenation maps an exact immutable Unicode source into deterministic operations',()=>{
 const text='🙂 Cabe des-\ntacar que funciona.',blocks=[{id:'p1',page:1,text,sha256:hash(text)}];
 const findings=run(text,['HES-001']);assert.equal(findings.length,1);const f=findings[0];
 assert.equal(f.phrase,'Cabe des-\ntacar que');assert.equal([...text].slice(f.start,f.end).join(''),f.phrase);
 const result={blocks,findings,canonical_document_sha256:documentHash(blocks),source_pdf_sha256:hash('pdf'),analysis:{},extraction:{},pages:[]};
 const pkg=makePackage(result,[{finding_id:f.id,status:'approved',replacement:'Aquí'}]);
 assert.equal(applyPackage(result,pkg)[0].text,'🙂 Aquí funciona.');assert.equal(blocks[0].text,text);
 assert.deepEqual(run(text,['HES-001']),findings);
});
test('residue markers are review candidates, not arbitrary bracketed text or quotations',()=>{
 assert.equal(run('Nombre: [TU NOMBRE].',['HES-045']).length,1);
 assert.equal(run('Véase [12] y [x+y].',['HES-045']).length,0);
 assert.equal(run('La plantilla dice «[TU NOMBRE]».',['HES-045']).length,0);
 assert.equal(run('Fuente contentReference[oaicite:0]{index=0}.',['HES-046']).length,1);
 assert.equal(run('No sé.... quizá mañana.',['HES-059']).length,1);
 assert.equal(run('No sé… quizá mañana.',['HES-059']).length,0);
});
test('useful contrasts remain candidates with explicit exceptions and no automatic rewrite',()=>{
 const f=run('No es un fallo de conexión, sino de permisos: el servidor devuelve 403.',['HES-013'])[0];
 assert.ok(f);assert.equal(f.replacement,null);assert.match(f.exception,/diagnóstico/);assert.match(f.evidence,/No implica/);
 assert.equal(run('El problema no es fácil. Revisaremos los permisos.',['HES-013']).length,0);
 assert.equal(run('Realizar la tarea requiere tiempo.',['HES-011']).length,0);
});
test('every catalogue entry has provenance, counterexamples and an explicit validation limit',()=>{
 assert.equal(new Set(rules.map(r=>r.id)).size,rules.length);
 for(const r of rules){assert.ok(r.examples.abstain);for(const id of r.source_ids)assert.ok(sources.some(s=>s.id===id),`${r.id}: ${id}`);assert.equal(r.validation.corpus_evaluated,false);}
 assert.equal(activeRules.length,30);
});
test('bibliographic references are not telegraphic prose',()=>{
 assert.equal(run('Artículo original. [47] W. Edwards Deming. Out of the Crisis.',['HES-020']).length,0);
});
test('Spanish conversational openings are limited by paragraph, genre and protected context',()=>{
 const cases=[
  ['¡Claro! Aquí tienes un resumen del informe.', 'Ensayo', 1],
  ['Por supuesto, aquí tienes una breve explicación del proceso.', 'Explicación técnica', 1],
  ['Primer párrafo.\n\n¡Claro! Aquí tienes la versión revisada.', 'Ensayo', 1],
  ['Aquí tienes un resumen del capítulo anterior.', 'Ensayo', 0],
  ['¡Claro! Aquí tienes un libro para mañana.', 'Ensayo', 0],
  ['Él respondió: ¡Claro! Aquí tienes un resumen.', 'Ensayo', 0],
  ['—¡Claro! Aquí tienes un resumen.', 'Ensayo', 0],
  ['«¡Claro! Aquí tienes un resumen».', 'Ensayo', 0],
  ['`¡Claro! Aquí tienes un resumen`', 'Explicación técnica', 0],
  ['¡Claro! Aquí tienes un resumen del informe.', 'Comunicación profesional', 0],
  ['¡Claro! Aquí tienes un resumen del informe.', 'Narrativa', 0],
 ];
 for (const [text,genre,n] of cases) assert.equal(run(text,['HES-036'],genre).length,n,`${genre}: ${text}`);
 const text='🙂 Introducción.\n\n¡Claro! Aquí tienes un resu-\nmen del informe.';
 const f=run(text,['HES-036'])[0];
 assert.equal(f.phrase,'¡Claro! Aquí tienes un resu-\nmen');
 assert.equal([...text].slice(f.start,f.end).join(''),f.phrase);
 assert.equal(f.replacement,null);assert.equal(f.status,'pending');
 assert.equal(run(text,['HES-001']).length,0);
 assert.equal(analyzeBlocks([{id:'p1',page:1,text,sha256:hash(text),protected:true}],{genre:'Ensayo'}).length,0);
 // Existing literal coverage must survive the additional structural check.
 assert.equal(run('Espero que esto te ayude.',['HES-036']).length,1);
});
