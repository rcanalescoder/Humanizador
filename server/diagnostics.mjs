const phaseNames={extracting:'Extracción del PDF',rules:'Reglas del catálogo',local:'Lectura con Ollama',completed:'Análisis terminado'};
const stageNames={generation:'Buscando propuestas',editorial:'Comprobando el diagnóstico',fidelity:'Comprobando la fidelidad',cache:'Recuperando un fragmento guardado',model:'Comprobando el modelo'};

export function analysisProgress(db,id,token,update) {
  const row=db.prepare('SELECT diagnostics FROM documents WHERE id=? AND claim_token=?').get(id,token);
  if(!row)return false;
  const previous=JSON.parse(row.diagnostics||'{}'), now=Date.now();
  const diagnostic={...previous,...(previous.phase!==update.phase||previous.stage!==update.stage?{stage_started_at_ms:now}:{}),...update,updated_at_ms:now,error:null};
  db.prepare('UPDATE documents SET diagnostics=? WHERE id=? AND claim_token=?').run(JSON.stringify(diagnostic),id,token);
  if(previous.phase!==update.phase || previous.stage!==update.stage || (update.phase==='local' && update.stage!=='cache' && previous.chunk!==update.chunk)) {
    const message=[phaseNames[update.phase]||update.phase,stageNames[update.stage],update.page?`página ${update.page}`:null].filter(Boolean).join(' · ');
    db.prepare('INSERT INTO events(document_id,at,message) VALUES(?,?,?)').run(id,new Date(now).toISOString(),message+'.');
  }
  return true;
}

export function failAnalysis(db,id,token,error,now=Date.now()) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const row=db.prepare('SELECT diagnostics FROM documents WHERE id=? AND claim_token=?').get(id,token);
    if(!row){db.exec('COMMIT');return false;}
    const previous=JSON.parse(row.diagnostics||'{}');
    const message=/PDF|contraseña|páginas|cancelado|Ollama/u.test(error.message)?error.message:'No se pudo completar el análisis. Consulta el diagnóstico.';
    const diagnostic={...previous,...error.diagnostic,updated_at_ms:now,error:{message,code:error.diagnostic?.code||'analysis_failed',name:error.name}};
    db.prepare('INSERT INTO analysis_failures(document_id,at_ms,diagnostic) VALUES(?,?,?)').run(id,now,JSON.stringify(diagnostic));
    db.prepare("UPDATE documents SET status='failed',error=?,diagnostics=?,finished_at_ms=?,processing_ms=MAX(0,?-started_at_ms),lease_until=NULL,claim_token=NULL WHERE id=? AND claim_token=?")
      .run(message,JSON.stringify(diagnostic),now,now,id,token);
    db.prepare('INSERT INTO events(document_id,at,message) VALUES(?,?,?)').run(id,new Date(now).toISOString(),`Análisis detenido${diagnostic.page?` en la página ${diagnostic.page}`:''}: ${message}`);
    db.exec('COMMIT');return true;
  } catch(e){db.exec('ROLLBACK');throw e;}
}

export function diagnosticView(db,document) {
  const stored=JSON.parse(document.diagnostics||'null');
  const profile=JSON.parse(document.profile);
  return {...stored,legacy:!stored,phase:stored?.phase||document.status,model:stored?.model||profile.local_model?.model||null,
    error:stored?.error||(document.error?{message:document.error,code:'legacy_error'}:null),
    stored_chunks:db.prepare('SELECT COUNT(*) AS n FROM local_review_chunks WHERE document_id=?').get(document.id).n,
    recent_failures:db.prepare('SELECT at_ms,diagnostic FROM analysis_failures WHERE document_id=? ORDER BY id DESC LIMIT 5').all(document.id).map(r=>({at_ms:r.at_ms,...JSON.parse(r.diagnostic)})),
    heartbeat_at_ms:['extracting','analyzing'].includes(document.status)&&document.lease_until?document.lease_until-30000:null,
    server_time_ms:Date.now()};
}
