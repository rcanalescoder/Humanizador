# Reglas para detectar texto generado por IA en castellano

Catálogo de patrones para un detector híbrido: una capa barata de expresiones regulares, unas cuantas métricas estadísticas y una capa de juicio con LLM.

- **Parte A** — 108 reglas regex (R001–R108), en YAML para cargarlas directamente.
- **Parte B** — 12 métricas calculables por código (M01–M12).
- **Parte C** — 100 reglas para LLM (L001–L100) y 8 contrapesos humanos (H01–H08).
- **Parte D** — cómo combinarlo todo y esqueleto de prompt.

## Antes de usarlo

Tres avisos que te ahorran disgustos:

1. **Ninguna regla prueba nada por sí sola.** Todo lo que hace un LLM lo aprendió de humanos. Lo que delata es la acumulación: muchas señales distintas, en poco texto, y sin señales humanas que las compensen.
2. **Los falsos positivos caen siempre en los mismos sitios:** prosa institucional, académica, jurídica, notas de prensa, SEO escrito a mano y hablantes no nativos. Si tu corpus tiene de eso, calibra aparte.
3. **Las señales caducan.** La raya larga, por ejemplo, ya pesa menos porque los modelos recientes la evitan. Guarda la fecha de cada regla y vuelve a medir pesos cada pocos meses con textos nuevos.

Los pesos que pongo son un punto de partida razonado, no una medida. Ajústalos con un corpus etiquetado tuyo (aunque sean 200 textos por clase).

---

## Parte A — Reglas regex

**Convenciones**

- Sintaxis de Python `re`. Flags por defecto: `re.IGNORECASE | re.MULTILINE`. Si la regla lleva `cs: true`, quita `IGNORECASE` (distingue mayúsculas).
- `modo: presencia` → cuenta si aparece (limita a 2–3 apariciones para que no domine). `modo: densidad` → apariciones por cada 1000 palabras; solo puntúa por encima de lo normal en tu corpus humano.
- `peso` de 1 a 10 a favor de IA. Peso negativo = señal humana (resta).
- Normaliza antes el texto a NFC, o las tildes compuestas no casarán.

### A1. Residuos de chatbot (casi concluyentes)

```yaml
- id: R001
  nombre: autorreferencia_ia
  regex: '\b(?:como|soy) (?:un |una )?(?:modelo de lenguaje|inteligencia artificial|asistente (?:virtual|de ia|de inteligencia artificial)|ia)\b'
  peso: 10
  modo: presencia
- id: R002
  nombre: corte_de_conocimiento
  regex: '\b(?:mi (?:fecha de )?corte de (?:conocimiento|entrenamiento)|hasta mi última actualización|mis datos de entrenamiento|no tengo acceso a (?:internet|información en tiempo real|datos en tiempo real))\b'
  peso: 10
  modo: presencia
- id: R003
  nombre: apertura_servicial
  regex: '^\s*¡?(?:claro(?: que sí)?|por supuesto|desde luego|con (?:mucho )?gusto|encantad[oa](?: de ayudar(?:te)?)?|perfecto|entendido|excelente pregunta|(?:muy )?buena pregunta|gran pregunta|qué (?:buena|gran|interesante) pregunta)\s*[!,.:]'
  peso: 6
  modo: presencia
- id: R004
  nombre: aqui_tienes
  regex: '\b(?:aquí (?:tienes|tiene|te (?:dejo|presento|comparto|muestro|va))|a continuación,? (?:te|le|os) (?:presento|muestro|dejo|comparto|explico|detallo))\b'
  peso: 6
  modo: presencia
- id: R005
  nombre: espero_que_te_sirva
  regex: '\bespero que (?:est[oa] |esta (?:información|guía|explicación|respuesta) )?(?:te |le |os )?(?:sea|resulte|haya sido|sirva|ayude|haya (?:ayudado|servido))\b'
  peso: 5
  modo: presencia
- id: R006
  nombre: no_dudes_en
  regex: '\b(?:no dud(?:es|e|éis) en (?:preguntar|consultar|contactar|escribir|dec[ií]r|pedir|avisar)\w*|há(?:z|ga)(?:me|nos)lo saber|si (?:necesitas|necesita|tienes|tiene|quieres|deseas) (?:más (?:información|detalles|ayuda)|algo más|alguna (?:otra )?(?:duda|pregunta)|que (?:profundice|amplíe|lo adapte)))\b'
  peso: 6
  modo: presencia
- id: R007
  nombre: oferta_de_seguir
  regex: '¿(?:te gustaría|quieres|deseas|necesitas|prefieres) que (?:te |lo |la |los |las |me )?(?:profundice|amplíe|adapte|ajuste|ayude|desarrolle|detalle|continúe|prepare|redacte|resuma|genere|añada|incluya|convierta|centre)\b'
  peso: 8
  modo: presencia
- id: R008
  nombre: negativa_de_asistente
  regex: '\b(?:lo siento,? (?:pero )?no puedo|no puedo (?:ayudar(?:te)? con|cumplir con|proporcionar|generar|asistir(?:te)? con)|no me es posible (?:ayudar|proporcionar|generar)|no tengo la capacidad de)\b'
  peso: 8
  modo: presencia
- id: R009
  nombre: plantilla_sin_rellenar
  regex: '\[(?:tu|su|nombre|insertar?|inserte|añad(?:e|ir)|fecha|empresa|ciudad|cargo|correo|teléfono|dirección|enlace|url|número|destinatario|remitente|asunto)\b[^\]\n]{0,40}\]'
  peso: 9
  modo: presencia
- id: R010
  nombre: artefactos_de_cita
  regex: 'turn\d+(?:search|view|news|image)\d+|\boaicite\b|contentReference\[|utm_source=(?:chatgpt|openai|perplexity|copilot)|【\d+[†:]'
  peso: 10
  modo: presencia
- id: R011
  nombre: despedida_de_animo
  regex: '¡(?:mucha suerte|buena suerte|mucho ánimo|muchos éxitos|éxitos?|feliz (?:lectura|escritura|aprendizaje|programación|viaje)|a (?:disfrutar|por ello|por todas))[^!\n]{0,40}!\s*$'
  peso: 4
  modo: presencia
- id: R012
  nombre: halago_al_interlocutor
  regex: '\b(?:tienes (?:toda la |mucha )?razón|(?:muy buena|gran|excelente) observación|excelente (?:punto|elección|idea|pregunta)|me alegra que (?:preguntes|lo menciones|te (?:haya|sea)))\b'
  peso: 4
  modo: presencia
- id: R013
  nombre: validacion_emocional
  regex: '\b(?:es (?:completamente|totalmente|perfectamente|absolutamente) (?:normal|comprensible|válido|natural|lógico)|lamento (?:mucho )?(?:que|escuchar|oír|leer)|entiendo (?:perfectamente |completamente )?(?:cómo te sientes|tu (?:frustración|preocupación|situación))|no estás sol[oa]|tus (?:sentimientos|emociones) son válid[oa]s)\b'
  peso: 4
  modo: presencia
- id: R014
  nombre: descargo_profesional
  regex: '\b(?:consult(?:a|e|ar|es) (?:con|a) un (?:profesional|especialista|médico|abogado|experto|asesor)|no (?:sustituye|reemplaza)n? (?:el|al|la|a la|a un) (?:consejo|asesoramiento|opinión|diagnóstico|criterio|profesional)|no constituyen? (?:asesoramiento|consejo))\b'
  peso: 4
  modo: presencia
```

### A2. Formato y tipografía

