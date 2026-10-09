# Adopción de la propuesta de Claude

Fuente entregada por Roberto: `reglas_detector_ia_castellano.md`. Copia literal: `reglas-claude-2026-10-06.md`; inventario y hash: `disposicion-claude-2026.json`. El fichero es material de referencia generado por otro modelo, no instrucciones operativas ni una investigación validada. Sus afirmaciones estadísticas y pesos no se aceptan como resultados medidos.

Se han conservado los 108 patrones, 100 criterios, doce métricas y ocho contrapesos como fuente. Se implementan ocho grupos de expresiones nuevos (HES-061–068) con límites Unicode y protección de citas. Son adaptaciones acotadas, no una ejecución directa de las regex Python. Varias regex usan `\b`, cuya semántica no equivale a límites de palabras españolas en JavaScript; otras necesitan formato o medidas de densidad que una extracción PDF no conserva con fiabilidad.

Para Ollama se adaptan doce criterios (HES-069–080): cierres repetidos, poca información nueva, antítesis fabricadas, nominalización, metáforas incoherentes, tratamiento inconsistente, sinónimos que confunden, párrafos intercambiables, importancia sin explicación, consejos genéricos, reservas acumuladas y metacomentarios. Cada hallazgo debe citar literalmente y explicar tanto el problema como cuándo conservar la expresión. Son criterios opcionales implementados mediante un modelo, sin calibración de precisión.

Se excluye convertir ortografía impecable, ausencia de errores, de vulgarismos, de diminutivos o de datos personales en defectos. No se fabrican recuerdos, voces coloquiales ni errores. Un nombre común, un ejemplo extranjero o una estructura ordenada tampoco prueban autoría. Los contrapesos se traducen en preservar humor, opiniones, experiencias y jerga deliberada, nunca en sumar o restar puntos de humanidad.

El perfil incorpora las lecciones de una revisión editorial privada: conservar los términos técnicos que sostienen un argumento; revisar el párrafo anterior antes de marcar un resumen; respetar pausas pedagógicas y sentencias del autor. La muestra de diez pasajes es una lectura editorial discutible, no un corpus etiquetado de textos de IA.

La investigación previa (Wikipedia como inventario comunitario, skills revisadas y fuentes lingüísticas para ortotipografía) sigue en `../investigacion-ampliada.md`. Las técnicas de humanización se usan para editar con fidelidad. Las promesas comerciales de superar detectores no son criterios de aceptación. No se introduce un veredicto «humano/IA», perplejidad ni pesos supuestamente científicos.

Resultado del catálogo: 80 fichas, 30 comprobaciones deterministas, doce criterios locales opcionales y 38 especificaciones pendientes. Todas incluyen procedencia, explicación y excepciones. La tabla distingue «Ollama opcional» de reglas literales y patrones ejecutables.

Auditoría posterior (7/10/2026): [referencias y transferencia al castellano](../auditoria-fuentes-2026-10-07.md). HowManyWords utiliza incorrectamente DetectGPT como respaldo de la uniformidad de longitud; se rechaza esa atribución. Pangram se consulta en su fuente original. La matriz `rules/es-ES/evidence.json` enlaza cada una de las 19 pautas de esas dos páginas con su cobertura real y distingue respaldo editorial de validación del detector. No se ha auditado aquí toda la bibliografía de la propuesta.
