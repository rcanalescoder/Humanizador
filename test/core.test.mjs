import test from 'node:test';
import assert from 'node:assert/strict';
import { canonical, hash, documentHash, makePackage, applyPackage, applyOperations } from '../core/changes.mjs';
import { analyzeBlocks, activeRules } from '../core/rules.mjs';

const block = text => ({ id: 'p0001-b0001', page: 1, text, sha256: hash(text) });
const profile = { rule_ids: activeRules.map(r => r.id) };
function resultFor(text) {
  const blocks = [block(text)];
  return { blocks, findings: analyzeBlocks(blocks, profile), pages: [{ page: 1, excluded: false }],
    canonical_document_sha256: documentHash(blocks), source_pdf_sha256: hash('pdf'),
    extraction: { engine: 'fixture', version: '1' }, analysis: { rules: 'fixture' } };
}
test('Unicode offsets target the right occurrence, respecting paired quotes and word boundaries', () => {
  const result = resultFor('🙂 «Cabe destacar que» no activa la regla. Cabe destacar que hay dos casos. Encabe destacar que tampoco.');
  const matches = result.findings.filter(f => f.rule_id === 'HES-001');
  assert.equal(matches.length, 1);
  const f = matches[0];
  assert.equal([...result.blocks[0].text].slice(f.start, f.end).join(''), 'Cabe destacar que');
  assert.deepEqual(result.findings, analyzeBlocks(result.blocks, profile));
});
test('approved changes reproduce byte-for-byte and pending suggestions cannot apply', () => {
  const result = resultFor('Cabe destacar que hay dos casos. En definitiva, eso importa.');
  const finding = result.findings.find(f => f.rule_id === 'HES-001');
  const decisions = [{ finding_id: finding.id, status: 'approved', replacement: 'El informe indica que' }];
  const a = makePackage(result, decisions), b = makePackage(result, decisions);
  assert.equal(canonical(a), canonical(b));
  assert.equal(a.operations.length, 1);
  assert.equal(a.unresolved_findings.length, 1);
  assert.equal(applyPackage(result, a)[0].text, 'El informe indica que hay dos casos. En definitiva, eso importa.');
  assert.throws(() => applyOperations(result.blocks, [{ ...a.operations[0], decision: 'pending' }], result.canonical_document_sha256));
});
test('changed bases and overlapping changes fail before producing a corrected version', () => {
  const result = resultFor('Cabe destacar que hay dos casos.');
  const pkg = makePackage(result, [{ finding_id: result.findings[0].id, status: 'approved', replacement: '' }]);
  assert.throws(() => applyPackage({ ...result, source_pdf_sha256: hash('other') }, pkg), /PDF/);
  assert.throws(() => applyPackage(result, { ...pkg, expected_result_sha256: hash('other') }), /resultado/);
  assert.throws(() => applyOperations([block('otro texto')], pkg.operations, result.canonical_document_sha256), /versión/);
  assert.throws(() => applyOperations(result.blocks, [...pkg.operations, ...pkg.operations], result.canonical_document_sha256), /solapan/);
  assert.throws(() => applyOperations(result.blocks, [{ ...pkg.operations[0], expected_text: 'otro' }], result.canonical_document_sha256), /fragmento/);
});
test('profile and protected regions suppress candidates without altering text', () => {
  const blocks = [block('Cabe destacar que hay dos casos.')];
  assert.equal(analyzeBlocks(blocks, { rule_ids: [] }).length, 0);
  assert.equal(analyzeBlocks([{ ...blocks[0], protected: true }], profile).length, 0);
  assert.equal(analyzeBlocks([{ ...blocks[0], excluded: true }], profile).length, 0);
});
test('PDF line breaks preserve exact matched text and Unicode offsets', () => {
  const result = resultFor('🙂 Cabe\ndestacar  que hay dos casos.');
  const f = result.findings.find(f => f.rule_id === 'HES-001');
  assert.equal(f.phrase, 'Cabe\ndestacar  que');
  assert.equal([...result.blocks[0].text].slice(f.start, f.end).join(''), f.phrase);
  const pkg = makePackage(result, [{ finding_id: f.id, status: 'approved', replacement: 'Aquí' }]);
  assert.equal(applyPackage(result, pkg)[0].text, '🙂 Aquí hay dos casos.');
});
test('canonical JSON rejects non JSON numbers and lone surrogates', () => {
  assert.equal(canonical({ z: 1, a: ['🙂', null] }), '{"a":["🙂",null],"z":1}');
  assert.throws(() => canonical(NaN));
  assert.throws(() => canonical('\ud800'));
});
