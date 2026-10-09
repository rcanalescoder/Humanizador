# Cómo incorporar conocimiento editorial

Humanizador debe acumular criterios contrastados, ejemplos y límites. Una lista de expresiones sospechosas no basta: una misma forma puede ser una redundancia, una explicación necesaria o una decisión de voz. Tampoco el número de propuestas de una IA demuestra la calidad de su revisión.

## De un hallazgo a una regla

En **Hallazgos → Exportar hallazgos para IA** se descarga un JSON legible con todas las coincidencias del análisis, fragmentos y contexto limitado, reglas de aquella ejecución, procedencia y decisiones del autor. El mismo botón está en **Cambios**. Se puede adjuntar a la IA que el autor elija. No se envía automáticamente a ningún servicio. Las propuestas descartadas por el motor no están incluidas; para investigar esos descartes se necesita la traza privada del análisis. El paquete no sustituye la lectura del documento completo.

Una observación nueva empieza como hipótesis. Registrar el pasaje exacto, la explicación, la fuente, la fecha, el género y la función que se está cuestionando. La salida de otro modelo es una aportación; su nombre no convierte la observación en un error confirmado. Las fuentes normativas, las recomendaciones editoriales y las preferencias personales deben conservar esa distinción.

Antes de ampliar el catálogo, comprobar si una ficha existente explica el caso. Si es así, mejorar su alcance o sus excepciones sin duplicarla. Si no, redactar un criterio que explique el perjuicio para el lector: qué resulta confuso, qué proposición se repite o qué conexión no se sostiene. Añadir un ejemplo problemático y otro cercano que convenga conservar. En textos del autor, su decisión puede resolver una preferencia; en afirmaciones normativas, hace falta contrastar la fuente pertinente.

Cada cambio necesita casos con contexto y una valoración independiente: **problema**, **conservar** o **dudoso**. Fijar esas etiquetas antes de mirar la respuesta del candidato. Los dudosos no cuentan como errores que el detector deba encontrar. Revisar por separado el diagnóstico y la sustitución; detectar bien no autoriza una reescritura infiel.

## Comprobar que generaliza

`evaluation/es-ES/editorial-cases.json` contiene diez casos sintéticos sin material del libro: cuatro problemas y seis controles, etiquetados antes de su primera evaluación local. Cubren cadenas nominales, causalidad, repetición, tratamiento, transiciones, humor, condiciones y contrastes. Son una muestra pequeña de regresión, no una medida de precisión general. Una vez utilizados para ajustar el sistema, dejan de ser casos desconocidos: incorporar otros documentos y autores antes de afirmar que la mejora generaliza.

`evaluation/es-ES/fidelity-regressions.json` guarda tres pares reducidos para investigar falsos rechazos de sustituciones y el contraejemplo que debe seguir rechazándose. Son casos para una evaluación específica pendiente; no se presentan como una batería semántica superada ni usan el formato del ejecutor general.

La evaluación usa el mismo motor de la aplicación y conserva las respuestas iniciales, los descartes y el resultado final. Las etiquetas no entran en el prompt. Ejecutar con Ollama disponible y una ruta de salida nueva:

```sh
mkdir -p evaluation/intermedios
npm run eval:local -- evaluation/es-ES/editorial-cases.json evaluation/intermedios/candidato-01.json
```

Comparar versiones sobre la misma muestra, digest de modelo y parámetros. Revisar **todos** los hallazgos, incluidos los que caen fuera de la expresión previamente marcada. Medir problemas encontrados, omisiones, falsos positivos en los controles y fidelidad de las sustituciones; registrar tiempo y tokens por separado. Un acierto por coincidencia de posición no acredita un diagnóstico correcto: leer la explicación. No sumar varios avisos sobre el mismo problema como varios aciertos.

Promover un cambio solo después de contrastarlo con su versión anterior y revisar las regresiones. Conservar también los intentos fallidos y las razones para rechazarlos. Los casos del libro, extracciones, trazas y decisiones son privados. Las cifras y decisiones valiosas se conservan en un archivo privado permanente, fuera de Git. Solo las evidencias anónimas o sintéticas se publican en `docs/`. El catálogo compartible contiene criterios, fuentes y ejemplos sintéticos; no necesita incorporar el manuscrito.

## Límites del aprendizaje actual

Las decisiones guardadas y sus notas permiten acumular evidencia, pero todavía no entrenan el modelo ni modifican automáticamente las reglas. La incorporación al catálogo y la valoración del corpus son revisiones explícitas. No hay rastreo automático de Internet, importador de respuestas externas ni validación general de los doce criterios locales.

Si el modelo local sigue fallando en un criterio después de reducir el caso y aclarar sus límites, registrar la limitación. Puede faltar contexto, ser necesario un detector específico o superar la capacidad del modelo. Añadir más instrucciones no garantiza resolverlo. El sistema sigue siendo útil si hace trabajo repetible, conserva decisiones y demuestra qué puede detectar; su calidad se juzga por esa evidencia y por el trabajo editorial que ahorra.
