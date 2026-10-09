// Synthetic UI fixture in a dedicated database; never write to the user's data.
import {resolve} from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
import {openDatabase,claimJob,finishJob,DEFAULT_PROJECT_ID} from '../server/db.mjs';
import {examplePdf} from '../core/example.mjs';
import {extractPdf} from '../server/extract.mjs';
import {hash,canonical} from '../core/changes.mjs';
import {randomUUID} from 'node:crypto';
const dir=resolve('test-results/unified-review');await mkdir(dir,{recursive:true});
const db=openDatabase(resolve(dir,'humanizador.sqlite'));const pdf=examplePdf({emptyPage:true});
await writeFile(resolve(dir,'Lectura-sintetica.pdf'),pdf);
const profile={genre:'Ensayo',review_mode:'rules'};
let id=db.prepare('SELECT id FROM documents LIMIT 1').get()?.id;
if(!id){id=randomUUID();db.prepare('INSERT INTO documents(id,name,sha256,pdf,created_at,profile,status,project_id) VALUES(?,?,?,?,?,?,?,?)').run(id,'Lectura sintética.pdf',hash(pdf),pdf,new Date().toISOString(),canonical(profile),'queued',DEFAULT_PROJECT_ID);const job=claimJob(db);finishJob(db,id,job.token,await extractPdf(pdf,profile));}
db.close();console.log(JSON.stringify({directory:dir,document:id}));