El Markdown fuera de sitio es de las señales más fuertes que hay: en un correo, un comentario o un trabajo pegado en Word no pinta nada. Si tu canal *sí* admite Markdown (README, wiki), baja estos pesos.

```yaml
- id: R015
  nombre: negrita_markdown
  regex: '\*\*[^*\n]{2,80}\*\*'
  peso: 2
  modo: densidad
- id: R016
  nombre: vineta_con_titulo_en_negrita
  regex: '^\s*(?:[-*•]|\d+[.)])\s+\*\*[^*\n]{2,60}\*\*\s*:|^\s*(?:[-*•]|\d+[.)])\s+\*\*[^*\n]{2,60}:\*\*'
  peso: 5
  modo: presencia
- id: R017
  nombre: encabezado_markdown
  regex: '^#{1,6}\s+\S'
  peso: 2
  modo: densidad
- id: R018
  nombre: separador_markdown
  regex: '^\s*(?:-{3,}|\*{3,}|_{3,})\s*$'
  peso: 2
  modo: presencia
- id: R019
  nombre: tabla_markdown
  regex: '^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$'
  peso: 2
  modo: presencia
- id: R020
  nombre: raya_espaciada_a_la_inglesa
  regex: '(?<=[^\s—]) — (?=[^\s—])'
  peso: 3
  modo: densidad
  nota: "En español la raya de inciso va pegada al texto que encierra. Con espacio a ambos lados es calco del inglés."
- id: R021
  nombre: raya_larga_densidad
  regex: '(?<=[^\n])—'
  peso: 1
  modo: densidad
  nota: "Excluye la raya de inicio de línea (diálogo). Señal en retroceso con modelos recientes."
- id: R022
  nombre: comillas_curvas
  regex: '[“”]'
  peso: 1
  modo: densidad
  nota: "Solo dice algo en canales de texto plano (chat, formularios). Word las pone solo."
- id: R023
  nombre: emoji_como_vineta_o_titulo
  regex: '^\s*(?:#{1,6}\s*|[-*•]\s*)?[\U0001F300-\U0001FAFF\u2600-\u27BF]\uFE0F?\s+\S'
  peso: 4
  modo: presencia
- id: R024
  nombre: emojis_de_asistente
  regex: '[✅✔☑❌🚀💡🔑📌🎯✨👉🔍📊🧠⚡🌟📝]'
  peso: 2
  modo: densidad
- id: R025
  nombre: glifos_de_interfaz
  regex: '[→⇒←↔≠≈✓▶►■◆▪➜➡]'
  peso: 3
  modo: presencia
  nota: "Flechas y operadores que casi nadie teclea en prosa corrida."
- id: R026
  nombre: titulo_con_mayusculas_inglesas
  regex: '^(?:#{1,6} +)?(?:\*\*)?[A-ZÁÉÍÓÚÑ][a-záéíóúüñ]+(?: (?:de|del|la|las|el|los|y|e|o|en|para|con|por|a|al|un|una))*(?: [A-ZÁÉÍÓÚÑ][a-záéíóúüñ]+(?: (?:de|del|la|las|el|los|y|e|o|en|para|con|por|a|al|un|una))*){2,}(?:\*\*)?\s*$'
  cs: true
  peso: 3
  modo: presencia
  nota: "Tipo 'Cómo Detectar un Texto Escrito por IA'. Ojo con nombres propios largos (instituciones)."
- id: R027
  nombre: titulo_con_dos_puntos
  regex: '^(?:#{1,6}\s+)?[^:\n]{3,60}: (?:una?|el|la|los|las|cómo|por qué|qué|guía|claves|todo lo que)\b[^\n]{5,80}$'
  peso: 2
  modo: presencia
- id: R028
  nombre: etiqueta_dos_puntos_mayuscula
  regex: '^\s*(?:[-*•]\s+)?[A-ZÁÉÍÓÚÑ][^:\n]{2,40}: [A-ZÁÉÍÓÚÑ][a-záéíóúüñ]'
  cs: true
  peso: 3
  modo: densidad
  nota: "Líneas tipo 'Flexibilidad: Permite adaptar...'. Tras dos puntos el español pide minúscula. Casa también con nombres propios ('Nota: María...') y con citas; por eso va por densidad."
- id: R029
  nombre: coma_antes_de_y_en_enumeracion
  regex: '\b[a-záéíóúüñ]+(?: [a-záéíóúüñ]+){0,2}, [a-záéíóúüñ]+(?: [a-záéíóúüñ]+){0,2}, (?:y|e|o|u) [a-záéíóúüñ]+'
  peso: 2
  modo: densidad
  nota: "Coma de Oxford: 'rápido, seguro, y fiable'. Calco. Hay usos legítimos con cambio de sujeto."
- id: R030
  nombre: punto_y_coma_densidad
  regex: ';'
  peso: 1
  modo: densidad
```

### A3. Aperturas, cierres y andamiaje

```yaml
- id: R031
  nombre: contexto_epocal
  regex: '\b(?:en (?:el|la|un|una) (?:mundo|sociedad|era|entorno|contexto|panorama|época|mercado) (?:actual|digital|modern[oa]|contemporáne[oa]|globalizad[oa]|de hoy|cada vez más|en constante (?:cambio|evolución|transformación))|en (?:la |plena )?era (?:digital|de la (?:información|inteligencia artificial|ia))|en un mundo (?:donde|en el que|que)|hoy en día|en la actualidad|en los tiempos que corren)\b'
  peso: 3
  modo: presencia
- id: R032
  nombre: anuncio_de_contenido
  regex: '\ben (?:este|esta|el presente|la presente) (?:artículo|guía|entrada|post|texto|ensayo|informe|documento|sección|apartado|trabajo),? (?:exploraremos|analizaremos|veremos|abordaremos|descubriremos|repasaremos|examinaremos|profundizaremos|te (?:explicamos|contamos|mostramos|enseñamos)|se (?:analiza|explora|aborda|examina|presenta)n?|vamos a)\b'
  peso: 5
  modo: presencia
- id: R033
  nombre: gancho_seo
  regex: '\b(?:todo lo que (?:necesitas|debes|tienes que) saber|guía (?:completa|definitiva|práctica|paso a paso)|descubre (?:cómo|por qué|qué|los|las|el|la)|(?:las|los) \d+ (?:claves|mejores|consejos|pasos|errores|razones|trucos|formas|maneras)|sigue leyendo)\b'
  peso: 3
  modo: presencia
- id: R034
  nombre: cierre_de_conclusion
  regex: '^\s*(?:#{1,6}\s*)?(?:\*\*)?(?:en (?:resumen|conclusión|definitiva|síntesis|suma|pocas palabras|última instancia|resumidas cuentas)|para (?:concluir|resumir|terminar|finalizar)|a modo de (?:conclusión|cierre|resumen)|conclusi(?:ón|ones)|reflexi(?:ón|ones) final(?:es)?)\b'
  peso: 4
  modo: presencia
- id: R035
  nombre: invitacion_al_lector
  regex: '(?:^|[.!?]\s+)(?:imagina|imagínate|imagine|imaginemos|piensa en|piénsalo(?: así)?|pongámoslo así|vayamos por partes|vamos a (?:verlo|desglosarlo|explorar|analizar|profundizar)|desglosemos|analicemos|exploremos|veamos|empecemos|comencemos)\b'
  peso: 3
  modo: presencia
- id: R036
  nombre: pregunta_retorica_de_transicion
  regex: '¿(?:pero |y |entonces,? )?(?:qué significa (?:esto|eso)|por qué (?:es (?:esto |tan )?(?:importante|relevante)|importa)|cómo (?:lograrlo|se logra|funciona(?: esto)?|podemos)|sabías que|te has preguntado(?: alguna vez)?|alguna vez te has preguntado|te suena|qué (?:pasa|ocurre|sucede) (?:si|cuando|entonces))[^?\n]{0,80}\?'
  peso: 3
  modo: presencia
- id: R037
  nombre: pregunta_y_remate
  regex: '¿(?:y )?(?:el|la|lo) (?:resultado|clave|respuesta|solución|problema|mejor(?: de todo| parte)?|conclusión|diferencia|truco|secreto)\?\s+\S'
  peso: 5
  modo: presencia
  nota: "'¿El resultado? Un equipo más ágil.'"
- id: R038
  nombre: etiqueta_de_remate
  regex: '\b(?:el resultado|la conclusión|la diferencia|la razón|el problema|la solución|la clave|el motivo|la moraleja|la lección|el veredicto|la buena noticia|la mala noticia)(?: es (?:simple|sencill[oa]|clar[oa]))?: '
  peso: 3
  modo: presencia
- id: R039
  nombre: metacomentario
  regex: '\b(?:como (?:hemos visto|vimos|se ha (?:visto|mencionado|señalado)|mencion(?:é|amos|ábamos) (?:antes|anteriormente|más arriba))|veamos (?:a continuación|ahora|cómo|por qué)|a continuación,? (?:se|veremos|analizaremos|exploraremos)|dicho (?:esto|lo anterior|de otro modo)|vale la pena (?:detenerse|profundizar|preguntarse))\b'
  peso: 3
  modo: presencia
- id: R040
  nombre: la_clave_esta_en
  regex: '\b(?:la clave (?:está|radica|reside) en|el secreto (?:está|radica|reside) en|la respuesta es (?:simple|sencilla|clara)|lo (?:cierto|importante|fundamental|esencial|interesante|curioso|mejor de todo) es que|la (?:buena|mala) noticia es que|la realidad es que)\b'
  peso: 3
  modo: presencia
```

