// Disposable in-memory UI fixture. Never opens the user's database or calls Ollama.
// node tools/preview-edition.mjs (port 8788, Ctrl+C to discard)
import { randomUUID } from 'node:crypto';
import { createApp } from '../server/api.mjs';
import { openDatabase, DEFAULT_PROJECT_ID } from '../server/db.mjs';
import { extractPdf } from '../server/extract.mjs';
import { examplePdf } from '../core/example.mjs';
import { hash } from '../core/changes.mjs';
const db=openDatabase(':memory:'),id=randomUUID(),pdf=examplePdf({diagram:true}),profile={genre:'Ensayo'};
const result=await extractPdf(pdf,profile);
result.analysis.profile.rule_ids=result.analysis.rules.map(r=>r.id);
db.prepare('UPDATE projects SET name=? WHERE id=?').run('Prueba desechable de edición',DEFAULT_PROJECT_ID);
db.prepare('INSERT INTO documents(id,project_id,name,sha256,pdf,size_bytes,created_at,profile,status,result,revision) VALUES(?,?,?,?,?,?,?,?,?,?,?)')
  .run(id,DEFAULT_PROJECT_ID,'Ejemplo para anotar.pdf',hash(pdf),pdf,pdf.length,new Date().toISOString(),JSON.stringify(profile),'completed',JSON.stringify(result),1);
const server=createApp(db,{publicUrl:'http://127.0.0.1:8788'});
server.listen(8788,'127.0.0.1',()=>console.log(JSON.stringify({url:'http://127.0.0.1:8788/',document_id:id})));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>server.close(()=>{db.close();process.exit(0);}));
