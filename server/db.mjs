import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, chmodSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { resultStatistics } from './statistics.mjs';
import { analysisProgress } from './diagnostics.mjs';
import { mergeDuplicateDocuments } from './revisions.mjs';

export const DEFAULT_PROJECT_ID = '00000000-0000-4000-8000-000000000001';

export const dataDir = resolve(process.env.HUMANIZADOR_DATA_DIR || 'data');
export function openDatabase(path = resolve(dataDir, 'humanizador.sqlite')) {
  mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(path);
  if (path !== ':memory:') chmodSync(path, 0o600);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, sha256 TEXT NOT NULL, pdf BLOB NOT NULL,
      created_at TEXT NOT NULL, profile TEXT NOT NULL, status TEXT NOT NULL,
      progress INTEGER NOT NULL DEFAULT 0, total INTEGER NOT NULL DEFAULT 0,
      error TEXT, result TEXT, lease_until INTEGER, claim_token TEXT,
      attempts INTEGER NOT NULL DEFAULT 0, revision INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS decisions (
      document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      finding_id TEXT NOT NULL, status TEXT NOT NULL, replacement TEXT,
      note TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL,
      PRIMARY KEY (document_id, finding_id)
    );
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY, document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      at TEXT NOT NULL, message TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS analysis_failures (
      id INTEGER PRIMARY KEY, document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      at_ms INTEGER NOT NULL, diagnostic TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS annotations (
      id TEXT PRIMARY KEY, document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      page INTEGER NOT NULL, kind TEXT NOT NULL, note TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'open',
      anchor TEXT NOT NULL, preview TEXT, version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS annotations_document ON annotations(document_id,page);
    CREATE TABLE IF NOT EXISTS auth_attempts (address TEXT PRIMARY KEY, attempts INTEGER NOT NULL, reset_at INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS document_queue ON documents(status, created_at);
  `);
  db.exec('BEGIN IMMEDIATE');
  try {
    const projectsExisted = Boolean(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='projects'").get());
    db.exec(`CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL)`);
    if (!projectsExisted) db.prepare('INSERT INTO projects(id,name,description,created_at) VALUES(?,?,?,?)').run(DEFAULT_PROJECT_ID, 'Proyecto inicial', 'Documentos de la primera versión.', new Date().toISOString());
    const columns = new Set(db.prepare('PRAGMA table_info(documents)').all().map(c => c.name));
    for (const [name,type] of Object.entries({ project_id: 'TEXT REFERENCES projects(id)', size_bytes: 'INTEGER NOT NULL DEFAULT 0', statistics: 'TEXT', queued_at_ms: 'INTEGER', started_at_ms: 'INTEGER', finished_at_ms: 'INTEGER', processing_ms: 'INTEGER', diagnostics: 'TEXT' })) {
      if (!columns.has(name)) db.exec(`ALTER TABLE documents ADD COLUMN ${name} ${type}`);
    }
    db.prepare('UPDATE documents SET project_id=? WHERE project_id IS NULL').run(DEFAULT_PROJECT_ID);
    db.exec('UPDATE documents SET size_bytes=length(pdf) WHERE size_bytes=0; CREATE INDEX IF NOT EXISTS documents_project ON documents(project_id)');
    for (const d of db.prepare('SELECT id,result FROM documents WHERE statistics IS NULL AND result IS NOT NULL').all()) {
      db.prepare('UPDATE documents SET statistics=? WHERE id=?').run(JSON.stringify(resultStatistics(JSON.parse(d.result))), d.id);
    }
    db.exec(`CREATE TABLE IF NOT EXISTS document_runs (
      id TEXT PRIMARY KEY, document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      source_document_id TEXT NOT NULL, name TEXT NOT NULL, status TEXT NOT NULL,
      rule_count INTEGER NOT NULL, processing_ms INTEGER, archived_at TEXT NOT NULL,
      reason TEXT NOT NULL, snapshot TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS runs_document ON document_runs(document_id)`);
    if (!db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='documents_project_hash'").get()) {
      mergeDuplicateDocuments(db);
      db.exec('CREATE UNIQUE INDEX documents_project_hash ON documents(project_id,sha256)');
    }
    db.exec(`CREATE TABLE IF NOT EXISTS local_review_chunks (
      document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      cache_key TEXT NOT NULL, result TEXT NOT NULL,
      PRIMARY KEY(document_id, cache_key))`);
    db.exec('COMMIT');
  } catch(e) { db.exec('ROLLBACK'); db.close(); throw e; }
  return db;
}
export function event(db, id, message) {
  db.prepare('INSERT INTO events(document_id, at, message) VALUES (?, ?, ?)').run(id, new Date().toISOString(), message);
}
export function claimJob(db, now = Date.now()) {
  db.exec('BEGIN IMMEDIATE');
  try {
    // Interrupted jobs are retried a bounded number of times; a stale child cannot publish.
    db.prepare(`UPDATE documents SET status='queued', claim_token=NULL, lease_until=NULL
      WHERE status IN ('extracting','analyzing') AND lease_until < ? AND attempts < 3`).run(now);
    db.prepare(`UPDATE documents SET status='failed', error='El análisis se interrumpió tres veces. Puedes reintentarlo.', claim_token=NULL
      WHERE status IN ('extracting','analyzing') AND lease_until < ? AND attempts >= 3`).run(now);
    const row = db.prepare("SELECT id FROM documents WHERE status='queued' ORDER BY created_at, id LIMIT 1").get();
    if (!row) { db.exec('COMMIT'); return null; }
    const token = randomUUID();
    db.prepare("UPDATE documents SET status='extracting', claim_token=?, lease_until=?, started_at_ms=?, finished_at_ms=NULL, processing_ms=NULL, progress=0, error=NULL, diagnostics=NULL, attempts=attempts+1 WHERE id=?")
      .run(token, now + 30000, now, row.id);
    analysisProgress(db,row.id,token,{phase:'extracting',stage:'extracting',completed:0,total:0,stage_started_at_ms:now});
    db.exec('COMMIT'); return { id: row.id, token };
  } catch (e) { db.exec('ROLLBACK'); throw e; }
}
export function finishJob(db, id, token, result, now = Date.now()) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const row = db.prepare(`UPDATE documents SET status='completed', result=?, progress=total, error=NULL,
      statistics=?, finished_at_ms=?, processing_ms=MAX(0, ?-started_at_ms),
      lease_until=NULL, claim_token=NULL, revision=revision+1 WHERE id=? AND claim_token=? AND status IN ('extracting','analyzing')`)
      .run(JSON.stringify(result), JSON.stringify(resultStatistics(result)), now, now, id, token);
    if (row.changes) {
      const previous=JSON.parse(db.prepare('SELECT diagnostics FROM documents WHERE id=?').get(id).diagnostics||'{}');
      db.prepare('UPDATE documents SET diagnostics=? WHERE id=?').run(JSON.stringify({...previous,phase:'completed',stage:'completed',completed:previous.total,updated_at_ms:now,error:null}),id);
      event(db,id,'Análisis terminado. Los hallazgos están pendientes de revisión.');
    }
    db.exec('COMMIT'); return row.changes === 1;
  } catch (e) { db.exec('ROLLBACK'); throw e; }
}
