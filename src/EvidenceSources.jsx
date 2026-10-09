import React from 'react';

export const decisionNames = { adapted: 'Adaptación acotada', partial: 'Cobertura parcial', pending: 'Sin implementar', rejected: 'Afirmación rechazada' };
const kindNames = { commercial_primary: 'Fuente comercial primaria', commercial_secondary: 'Blog comercial',
  editorial_primary: 'Guía editorial primaria', peer_reviewed_method: 'Método científico',
  peer_reviewed_study: 'Estudio científico', preprint: 'Preprint sin revisión confirmada',
  user_generated_proposal: 'Propuesta de un modelo', author_preference: 'Preferencia del autor',
  editorial_guidance: 'Guía editorial', linguistic_guidance: 'Guía lingüística', community_pattern: 'Patrón comunitario' };
const implementationNames = { deterministic: 'motor', local_optional: 'Ollama opcional', pending: 'pendiente' };

export default function EvidenceSources({ catalogue }) {
  return <>
    <section className="card evidence-summary"><h2>Qué respalda cada referencia</h2>
      <p>{catalogue.validation.deterministic} comprobaciones en el motor, {catalogue.validation.local_optional} criterios opcionales con Ollama y {catalogue.validation.pending} fichas pendientes. <strong>{catalogue.validation.corpus_evaluated} reglas con precisión medida en un corpus editorial representativo.</strong></p>
      <p>Las pruebas de código comprueban comportamientos concretos. Los estudios y guías orientan la revisión; su presencia aquí no demuestra la precisión de nuestros avisos.</p>
      <p className="small muted">Auditoría de referencias: {catalogue.evidence_reviewed_at}. Abre la cobertura de cada fuente para ver qué se ha aplicado y qué falta.</p>
    </section>
    <div className="source-grid">{catalogue.sources.map(source => {
      const entries = catalogue.coverage.filter(row => row.source_id === source.id);
      return <section className="card source-card" key={source.id}>
        <span className="source-id">{source.id} · {kindNames[source.kind] || 'Fuente de referencia'}</span>
        <h3>{source.title}</h3><p>{source.scope}</p>
        {source.assessment && <p className="source-assessment">{source.assessment}</p>}
        {source.id === 'CL26' && <p className="source-assessment">La propuesta agrupa ideas y referencias de calidad desigual. La auditoría de Pangram y HowManyWords aparece por separado; no se ha verificado aquí toda su bibliografía.</p>}
        {entries.length > 0 && <details className="evidence-details"><summary>Ver cobertura de {entries.length} {entries.length === 1 ? 'pauta' : 'pautas'}</summary>
          {entries.map(row => <div className="evidence-entry" key={row.id}>
            <strong>{row.signal}</strong><span className="pill">{decisionNames[row.decision]}</span>
            <p>{row.detail}</p><p className="small muted">{row.rules.length ? row.rules.map(rule => `${rule.id}: ${implementationNames[rule.implementation]}`).join(' · ') : 'Sin regla equivalente en el catálogo.'}</p>
            {row.tests.length > 0 && <p className="small muted">Tiene casos de comprobación locales; no equivale a precisión editorial medida.</p>}
          </div>)}
        </details>}
        <span className="muted small">{source.version}</span>
        {source.url && <a className="text-button" href={source.url} target="_blank" rel="noreferrer">Consultar fuente ↗</a>}
      </section>;
    })}</div>
  </>;
}
