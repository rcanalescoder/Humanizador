// A small original PDF, generated locally: no document or service is downloaded.
export function examplePdf({ emptyPage = false, rotation = 0, diagram = false } = {}) {
  const objects = [];
  const add = text => { objects.push(text); return objects.length; };
  add('<< /Type /Catalog /Pages 2 0 R >>');
  add('');
  const font = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const textPages = [
    [
      ['Humanizador: documento de ejemplo', 20, 740],
      ['Un ensayo breve para probar la revisión editorial', 12, 711],
      ['Cabe destacar que el servidor guarda los documentos en privado.', 12, 653],
      ['El análisis sigue trabajando aunque cierres la pestaña del navegador.', 12, 628],
      ['En el mundo actual, es crucial revisar todos los resultados.', 12, 582],
      ['El autor puede aprobar una corrección o conservar la frase original.', 12, 557],
      ['Dicho de otro modo, el autor decide qué cambios se aplican.', 12, 532],
      ['Al final del día, la decisión depende del contexto de cada pasaje.', 12, 486],
      ['En definitiva, el fichero exportado contiene operaciones concretas.', 12, 461],
      ['La página siguiente muestra usos que conviene conservar.', 12, 394],
    ],
    [
      ['El contexto cambia la lectura', 20, 740],
      ['Una expresión marcada puede ser correcta y necesaria.', 12, 690],
      ['La cita «Cabe destacar que» describe una muletilla y se conserva.', 12, 645],
      ['Esta herramienta no decide quién escribió un documento.', 12, 610],
      ['Los cambios solo se exportan después de aprobar cada ocurrencia.', 12, 575],
      ['La primera versión trabaja con PDF que tenga texto seleccionable.', 12, 540],
    ],
  ];
  if (emptyPage) textPages.push([]);
  const pages = [];
  const escape = s => s.replace(/[\\()]/g, '\\$&');
  for (const lines of textPages) {
    const stream = lines.map(([str, size, y]) => `BT /F1 ${size} Tf 50 ${y} Td (${escape(str)}) Tj ET`).join('\n') +
      (diagram && pages.length === 0 ? '\nq 0.9 0.94 1 rg 50 255 160 65 re f 350 255 160 65 re f 0.2 0.3 0.7 RG 2 w 210 287 m 345 287 l S 333 280 m 345 287 l 333 294 l S Q\nBT /F1 14 Tf 70 282 Td (Entrada) Tj ET\nBT /F1 14 Tf 370 282 Td (Salida) Tj ET' : '');
    const content = add(`<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`);
    pages.push(add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Rotate ${rotation} /Resources << /Font << /F1 ${font} 0 R >> >> /Contents ${content} 0 R >>`));
  }
  objects[1] = `<< /Type /Pages /Kids [${pages.map(p => `${p} 0 R`).join(' ')}] /Count ${pages.length} >>`;
  let out = '%PDF-1.4\n', offsets = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(out, 'latin1')); out += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const start = Buffer.byteLength(out, 'latin1');
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(n => `${String(n).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
}
