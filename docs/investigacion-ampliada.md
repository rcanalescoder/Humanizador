# Ampliación de la investigación: castellano de España

Fecha: 6 de octubre de 2026. Esta revisión amplía el informe inicial y corrige su cobertura insuficiente. El catálogo pasa de 44 a 60 fichas. El motor pasa de 13 búsquedas literales a 22 comprobaciones ejecutables; las 38 restantes necesitan revisión contextual o desarrollo. Una ficha documentada no equivale a un detector implementado y una coincidencia no equivale a un error.

## Qué hemos revisado y qué aporta cada fuente

Se consultaron fuentes primarias: repositorios, referencias lingüísticas, páginas de los trabajos científicos y documentación del producto. Se leyeron completos los cuatro adjuntos y el skill que señaló Roberto. Para los artículos se revisaron resúmenes y secciones pertinentes; no se presenta esta revisión como una reproducción de sus experimentos. No se instalaron plugins ni se ejecutó código de terceros.

| Fuente | Aportación útil | Límite y decisión |
|---|---|---|
| [humanizar-texto-es, copia de toniperea en el registro](https://github.com/majiayu000/claude-skill-registry/blob/baa7aad33924d121f544b221f7534cd500b310f8/skills/productivity/humanizar-texto-es-toniperea-humanizar-texto-es/SKILL.md) | Revisar ritmo, enumeraciones y fórmulas; acompañar los cambios de un análisis. | Sus once técnicas mezclan edición y evasión. No adoptar cuotas de vocabulario, errores deliberados, emociones añadidas ni su baremo de humanidad: no aporta validación. Tampoco acredita por sí mismo español de España. |
| [Aboudjem/humanizer-skill](https://github.com/Aboudjem/humanizer-skill/tree/a58df065367550b6ce40ff3f648335018d8e0589) | Amplía la revisión a marcadores sin completar, citas técnicas pegadas, atribuciones de capacidades y residuos de borrador. | Un catálogo de patrones para un modelo no es una implementación de todos ellos. Los ejemplos ingleses requieren adaptación y pruebas españolas. |
| [harshaneel/humanize](https://github.com/harshaneel/humanize/tree/9c3dec34dc8e0ed9d26de14a869900a714da8f9e) | Reescritura organizada por aspectos y bibliografía para contrastar hipótesis. | La cantidad de referencias declarada no prueba que las transformaciones conserven el significado ni que funcionen en nuestro género. |
| [human-writing-skills](https://github.com/whh110112/human-writing-skills/tree/f6939121530e5bf9c29744546868d154c86fea3b) | Continuidad del contexto y de la voz a lo largo de un trabajo. | Protocolo para modelos; no una lista de infracciones deterministas. |
| [RAE: raya](https://www.rae.es/dpd/raya) | Distinguir parlamento, inciso, verbo de habla y acción independiente. | La mayúscula no depende solo de si hay verbo de habla: un inciso dentro del enunciado puede empezar en minúscula. No confundir ortografía con autoría. |
| [RAE: comillas](https://www.rae.es/dpd/comillas) y [puntos suspensivos](https://www.rae.es/dpd/puntos%20suspensivos) | Citas anidadas, continuidad y puntuación. | Respetar convenciones y citas del original. Los saltos de línea del PDF no identifican párrafos de manera fiable. |
| [ASALE: Guía panhispánica de lenguaje claro y accesible](https://www.asale.org/sites/default/files/2025-10/Gu%C3%ADa%20panhisp%C3%A1nica%20de%20lenguaje%20claro%20y%20accesible.pdf) | Revisar referentes, acumulación de incisos y nominalizaciones que dificultan la comprensión. | Una nominalización válida no debe reemplazarse automáticamente. Adaptar las recomendaciones al género. |
| [LengClaro2023](https://arxiv.org/abs/2506.05927) | Corpus español para evaluar simplificación de textos administrativos. | Claridad y detección de IA son tareas distintas. No valida nuestra humanización de ensayo o narrativa. |
| [Interpretable Stylistic Variation](https://arxiv.org/abs/2604.14111) | Analiza estilo por género, modelo y generación sobre RAID. El género tiene un peso considerable. | No extrapolar sus rasgos a un umbral universal para el castellano de España. |
| [Temporal Flattening](https://aclanthology.org/2026.findings-acl.682/) | Estudia evolución de escritura a lo largo del tiempo. En su muestra, los LLM tienen mayor diversidad léxica. | Desmiente la comodidad de asumir siempre menor diversidad; no ofrece una regla para juzgar una frase de un manuscrito. |
| [DAMAGE](https://aclanthology.org/2025.genaidetect-1.9/) | Audita 19 humanizadores; separa fidelidad y fluidez de capacidad para eludir detectores. Sus ejemplos muestran degradación y cambios de contenido. | Sus autores pertenecen a Pangram. No es una evaluación de Monica ni una validación es-ES; se consultaron especialmente las secciones 3 y 4 del PDF. |
| [Monica Bypass AI](https://monica.im/es/bypass-ai) | Flujo de entrada, análisis, reescritura y comparación. | La página comercial afirma integración con detectores y preservación del mensaje, pero no proporciona catálogo, algoritmo o ensayo reproducible. No hemos probado el servicio ni enviado documentos. |
| Cuatro adjuntos de Roberto | 30 entradas DLG y 27 HUM: diálogo, voz, fidelidad y protocolos. | Las 57 disposiciones están en [aportaciones-reglas.md](aportaciones-reglas.md); no se inflan como 57 reglas independientes. |

Las referencias de repositorios se fijan por commit. Las fichas de aplicación tienen redacción propia; no se importa el código ni el texto de los catálogos. La licencia del repositorio no sustituye a la de sus fuentes citadas: una incorporación literal futura necesitará revisar esa procedencia.

## Pautas que hemos descartado o corregido

La naturalidad no exige imperfecciones. Introducir erratas, inventar una reacción o convertir un dato incierto en una afirmación rotunda cambia el trabajo del autor. Tampoco vamos a reemplazar todos los ejemplos por recuerdos ficticios ni a añadir expresiones coloquiales para simular una voz española. El perfil conserva primero lo que Roberto ha escrito.

Las listas sirven para enumeraciones reales. Las frases breves pueden dar énfasis y los contrastes pueden corregir una confusión. El problema se decide por su función y por los párrafos vecinos, no por la presencia de una estructura. La medición de ritmo permite localizar un tramo; no explica por sí sola qué debería cambiar.

Una comprobación de vigencia evitó añadir una regla errónea: [FundéuRAE, actualización del 18 de abril de 2025](https://www.fundeu.es/recomendacion/con-base-en-base-a-sobre-la-base-de-basandose-en/), considera admisibles «en base a» y «con base en», aunque recomienda alternativas. No se catalogan como incorrecciones universales.

## Qué cambia en el producto

Se añaden 16 fichas: plantillas incompletas, marcas internas de cita, caracteres de alfabetos distintos, capacidades humanas atribuidas a herramientas, prestigio de fuentes sin aportación, siete convenciones de diálogo, vocativos reiterados, exposición artificial en diálogo, suspensión con puntos de más y etiquetas de razonamiento. Las convenciones de diálogo permanecen contextuales: antes de automatizarlas hace falta reconstruir párrafos y distinguir parlamentos de listas.

Se ejecutan nueve comprobaciones adicionales: perífrasis de acción muy concretas (HES-011), fórmulas de autoridad (012), contraste sintáctico (013), tres arranques iguales consecutivos (016), cuatro frases de hasta seis palabras (020), marcadores de plantilla (045), marcas de cita (046), puntos de más (059) y etiquetas de razonamiento (060). Las dos ventanas de ritmo no se ejecutan en Narrativa y evitan referencias numeradas y párrafos separados. Sus umbrales son decisiones de implementación provisionales, no resultados científicos.

El buscador une cortes de palabra por guion y salto de línea mediante una correspondencia de posiciones. El texto original permanece intacto: cada hallazgo devuelve el fragmento exacto del PDF y sus offsets en puntos de código Unicode. La aplicación de cambios sigue exigiendo aprobación y precondiciones. Se conservan las citas entrecomilladas y los bloques protegidos.

## Criterio para ampliar y validar

Cada ficha necesita procedencia, alcance, método, un caso para revisar y un caso que deba conservarse. Se distingue búsqueda literal, patrón estructural y revisión contextual. Ninguna ficha nueva declara precisión o tasa de falsos positivos sin una evaluación etiquetada.

El siguiente corpus debe separar explicación técnica, ensayo, comunicación y narrativa es-ES, con texto propio, texto generado conocido y texto editado. Debe contener anáforas voluntarias, bibliografías, listas reales, contrastes útiles y diálogo bien puntuado. Primero se mide la precisión de los avisos por regla y género; después se mide si una propuesta conserva significado y voz. El número de hallazgos ni una nota de humanidad sustituyen esas dos comprobaciones.
