import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { openDatabase } from '../server/db.mjs';
import { pauseJobs } from '../server/pause.mjs';
const dev = process.argv.includes('--dev');
const env = { ...process.env, HUMANIZADOR_DEV: dev ? '1' : '0' };
const db = openDatabase();
pauseJobs(db, 'Se interrumpió la sesión anterior. Puedes continuar desde los bloques guardados.');
const children = new Set();
let closing = false, exitCode = 0;
function stop(code = 0) {
  if (closing) return;
  closing = true; exitCode = code;
  pauseJobs(db);
  for (const child of children) child.kill('SIGTERM');
  const timer = setTimeout(() => { for (const child of children) child.kill('SIGKILL'); }, 6000);
  timer.unref();
  if (!children.size) { db.close(); process.exit(exitCode); }
}
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => stop());
for (const command of [['server/api.mjs'], ['server/worker.mjs'], ...(dev ? [['node_modules/vite/bin/vite.js']] : [])]) {
  const args=[fileURLToPath(new URL('../'+command[0],import.meta.url)),...command.slice(1),...(process.env.HUMANIZADOR_INSTANCE?[`--instance=${process.env.HUMANIZADOR_INSTANCE}`]:[])];
  const child = spawn(process.execPath, args, { stdio: 'inherit', env });
  children.add(child);
  child.on('error', e => { console.error('No se pudo iniciar un servicio:', e.message); stop(1); });
  child.on('close', code => { children.delete(child); if (!closing) stop(code || 1); else if (!children.size) { db.close(); process.exit(exitCode); } });
}
