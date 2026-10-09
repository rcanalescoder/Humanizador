// Editorial preferences contributed by the author; not empirical AI detectors.
export const editorialPrinciples = {
  version: 'roberto-2026-10-09.1',
  provenance: 'Criterios editoriales aportados por Roberto Canales Mora; generalización de su revisión manual, 2026-10-09.',
  scope: 'Preferencias editoriales de Roberto. No prueban autoría de IA ni permiten recuperar contenido ausente del original.',
  rules: [
    {id:'AUT-01',name:'Conservar quién habla y actúa',instruction:'Mantén el sujeto y destinatario que sostiene el contexto. No conviertas una experiencia en una norma impersonal ni cambies yo por tú automáticamente.'},
    {id:'AUT-02',name:'Conservar la escena completa',instruction:'Mantén situación, acción, reacción y consecuencia. No reduzcas una escena a su moraleja; si falta información, pregunta al autor en vez de inventarla.'},
    {id:'AUT-03',name:'Conservar postura y humor',instruction:'Respeta intensidad, provocación, humor y aforismos deliberados cuando el contexto los sostiene. No neutralices la postura por preferir un tono de manual.'},
    {id:'AUT-04',name:'Explicar relaciones',instruction:'Comprueba qué cambia entre la acción y el resultado. Señala un salto causal demostrable; no completes la relación con hechos inventados.'},
    {id:'AUT-05',name:'Conservar alcance y certeza',instruction:'Conserva hipótesis, condiciones, negaciones, cantidades, atribuciones y grados de certeza. Tampoco añadas salvedades repetidas que alteren la postura. Una nota del autor puede cambiarla, una propuesta de estilo no.'},
    {id:'AUT-06',name:'Precisar con evidencia',instruction:'Conserva detalles que permiten entender el ejemplo y referentes concretos. No inventes fechas, lugares, experiencias, citas o cifras para concretar una frase abstracta.'},
    {id:'AUT-07',name:'Leer con las frases vecinas',instruction:'Inserta mentalmente el cambio entre sus vecinos: debe mantener referente, progresión y sentido. Conserva puentes útiles; evita promesas al futuro y recapitulaciones que no ayudan. No elimines todos los conectores.'},
    {id:'AUT-08',name:'Revisar la expresión oral',instruction:'Revisa orden, concordancia, ritmo y referentes con palabras habituales. No acortes todo ni conviertas la voz oral del autor en prosa impersonal. Las notas pueden contener erratas; interpreta su intención.'},
  ],
};
export const editorialInstructions = `Preferencias del autor (sin inventar información ausente):
AUT-01: conserva sujeto y destinatario según el contexto, sin imponer primera persona.
AUT-02: conserva situación, acción, reacción y consecuencia; no reduzcas una escena a su moraleja.
AUT-03: respeta postura, humor y aforismos deliberados apoyados por el contexto.
AUT-04: comprueba el mecanismo causal; señala el salto sin inventar su explicación.
AUT-05: conserva condiciones, negaciones, cifras y certeza; no añadas salvedades que cambien la postura.
AUT-06: conserva detalles útiles y referentes; pide datos antes de inventar precisión.
AUT-07: lee el cambio entre sus vecinos; conserva puentes útiles y evita anuncios que no orientan.
AUT-08: revisa orden, ritmo y concordancia con palabras habituales; no acortes todo.`;

// A conservative, transparent screen, not a semantic equivalence test. It asks
// for manual drafting when a literal factual constraint disappears. Synonyms
// may trigger it; the diagnosis survives and the author can write a replacement.
export function replacementSafeguards(source, replacement) {
  if (replacement === null || replacement === undefined) return [];
  const normal = s=>s.normalize('NFC').toLocaleLowerCase('es-ES');
  const a=normal(source),b=normal(replacement),warnings=[];
  const numbers=s=>[...s.matchAll(/\d+(?:[.,]\d+)*/gu)].map(m=>m[0]);
  const old=numbers(a),next=numbers(b);
  if(old.length!==next.length||old.some((n,i)=>n!==next[i]))warnings.push({code:'quantities',principle:'AUT-05',message:'Cambian las cifras literales. Hace falta comprobar su equivalencia con el original.'});
  const has=(s,re)=>re.test(s);
  if(has(a,/\b(?:no|nunca|jamás|tampoco|sin)\b/u)&&!has(b,/\b(?:no|nunca|jamás|tampoco|sin)\b/u))warnings.push({code:'negation',principle:'AUT-05',message:'Desaparece una negación explícita. Revisa qué se afirma antes de redactar la sustitución.'});
  if(has(a,/(?<!\p{L})(?:puede|podría|podemos|podrían|posiblemente|quizá|quizás|tal vez|en mi caso)(?!\p{L})/u)&&!has(b,/(?<!\p{L})(?:puede|podría|podemos|podrían|posiblemente|quizá|quizás|tal vez|en mi caso|es posible|cabe la posibilidad)(?!\p{L})/u))warnings.push({code:'certainty',principle:'AUT-05',message:'No se conserva una señal explícita de posibilidad o experiencia particular.'});
  if(has(a,/\b(?:si|siempre que|a menos que)\b/u)&&!has(b,/\b(?:si|siempre que|a menos que|en caso de|cuando)\b/u))warnings.push({code:'condition',principle:'AUT-05',message:'Desaparece una condición explícita. Comprueba su alcance antes de sustituir.'});
  return warnings;
}
