// Heurísticas editoriales españolas. No clasifican autoría ni generan correcciones.
const segmenter = new Intl.Segmenter('es-ES', { granularity: 'sentence' });
const words = text => text.match(/[\p{L}\p{N}]+/gu) || [];
export const structuralIds = ['HES-011','HES-012','HES-013','HES-016','HES-020','HES-045','HES-046','HES-059','HES-060'];
export const supplementalIds = ['HES-036'];
export const patternVersion = '0.3.1';
export function searchView(original) {
  const cp = [...original], starts = [], ends = []; let text = '';
  for (let i = 0; i < cp.length; i++) {
    // Map layout word breaks to the immutable source; never apply this to its text.
    if (cp[i] === '-' && /\p{L}/u.test(cp[i-1] || '')) {
      const m = cp.slice(i+1,i+12).join('').match(/^[ \t]*\n[ \t]*(?=\p{Ll})/u);
      if (m) { i += [...m[0]].length; continue; }
    }
    const c = /\s/u.test(cp[i]) ? ' ' : cp[i];
    for (let j = 0; j < c.length; j++) { starts.push(i); ends.push(i+1); }
    text += c;
  }
  return { text, starts, ends };
}
const expressions = {
  'HES-011': /\b(?:llevar\s+a\s+cabo\s+la\s+(?:implementación|evaluación|revisión)|realizar\s+la\s+(?:implementación|evaluación)|proceder\s+a\s+la\s+(?:revisión|evaluación))\b/giu,
  'HES-012': /\b(?:los expertos afirman|según diversos estudios|la ciencia demuestra)\b/giu,
  // A syntactic contrast is a review candidate, including deliberate and useful contrasts.
  'HES-013': /\bno\s+(?:es|se\s+trata\s+de)\s+[^.!?;]{2,100}?(?:,?\s+sino\s+(?:que\s+)?|[.:]\s+es\s+)[^.!?;]{2,100}/giu,
  'HES-045': /\[(?:TU NOMBRE|NOMBRE DEL AUTOR|INSERTAR [^\]\n]{1,60}|AÑADIR [^\]\n]{1,60})\]/gu,
  'HES-046': /(?:contentReference\[oaicite:\d+\](?:\{index=\d+\})?|cite[^]{1,120})/gu,
  'HES-059': /(?<=\p{L})\.{4,}(?=\s+\p{L})/gu,
  'HES-060': /<\/?(?:think|analysis)>/giu,
};
export function patternMatches(text, id, profile) {
  if (id === 'HES-036') {
    // Adapt the conversational structure, not Pangram's English frequencies.
    // Letters and emails may legitimately start this way. Dialogue is excluded
    // by genre and the caller checks source paragraph boundaries and quotations.
    if (!['Ensayo', 'Explicación técnica'].includes(profile.genre)) return [];
    const opener = /(?:¡?claro[!,.]|¡?por supuesto[!,.])\s+aqu[ií]\s+tienes\s+(?:un(?:a)?|el|la)\s+(?:(?:breve|nuevo|nueva)\s+)?(?:resumen|versión|análisis|explicación|traducción|propuesta|lista|texto)(?![\p{L}\p{N}_])/giu;
    return [...text.matchAll(opener)].map(m => ({ index: m.index, length: m[0].length, paragraphStartOnly: true,
      evidence: 'Apertura conversacional al principio de un párrafo. Comprobar si pertenece a una respuesta, carta o ejemplo deliberado; no prueba autoría.' }));
  }
  if (expressions[id]) return [...text.matchAll(expressions[id])].map(m => ({ index:m.index,length:m[0].length,evidence:'Patrón de forma; comprobar su función en el contexto. No implica autoría de IA.' }));
  if (!['HES-016','HES-020'].includes(id) || profile.genre === 'Narrativa') return [];
  const sentences = [...segmenter.segment(text)].map(s => {
    const leading = s.segment.length - s.segment.trimStart().length;
    const body = s.segment.trim();
    return { index:s.index+leading,length:body.length,body,w:words(body) };
  });
  const n = id === 'HES-016' ? 3 : 4, found = []; let lastEnd = -1;
  for (let i=0;i<=sentences.length-n;i++) {
    const win = sentences.slice(i,i+n);
    if (win.some(s => !/[.!?]$/u.test(s.body) || s.w.length < 2 || /\[\d+\]/u.test(s.body) || /^[\d•—―]/u.test(s.body))) continue;
    const good = id === 'HES-016' ? win.every(s => s.w.slice(0,2).join(' ').toLocaleLowerCase('es-ES') === win[0].w.slice(0,2).join(' ').toLocaleLowerCase('es-ES'))
      : win.every(s => s.w.length<=6);
    const end = win.at(-1).index+win.at(-1).length;
    if (good && win[0].index >= lastEnd) { found.push({index:win[0].index,length:end-win[0].index,evidence:`Ventana de ${n} oraciones; umbral editorial provisional. Conservar anáforas, énfasis y ritmo deliberados.`});lastEnd=end; }
  }
  return found;
}