### A4. Conectores y fórmulas de redacción

```yaml
- id: R041
  nombre: conector_al_inicio_de_frase
  regex: '(?:^|[.!?]\s+)(?:además|asimismo|por otro lado|por otra parte|en este sentido|en este contexto|sin embargo|no obstante|por lo tanto|por consiguiente|en consecuencia|de hecho|en definitiva|a su vez|por ende|ahora bien|en suma|por si fuera poco|en primer lugar|en segundo lugar|por último|finalmente|de igual (?:modo|manera|forma)|del mismo modo|en cualquier caso|en efecto),'
  peso: 2
  modo: densidad
  nota: "Mide también el porcentaje de frases que empiezan así (M03)."
- id: R042
  nombre: cabe_destacar
  regex: '\b(?:cabe (?:destacar|señalar|mencionar|resaltar|recordar|subrayar|añadir|preguntarse)|es importante (?:destacar|señalar|tener en cuenta|mencionar|recordar|resaltar|subrayar|entender|comprender)|(?:vale|merece) la pena (?:destacar|mencionar|señalar|recordar|subrayar)|conviene (?:recordar|señalar|destacar|subrayar|tener presente)|hay que tener en cuenta que|no (?:hay que|debemos|podemos) olvidar que|es (?:fundamental|crucial|esencial|vital|clave|imprescindible) (?:destacar|entender|comprender|tener en cuenta|recordar|señalar|que))\b'
  peso: 4
  modo: densidad
- id: R043
  nombre: locucion_prepositiva_inflada
  regex: '\b(?:a la hora de|a lo largo de|en términos de|a nivel|en el ámbito de|en lo que respecta a|en lo referente a|con respecto a|con el (?:fin|objetivo|propósito) de|en aras de|de cara a|en el marco de|por medio de|en materia de|en función de|debido al hecho de que|a fin de)\b'
  peso: 1
  modo: densidad
- id: R044
  nombre: certeza_enfatica
  regex: '\b(?:sin (?:lugar a )?dudas?|indudablemente|innegablemente|es innegable que|no cabe (?:la menor )?duda(?: de que)?|a todas luces|huelga decir)\b'
  peso: 2
  modo: presencia
- id: R045
  nombre: matizacion_defensiva
  regex: '\b(?:si bien es cierto que|en (?:muchos|algunos|ciertos|determinados) casos|en la mayoría de los casos|pueden? variar (?:según|en función|dependiendo)|depend(?:e|erá|erán) (?:en gran medida |en buena medida )?de (?:cada|tus|sus|múltiples|diversos|varios|muchos)|por lo general|en términos generales|en líneas generales|en cierta medida|hasta cierto punto|de alguna (?:manera|forma)|en cierto modo)\b'
  peso: 2
  modo: densidad
- id: R046
  nombre: atribucion_vaga
  regex: '\b(?:(?:los|algunos|muchos|numerosos|diversos|varios) (?:expertos|especialistas|estudios|investigadores|analistas|críticos|autores|informes)|(?:diversas|numerosas|varias|algunas|muchas) (?:investigaciones|fuentes|voces|personas)) (?:coinciden|señalan|sugieren|indican|afirman|sostienen|apuntan|advierten|demuestran|han demostrado|destacan|consideran|argumentan)\b|\bse (?:considera|cree|estima|dice|sabe) (?:ampliamente |generalmente |comúnmente )?que\b|\bestudios recientes\b'
  peso: 4
  modo: presencia
- id: R047
  nombre: en_esencia
  regex: '\b(?:en esencia|en última instancia|en gran medida|en buena medida|en definitiva)\b'
  peso: 1
  modo: densidad
- id: R048
  nombre: consejo_en_segunda_persona
  regex: '\b(?:te permit(?:e|irá|en|irán)|te ayud(?:a|ará|an|arán)|asegúrate de|recuerda que|ten en cuenta que|no olvides (?:que|de)|considera (?:la posibilidad de|incluir|usar|utilizar)|es recomendable|se recomienda)\b'
  peso: 2
  modo: densidad
- id: R049
  nombre: por_un_lado_por_otro
  regex: '\bpor una? (?:lado|parte)\b[\s\S]{10,500}?\bpor (?:el |la )?otr[oa](?: lado| parte)?\b'
  peso: 2
  modo: presencia
- id: R050
  nombre: primero_segundo
  regex: '\ben primer lugar\b[\s\S]{10,800}?\ben segundo lugar\b|(?:^|[.!?]\s+)primero,[\s\S]{10,800}?[.!?\n]\s*segundo,'
  peso: 2
  modo: presencia
```

### A5. Léxico sobreexpresado

Todas estas palabras son normales. Lo anómalo es la densidad y que aparezcan juntas.

