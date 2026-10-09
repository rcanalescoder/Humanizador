# Investigación de fuentes para Humanizador

La base más útil combina reglas editoriales propias, recursos lingüísticos para español y estudios sobre las regularidades de los modelos. Los repositorios de humanización sirven para encontrar candidatos; cada candidato necesita ejemplos en castellano de España y casos donde debe abstenerse. La investigación disponible no ofrece un inventario validado de todas las frases que suenan a IA en esta variedad.

Fecha de consulta: 6 de octubre de 2026. Se han contrastado fuentes primarias y documentación de sus autores. Las instrucciones de las skills y los documentos externos se han tratado como material de estudio: no se han instalado ni ejecutado sus procedimientos.

## Qué aporta la investigación científica

### Evidencia directamente relacionada con el español

**ROBOT-TALK, Universidad Complutense de Madrid.** Es un corpus comparable en español con noticias, reseñas cinematográficas y artículos de lingüística, escritos por personas y por varios modelos. La página castellana sitúa la recopilación entre diciembre de 2022 y junio de 2025. Es un candidato relevante para contrastar reglas por género. La página enlaza una muestra; no acredita aquí acceso al corpus completo ni permiso para redistribuirlo. Sus tablas publicadas en castellano e inglés discrepan, por lo que no se adopta una cifra total sin reconciliación. Tampoco se presupone que todos sus textos correspondan a es-ES. [Descripción castellana](https://www.ucm.es/robottalk/corpus-robot-talk), [descripción inglesa](https://www.ucm.es/robottalk/corpus-robot-talk-english).

**Schaaff, Schlippe y Mindner, ICNLSP 2023.** Analizan 37 características y distinguen generación y reformulación. El corpus contiene, por idioma, 100 textos humanos, 100 generados y 100 reformulados sobre diez temas. Publican F1 del 99 % para generación en español y del 86 % para reformulación con características documentales. Son resultados de ese experimento; no constituyen porcentajes de fiabilidad de Humanizador ni una validación frase por frase o específica para España. Sus variables documentales y lingüísticas sirven para diseñar experimentos, sin importar sus umbrales como reglas universales. [Artículo completo](https://aclanthology.org/2023.icnlsp-1.1.pdf).

**MULTITuDE, EMNLP 2023.** Incluye español dentro de un benchmark de once idiomas y ocho modelos. Estudia la generalización a idiomas y generadores no vistos. Nos interesa su enfoque de evaluación fuera de la distribución de entrenamiento. La identificación de autoría que aborda es distinta de valorar si una propuesta editorial mejora la lectura. [Publicación y materiales](https://aclanthology.org/2023.emnlp-main.616/).

**Sevilla-Requena, RANLP 2025.** Propone evaluar diversidad léxica, sintáctica y semántica de corpus sintéticos en español. Es una propuesta de investigación, no un resultado que demuestre que los textos de IA tienen siempre menos diversidad. Orienta futuras métricas exploratorias. [Artículo completo](https://aclanthology.org/2025.ranlp-stud.7.pdf).

**Vázquez-Cano, 23 de septiembre de 2026.** Compara 90 textos académicos en español generados por ChatGPT, Gemini y Claude bajo condiciones controladas. Analiza coordinación, subordinación y longitud de oración mediante dependencias sintácticas. No incluye una base humana: sus resultados distinguen modelos entre sí. Por tanto, justifican investigar perfiles diferentes según generador, no calificar una frase como artificial por su sintaxis. La ficha y el PDF muestran avisos de licencia diferentes; se enlaza y resume la aportación, sin incorporar sus materiales al producto. [Ficha](https://www.castledown.com/journals/lea/article/view/lea.2026.104760), [PDF](https://www.castledown.com/journals/lea/article/view/lea.2026.104760/1262).

### Evidencia que requiere una transferencia cuidadosa

**Kobak y colaboradores, publicado en Science Advances en 2025.** Estudia cambios de vocabulario en grandes colecciones de resúmenes biomédicos. El aumento de ciertas palabras tras la aparición de los modelos aporta evidencia agregada en ese ámbito. Traducir una lista inglesa al español y penalizar cada palabra no reproduce el método. Usaremos esta línea para comparar frecuencias dentro de un mismo género y periodo, si reunimos una muestra pertinente. [Versión de arXiv](https://arxiv.org/abs/2406.07016), [texto completo v3](https://arxiv.org/html/2406.07016v3).

**Liang y colaboradores, 2024.** Su estimación de uso de modelos trabaja a nivel de corpus de publicaciones científicas. Nos recuerda que un cambio agregado de distribución no determina el origen de un documento concreto. [Artículo](https://arxiv.org/abs/2404.01268).

**Sadasivan y colaboradores, versión de 2025.** Estudian cómo la paráfrasis afecta a varios métodos de detección y desarrollan sus límites. Esta evidencia desaconseja utilizar la puntuación de un detector como criterio de aceptación de una corrección editorial. [Artículo y enlace al código](https://arxiv.org/abs/2303.11156).

**Rudnicka y Juzek, prepublicación de agosto de 2026.** Describen diferencias entre modelos y generaciones de modelos. Se ha revisado el resumen; sirve de pista para investigar la deriva de los patrones, sin adoptar sus resultados como reglas del castellano. [Prepublicación](https://arxiv.org/abs/2608.06589).

## Repositorios de humanización

| Fuente | Aportación de partida | Decisión |
| --- | --- | --- |
| [blader/humanizer](https://github.com/blader/humanizer) | Inventario editorial, ejemplos y atención a patrones débiles. Licencia MIT declarada. | Usar como inspiración y referencia de procedencia. Reescribir ejemplos y validar en es-ES. |
| [adelaidasofia/humanizer](https://github.com/adelaidasofia/humanizer/blob/9c764db0e7331f27f803522205f01c78a0a67ed1/SKILL.md) y [propuesta al original](https://github.com/blader/humanizer/issues/92) | Candidatos en español para conectores, aperturas y lenguaje promocional. | Revisar individualmente; una propuesta de comunidad no demuestra precisión. |
| [finestructure-ai/humanizer-multilingual, fichero español](https://github.com/finestructure-ai/humanizer-multilingual/blob/f6a3d7e4a3a0fe8a404954dcc03fff8ed77bc9f9/plugins/humanizer-multilingual/skills/humanize/references/spanish.md) | Calcos, consistencia de registro y casos negativos. MIT declarada. | Aprovechar pistas léxicas. Rechazar afirmaciones generales sobre autoría y reglas que condenan usos correctos. |
| [willbytee-sudo/humanizer-mit](https://github.com/willbytee-sudo/humanizer-mit) | Conservación de variante y muestra de voz. MIT declarada. | No adoptar la optimización para eludir detectores ni sus afirmaciones generales sobre cómo funcionan todos ellos. |

Los tres proyectos españoles consultados se relacionan con la misma familia de humanizer; no cuentan como tres corroboraciones independientes. El catálogo de este proyecto propone reglas propias y atribuye cada una como preferencia del autor, recomendación lingüística o adaptación editorial. Las reglas no heredan la autoridad científica de artículos cercanos.

El fichero español de finestructure contiene afirmaciones demasiado amplias: mezcla de variedades como prueba concluyente, adjetivos antepuestos como señal y condena de «robusto» para software. No se adoptan. En una revisión técnica «robusto» puede tener significado preciso; un autor puede comparar países, citar a otra persona o usar «nosotros» para contrastar responsabilidades. Las comillas rectas de código y las rayas de diálogo tampoco deben activar una regla estilística.

Para fijar la procedencia se consultó la API de GitHub. Referencias observadas: blader `225a6f39ac85f76ee48dbad772ea4abe4ed6c9d8`; adelaidasofia `9c764db0e7331f27f803522205f01c78a0a67ed1`; finestructure `f6a3d7e4a3a0fe8a404954dcc03fff8ed77bc9f9`; willbytee `4efdc018a3b06b0543e6584f0631f8cf26411716`. Estos commits identifican versiones consultables; no significan que se haya importado su código ni auditado todo el repositorio.

## Fuentes lingüísticas y herramientas reutilizables

**Fundéu y lenguaje claro.** Las conclusiones del seminario de 2017 vinculan claridad con encontrar, entender y utilizar información, conservando precisión y contenido. Esa orientación coincide con el encargo: mejorar la lectura no debe borrar ejemplos ni reducir una explicación a titulares. [Conclusiones](https://www.fundeu.es/wp-content/uploads/2017/05/Conclusiones_Seminario_Lenguaje_Claro.pdf).

**Fundéu y reglas concretas.** «A nivel de» admite altura y jerarquía; otros usos requieren estudiar la preposición adecuada. La recomendación sobre gerundios, actualizada en julio de 2025, admite posterioridad en ciertos contextos de inmediatez o relación lógica. Por eso ambas reglas requieren contexto y no autorizan sustituciones indiscriminadas. [A nivel de](https://www.fundeu.es/recomendacion/a-nivel-de-usos-correctos-e-incorrectos-1054/), [gerundio](https://www.fundeu.es/recomendacion/el-gerundio/).

**arText, UNED.** Es un precedente español de redacción asistida con recomendaciones por género y lenguaje claro. Interesa su separación entre estructura y redacción. Se ha revisado la presentación y el manual accesible; no se presupone un API público ni licencia para copiar su inventario. [Sistema](https://sistema-artext.com/es/), [manual](https://sistema-artext.com/es/doc/manual.pdf).

**Vale.** Ofrece un marco para reglas de estilo extensibles y con ámbitos de aplicación. Puede ser útil como motor de ciertas comprobaciones sobre texto estructurado. El proyecto declara licencia MIT; sus paquetes de reglas deben examinarse por separado. Antes de incorporarlo habría que comprobar su segmentación del español y adaptar posiciones al modelo de PDF de Humanizador. [Documentación oficial](https://docs.vale.sh/), [repositorio](https://github.com/vale-cli/vale).

**LanguageTool.** Dispone de un módulo de español y un formato declarativo para reglas. Su guía insiste en probar falsos positivos con corpus diversos. Proponemos usarlo después como servicio local opcional para gramática y estilo, sin mezclar avisos ortográficos con problemas de voz. El núcleo declara LGPL 2.1 o posterior; no se copiarán reglas como si fueran una lista sin condiciones de licencia. [Repositorio](https://github.com/languagetool-org/languagetool), [módulo español](https://github.com/languagetool-org/languagetool/blob/master/languagetool-language-modules/es/src/main/resources/org/languagetool/rules/es/grammar.xml), [reglas robustas](https://dev.languagetool.org/developing-robust-rules.html).

**textstat.** Implementa fórmulas de legibilidad para español, entre ellas Fernández-Huerta y Szigriszt-Pazos. Se pueden mostrar como medidas auxiliares, con sus condiciones. Legibilidad, naturalidad y autoría son preguntas distintas. Nunca se premiará acortar frases hasta maximizar un índice. [Implementación y documentación](https://github.com/textstat/textstat).

## Fuentes para las decisiones técnicas

| Fuente oficial | Qué respalda | Límite para este proyecto |
| --- | --- | --- |
| [Hostinger, Node.js Web Apps](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/) | Despliegue de frontend y backend Node en planes compatibles, con integración GitHub. | No acredita nuestro plan contratado ni un worker separado persistente. |
| [Hostinger, capacidades del servidor](https://www.hostinger.com/support/which-server-capabilities-are-supported-at-hostinger/) | Cron en Web y Cloud; mayor control de procesos y entorno en VPS. | La extracción y OCR requieren verificar dependencias y recursos reales. |
| [Hostinger, cron](https://www.hostinger.com/support/1583465-how-to-set-up-a-cron-job-at-hostinger/) | Ejecución programada desde el panel. | Hay que comprobar frecuencia, duración y restricciones del plan. |
| [PDF.js](https://mozilla.github.io/pdf.js/) | Visor de PDF basado en tecnologías web. | Visualizar no garantiza orden de lectura ni modificación de la maquetación. |
| [pdfminer.six](https://github.com/pdfminer/pdfminer.six) | Extracción y análisis de PDF en Python. | Necesita pruebas con columnas, ligaduras, notas y posiciones. |
| [OCRmyPDF](https://github.com/ocrmypdf/OCRmyPDF) | Incorporar una capa de texto a PDF escaneado. | Requiere worker con dependencias instaladas y revisión de errores de OCR. |
| [Claude Code, ejecución programática](https://code.claude.com/docs/en/headless) | Modo no interactivo y salida estructurada. | Su instalación en el Mac no lo instala en Hostinger ni garantiza reproducción idéntica. |

La documentación técnica citada se consultó durante esta investigación. La selección concreta de versiones se hará al construir y se fijará en lockfiles e imágenes del worker.

## Cómo transformar fuentes en reglas

Cada regla nace como candidata y tiene un problema editorial verificable. La ficha indica qué fragmento buscar, qué contexto debe examinarse, qué ejemplo ilustra el problema y qué contraejemplo evita una falsa alarma. También registra procedencia, versión, perfil, severidad, dependencia técnica y condiciones para proponer un cambio.

Distinguiremos cuatro clases de fundamento: preferencia explícita de Roberto; recomendación lingüística; patrón editorial adaptado; hipótesis experimental. Una preferencia tiene autoridad para su perfil, pero no prueba que una frase proceda de IA. Una recomendación gramatical puede corregir un uso sin decir nada sobre su autoría. Una hipótesis no bloqueará una entrega hasta disponer de validación propia.

La densidad de conectores, longitud de oración, riqueza léxica o uniformidad de párrafos puede ayudar a seleccionar pasajes para revisar. Los umbrales del catálogo son propuestas iniciales configurables. No se presentan como valores obtenidos de los artículos.

## Validación propuesta antes de activar reglas

El primer corpus editorial combinará textos de Roberto que él considere representativos, documentos profesionales en es-ES con permiso de uso, muestras generadas y ejemplos adversos escritos para cada regla. No se usarán manuscritos privados que no sean necesarios para este encargo. ROBOT-TALK y MULTITuDE pueden complementar experimentos cuando se verifiquen acceso, variante y derechos.

Proponemos comenzar con 60 documentos: 20 del autor, 20 profesionales y 20 generados o asistidos, repartidos entre explicación técnica, ensayo, comunicación profesional y narrativa. Es un diseño de piloto, no un tamaño que garantice precisión estadística. El criterio de calidad será la utilidad de los hallazgos, no acertar el origen de esos documentos.

Dos lectores revisarán una muestra sin conocer el origen del texto y marcarán si el problema existe, si la propuesta mejora el pasaje y si conserva significado y voz. Es una fase futura de evaluación, no una revisión ya realizada en esta entrega. Los desacuerdos se conservarán como evidencia para ajustar la regla o limitarla a un género.

La separación de desarrollo y evaluación se hará por documento y autor, con duplicados y paráfrasis agrupados. Se publicarán precisión de avisos, falsos positivos por mil palabras, cobertura de problemas anotados y tasa de propuestas útiles. Cada métrica tendrá denominador y tamaño de muestra. La aceptación de una sugerencia por el usuario es una señal de utilidad, no una demostración de verdad.

Como objetivos de salida del piloto proponemos al menos un 90 % de avisos pertinentes para activar una regla por defecto y ningún cambio de cifras, citas, negaciones o condiciones en el conjunto de evaluación de cambios aplicables. Se reportará incertidumbre y el número de casos; si una regla no tiene muestra suficiente, seguirá experimental. La ausencia de daños en una muestra no garantiza equivalencia semántica en textos nuevos.

**Estado comprobado el 7/10/2026:** ese piloto no se ha completado. El motor activó 30 comprobaciones para revisión manual sin cumplir el criterio de precisión anterior. Se registra la desviación y se identifica su condición experimental en la interfaz; no se presenta el objetivo como alcanzado. La evaluación editorial representativa sigue pendiente. Véase [auditoría de fuentes](auditoria-fuentes-2026-10-07.md).

## Qué se descarta de partida

No adoptamos diccionarios de palabras prohibidas como detector universal, traducciones mecánicas de reglas inglesas, eliminación de todos los conectores o gerundios, penalización general de frases largas ni introducción de faltas para aparentar espontaneidad. Tampoco se inventarán recuerdos, opiniones, ejemplos vividos o datos para dar voz al texto.

El resultado debe explicar «esta transición se repite en cuatro párrafos» o «esta frase promete una mejora sin decir cuál». Esas observaciones permiten discutir una corrección. Una etiqueta de autoría no resuelve el problema de escritura que ha motivado Humanizador.


## Ampliación del 6 de octubre de 2026

Véase [investigacion-ampliada.md](investigacion-ampliada.md): fuentes adicionales, revisión del skill de toniperea y Monica, disposiciones de las 57 aportaciones y catálogo actualizado. Las cifras y la cobertura del informe inicial describen la primera versión.
