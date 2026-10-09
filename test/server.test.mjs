import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/api.mjs';
import { openDatabase, claimJob, finishJob } from '../server/db.mjs';
import { extractPdf } from '../server/extract.mjs';
import { examplePdf } from '../core/example.mjs';
import { activeRules } from '../core/rules.mjs';
import { hash, canonical } from '../core/changes.mjs';
import { mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { basename, join } from 'node:path';

test('PDF worker modules have JavaScript MIME, including cache-versioned URLs', async () => {
  await mkdir('dist', {recursive:true});
  const directory=await mkdtemp(join('dist','mime-test-'));
  const db=openDatabase(':memory:'),server=createApp(db);
  try {
    await writeFile(join(directory,'worker.mjs'),'export const ready = true;');
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const response=await fetch(`http://127.0.0.1:${server.address().port}/${basename(directory)}/worker.mjs?module=1`);
    assert.equal(response.status,200);
    assert.equal(response.headers.get('content-type'),'text/javascript');
    assert.equal(response.headers.get('x-content-type-options'),'nosniff');
    assert.equal(await response.text(),'export const ready = true;');
  } finally {
    await new Promise(resolve=>server.close(resolve));db.close();
    await rm(directory,{recursive:true,force:true});
  }
});

test('real PDF extraction, persistent queue, stale-worker protection, decisions and export', async () => {
  const db = openDatabase(':memory:');
  const server = createApp(db, { publicUrl: 'http://127.0.0.1:8787' });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const headers = { Host: '127.0.0.1:8787', 'x-humanizador-request': '1' };
  const request = (url, options = {}) => fetch(base + url, { ...options, headers: { ...headers, ...options.headers } });
  try {
    const catalogue = await (await request('/api/rules')).json();
    assert.equal(catalogue.validation.corpus_evaluated, 0);
    assert.equal(catalogue.coverage.find(r=>r.id==='HM-01').decision, 'rejected');
    assert.ok(catalogue.sources.some(s=>s.id==='DGPT23'));
    const pdf = examplePdf({ emptyPage: true });
    const upload = await request('/api/documents?name=Ejemplo.pdf', { method: 'POST', headers: { 'Content-Type': 'application/pdf' }, body: pdf });
    assert.equal(upload.status, 202);
    const { id } = await upload.json();
    assert.equal((await (await request(`/api/documents/${id}`)).json()).status, 'queued');
    const first = claimJob(db, 1000);
    assert.equal(first.id, id);
    assert.equal(claimJob(db, 1001), null);
    const second = claimJob(db, 32000);
    assert.notEqual(first.token, second.token);
    const profile = JSON.parse(db.prepare('SELECT profile FROM documents WHERE id=?').get(id).profile);
    const result = await extractPdf(pdf, profile);
    assert.equal(result.coverage.total, 3);
    assert.equal(result.coverage.analyzed, 2);
    assert.equal(result.pages[2].excluded, true);
    assert.equal(result.findings.filter(f => f.rule_id === 'HES-001').length, 1); // quotation excluded
    assert.equal(result.blocks[0].text.includes('Cabe destacar que'), true);
    assert.equal(finishJob(db, id, first.token, result), false);
    assert.equal(finishJob(db, id, second.token, result), true);
    const detail = await (await request(`/api/documents/${id}`)).json();
    const dossierResponse = await request(`/api/documents/${id}/export?format=findings`);
    assert.equal(dossierResponse.status, 200);
    assert.match(dossierResponse.headers.get('content-disposition'), /hallazgos-para-ia.json/);
    const dossier = await dossierResponse.json();
    assert.equal(dossier.format, 'humanizador.findings');
    assert.equal(dossier.counts.pending, result.findings.length);
    assert.equal(dossier.document.canonical_document_sha256, result.canonical_document_sha256);
    assert.ok(dossier.findings.every(f => f.context.some(c => c.block_id === f.block_id && c.text.includes(f.phrase))));
    const finding = result.findings.find(f => f.rule_id === 'HES-001');
    const change = { finding_id: finding.id, status: 'approved', replacement: 'La prueba confirma que', revision: detail.revision };
    const saved = await request(`/api/documents/${id}/decisions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(change) });
    assert.equal(saved.status, 200);
    assert.equal((await saved.json()).decisions.length, 1);
    assert.equal((await request(`/api/documents/${id}/decisions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(change) })).status, 409);
    const a = await (await request(`/api/documents/${id}/export?format=changes`)).text();
    const b = await (await request(`/api/documents/${id}/export?format=changes`)).text();
    assert.equal(a, b);
    assert.equal(JSON.parse(a).operations.length, 1);
    assert.ok(JSON.parse(a).unresolved_findings.length > 0);
    assert.match(await (await request(`/api/documents/${id}/export?format=text`)).text(), /La prueba confirma que/);
    const decidedDossier = await (await request(`/api/documents/${id}/export?format=findings`)).json();
    assert.equal(decidedDossier.counts.approved, 1);
    assert.equal(decidedDossier.findings.find(f => f.id === finding.id).decision.replacement, change.replacement);
    assert.equal((await request(`/api/documents/${id}/export?format=invalid`)).status, 400);
    assert.equal((await request(`/api/documents/${id}`, { method: 'DELETE' })).status, 200);
    assert.equal((await request(`/api/documents/${id}/pdf`)).status, 404);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM decisions').get().n, 0);
  } finally { await new Promise(resolve => server.close(resolve)); db.close(); }
});
test('private API rejects anonymous access, foreign origins, missing CSRF header and malformed files', async () => {
  const db = openDatabase(':memory:');
  const server = createApp(db, { maxUploadMb: 25, password: 'a-long-test-password', publicUrl: 'http://127.0.0.1:8787' });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const baseHeaders = { Host: '127.0.0.1:8787' };
  try {
    assert.equal((await fetch(base + '/api/documents', { headers: baseHeaders })).status, 401);
    assert.equal((await fetch(base + '/api/session', { method: 'POST', headers: baseHeaders, body: '{}' })).status, 403);
    assert.equal((await fetch(base + '/api/session', { method: 'POST', headers: { ...baseHeaders, 'x-humanizador-request': '1', Origin: 'https://evil.example' } })).status, 403);
    const login = await fetch(base + '/api/session', { method: 'POST', headers: { ...baseHeaders, 'x-humanizador-request': '1', 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'a-long-test-password' }) });
    assert.equal(login.status, 200);
    const cookie = login.headers.get('set-cookie').split(';')[0];
    assert.match(login.headers.get('set-cookie'), /HttpOnly; SameSite=Strict/);
    const headers = { ...baseHeaders, Cookie: cookie, 'x-humanizador-request': '1' };
    assert.equal((await fetch(base + '/api/documents', { headers })).status, 200);
    assert.equal((await fetch(base + '/api/documents', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/pdf' }, body: 'not a pdf' })).status, 400);
    assert.equal((await fetch(base + '/api/documents', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/pdf' }, body: Buffer.alloc(25 * 1024 * 1024 + 1) })).status, 413);
    assert.equal((await fetch(base + '/api/session', { method: 'DELETE', headers })).status, 200);
    assert.equal((await fetch(base + '/api/documents', { headers })).status, 401);
    assert.throws(() => createApp(db, { production: true, password: '', publicUrl: 'https://test.example' }), /Producción/);
  } finally { await new Promise(resolve => server.close(resolve)); db.close(); }
});
test('cancellation and recovery do not let a stale worker publish', () => {
  const db = openDatabase(':memory:');
  try {
    db.prepare('INSERT INTO documents(id,name,sha256,pdf,created_at,profile,status) VALUES(?,?,?,?,?,?,?)').run('doc','a.pdf',hash('pdf'),new Uint8Array([1]),'2026-01-01',canonical({}), 'queued');
    const job = claimJob(db, 1);
    db.prepare("UPDATE documents SET status='cancelled',claim_token=NULL WHERE id='doc'").run();
    assert.equal(finishJob(db, 'doc', job.token, {}), false);
    assert.equal(claimJob(db, 100000), null);
  } finally { db.close(); }
});
