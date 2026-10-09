import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { openDatabase } from '../server/db.mjs';
import { examplePdf } from '../core/example.mjs';
import { activeRules } from '../core/rules.mjs';
import { hash, canonical } from '../core/changes.mjs';

test('a separate worker completes a disk-backed job without a browser or API, and survives restart', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'humanizador-worker-'));
  const path = join(dir, 'humanizador.sqlite');
  let db = openDatabase(path), worker;
  const run = () => spawn(process.execPath, ['server/worker.mjs'], { env: { ...process.env, HUMANIZADOR_DATA_DIR: dir }, stdio: 'pipe' });
  const stop = async () => { if (worker.exitCode === null) { const exited = once(worker, 'exit'); worker.kill('SIGTERM'); await exited; } };
  try {
    const pdf = examplePdf();
    db.prepare('INSERT INTO documents(id,name,sha256,pdf,created_at,profile,status) VALUES(?,?,?,?,?,?,?)')
      .run('background','Prueba.pdf', hash(pdf),pdf,new Date().toISOString(),canonical({ rule_ids: activeRules.map(r => r.id) }), 'queued');
    db.close();
    worker = run();
    worker.stdout.resume(); worker.stderr.resume();
    db = openDatabase(path);
    let row;
    for (let n = 0; n < 100; n++) {
      row = db.prepare("SELECT status,result,revision FROM documents WHERE id='background'").get();
      if (['completed','failed'].includes(row.status)) break;
      await delay(100);
    }
    assert.equal(row.status, 'completed');
    assert.ok(JSON.parse(row.result).findings.length >= 5);
    await stop(); db.close(); db = openDatabase(path);
    worker = run(); worker.stdout.resume(); worker.stderr.resume();
    await delay(650);
    assert.deepEqual(db.prepare("SELECT status,result,revision FROM documents WHERE id='background'").get(), row);
  } finally { if (worker) await stop(); db.close(); await rm(dir,{recursive:true,force:true}); }
});
