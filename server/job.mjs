import { openDatabase, finishJob } from './db.mjs';
import { extractPdf } from './extract.mjs';
import { analysisProgress, failAnalysis } from './diagnostics.mjs';
import { reviewLocal } from './ollama.mjs';

const [id, token] = process.argv.slice(2);
const db = openDatabase();
try {
  const doc = db.prepare('SELECT pdf, profile FROM documents WHERE id=? AND claim_token=?').get(id, token);
  if (!doc) process.exit(0);
  const profile = JSON.parse(doc.profile);
  const result = await extractPdf(doc.pdf, profile, ({ status, current, total }) => {
    const changed = db.prepare('UPDATE documents SET status=?, progress=?, total=?, lease_until=? WHERE id=? AND claim_token=?')
      .run(status, current, total, Date.now() + 30000, id, token);
    if (!changed.changes) throw new Error('Trabajo cancelado.');
    analysisProgress(db,id,token,{phase:status==='extracting'?'extracting':'rules',stage:status==='extracting'?'extracting':'rules',page:current,completed:current,total});
  });
  if (profile.review_mode === 'local') {
    analysisProgress(db,id,token,{phase:'local',stage:'model',page:null,chunk:null,completed:0,total:0,model:profile.local_model?.model,stage_started_at_ms:Date.now()});
    const controller = new AbortController();
    const check = () => {
      if (db.prepare('SELECT claim_token FROM documents WHERE id=?').get(id)?.claim_token !== token) controller.abort();
    };
    const timer = setInterval(check, 500);
    try {
      await reviewLocal(result, profile, {
        signal: controller.signal,
        activity: detail => {check();controller.signal.throwIfAborted();analysisProgress(db,id,token,detail);},
        progress: (current, total) => {
          check(); controller.signal.throwIfAborted();
          db.prepare("UPDATE documents SET status='analyzing',progress=?,total=? WHERE id=? AND claim_token=?").run(current, total, id, token);
        },
        load: key => { const row = db.prepare('SELECT result FROM local_review_chunks WHERE document_id=? AND cache_key=?').get(id, key); return row ? JSON.parse(row.result) : null; },
        save: (key, output) => {
          check(); controller.signal.throwIfAborted();
          db.prepare('INSERT OR REPLACE INTO local_review_chunks(document_id,cache_key,result) SELECT id,?,? FROM documents WHERE id=? AND claim_token=?').run(key, JSON.stringify(output), id, token);
        }
      });
    } finally { clearInterval(timer); }
  }
  finishJob(db, id, token, result);
} catch (e) {
  failAnalysis(db,id,token,e);
  console.error('Trabajo fallido:', id, e.name);
} finally { db.close(); }