```yaml
- id: R051
  nombre: verbos_de_inmersion
  regex: '\b(?:profundi[zc]\w+|sum[eé]r[gj]\w+|ad[eé]ntr\w+|desentrañ\w+|desgran\w+|buce(?:ar|a|an|ando|emos)|ahond\w+)\b'
  peso: 3
  modo: densidad
  nota: "El 'delve' castellano: adentrarse, sumergirse, profundizar, desentrañar."
- id: R052
  nombre: verbos_de_impulso
  regex: '\b(?:potenci(?:ar|an|ando|ará|arán|ad[oa]s?)|foment\w+|impuls(?:ar|an|ando|ará|arán)|optimi[zc]\w+|maximi[zc]\w+|agili[zc]\w+|empoder\w+|catapult\w+|revolucion(?:ar|an|ando|ará|ad[oa]s?)|transform(?:a|ar|an|ando|ará) (?:la forma|la manera|el modo))\b'
  peso: 2
  modo: densidad
- id: R053
  nombre: verbos_de_realce
  regex: '\b(?:subray(?:a|an|ar|ando)|resalt(?:a|an|ar|ando)|pon(?:e|en|er|iendo) de (?:relieve|manifiesto)|reflejan?|evidencian?|demuestran? (?:el|la|su) (?:compromiso|importancia|capacidad|relevancia)|dan? cuenta de)\b'
  peso: 2
  modo: densidad
- id: R054
  nombre: verbos_comodin_formales
  regex: '\b(?:utili[zc]\w+|reali[zc]\w+|llev(?:ar|a|an|ó|aron|ando) a cabo|efect[uú]\w+|pose(?:e|en|er|ía)|implement\w+|proporcion\w+|brind(?:ar|a|an|ando|ó|ará))\b'
  peso: 1
  modo: densidad
  nota: "Utilizar por usar, realizar por hacer, poseer por tener. 'Brindar' fuera de un brindis apenas se usa en España."
- id: R055
  nombre: adjetivos_de_folleto
  regex: '\b(?:crucial(?:es)?|fundamental(?:es)?|esencial(?:es)?|integral(?:es)?|holístic[oa]s?|robust[oa]s?|innovador(?:a|es|as)?|transformador(?:a|es|as)?|revolucionari[oa]s?|vibrantes?|dinámic[oa]s?|fascinantes?|invaluables?|inigualables?|multifacétic[oa]s?|polifacétic[oa]s?|intrincad[oa]s?|meticulos[oa]s?|exhaustiv[oa]s?|enriquecedor(?:a|es|as)?|significativ[oa]s?|sin precedentes|de vanguardia|de primer nivel)\b'
  peso: 2
  modo: densidad
- id: R056
  nombre: metaforas_de_catalogo
  regex: '\b(?:tapiz|crisol|mosaico|sinfonía|faro|brújula|piedra angular|pilar(?:es)? fundamental(?:es)?|encrucijada|travesía|hoja de ruta|entramado|telón de fondo|punta de lanza|caldo de cultivo|punto de inflexión|motor de (?:cambio|crecimiento|desarrollo)|puente entre|un viaje (?:de|hacia|por|a través)|semillas? de)\b'
  peso: 3
  modo: densidad
- id: R057
  nombre: paisaje_y_panorama
  regex: '\b(?:panorama|paisaje|ecosistema|escenario|entorno|tejido) (?:actual|digital|empresarial|tecnológico|competitivo|cambiante|educativo|laboral|político|mediático|económico|cultural|social|productivo|global)\b'
  peso: 2
  modo: densidad
- id: R058
  nombre: papel_crucial
  regex: '\b(?:jueg(?:a|an)|desempeñ(?:a|an|ar)|cumpl(?:e|en)|ocup(?:a|an)) un (?:papel|rol) (?:[a-záéíóúüñ]+ )?(?:crucial|fundamental|clave|esencial|vital|importante|central|decisivo|protagonista|determinante)\b'
  peso: 4
  modo: presencia
- id: R059
  nombre: abanicos_y_gamas
  regex: '\b(?:(?:una )?(?:amplia|gran|extensa|rica|vasta) (?:gama|variedad|diversidad|selección|oferta) de|un (?:sinfín|abanico|sinnúmero|amplio (?:abanico|espectro|repertorio)) de|una (?:multitud|infinidad|miríada|plétora) de)\b'
  peso: 2
  modo: densidad
- id: R060
  nombre: marketing_vacio
  regex: '\b(?:al siguiente nivel|marcar la diferencia|valor añadido|soluciones (?:innovadoras|integrales|a medida|personalizadas)|sacar el máximo (?:partido|provecho)|potencial (?:completo|máximo)|todo (?:su|tu|el) potencial|experiencia (?:única|inolvidable|inigualable))\b'
  peso: 3
  modo: presencia
- id: R061
  nombre: de_manera_mas_adjetivo
  regex: '\bde (?:manera|forma) (?:más |muy )?(?:eficiente|eficaz|efectiva|significativa|sostenible|segura|óptima|integral|proactiva|clara|sencilla|rápida|adecuada|constante|natural|intuitiva|fluida|consciente|responsable|estratégica)\b'
  peso: 2
  modo: densidad
- id: R062
  nombre: adverbios_en_mente_densidad
  regex: '\b[a-záéíóúüñ]{5,}mente\b'
  peso: 1
  modo: densidad
- id: R063
  nombre: adverbios_enfaticos
  regex: '\b(?:significativamente|fundamentalmente|notablemente|verdaderamente|realmente|genuinamente|auténticamente|profundamente|sumamente|altamente|increíblemente|extremadamente|especialmente|particularmente|constantemente|continuamente|eficazmente|cuidadosamente|meticulosamente)\b'
  peso: 2
  modo: densidad
- id: R064
  nombre: promocional_turistico
  regex: '\b(?:ubicad[oa]s? en el corazón de|en pleno corazón de|joya (?:oculta|escondida|de la corona)|rico patrimonio|rica (?:historia|herencia|tradición|cultura)|impresionantes?|pintoresc[oa]s?|emblemátic[oa]s?|imperdibles?|un destino (?:único|ideal)|no te (?:lo |la )?puedes perder|para todos los gustos|de renombre(?: mundial| internacional)?|cautivador(?:a|es|as)?)\b'
  peso: 3
  modo: densidad
- id: R065
  nombre: legado_e_hitos
  regex: '\b(?:marc(?:ó|a|aron) un (?:antes y un después|hito|punto de inflexión)|dej(?:ó|a|aron) una huella (?:imborrable|indeleble|profunda)|sent(?:ó|aron) las bases|un legado (?:duradero|imborrable|perdurable)|sigue siendo (?:un referente|relevante|una fuente de inspiración)|testimonio (?:vivo |fiel |claro )?de|se (?:erige|alza|consolida|posiciona) como|se ha convertido en (?:un referente|una pieza clave|un pilar))\b'
  peso: 3
  modo: presencia
- id: R066
  nombre: retos_y_futuro
  regex: '\b(?:desafíos y oportunidades|retos y oportunidades|oportunidades y desafíos|a pesar de (?:estos|los|sus) (?:desafíos|retos|obstáculos|dificultades)|el futuro (?:[a-záéíóúüñ ]{0,30})?(?:es|se presenta|luce|parece) (?:prometedor|brillante)|un futuro (?:más )?(?:sostenible|prometedor|inclusivo|brillante|mejor)|abr(?:e|en|ir) (?:la puerta|nuevas (?:puertas|posibilidades|oportunidades|vías))|allana(?:r|n|ndo)? el camino)\b'
  peso: 3
  modo: presencia
- id: R067
  nombre: equilibrio_perfecto
  regex: '\b(?:equilibrio|balance) (?:perfecto |ideal |adecuado |delicado |justo )?entre\b|\bcombinan?(?:do)? a la perfección\b|\bla combinación perfecta (?:de|entre)\b'
  peso: 2
  modo: presencia
- id: R068
  nombre: parejas_de_sinonimos
  regex: '\b(?:clar[oa] y concis[oa]|rápid[oa] y (?:eficiente|sencill[oa]|eficaz)|simple y (?:efectiv[oa]|sencill[oa])|segur[oa] y (?:eficiente|eficaz|fiable)|eficiente y (?:eficaz|efectiv[oa])|único e irrepetible|sólid[oa] y (?:robust[oa]|fiable)|fluid[oa] y natural)\b'
  peso: 2
  modo: presencia
- id: R069
  nombre: rango_vago
  regex: '\bentre (?:\d+|dos|tres|cuatro|cinco|seis|siete|ocho|diez|quince|veinte) y (?:\d+|tres|cuatro|cinco|seis|siete|ocho|diez|quince|veinte|treinta) [a-záéíóúüñ]+'
  peso: 1
  modo: densidad
  nota: "Rangos donde un humano que lo sabe daría el número."
```

