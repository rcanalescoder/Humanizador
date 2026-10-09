// Local, private evaluation. Never writes documents, decisions or the live database.
// node tools/editorial-audit.mjs sample.json output.json [review-module.mjs] [reuse.json]
import { readFile, writeFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { hash, canonical } from '../core/changes.mjs';
import { analyzeBlocks, ruleHash, activeRules } from '../core/rules.mjs';

const [samplePath, outputPath, modulePath = 'server/ollama.mjs', reusePath] = process.argv.slice(2);
if (!samplePath || !outputPath) throw Error('Indica muestra y salida privadas.');
try { await access(outputPath); throw Error('La salida ya existe; usa otro nombre para conservar la evidencia.'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const sampleBytes = await readFile(samplePath);
const sample = JSON.parse(sampleBytes);
const reviewer = await import(pathToFileURL(resolve(modulePath)));
const model = await reviewer.modelStatus();
if (!model.ready) throw Error(model.message);
const report = { date: new Date().toISOString(), sample_sha256: hash(sampleBytes),
  source_pdf_sha256: sample.source_pdf_sha256, model, module_sha256: hash(await readFile(modulePath)),
  rule_hash: ruleHash, rule_count: activeRules.length, reused_replies: 0, live_requests: 0,
  samples: [], status: 'running' };
const reusable = new Map();
if (reusePath) {
  const bytes = await readFile(reusePath), previous = JSON.parse(bytes);
  assert.equal(previous.status, 'completed');
  assert.equal(previous.sample_sha256, report.sample_sha256);
  assert.equal(previous.model.digest, model.digest); assert.equal(previous.model.model, model.model);
  report.reuse_source_sha256 = hash(bytes); report.reuse_source = reusePath;
  for (const s of previous.samples) for (const e of s.exchanges) {
    reusable.set(hash(canonical(e.request)), e.response);
  }
}
const nativeFetch = globalThis.fetch;
let exchanges;
// Capture requests and raw responses before any filtering, including baseline
// versions that only stored a count of rejected proposals.
globalThis.fetch = async (url, options) => {
  if (new URL(url).pathname === '/api/chat') {
    const request = JSON.parse(options.body), previous = reusable.get(hash(canonical(request)));
    if (previous) {
      // Reuse only a byte-equivalent logical request with the frozen digest.
      // Preserve the response content, but do not count old inference as new work.
      const response = { ...structuredClone(previous), total_duration: 0, load_duration: 0,
        prompt_eval_count: 0, prompt_eval_cached_count: 0, prompt_eval_duration: 0,
        eval_count: 0, eval_duration: 0 };
      exchanges.push({ request, response, reused: true }); report.reused_replies++;
      return new Response(JSON.stringify(response), { headers: { 'Content-Type': 'application/json' } });
    }
    report.live_requests++;
  }
  const response = await nativeFetch(url, options);
  if (new URL(url).pathname === '/api/chat') exchanges.push({
    request: JSON.parse(options.body), response: await response.clone().json(),
  });
  return response;
};
try {
  for (const item of sample.samples) {
    const blocks = structuredClone(item.blocks);
    for (const block of blocks) assert.equal(hash(block.text), block.sha256);
    const target = blocks.find(b => b.id === item.target_block_id);
    for (const c of sample.cases.filter(c => item.case_ids.includes(c.id))) {
      assert.equal(c.block_sha256, target.sha256);
      assert.equal([...target.text].slice(c.start, c.end).join(''), c.quote);
    }
    exchanges = [];
    const deterministic = analyzeBlocks([target], { genre: 'Ensayo' });
    const start = Date.now();
    const result = await reviewer.reviewLocal({ blocks, findings: structuredClone(deterministic), analysis: {} },
      { genre: 'Ensayo', local_model: { model: model.model, digest: model.digest } });
    for (const f of result.findings) {
      assert.equal(f.block_sha256, target.sha256);
      assert.equal([...target.text].slice(f.start, f.end).join(''), f.phrase);
      assert.equal(f.status, 'pending');
    }
    const stages = [];
    const chunks = reviewer.reviewChunks(blocks);
    let chunkIndex = 0;
    for (let i = 0; i < exchanges.length; i++) {
      const exchange = exchanges[i];
      if (!exchange.request.format.properties.findings) continue;
      const chunk = chunks[chunkIndex++];
      const initial = JSON.parse(exchange.response.message.content).findings;
      const next = exchanges[i + 1];
      const critique = next && !next.request.format.properties.findings
        ? JSON.parse(next.response.message.content) : null;
      stages.push({ start: chunk.start, end: chunk.end,
        input_sha256: hash(exchange.request.messages[1].content), initial,
        mechanical: initial.map((candidate, index) => {
          const checked = reviewer.validateSuggestions({ findings: [candidate] }, chunk,
            { model: model.model, digest: model.digest });
          return { index, rejected: checked.rejected,
            findings: checked.findings.map(({ block_id, block_sha256, start, end, phrase, rule_id }) =>
              ({ block_id, block_sha256, start, end, phrase, rule_id })),
            entries: checked.entries?.map(({ finding, ...entry }) => entry) ?? [] };
        }), critique });
    }
    const entry = { id: item.id, elapsed_ms: Date.now() - start, deterministic, stages,
      final: result.findings, analysis: result.analysis.local_review, exchanges };
    report.samples.push(entry);
    await writeFile(outputPath, JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
    console.log(JSON.stringify({ sample: item.id, initial: stages.reduce((n,s) => n+s.initial.length,0),
      final_local: result.findings.filter(f => f.origin === 'ollama').length,
      rejected: entry.analysis.rejected_suggestions, elapsed_ms: entry.elapsed_ms }));
  }
  report.status = 'completed';
} catch (error) {
  report.status = 'failed'; report.error = error.message; report.failed_exchanges = exchanges;
  throw error;
} finally {
  globalThis.fetch = nativeFetch;
  await writeFile(outputPath, JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
}
