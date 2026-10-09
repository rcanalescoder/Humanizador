# Auditoría de referencias y transferencia al castellano

La integración fue incompleta. Había investigación útil y parte se convirtió en comprobaciones, pero no se cerró la cadena entre afirmación de una fuente, adaptación, implementación y evaluación editorial. La bibliografía de la propuesta de Claude no demuestra que sus 108 regex sean válidas ni que estén ejecutándose.

## Errores comprobados

1. **Una cita incorrecta.** [HowManyWords](https://howmanywords.app/es/blog/senales-de-que-tu-ensayo-fue-escrito-por-ia) atribuye a DetectGPT que la uniformidad de longitud de las frases es la señal estadística más fuerte. [El artículo de ICML](https://proceedings.mlr.press/v202/mitchell23a.html) trabaja con curvatura de logprobabilidades y perturbaciones. Su texto completo no contiene «burstiness». La atribución se rechaza; no justifica el umbral de HES-024.
2. **Procedencia demasiado agrupada.** CL26 identificaba la propuesta aportada por Roberto. Las referencias que contenía no tenían un mapa individual de cobertura. La nueva matriz separa las nueve pautas de Pangram y las diez de HowManyWords; indica también los casos que solo guardan semejanza con una ficha.
3. **Activación antes de la evaluación prevista.** `investigacion.md` propuso un 90 % de avisos pertinentes para activar reglas por defecto. Se activaron 30 comprobaciones como candidatos de revisión sin medir esa precisión en un corpus representativo. Las pruebas sintéticas no cumplen aquel requisito. Ahora se muestra expresamente su condición experimental, pero esa etiqueta no salda la evaluación pendiente ni acredita el 90 %.

La propuesta original de Claude permanece intacta para poder contrastar esta lectura. Esta auditoría cubre las dos referencias preguntadas, su relación con DetectGPT y las nuevas fuentes que se enumeran aquí; no certifica toda la bibliografía de Claude ni la investigación completa del proyecto.

## Qué aportan las fuentes

[Pangram](https://www.pangram.com/signs-of-ai-writing) aporta observaciones comerciales sobre formas frecuentes. Consultamos la fuente inglesa original, enlazada de forma secundaria por Pasquale. Las formas ayudan a preparar ejemplos; sus multiplicadores no se convierten en pesos españoles. Pangram distingue esas señales de las entradas de su detector principal. La página tampoco proporciona una evaluación de utilidad editorial de nuestras reglas.

El [experimento de Schaaff, Schlippe y Mindner](https://aclanthology.org/2023.icnlsp-1.1/) ya figuraba en nuestra investigación. Incluye español, pero clasifica textos completos bajo las condiciones de su muestra. Su F1 no mide si una expresión de un manuscrito necesita revisión. Para aplicar su aportación metodológica debemos construir nuestra muestra, separar desarrollo y evaluación y medir errores por género; no basta con incorporar características de su lista.

El [preprint de El Attar y colaboradores](https://arxiv.org/html/2606.04177v1) estudia características lingüísticas entre modelos y dominios en inglés. Justifica experimentar con generalización y riqueza léxica. No aporta umbrales españoles. Además, el apéndice C.4.3 afirma mayor TTR humano, pero presenta 0,6 humano frente a 0,8 IA: esa dirección requiere aclaración. No se importa como detector.

## Pautas inglesas trasladables

La adaptación siguiente es una decisión editorial del proyecto. Las fuentes respaldan el criterio de lectura, no certifican nuestro detector. Los ejemplos castellanos son propios.

| Fuente y criterio | Caso para revisar | Caso que conservar | Aplicación actual |
| --- | --- | --- | --- |
| [NIH: verbos de acción](https://www.nih.gov/nih-style-guide/grammar-punctuation). Mostrar quién hace qué cuando una cadena nominal lo oculta. | «El equipo llevó a cabo la evaluación del plan». | «La evaluación de riesgos es obligatoria»: concepto necesario. | HES-011 busca formas concretas; HES-072 pide lectura contextual a Ollama. No se prohíbe toda palabra en -ción. |
| [Purdue: conexión entre párrafos](https://owl.purdue.edu/owl/general_writing/mechanics/transitions_and_transitional_devices/index.html). Explicar la relación concreta con lo anterior. | Tras hablar de una avería, «Todo esto nos lleva al color de los sobres», sin relación explicada. | «La avería impidió imprimir los sobres; por eso aplazamos el envío». | HES-080 ya interpreta ambos lados. No debe inventar una causa al reescribir. |
| [Google: voz y tono](https://developers.google.com/style/tone). Revisar anuncios vacíos, arranques repetidos y ritmo entrecortado. | Tres frases que arrancan «El equipo…» sin función retórica. | Una anáfora deliberada o varios pasos de una instrucción. | HES-001, 016 y 020 tienen comprobaciones acotadas. Sus ventanas son heurísticas propias. No se importan las restricciones de Google sobre humor o referencias culturales a la voz de Roberto. |
| Pangram: apertura de respuesta pegada en una obra. | «¡Claro! Aquí tienes un resumen…» al comenzar un párrafo de ensayo. | La misma frase citada, dialogada o en un correo. | Se amplía HES-036 con patrón español y exclusiones de género y contexto. |

Rayas, listas, tríadas, símbolos matemáticos, ausencia de anécdotas y frases de longitud parecida no son defectos por sí mismos. Sus fichas y huecos aparecen individualmente en `rules/es-ES/evidence.json`. HES-047 no equivale a Unicode visible inusual; HES-042 no es verificación bibliográfica; HES-013 no cubre automáticamente «no solo…, sino también…».

## Resultado verificable y siguiente criterio de mejora

La aplicación expone esta trazabilidad en Fuentes y en el detalle de las reglas. La API calcula el estado de implementación desde las reglas reales. Las pruebas comprueban referencias resolubles, exclusiones, conservación de literales previos y offsets de la nueva apertura, incluso con emoji y palabra partida por maquetación. La fuente del PDF y los análisis guardados no se modifican.

Continúan 80 fichas: 30 comprobaciones deterministas, doce criterios opcionales de Ollama y 38 pendientes. No se han añadido nuevas llamadas al modelo ni cambiado el prompt evaluado anteriormente. Esta tanda mejora un detector concreto y la trazabilidad; no constituye una nueva medición de precisión general ni una mejora demostrada de Ollama sobre un libro completo.

La comparación con Sol necesita etiquetar los casos discutibles. Una omisión de un problema confirmado reduce la cobertura y es un fallo que corregir. Un aviso rechazado porque el pasaje cumple una función puede ser un acierto. Contar avisos sin resolver esa diferencia no evalúa calidad. La omisión conocida de una transición causal, sigue pendiente; también sigue pendiente un corpus representativo con positivos y negativos independientes.

Para otra incorporación: registrar la afirmación exacta y su fuente primaria; señalar si es observación, recomendación o resultado experimental; enlazar una implementación concreta; preparar casos de conservación; ejecutar las comprobaciones correspondientes; registrar la evaluación editorial separadamente. No actualizar un estado a «evaluado» solo porque pase la batería de código.