### A6. Construcciones sintácticas

```yaml
- id: R070
  nombre: no_solo_sino
  regex: '\bno (?:solo|sólo|solamente|únicamente|se limitan? a|es (?:solo|sólo|simplemente|únicamente))\b[^.\n]{1,120}?\bsino\b'
  peso: 3
  modo: densidad
- id: R071
  nombre: no_se_trata_de
  regex: '\bno se trata (?:solo |sólo |simplemente |únicamente |tanto )?de [^.;\n]{2,80}[,;.] ?(?:sino|se trata) (?:de|más bien)\b'
  peso: 5
  modo: presencia
- id: R072
  nombre: no_es_x_es_y
  regex: '\bno (?:es|son|era|fue) (?:solo |sólo |simplemente )?(?:un|una|el|la|los|las|cuestión de|cosa de) [^.;:,\n]{2,60}[.;:,] (?:es|son|era|fue) '
  peso: 5
  modo: presencia
  nota: "'No es un lujo. Es una necesidad.' Más de una vez en el mismo texto pesa mucho."
- id: R073
  nombre: mas_que_x_es_y
  regex: '\b(?:más que|más allá de|lejos de ser) (?:un|una|el|la|los|las|simples?|mer[oa]|solo|sólo) [^,.\n]{2,60}, (?:es|son|se trata|representa|constituye|se convierte|se ha convertido)\b'
  peso: 4
  modo: presencia
- id: R074
  nombre: es_mas_que
  regex: '\b(?:es|son|fue) (?:mucho )?más que (?:un|una|solo|sólo|simplemente|simples?)\b'
  peso: 3
  modo: presencia
- id: R075
  nombre: desde_hasta
  regex: '\bdesde (?:el |la |los |las |un |una )?[^,.\n]{3,50}? hasta (?:el |la |los |las |un |una )?[a-záéíóúüñ]'
  peso: 1
  modo: densidad
  nota: "Rango retórico: 'desde pequeñas startups hasta grandes corporaciones'."
- id: R076
  nombre: ya_sea
  regex: '\bya sean?\b[^.\n]{2,80}?\bo\b'
  peso: 2
  modo: densidad
- id: R077
  nombre: tanto_como
  regex: '\btanto [^,.\n]{2,50}? como [a-záéíóúüñ]'
  peso: 1
  modo: densidad
- id: R078
  nombre: triada_de_abstractos
  regex: '\b[a-záéíóúüñ]{3,}(?:ción|dad|ncia|ismo|miento|eza|tud), (?:la |el )?[a-záéíóúüñ]{3,}(?:ción|dad|ncia|ismo|miento|eza|tud) (?:y|e) (?:la |el )?[a-záéíóúüñ]{3,}(?:ción|dad|ncia|ismo|miento|eza|tud)\b'
  peso: 3
  modo: densidad
  nota: "'innovación, sostenibilidad y eficiencia'."
- id: R079
  nombre: triada_simple
  regex: '\b[a-záéíóúüñ]{4,}, [a-záéíóúüñ]{4,} (?:y|e) [a-záéíóúüñ]{4,}\b'
  peso: 1
  modo: densidad
- id: R080
  nombre: gerundio_de_coletilla
  regex: ', (?:permitiendo|garantizando|asegurando|facilitando|contribuyendo|fomentando|promoviendo|destacando|subrayando|reflejando|demostrando|consolidando|ofreciendo|brindando|generando|creando|logrando|mejorando|reforzando|impulsando|marcando|evidenciando|convirtiéndo(?:se|l[oa]s?)|posicionándo(?:se|l[oa]s?))\b'
  peso: 4
  modo: densidad
- id: R081
  nombre: lo_que_mas_consecuencia
  regex: ', lo (?:que|cual) (?:permite|garantiza|asegura|facilita|contribuye|fomenta|refleja|demuestra|subraya|pone de manifiesto|convierte|hace que|resulta en|se traduce en|supone|implica|genera|l[oa] convierte)\b'
  peso: 3
  modo: densidad
- id: R082
  nombre: pasiva_perifrastica
  regex: '\b(?:es|son|fue|fueron|ha sido|han sido|será|serán|está siendo|están siendo|puede ser|pueden ser|debe ser|deben ser) (?:[a-záéíóúüñ]+mente )?[a-záéíóúüñ]+(?:ad|id)[oa]s? por\b'
  peso: 2
  modo: densidad
- id: R083
  nombre: pronombre_sujeto_inicial
  regex: '(?:^|[.!?]\s+)(?:él|ella|ellos|ellas|nosotros|nosotras) [a-záéíóúüñ]'
  peso: 1
  modo: densidad
  nota: "El español omite el sujeto; repetirlo frase tras frase huele a calco."
- id: R084
  nombre: anafora_triple
  regex: '(?:^|(?<=[.!?]\s))([a-záéíóúüñ]+)\s[^.!?\n]{2,60}[.!?]\s+\1\s[^.!?\n]{2,60}[.!?]\s+\1\s'
  peso: 4
  modo: presencia
  nota: "Tres frases seguidas que empiezan por la misma palabra."
- id: R085
  nombre: fragmentos_en_serie
  regex: '(?:(?:^|(?<=[.!?]\s))(?:sin|con|más|menos|ni|cada|todo|nada de) [^.!?\n]{2,25}\.\s+){2,}'
  peso: 4
  modo: presencia
  nota: "'Sin excusas. Sin atajos.'"
```

### A7. Calcos del inglés y variante

```yaml
- id: R086
  nombre: calcos_fraseologicos
  regex: '\b(?:hacen? (?:total |todo el |mucho )?sentido|al final del día|tomar ventaja de|en orden (?:de|a)|en adición a|es por (?:eso|ello|esto) que|jugar un rol|tomar (?:acción|una decisión informada)|decisiones informadas)\b'
  peso: 3
  modo: presencia
  nota: "'Es por eso que' también es habitual en hablantes americanos; pondera según origen."
- id: R087
  nombre: falsos_amigos
  regex: '\b(?:eventualmente|remover|aplicar (?:a|para) (?:un|una|el|la) (?:puesto|trabajo|beca|empleo|universidad)|asumir que|consistente con|la evidencia sugiere|dramáticamente)\b'
  peso: 2
  modo: densidad
- id: R088
  nombre: marcas_americanas
  regex: '\b(?:computador(?:a|as|es)?|celular(?:es)?|carro|platicar|acá|chequear|rentar|boleto|jugo|ahorita|estacionar)\b'
  peso: 0
  modo: presencia
  nota: "Regla combinada con R089: si disparan las dos en el mismo texto, suma 4 (mezcla de variantes)."
- id: R089
  nombre: marcas_peninsulares
  regex: '\b(?:vosotr[oa]s|vuestr[oa]s?|ordenador(?:es)?|móvil(?:es)?|zumo|aparcar|patatas?|[a-záéíóúüñ]{3,}(?:áis|éis))\b'
  peso: 0
  modo: presencia
```

### A8. Señales humanas (restan)

Tan útiles como las anteriores: un texto con erratas, jerga y descuidos rara vez sale tal cual de un modelo. Cuidado, que cualquiera puede pedirle a la IA que "escriba con faltas"; por eso restan, pero no absuelven.

