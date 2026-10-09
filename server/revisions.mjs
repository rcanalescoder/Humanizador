import { randomUUID } from 'node:crypto';
const columns = db => db.prepare('PRAGMA table_info(documents)').all().map(c=>c.name).filter(n=>n!=='pdf');
export function archiveDocument(db, sourceId, targetId=sourceId, reason='reprocess') {
  const row=db.prepare(`SELECT ${columns(db).map(n=>`"${n}"`).join(',')} FROM documents WHERE id=?`).get(sourceId);
  if (!row) throw new Error('Documento no encontrado.');
  const doc={...row,profile:JSON.parse(row.profile),result:row.result?JSON.parse(row.result):null,statistics:row.statistics?JSON.parse(row.statistics):null};
  const snapshot={format_version:'1.0',source_document_id:sourceId,document:doc,
    decisions:db.prepare('SELECT * FROM decisions WHERE document_id=? ORDER BY finding_id').all(sourceId),
    events:db.prepare('SELECT at,message FROM events WHERE document_id=? ORDER BY id').all(sourceId)};
  db.prepare('INSERT INTO document_runs(id,document_id,source_document_id,name,status,rule_count,processing_ms,archived_at,reason,snapshot) VALUES(?,?,?,?,?,?,?,?,?,?)')
    .run(randomUUID(),targetId,sourceId,row.name,row.status,doc.profile.rule_ids?.length||0,row.processing_ms,new Date().toISOString(),reason,JSON.stringify(snapshot));
}
export function mergeDuplicateDocuments(db) {
  const groups=db.prepare('SELECT project_id,sha256 FROM documents GROUP BY project_id,sha256 HAVING COUNT(*)>1').all();
  for(const group of groups) {
    const rows=db.prepare(`SELECT ${columns(db).map(n=>`"${n}"`).join(',')} FROM documents WHERE project_id=? AND sha256=? ORDER BY created_at,id`).all(group.project_id,group.sha256);
    const main=rows[0],latest=rows.at(-1);
    for(const row of rows) if(row.id!==latest.id)archiveDocument(db,row.id,main.id,'duplicate_merge');
    if(latest.id!==main.id) {
      const mutable=columns(db).filter(n=>!['id','sha256','name','project_id','created_at'].includes(n));
      db.prepare(`UPDATE documents SET ${mutable.map(n=>`"${n}"=?`).join(',')} WHERE id=?`).run(...mutable.map(n=>latest[n]),main.id);
      db.prepare('DELETE FROM decisions WHERE document_id=?').run(main.id);
      db.prepare('INSERT INTO decisions(document_id,finding_id,status,replacement,note,updated_at) SELECT ?,finding_id,status,replacement,note,updated_at FROM decisions WHERE document_id=?').run(main.id,latest.id);
      db.prepare('INSERT INTO events(document_id,at,message) SELECT ?,at,message FROM events WHERE document_id=?').run(main.id,latest.id);
    }
    db.prepare('UPDATE document_runs SET document_id=? WHERE document_id=?').run(main.id,latest.id);
    for(const row of rows)if(row.id!==main.id){
      db.prepare('UPDATE document_runs SET document_id=? WHERE document_id=?').run(main.id,row.id);
      db.prepare('DELETE FROM documents WHERE id=?').run(row.id);
    }
    db.prepare('UPDATE documents SET revision=? WHERE id=?').run(Math.max(...rows.map(r=>r.revision))+1,main.id);
    db.prepare("UPDATE documents SET status='queued',claim_token=NULL,lease_until=NULL,attempts=0 WHERE id=? AND status IN ('queued','extracting','analyzing')").run(main.id);
    db.prepare('INSERT INTO events(document_id,at,message) VALUES(?,?,?)').run(main.id,new Date().toISOString(),'PDF duplicados reunidos en un documento; análisis anteriores conservados en Historia.');
  }
}
export function listRuns(db,id) {
 return db.prepare('SELECT id,name,status,rule_count,processing_ms,archived_at,reason FROM document_runs WHERE document_id=? ORDER BY archived_at DESC,id').all(id);
}
