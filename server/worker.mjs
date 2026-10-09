import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { pauseJobs } from './pause.mjs';
import { failAnalysis } from './diagnostics.mjs';
import { openDatabase, claimJob } from './db.mjs';

const db = openDatabase();
let stopping = false, child = null;
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => { stopping = true; pauseJobs(db); child?.kill('SIGTERM'); if(child) setTimeout(()=>child?.kill('SIGKILL'),3000).unref(); });
console.log('Worker de Humanizador preparado (una tarea cada vez).');
while (!stopping) {
  const job = claimJob(db);
  if (!job) { await delay(500); continue; }
  child = spawn(process.execPath, ['--max-old-space-size=512', new URL('./job.mjs', import.meta.url).pathname, job.id, job.token, ...(process.env.HUMANIZADOR_INSTANCE?[`--instance=${process.env.HUMANIZADOR_INSTANCE}`]:[])], { stdio: 'inherit' });
  const active = child;
  const localReview = JSON.parse(db.prepare('SELECT profile FROM documents WHERE id=?').get(job.id).profile).review_mode === 'local';
  const heartbeat = setInterval(() => {
    const row = db.prepare('SELECT claim_token FROM documents WHERE id=?').get(job.id);
    if (!row || row.claim_token !== job.token) active.kill('SIGTERM');
    else db.prepare('UPDATE documents SET lease_until=? WHERE id=? AND claim_token=?').run(Date.now() + 30000, job.id, job.token);
  }, 1000);
  const timeout = localReview ? null : setTimeout(() => {
    failAnalysis(db,job.id,job.token,new Error('Se alcanzó el límite de tres minutos para procesar el PDF. Puedes reintentar o subir uno más pequeño.'));
    active.kill('SIGKILL');
  }, 180000);
  const exited = await new Promise(resolve => { active.once('exit', resolve); active.once('error', resolve); });
  clearInterval(heartbeat); clearTimeout(timeout); child = null;
  // An unexpected child exit becomes recoverable after the lease expires.
  db.prepare('UPDATE documents SET lease_until=? WHERE id=? AND claim_token=?').run(Date.now() - 1, job.id, job.token);
}
db.close();