```yaml
- id: R090
  nombre: palabras_sin_tilde
  regex: '\b(?:tambien|ademas|segun|despues|todavia|aqui|alli|facil|dificil|razon|quizas?|ojala|dias|estan|informacion|podria|habia|tenia|ningun|algun|telefono|opinion|cuestion|solucion|situacion)\b'
  peso: -3
  modo: densidad
- id: R091
  nombre: abreviaturas_de_chat
  regex: '\b(?:xq|pq|tb|tmb|tbn|q|xfa|porfa|finde|bn|dnd|tkm|ntp|nse|msj|wsp|ja(?:ja)+|je(?:je)+|ji(?:ji)+|jaj+|xd+)\b'
  peso: -4
  modo: presencia
- id: R092
  nombre: alargamientos_y_signos_repetidos
  regex: '([a-záéíóúñ])\1{2,}|[!?]{2,}|\.{4,}'
  peso: -3
  modo: presencia
- id: R093
  nombre: pregunta_sin_signo_de_apertura
  regex: '(?:^|(?<=[.!?…]\s))[^¿?\n.!]{4,200}\?'
  peso: -3
  modo: presencia
  nota: "Los modelos casi nunca se comen el ¿."
- id: R094
  nombre: exclamacion_sin_signo_de_apertura
  regex: '(?:^|(?<=[.!?…]\s))[^¡!\n.?]{4,200}!'
  peso: -2
  modo: presencia
- id: R095
  nombre: coloquial_peninsular
  regex: '\b(?:o sea|en plan|pues nada|tío|tía|joder|hostia|coño|molan?|flip(?:o|a|as|ante|ando)|mogollón|mazo|guay|chaval(?:es)?|qué va|ni idea|yo qué sé|vaya tela|madre mía|ostras|jo(?:lín|lines|pe)|mierda|cojon\w+|curro|currar|chungo|cutre|friki|pringao)\b'
  peso: -3
  modo: presencia
- id: R096
  nombre: coloquial_americano
  regex: '\b(?:güey|wey|boludo|chévere|bacán|órale|chido|vaina|parce|pana|chamba|plata|nomás|re (?:bien|mal|lindo)|qué onda)\b'
  peso: -3
  modo: presencia
- id: R097
  nombre: errores_normativos
  regex: '\b(?:haber si|aver|iva a|hechar|haiga|contra más|(?:detrás|delante|encima|debajo) (?:mío|mía|tuyo|tuya|suyo|suya)|(?:pienso|creo|opino|resulta) de que|(?:dij|vin|fu|hic|pus|estuv|tuv|pud|quis|sup|v|com|sal)istes|(?:habl|pas|llam|mir|qued|dej|llev|mand|compr)astes|a parte de|osea|enserio|sobretodo|talvez|apesar|derrepente|porsupuesto|almenos|amenudo|asique)\b'
  peso: -4
  modo: presencia
- id: R098
  nombre: espaciado_descuidado
  regex: ' {2,}\S|[a-záéíóúñ] [,;.](?:\s|$)|[,;][a-záéíóúñ]'
  peso: -2
  modo: presencia
- id: R099
  nombre: minuscula_tras_punto
  regex: '[a-záéíóúñ]{4,}[.!?] [a-záéíóúñ]{2,}'
  cs: true
  peso: -2
  modo: presencia
  nota: "Pide 4 letras antes del punto para no casar con abreviaturas (etc., pág., EE. UU.)."
- id: R100
  nombre: linea_que_empieza_en_minuscula
  regex: '^[a-záéíóúñ]'
  cs: true
  peso: -1
  modo: densidad
- id: R101
  nombre: marcas_de_edicion
  regex: '(?:^|\s)(?:edito|edit|pd|p\.d\.|pdt|actualizo)\s*[:.]'
  peso: -3
  modo: presencia
- id: R102
  nombre: emoticonos_de_texto
  regex: '(?:^|\s)(?:[:;]-?[)(dp3]+|\^\^|<3)(?=\s|$)'
  peso: -2
  modo: presencia
- id: R103
  nombre: mayusculas_de_grito
  regex: '\b[A-ZÁÉÍÓÚÜÑ]{2,}(?: [A-ZÁÉÍÓÚÜÑ]{2,}){2,}\b'
  cs: true
  peso: -2
  modo: presencia
- id: R104
  nombre: muletillas_orales
  regex: '(?:^|[.!?]\s+)(?:bueno|pues|oye|mira|vamos|hombre|a ver|total|en fin|nada),? '
  peso: -2
  modo: densidad
- id: R105
  nombre: primera_persona_situada
  regex: '\b(?:ayer|anoche|esta mañana|el otro día|la semana pasada|hace (?:un par de|unos|dos|tres) (?:días|semanas|meses|años)) (?:me|fui|estuve|vi|hablé|quedé|llamé|tuve|nos|mi)\b'
  peso: -3
  modo: presencia
- id: R106
  nombre: aproximacion_coloquial
  regex: '\b(?:más o menos|o algo así|o así|y tal|y eso|y demás|ni nada|o por ahí|creo recordar|si no recuerdo mal|no me acuerdo (?:bien|exactamente)|que yo sepa|digo yo|me parece a mí)\b'
  peso: -2
  modo: presencia
- id: R107
  nombre: rectificacion_sobre_la_marcha
  regex: '\b(?:bueno,? no\b|mejor dicho\b|perdón,|miento,|quiero decir\b|me explico\b|a lo que iba\b|me estoy liando\b|me voy por las ramas\b)'
  peso: -3
  modo: presencia
- id: R108
  nombre: diminutivos_y_apreciativos
  regex: '\b[a-záéíóúüñ]{3,}(?:it[oa]s?|ill[oa]s?|ete|etes|azo|azos|ísim[oa]s?|uch[oa]s?)\b'
  peso: -1
  modo: densidad
  nota: "Muy ruidosa (bonito, grito, amarillo...). Úsala solo como densidad relativa a tu corpus."
```

---

## Parte B — Métricas calculables (sin LLM)

No son regex, pero salen con veinte líneas de Python y suelen discriminar mejor que cualquier lista de palabras.

| ID | Métrica | Qué apunta a IA |
|---|---|---|
| M01 | Coeficiente de variación de la longitud de frase (en palabras) | Bajo: frases todas de tamaño parecido, ritmo de metrónomo |
| M02 | Coeficiente de variación de la longitud de párrafo | Bajo: párrafos clónicos |
| M03 | % de frases que empiezan por conector (lista de R041) | Alto |
| M04 | Diversidad léxica (MTLD o TTR con ventana móvil) | Más baja que en humanos del mismo género |
| M05 | Ratio sustantivos/verbos (nominalización) con spaCy `es_core_news` | Alto |
| M06 | Perplejidad media con un modelo causal en español | Baja |
| M07 | Varianza de la perplejidad por frase ("burstiness") | Baja |
| M08 | Errores ortotipográficos por 1000 palabras (LanguageTool, hunspell) | Cero en texto largo e informal |
| M09 | Densidad de 1.ª persona singular y deícticos (yo, mi, aquí, ayer, esto) | Muy baja |
| M10 | Repetición de arranques de párrafo (primer bigrama) | Alta |
| M11 | Proporción de líneas con formato (viñetas, negritas, encabezados) | Alta para el canal |
| M12 | Nombres propios, cifras y fechas por 1000 palabras | Baja: texto sin datos concretos |

---

## Parte C — 100 reglas para LLM

Son las que una regex no puede ver: exigen entender el texto. Cada una describe qué buscar; pídele al modelo evidencia literal para cada regla que active.

### C1. Estructura y organización

