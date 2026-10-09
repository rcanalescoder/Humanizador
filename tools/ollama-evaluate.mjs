import { mkdir,writeFile } from 'node:fs/promises';
import { modelStatus,reviewLocal } from '../server/ollama.mjs';
import { hash } from '../core/changes.mjs';
const model=await modelStatus(); if(!model.ready) throw Error(model.message);
const cases=[{name:'problema explícito',text:'En el cambiante panorama actual, es fundamental destacar que nuestra solución revolucionaria transforma radicalmente la experiencia y garantiza resultados excepcionales. La realización de la implementación de la mejora permite potenciar la entrega de valor.'},{name:'control concreto',text:'Ayer cambiamos la consulta que carga los pedidos. Tardaba ocho segundos porque recorría toda la tabla; con el índice nuevo tarda menos de uno. Marta pidió conservar el filtro por fecha y lo dejamos igual. Antes de publicarlo, comprobamos tres pedidos que habían fallado el lunes.'}];
await mkdir('test-results',{recursive:true});
const report={date:new Date().toISOString(),model,samples:[],scope:'Prueba funcional pequeña; no mide precisión ni prueba autoría.'};
for(const [index,c] of cases.entries()) {
 const start=Date.now(), block={id:`pilot-${index}`,page:c.page||1,text:c.text,sha256:hash(c.text)};
 const output=await reviewLocal({blocks:[block],findings:[],analysis:{}},{genre:'Ensayo',local_model:{model:model.model,digest:model.digest}});
 report.samples.push({name:c.name,elapsed_ms:Date.now()-start,findings:output.findings,analysis:output.analysis.local_review});
 await writeFile('test-results/ollama-pilot.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({sample:c.name,elapsed_ms:report.samples.at(-1).elapsed_ms,findings:output.findings.length,rejected:output.analysis.local_review.rejected_suggestions}));
}
