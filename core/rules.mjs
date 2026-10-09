import { readFileSync } from 'node:fs';
import { hash, canonical } from './changes.mjs';
import { structuralIds, supplementalIds, searchView, patternMatches, patternVersion } from './patterns.mjs';

const research = JSON.parse(readFileSync(new URL('../rules/es-ES/inicial.json', import.meta.url), 'utf8'));
const extension = JSON.parse(readFileSync(new URL('../rules/es-ES/ampliacion.json', import.meta.url), 'utf8'));
const claude = JSON.parse(readFileSync(new URL('../rules/es-ES/claude-2026.json', import.meta.url), 'utf8'));
// Literal and structural candidates. Their editorial pertinence remains a human decision.
const activeIds = ['HES-001', 'HES-002', 'HES-003', 'HES-004', 'HES-005', 'HES-006',
  'HES-007', 'HES-008', 'HES-009', 'HES-010', 'HES-021', 'HES-027', 'HES-036',
  ...claude.rules.filter(r => r.detector.type === 'literal').map(r => r.id)];
const hints = {
  'HES-001': ['Eliminar el anuncio si la frase siguiente se entiende sin él.', ''],
  'HES-002': ['Acortar el cierre si solo repite lo ya explicado.', ''],
  'HES-003': ['Conservar la reformulación si aclara; quitarla si solo repite.', null],
  'HES-004': ['Sustituir la invitación por el asunto concreto del apartado.', null],
  'HES-005': ['Quitar el marco genérico si no interviene en el argumento.', null],
  'HES-006': ['Explicar la acción o el resultado con información del texto.', null],
  'HES-007': ['Conservar la necesidad real o explicar su consecuencia.', null],
  'HES-008': ['Mantener la referencia temporal si limita la afirmación.', null],
  'HES-009': ['Si el uso es figurado, probar «a fin de cuentas».', 'a fin de cuentas'],
  'HES-010': ['Expresar la relación concreta que sostiene el contexto.', null],
  'HES-021': ['Conservar un solo marcador sin aumentar la certeza.', null],
  'HES-027': ['Conservar la referencia si ayuda a orientarse en la obra.', null],
  'HES-036': ['Revisar si esta frase del asistente pertenece al documento.', null],
};
export const rules = [...research.rules, ...extension.rules, ...claude.rules].map(r => ({ ...r, version: (activeIds.includes(r.id) || structuralIds.includes(r.id)) && !r.source_ids.includes('CL26') ? patternVersion : r.version, name: r.id === 'HES-013' ? 'Contraste para revisar en contexto' : r.id === 'HES-012' ? 'Fórmula de autoridad para comprobar' : r.name,
  detector: {...r.detector, status: (activeIds.includes(r.id) || structuralIds.includes(r.id)) ? 'implemented_candidate' : 'specification_not_implemented'},
  implemented: (activeIds.includes(r.id) || structuralIds.includes(r.id)),
  enabled_by_default: (activeIds.includes(r.id) || structuralIds.includes(r.id)), implementation_status: (activeIds.includes(r.id) || structuralIds.includes(r.id)) ? (structuralIds.includes(r.id) ? 'structural_candidate' : supplementalIds.includes(r.id) ? 'hybrid_candidate' : 'literal_candidate') : 'research_only',
  validation_status: r.validation.corpus_evaluated ? 'evaluated' : 'experimental',
  advice: hints[r.id]?.[0] ?? r.proposal.guidance }));
export const sources = [...research.sources, ...extension.sources, ...claude.sources];
export const semanticRules = claude.rules.filter(r => r.detector.type === 'local_editorial');
export const activeRules = rules.filter(r => r.implemented);
export const ruleSnapshot = activeRules.map(r => ({ id: r.id, version: r.version, phrases: r.detector.phrases,
  implementation_status: r.implementation_status, pattern_version: patternVersion, severity: r.severity, advice: r.advice, exceptions: r.exceptions }));
export const ruleHash = hash(canonical(ruleSnapshot));

function quoteRanges(text) {
  // Respect paired quotations, including curly and Spanish quotation marks.
  const ranges = [];
  for (const re of [/«[^»]*»/gu, /“[^”]*”/gu, /"[^"\n]*"/gu, /`[^`\n]*`/gu]) {
    for (const m of text.matchAll(re)) ranges.push([m.index, m.index + m[0].length]);
  }
  return ranges;
}
const wordCharacter = /[\p{L}\p{N}_]/u;
export function analyzeBlocks(blocks, profile) {
  const enabled = new Set(profile.rule_ids ?? activeRules.map(r => r.id));
  const findings = [];
  for (const block of blocks) {
    if (block.excluded || block.protected) continue;
    const view = searchView(block.text);
    const quotes = quoteRanges(view.text);
    for (const rule of activeRules) {
      if (!enabled.has(rule.id)) continue;
      const matches = structuralIds.includes(rule.id) ? patternMatches(view.text, rule.id, profile) : rule.detector.phrases.flatMap(phrase => {
        const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ +/g, '\\s+');
        return [...view.text.matchAll(new RegExp(escaped, 'giu'))].map(m => ({index:m.index,length:m[0].length,evidence:'Coincidencia literal; pertinencia pendiente de revisión.'}));
      });
      if (supplementalIds.includes(rule.id)) matches.push(...patternMatches(view.text, rule.id, profile));
      for (const m of matches) {
        const a=m.index,z=a+m.length;
        if (!structuralIds.includes(rule.id) && (wordCharacter.test(view.text[a-1] ?? '') || wordCharacter.test(view.text[z] ?? ''))) continue;
        if (quotes.some(([s,e])=>s<=a && z<=e)) continue;
        const start=view.starts[a],end=view.ends[z-1];
        if (m.paragraphStartOnly && !/(?:^|\n[ \t]*\n)[ \t]*$/u.test([...block.text].slice(0,start).join(''))) continue;
        const phrase=[...block.text].slice(start,end).join('');
        // Do not join separate source paragraphs into a rhythm warning.
        if (['HES-016','HES-020'].includes(rule.id) && /\n[ \t]*\n/u.test(phrase)) continue;
        const key={block_id:block.id,block_sha256:block.sha256,rule_id:rule.id,rule_version:rule.version,start,end};
        let replacement=hints[rule.id]?.[1] ?? null;
        if (replacement && /^\p{Lu}/u.test(phrase)) replacement=replacement[0].toUpperCase()+replacement.slice(1);
        findings.push({...key,id:hash(canonical(key)),page:block.page,phrase,rule_name:rule.name,severity:rule.severity,
          family:rule.family,explanation:rule.advice,exception:rule.exceptions,replacement,status:'pending',evidence:m.evidence});
      }
    }
  }
  return findings.sort((a, b) => a.page - b.page || blocks.findIndex(x => x.id === a.block_id) - blocks.findIndex(x => x.id === b.block_id)
    || a.start - b.start || a.id.localeCompare(b.id, 'en'));
}
