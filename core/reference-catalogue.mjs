import evidence from '../rules/es-ES/evidence.json' with { type: 'json' };
export { evidence };

// Pure enrichment shared by API and browser. It also lets a freshly built UI
// read an older running API without interrupting a long document analysis.
export function referenceCatalogue(catalogue) {
  const rules = catalogue.rules.map(rule => ({ ...rule,
    validation_status: rule.validation.corpus_evaluated ? 'evaluated' : 'experimental' }));
  const sources = [...new Map([...evidence.sources, ...catalogue.sources].map(s => [s.id, s])).values()];
  const coverage = evidence.coverage.map(entry => ({ ...entry,
    rules: entry.rule_ids.map(id => {
      const rule = rules.find(r => r.id === id);
      if (!rule) throw Error(`Referencia a regla inexistente: ${entry.id} / ${id}`);
      return { id, name: rule.name, implementation: rule.implemented ? 'deterministic'
        : rule.detector.type === 'local_editorial' ? 'local_optional' : 'pending',
      validation: rule.validation_status };
    }),
  }));
  const validation = {
    deterministic: rules.filter(r => r.implemented).length,
    local_optional: rules.filter(r => r.detector.type === 'local_editorial').length,
    pending: rules.filter(r => !r.implemented && r.detector.type !== 'local_editorial').length,
    corpus_evaluated: rules.filter(r => r.validation.corpus_evaluated).length,
  };
  return { ...catalogue, rules, sources, coverage, validation, evidence_reviewed_at: evidence.reviewed_at };
}
