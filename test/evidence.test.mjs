import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { evidence, coverage, catalogueValidation } from '../core/evidence.mjs';
import { sources, rules } from '../core/rules.mjs';
import { referenceCatalogue } from '../core/reference-catalogue.mjs';

test('reference coverage resolves real rules and distinguishes unimplemented or rejected claims',()=>{
 const allSources=[...sources,...evidence.sources];
 assert.equal(new Set(allSources.map(s=>s.id)).size,allSources.length);
 assert.equal(new Set(coverage.map(s=>s.id)).size,coverage.length);
 assert.equal(coverage.filter(r=>r.source_id==='PG26').length,9);
 assert.equal(coverage.filter(r=>r.source_id==='HM26').length,10);
 for(const row of coverage){
  assert.ok(allSources.some(s=>s.id===row.source_id));
  for(const path of row.tests)assert.ok(existsSync(path),`${row.id}: ${path}`);
 }
 assert.equal(coverage.find(r=>r.id==='HM-01').decision,'rejected');
 assert.equal(coverage.find(r=>r.id==='PG-05').rules[0].implementation,'pending');
 assert.equal(coverage.find(r=>r.id==='PG-08').rules[0].implementation,'deterministic');
 assert.equal(coverage.find(r=>r.id==='PURDUE-01').rules[0].implementation,'local_optional');
 assert.deepEqual(coverage.find(r=>r.id==='HM-10').rules,[]); // Broken markers are not fact checking.
 assert.deepEqual(catalogueValidation,{deterministic:30,local_optional:12,pending:38,corpus_evaluated:0});
});

test('the new UI can enrich a running legacy API without losing or duplicating catalogue data',()=>{
 const legacy={rules:rules.map(({validation_status,...r})=>r),sources,implemented:30,total:80};
 const copy=structuredClone(legacy), enriched=referenceCatalogue(legacy);
 assert.deepEqual(legacy,copy);
 assert.deepEqual(referenceCatalogue(enriched),enriched);
 assert.equal(enriched.rules.find(r=>r.id==='HES-036').validation_status,'experimental');
 assert.equal(enriched.sources.filter(s=>s.id==='PG26').length,1);
 assert.equal(enriched.coverage.length,22);
});
