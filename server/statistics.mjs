const sentences = new Intl.Segmenter('es-ES', { granularity: 'sentence' });
export function resultStatistics(result) {
  const blocks = (result.blocks || []).filter(b => !b.excluded && !b.protected);
  const rules = new Map();
  for (const f of result.findings || []) {
    const entry = rules.get(f.rule_id) || { id: f.rule_id, name: f.rule_name, count: 0 };
    entry.count++; rules.set(f.rule_id, entry);
  }
  return { sentences: blocks.reduce((n,b) => n + [...sentences.segment(b.text)].filter(s => /[\p{L}\p{N}]/u.test(s.segment)).length, 0),
    words: result.coverage?.words || 0, pages: result.pages?.length || 0,
    analyzed: result.coverage?.analyzed ?? result.pages?.filter(p => !p.excluded).length ?? 0,
    findings: result.findings?.length || 0, rules: [...rules.values()].sort((a,b) => b.count-a.count || a.id.localeCompare(b.id)) };
}
export function summarizeDocuments(db, projectId = null) {
  const rows = db.prepare(`SELECT id,name,project_id,created_at,status,progress,total,error,profile,size_bytes,statistics,
    queued_at_ms,started_at_ms,finished_at_ms,processing_ms,
    (SELECT COUNT(*) FROM decisions WHERE document_id=documents.id AND status='approved') AS approved,
    (SELECT COUNT(*) FROM decisions WHERE document_id=documents.id AND status='kept') AS kept
    FROM documents ${projectId ? 'WHERE project_id=?' : ''} ORDER BY created_at DESC,id`).all(...(projectId ? [projectId] : []));
  return rows.map(d => {
    const stats = d.statistics ? JSON.parse(d.statistics) : null;
    return { ...d, profile: JSON.parse(d.profile), statistics: stats, findings: stats?.findings || 0,
      pending: Math.max(0, (stats?.findings || 0) - d.approved - d.kept),
      coverage: stats ? { analyzed: stats.analyzed, total: stats.pages, words: stats.words } : null };
  });
}
export function projectStatistics(documents) {
  const summary = { documents: documents.length, size_bytes: 0, sentences: 0, words: 0, pages: 0, analyzed: 0,
    findings: 0, pending: 0, approved: 0, kept: 0, completed: 0, working: 0, failed: 0, cancelled: 0,
    processing_ms: 0, timed_documents: 0, unmeasured_documents: 0, queue_ms: 0, rules: [] };
  const counts = new Map();
  for (const d of documents) {
    summary.size_bytes += d.size_bytes;
    for (const key of ['pending','approved','kept']) summary[key] += d[key];
    if (d.status === 'completed') {
      summary.completed++;
      for (const key of ['sentences','words','pages','analyzed','findings']) summary[key] += d.statistics?.[key] || 0;
      for (const rule of d.statistics?.rules || []) {
        const r = counts.get(rule.id) || { ...rule, count: 0, documents: 0 };
        r.count += rule.count; r.documents++; counts.set(rule.id,r);
      }
      if (d.processing_ms !== null) { summary.processing_ms += d.processing_ms; summary.timed_documents++; }
      else summary.unmeasured_documents++;
      if (d.started_at_ms !== null && d.queued_at_ms !== null) summary.queue_ms += Math.max(0,d.started_at_ms-d.queued_at_ms);
    } else if (['queued','extracting','analyzing'].includes(d.status)) summary.working++;
    else if (d.status === 'failed') summary.failed++;
    else if (d.status === 'cancelled') summary.cancelled++;
  }
  summary.rules = [...counts.values()].sort((a,b)=>b.count-a.count || a.id.localeCompare(b.id));
  summary.distinct_rules = summary.rules.length;
  summary.average_processing_ms = summary.timed_documents ? summary.processing_ms/summary.timed_documents : null;
  return summary;
}
