# Edición del PDF

El modo «Edición del PDF» permite leer el original y guardar indicaciones propias, aunque el análisis automático esté pendiente, cancelado o haya fallado. No utiliza Ollama ni modifica los bytes del documento. «Hallazgos» presenta las propuestas automáticas en una tabla compacta; al abrir una fila se mantienen el contexto, la explicación y la decisión editorial.

## Uso

1. Abrir un documento y entrar en «Edición del PDF» desde el menú o el resumen.
2. Seleccionar texto y pulsar el botón derecho o «Añadir nota a la selección». Para una imagen, activar «Marcar zona / infografía» y arrastrar un rectángulo. El botón derecho sin selección permite marcar una zona o anotar la página completa.
3. Escribir la indicación y pulsar «Guardar nota» (Ctrl o ⌘ + Enter). Cada nota guardada aparece en la tabla y señala su zona en el PDF. Se puede buscar, editar, resolver, reabrir o eliminar con confirmación.
4. Pulsar «Exportar edición para IA». Se descarga un JSON con todas las notas, incluidas las resueltas. No depende del filtro de la tabla. No se envía automáticamente a ningún proveedor.

Las notas se guardan en el servidor al confirmar el diálogo; una nota todavía sin guardar no se conserva al cerrar o recargar. La selección de texto requiere una capa de texto en el PDF. «Marcar zona» funciona también con imágenes y páginas sin texto seleccionable, sin OCR. El visor muestra una página cada vez y permite cambiar página y zoom.

## Referencias y exportación

`humanizador.pdf-edition` 1.0 identifica el documento por su SHA-256. Cada nota conserva su id, página física (desde 1), etiqueta interna si existe, rotación, unidad y caja de página. `rects` contiene `[xMin,yMin,xMax,yMax]` en coordenadas nativas del PDF antes de rotación. Son independientes del tamaño de pantalla y del zoom.

Una selección de texto añade cita literal del texto extraído, offsets en puntos de código Unicode (fin exclusivo), hash del bloque y hasta 500 caracteres de contexto por lado. `core/pdf-text.mjs` comparte la extracción entre servidor y visor: NFC, separadores por elemento y sin unir palabras partidas. El servidor vuelve a extraer la página seleccionada y rechaza citas, offsets, páginas o áreas inválidas. En documentos con columnas o una capa de texto defectuosa conviene marcar una zona y explicar el problema.

La imagen de cada selección se exporta en `image.data_base64`, con tipo PNG, dimensiones y SHA-256. La IA receptora puede decodificarla para ver una infografía. Es un recorte del lienzo del navegador, de hasta 1600 píxeles por lado; no sustituye el PDF original ni aporta el manuscrito editable. Para cambiar el libro en origen hay que facilitar también sus archivos de trabajo. Las instrucciones del JSON piden devolver propuestas por id y conservar voz, significado y condiciones.

Si hay un análisis terminado, `automatic_review` añade su dossier de hallazgos. Si no lo hay, vale `null`: la exportación manual sigue disponible. «Exportar hallazgos para IA» conserva el formato 1.0 cuando no hay notas; cuando las hay usa 1.1 y añade `manual_edition`. Los JSON de notas son indicaciones para revisar. La exportación de operaciones aprobadas mantiene su contrato de hashes y precondiciones.

## Persistencia y comprobación

La tabla `annotations` pertenece al documento y sobrevive a un reprocesado. Cada nota tiene versión para rechazar ediciones simultáneas obsoletas. Mover el documento conserva las notas; borrar el documento o proyecto las elimina con sus recortes. Las copias SQLite incluyen las anotaciones. El listado devuelve metadatos y las imágenes se cargan por una ruta autenticada, sin reenviarlas en cada consulta de progreso.

Límites: 2000 notas por documento, 5000 caracteres por indicación, 12.000 puntos de código y 100 rectángulos por selección de texto, 2 MiB por PNG. Los recortes se comprueban como PNG con dimensiones limitadas y se identifican como capturas del navegador; no son una reconstrucción independiente hecha por el servidor.

Para repetir una prueba sin tocar datos reales: ejecutar `npm run build` y `node tools/preview-edition.mjs`; abrir `http://127.0.0.1:8788/`. El ejemplo tiene texto y un diagrama sintético. Su base está en memoria: al detenerlo desaparecen las notas de prueba. Comprobar texto, zona, zoom, recarga, tabla y exportación; contrastar los hashes y los recortes exportados. `test/annotations.test.mjs` cubre el contrato de persistencia, anclajes, Unicode, rotación, conflictos y exportación.

El servidor debe servir `.mjs` con MIME `text/javascript`. El visor usa una dirección de worker con versión de caché para evitar respuestas antiguas almacenadas con un MIME incorrecto. Una advertencia «Setting up fake worker» acompañada de un fallo de importación exige comprobar ese recurso, antes de atribuir el error al PDF. No desactivar CSP ni `nosniff` para resolverlo.