- **L001 · Esquema de redacción escolar.** Introducción que anuncia, bloques simétricos y conclusión que resume, aunque el género no lo pida (un correo, una reseña, un comentario).
- **L002 · Párrafos clónicos.** Todos los párrafos tienen casi la misma extensión.
- **L003 · Molde interno repetido.** Cada párrafo sigue la misma plantilla: afirmación, desarrollo, frase de cierre.
- **L004 · Frase-moraleja al final de párrafo.** El párrafo termina con una sentencia que repite lo dicho en tono solemne.
- **L005 · Conclusión que no concluye.** El final reformula la introducción sin añadir nada.
- **L006 · Introducción que parafrasea el encargo.** Arranca reescribiendo el título o la pregunta antes de decir algo.
- **L007 · Listas donde tocaba prosa.** Un razonamiento troceado en viñetas sin conexión entre ellas.
- **L008 · Viñetas con paralelismo perfecto.** Todas empiezan por la misma categoría gramatical y miden lo mismo.
- **L009 · Números redondos de elementos.** Siempre 3, 5 o 10 puntos, sin que el contenido lo justifique.
- **L010 · Encabezados genéricos.** "Beneficios", "Desafíos", "Consideraciones", "Conclusión": valdrían para cualquier tema.
- **L011 · Cobertura plana.** Toca todos los ángulos con la misma profundidad; no se nota qué le importa al autor.
- **L012 · Transición señalizada en cada párrafo.** Ningún párrafo arranca sin su conector.
- **L013 · Coda de retos y futuro.** Un apartado final de "desafíos y perspectivas" pegado por sistema.
- **L014 · Ni una digresión.** No hay paréntesis personales, desvíos ni cabos sueltos; todo avanza en línea recta.
- **L015 · Mucha longitud, poca información.** Si subrayas lo que cada frase añade de nuevo, queda muy poco.
- **L016 · Simetría artificial.** Mismo número de pros que de contras, mismo espacio para cada postura.

### C2. Ritmo y sintaxis

- **L017 · Ritmo uniforme.** Frases de longitud parecida una tras otra, o alternancia larga-corta mecánica.
- **L018 · Frase corta de efecto.** Tras una frase larga, un remate breve y solemne ("Y eso lo cambia todo.").
- **L019 · Tríadas por sistema.** Enumera siempre de tres en tres: adjetivos, ventajas, ejemplos.
- **L020 · Parejas de casi sinónimos.** "Claro y conciso", "rápida y eficiente": dos palabras donde bastaba una.
- **L021 · Antítesis fabricada.** "No es X, es Y" cuando nadie había dicho X; un hombre de paja para lucir el giro.
- **L022 · Anáforas de discurso.** Repeticiones retóricas al inicio de frases seguidas en un texto que no es un discurso.
- **L023 · Gerundio de coletilla.** La frase se alarga con un gerundio de consecuencia vaga ("…, garantizando así una experiencia óptima").
- **L024 · Pasiva calcada.** "Fue desarrollado por", "está siendo analizado" donde el español prefiere activa o pasiva refleja.
- **L025 · Pronombres sujeto sobrantes.** "Él dijo… Ella respondió… Ellos decidieron" sin necesidad de contraste.
- **L026 · Posesivos a la inglesa.** "Levantó su mano", "cerró sus ojos" en vez de artículo.
- **L027 · Orden rígido.** Siempre sujeto-verbo-objeto; faltan las dislocaciones naturales ("Eso lo sé yo", "A mí me da igual").
- **L028 · Adjetivo valorativo antepuesto.** "Una rica historia", "un profundo impacto", "una vibrante comunidad", de forma sistemática.
- **L029 · Nominalización en cadena.** "La realización de la implementación de la mejora" en vez de verbos.
- **L030 · Sintaxis sin tropiezos.** Ni una frase a medias, ni un anacoluto, ni una autocorrección, en textos espontáneos.
- **L031 · Pregunta retórica autorrespondida.** Pregunta y contesta acto seguido para introducir el siguiente punto.
- **L032 · Dos puntos o raya como redoble.** La puntuación se usa para anunciar un remate ("Solo hay un problema: el tiempo.").
- **L033 · Corrección uniforme.** Concordancias y subjuntivos impecables de principio a fin, también donde el registro es informal.
- **L034 · Puntuación de manual en registro coloquial.** Comas vocativas, tildes diacríticas y signos de apertura perfectos en un supuesto mensaje rápido.

### C3. Léxico y registro

- **L035 · Vocabulario de folleto.** Crucial, fundamental, clave, integral, innovador, repetidos sin carga real.
- **L036 · Verbos comodín elevados.** Utilizar, realizar, poseer, efectuar, llevar a cabo, donde lo natural era usar, hacer, tener.
- **L037 · Metáforas de catálogo.** Viaje, tapiz, faro, puente, semilla, brújula, motor, pilar.
- **L038 · Metáforas que no se sostienen.** Imágenes mezcladas o que, leídas en literal, no significan nada.
- **L039 · Intensificadores vacíos.** "Realmente", "verdaderamente", "profundamente" que no intensifican nada.
- **L040 · Español sin geografía.** No se puede adivinar de dónde es el autor: ni un giro local, ni un localismo.
- **L041 · Mezcla de variantes.** "Vosotros" junto a "computadora", "ordenador" junto a "ustedes" sin motivo.
- **L042 · Tratamiento inconsistente.** Salta de tú a usted o a vosotros dentro del mismo texto.
- **L043 · Falsos amigos.** "Eventualmente" por finalmente, "asumir" por suponer, "remover" por quitar, "soportar" por admitir.
- **L044 · Calcos fraseológicos.** "Al final del día", "hace sentido", "tomar una decisión informada", "estar en la misma página".
- **L045 · Modismos ausentes o mal encajados.** Ningún refrán ni frase hecha, o usados con un matiz que un nativo no les daría.
- **L046 · Coloquialismo impostado.** Cuando intenta sonar cercano recurre a jerga desfasada o exagerada.
- **L047 · Registro plano.** El mismo tono para el dato, la anécdota y la broma; nunca sube ni baja.
- **L048 · Variación elegante forzada.** Rota sinónimos para no repetir (empresa, compañía, organización, entidad) aunque confunda.
- **L049 · Lenguaje higienizado.** Evita palabrotas, términos crudos y juicios duros incluso cuando el contexto los pide.
- **L050 · Desdoblamientos mecánicos.** Fórmulas inclusivas o "los y las" aplicadas con regularidad de plantilla.
- **L051 · Tecnicismo correcto, jerga ausente.** Usa los términos del manual pero no el argot de quien trabaja en ello.
- **L052 · Sin sufijos apreciativos.** Ni un diminutivo, aumentativo o despectivo en un texto que quiere ser coloquial.
- **L053 · Sin marcadores orales.** Faltan "pues", "bueno", "o sea", "vamos", "a ver" donde un hablante los pondría.
- **L054 · Adverbios en -mente apilados.** Varios por párrafo, a veces dos en la misma frase.

### C4. Contenido y especificidad

