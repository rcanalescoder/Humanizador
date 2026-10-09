import { createHash } from 'node:crypto';

export const hash = value => createHash('sha256').update(value).digest('hex');
// JCS subset: only JSON strings, booleans, null, finite numbers, arrays and objects.
// Text normalization is done by extraction, never by this serializer.
export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('Número no válido.');
  const result = JSON.stringify(value);
  if (result === undefined) throw new Error('Valor JSON no válido.');
  if (typeof value === 'string' && /[\uD800-\uDFFF]/u.test(value)) {
    // Under /u, surrogate pairs are one code point; only lone surrogates match.
    throw new Error('Unicode no válido.');
  }
  return result;
}
export const documentHash = blocks => hash(canonical(blocks.map(b => ({ id: b.id, text: b.text, page: b.page }))));
export function applyOperations(blocks, operations, expectedDocumentHash) {
  if (documentHash(blocks) !== expectedDocumentHash) throw new Error('La versión del texto no coincide con el paquete.');
  const byId = new Map(blocks.map(b => [b.id, b]));
  const grouped = new Map();
  for (const op of operations) {
    const block = byId.get(op.block_id);
    if (!block || hash(block.text) !== op.block_sha256) throw new Error('El bloque de origen ha cambiado.');
    if (op.decision !== 'approved') throw new Error('El paquete contiene cambios sin aprobar.');
    const chars = [...block.text];
    if (!Number.isInteger(op.start) || !Number.isInteger(op.end) || op.start < 0 || op.end < op.start || op.end > chars.length
      || chars.slice(op.start, op.end).join('') !== op.expected_text || typeof op.replacement !== 'string') {
      throw new Error('El fragmento de origen no coincide con la operación.');
    }
    const list = grouped.get(block.id) ?? []; list.push(op); grouped.set(block.id, list);
  }
  for (const list of grouped.values()) {
    list.sort((a, b) => a.start - b.start || a.end - b.end);
    for (let i = 1; i < list.length; i++) {
      if (list[i].start < list[i - 1].end || list[i].start === list[i - 1].start) throw new Error('Hay cambios que se solapan. Resuelve el conflicto antes de exportar.');
    }
  }
  return blocks.map(b => {
    const chars = [...b.text];
    for (const op of [...(grouped.get(b.id) ?? [])].reverse()) chars.splice(op.start, op.end - op.start, ...op.replacement);
    return { ...b, text: chars.join(''), sha256: hash(chars.join('')) };
  });
}
export function makePackage(result, decisions) {
  const decisionMap = new Map(decisions.map(d => [d.finding_id, d]));
  const effective = result.findings.map(f => ({ finding_id: f.id, status: decisionMap.get(f.id)?.status ?? 'pending',
    replacement: decisionMap.get(f.id)?.replacement ?? null })).sort((a, b) => a.finding_id.localeCompare(b.finding_id, 'en'));
  const operations = result.findings.filter(f => decisionMap.get(f.id)?.status === 'approved').map(f => {
    const d = decisionMap.get(f.id);
    if (typeof d.replacement !== 'string') throw new Error('Una corrección aprobada necesita texto de sustitución.');
    const core = { block_id: f.block_id, block_sha256: f.block_sha256, start: f.start, end: f.end, expected_text: f.phrase,
      replacement: d.replacement, rule_id: f.rule_id, rule_version: f.rule_version, origin: 'user', decision: 'approved' };
    return { id: hash(canonical(core)), ...core };
  });
  const corrected = applyOperations(result.blocks, operations, result.canonical_document_sha256);
  return {
    format_version: '1.0', source_pdf_sha256: result.source_pdf_sha256,
    canonical_document_sha256: result.canonical_document_sha256,
    extraction: result.extraction, analysis: result.analysis,
    decisions_sha256: hash(canonical(effective)), operations,
    unresolved_findings: effective.filter(d => d.status === 'pending').map(d => d.finding_id),
    excluded_regions: result.pages.filter(p => p.excluded).map(p => ({ page: p.page, reason: p.reason })),
    expected_blocks: corrected.map(b => ({ id: b.id, sha256: b.sha256 })),
    expected_result_sha256: documentHash(corrected),
  };
}
export function applyPackage(result, pkg) {
  if (pkg.format_version !== '1.0' || pkg.source_pdf_sha256 !== result.source_pdf_sha256) throw new Error('El PDF de origen no coincide.');
  const corrected = applyOperations(result.blocks, pkg.operations, pkg.canonical_document_sha256);
  if (documentHash(corrected) !== pkg.expected_result_sha256 || canonical(corrected.map(b => ({ id: b.id, sha256: b.sha256 }))) !== canonical(pkg.expected_blocks)) {
    throw new Error('El resultado no coincide con los hashes esperados.');
  }
  return corrected;
}
