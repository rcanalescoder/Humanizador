import { event } from './db.mjs';
// Invalidate claims before signalling children; keep complete validated chunks.
export function pauseJobs(db, reason = 'Servidor detenido. Elige si quieres continuar la revisión.') {
  db.exec('BEGIN IMMEDIATE');
  try {
    const rows = db.prepare("SELECT id,diagnostics FROM documents WHERE status IN ('queued','extracting','analyzing')").all();
    db.prepare("UPDATE documents SET status='paused',claim_token=NULL,lease_until=NULL,finished_at_ms=?,processing_ms=CASE WHEN started_at_ms IS NULL THEN NULL ELSE MAX(0,?-started_at_ms) END,revision=revision+1 WHERE status IN ('queued','extracting','analyzing')").run(Date.now(),Date.now());
    for (const {id,diagnostics} of rows) {
      const previous=JSON.parse(diagnostics||'{}');
      db.prepare('UPDATE documents SET diagnostics=? WHERE id=?').run(JSON.stringify({...previous,phase:'paused',stage:'paused',previous_stage:previous.stage,updated_at_ms:Date.now()}),id);
      event(db,id,reason);
    }
    db.exec('COMMIT'); return rows.length;
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}