- **L055 · Párrafo intercambiable.** Cambias el tema por otro y el párrafo sigue valiendo.
- **L056 · Sin datos verificables.** No hay nombres, fechas, cifras ni lugares que se puedan comprobar.
- **L057 · Ejemplos prototípicos.** "Una pequeña empresa", "un estudiante que quiere mejorar": casos de manual, no casos reales.
- **L058 · Nombres de catálogo.** María, Juan, Carlos, Ana García, "Empresa X".
- **L059 · Cifras sin fuente.** Porcentajes redondos o demasiado precisos que no se atribuyen a nadie.
- **L060 · Atribuciones vagas.** "Los expertos coinciden", "diversos estudios señalan".
- **L061 · Referencias inventadas.** Autores reales con títulos que no existen, DOI o URL que no encajan con lo citado.
- **L062 · Citas demasiado redondas.** Entrecomillados perfectos atribuidos a personas reales, sin fuente.
- **L063 · Importancia afirmada, no demostrada.** Dice que algo "desempeña un papel crucial" sin enseñar por qué.
- **L064 · Explica lo obvio.** Define conceptos que su lector natural ya conoce.
- **L065 · Sin conocimiento situado.** Nada que solo sepa quien estuvo allí, lo hizo o lo sufrió.
- **L066 · Anécdota de cartón piedra.** Experiencia "personal" sin cuándo, dónde ni con quién.
- **L067 · Detalles sensoriales de stock.** El aroma del café, la luz que se filtra por la ventana, el murmullo de la ciudad.
- **L068 · Tiempo difuso.** "Recientemente", "en los últimos años", nunca una fecha.
- **L069 · Referencias culturales importadas.** Ejemplos de Estados Unidos o globales en un texto que se supone local.
- **L070 · Error factual con aplomo.** Un dato falso, sobre todo local (calles, leyes, fechas), dicho sin titubeo.
- **L071 · Contradicciones suaves.** Una sección afirma algo y otra lo contrario sin que el texto lo note.
- **L072 · Valoración sin escena.** Reseñas que califican ("una obra conmovedora") sin citar un solo momento concreto.
- **L073 · Consejos de sentido común.** "Define tus objetivos", "sé constante", "busca el equilibrio".
- **L074 · Sin fricción con la realidad.** No aparecen costes, excepciones ni "esto falla cuando…"; todo funciona en abstracto.

### C5. Postura, voz y pragmática

- **L075 · Equidistancia.** Nunca se moja; todo "depende de cada caso".
- **L076 · Matización acumulada.** Cada afirmación llega envuelta en reservas.
- **L077 · Optimismo por defecto.** Tono positivo y final esperanzador pase lo que pase.
- **L078 · Moralina.** Lección o llamada a la reflexión que nadie pidió.
- **L079 · Entusiasmo de atención al cliente.** Cordialidad exclamativa sin motivo.
- **L080 · Validación emocional de manual.** "Es completamente normal sentirse así" como respuesta refleja.
- **L081 · Descargos no pedidos.** Advertencias de prudencia o de "consulta a un profesional" que el contexto no exige.
- **L082 · Sin humor ni ironía.** O, si lo hay, humor blanco y previsible.
- **L083 · Sin aristas.** Ni una opinión impopular, ni una queja, ni una manía, ni un entusiasmo concreto.
- **L084 · Sin destinatario real.** No presupone nada compartido con el lector; escribe para cualquiera.
- **L085 · Voz de profesor.** Tono didáctico constante aunque el género sea otro.
- **L086 · Metacomentario.** El texto habla de sí mismo: "como hemos visto", "veamos ahora".
- **L087 · Fórmulas de guía.** "Imagina que…", "piensa en…", "vayamos por partes".
- **L088 · Rastro de conversación.** Restos de saludo servicial, de oferta final o de respuesta a una petición que no está en el texto.
- **L089 · Consigna cumplida al pie de la letra.** Cubre todos los puntos del enunciado, en su orden, con la extensión exacta.
- **L090 · Emoción declarada, no mostrada.** "Sentí una profunda tristeza" en lugar de lo que pasó.

### C6. Narrativa y texto personal

- **L091 · Personajes con una sola voz.** Todos hablan igual y con frases completas.
- **L092 · Final de epifanía.** El conflicto se resuelve limpio, con aprendizaje o reconciliación.
- **L093 · Ambientación y nombres por defecto.** Elena, Mateo, Lucía; pueblo costero, faro, librería antigua.
- **L094 · Narrador que explica el tema.** El texto dice en voz alta qué significa la historia.

### C7. Formato en contexto y coherencia global

- **L095 · Markdown fuera de lugar.** Negritas, encabezados o tablas en un canal donde nadie los escribe.
- **L096 · Emojis estructurales.** Un emoji por punto o por título, con función de viñeta.
- **L097 · Tipografía imposible para el canal.** Comillas curvas, rayas y puntos suspensivos Unicode en un supuesto mensaje de móvil.
- **L098 · Salto de estilo.** Tramos pulidos junto a tramos con errores: indicio de pegado parcial.
- **L099 · Desajuste con el autor declarado.** El nivel, el vocabulario o los conocimientos no cuadran con quien firma.
- **L100 · Sin huellas de proceso.** Ni erratas, ni dudas, ni "edito:", ni referencias a lo que pasó mientras escribía.

### Contrapesos humanos (el LLM debe buscarlos también)

- **H01** Erratas de teclado y descuidos coherentes entre sí (siempre la misma falta).
- **H02** Referencias a contexto compartido que el texto no explica ("lo de ayer", "como dijo Marta").
- **H03** Datos hiperlocales o personales comprobables.
- **H04** Opiniones tajantes, quejas, sarcasmo o mala leche.
- **H05** Humor interno, juegos de palabras que dependen de la cultura local.
- **H06** Digresiones y cambios de rumbo; ideas que se abandonan.
- **H07** Desigualdad de esfuerzo: partes cuidadas y partes despachadas.
- **H08** Jerga de gremio o de generación usada con naturalidad.

---

## Parte D — Cómo combinarlo

**Puntuación.** Calcula por separado la suma ponderada de regex (por 1000 palabras), las métricas de la parte B y el veredicto del LLM. Entrena una regresión logística sencilla encima con tu corpus: te dará pesos reales y verás qué reglas no aportan nada. Con menos de 150 palabras, devuelve "indeterminado".

**Capa LLM.** No le pases las 100 reglas de golpe: rinde mejor por bloques (C1 a C7), una llamada por bloque. Exige cita literal para cada regla activada y descarta las que vengan sin cita. Pide el veredicto al final, no al principio, para que no racionalice.

```text
Eres un analista de estilo. Evalúa el TEXTO contra las REGLAS.
Para cada regla devuelve: id, activa (0, 1 o 2), cita literal del texto que la justifica.
Si no puedes citar, activa = 0.
Busca también los contrapesos H01-H08 con el mismo formato.
No des un veredicto global hasta haber recorrido todas las reglas.
Responde solo con JSON:
{"reglas":[{"id":"L001","activa":0,"cita":""}],
 "contrapesos":[{"id":"H01","activa":0,"cita":""}],
 "veredicto":"humano | mixto | ia | indeterminado",
 "confianza":0.0}

REGLAS:
{{bloque_de_reglas}}

TEXTO:
{{texto}}
```

**Qué informar.** Nunca "esto es IA" a secas: mejor una probabilidad, las cinco señales que más pesaron y las citas. Te lo van a discutir.

## Fuentes

- [Wikipedia: Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing) — el catálogo más completo; buena parte de los bloques A3–A6 y C4 son su adaptación al castellano.
- [Las 9 señales de Pangram](https://pasqualepillitteri.it/es/news/13027/9-senales-escritura-ia-pangram) — frecuencias de Markdown, viñetas y glifos en texto humano frente a IA.
- [El nuevo em-dash: 9 señales](https://pasqualepillitteri.it/es/news/11197/nuevo-em-dash-9-senales-escritura-ia) — por qué la raya larga ya no basta.
- [10 señales de que tu ensayo fue escrito por IA](https://howmanywords.app/es/blog/senales-de-que-tu-ensayo-fue-escrito-por-ia) — ritmo uniforme y clichés en español.
- [Señales del estilo de ChatGPT](https://howmanywords.app/es/blog/senales-del-estilo-de-escritura-de-chatgpt) — géneros donde estas señales dan falsos positivos.
