> Estado actual: 60 fichas y 22 comprobaciones ejecutables. Esta página conserva las 44 fichas iniciales; véase [la ampliación](investigacion-ampliada.md) y `rules/es-ES/ampliacion.json` para las 16 nuevas.

# Catálogo inicial de reglas para castellano de España

Las 44 fichas siguientes son candidatas para Humanizador. Sus ejemplos ilustran problemas editoriales; no permiten deducir quién escribió el texto. Cada regla tiene una versión, ámbito, procedimiento propuesto y casos en los que debe abstenerse. La versión 0.1 implementa 13 detectores literales en `core/rules.mjs`; las otras 31 fichas siguen como investigación. Ninguna regla se ha evaluado todavía en un corpus editorial representativo.

El catálogo estructurado está en [inicial.json](../rules/es-ES/inicial.json). Los procedimientos descritos son especificaciones: un patrón literal identifica un pasaje para revisar; una regla contextual necesita interpretar su función. Incluso una sustitución mecánica requiere comprobar el significado y aprobar su ocurrencia.

## Fundamento y activación

La mayoría de reglas procede del diseño editorial basado en las preferencias de Roberto. Las fuentes comunitarias aportan pistas y Fundéu aporta recomendaciones lingüísticas concretas. Los artículos de investigación orientan la evaluación; no validan las expresiones ni los umbrales de este catálogo. Las referencias abreviadas se resuelven al final.

Se propone comenzar la prueba vertical con HES-001, 002, 004, 008 y 010. Detectar sus expresiones es sencillo; decidir si sobran exige leer el pasaje. No habrá sustitución global de muletillas. Las reglas de comparación necesitan dos versiones del texto y las de formato necesitan extracción fiable de estilos.

Todos los umbrales numéricos son propuestas iniciales sin calibrar. Las reglas se mantienen desactivadas por defecto hasta pasar sus casos de validación. Los géneros técnico, narrativo, académico y profesional pueden necesitar activaciones diferentes.

El campo «detección» indica cómo se seleccionaría el pasaje: coincidencia literal, medida numérica, análisis lingüístico, lectura contextual o comparación entre versiones. Una coincidencia literal se puede producir de forma determinista; afirmar que la frase sobra exige una decisión editorial. Las reglas contextuales podrán generar sugerencias humanas o de un LLM, que se registrarán por separado. El JSON describe ese trabajo pendiente y no se puede cargar hoy en un motor para ejecutar las 44 reglas.

## Fichas

### HES-001 Muletilla de importancia

**Ámbito:** sentence. **Familia:** lexico. **Severidad propuesta:** medium. **Detección:** literal. **Fundamento:** RC, AD.

Detectar la locución fuera de citas y comprobar si solo anuncia la información siguiente.

Expresiones candidatas: «cabe destacar que», «es importante señalar que», «conviene destacar que».

**Pasaje para revisar:** Cabe destacar que el equipo tiene cinco personas.

**Intervención posible:** El equipo tiene cinco personas.

**Caso donde abstenerse:** En este capítulo explico por qué conviene destacar las excepciones.

Conservar si anuncia una distinción relevante; no eliminar el contenido posterior.

### HES-002 Cierre anunciado

**Ámbito:** sentence. **Familia:** lexico. **Severidad propuesta:** low. **Detección:** literal. **Fundamento:** RC.

Localizar la fórmula; revisar si el cierre aporta síntesis necesaria o repite sin avance.

Expresiones candidatas: «en definitiva», «en conclusión», «para concluir».

**Pasaje para revisar:** En definitiva, la cola permite procesar los documentos por turnos.

**Intervención posible:** La cola procesa los documentos por turnos.

**Caso donde abstenerse:** En conclusión, aceptamos la hipótesis alternativa tras las pruebas anteriores.

Conservar conclusiones argumentadas y secciones cuyo género exige conclusión.

### HES-003 Reformulación vacía

**Ámbito:** paragraph. **Familia:** lexico. **Severidad propuesta:** medium. **Detección:** literal. **Fundamento:** RC.

Comparar la frase posterior con la anterior; emitir aviso solo si no aclara ni añade precisión.

Expresiones candidatas: «dicho de otro modo», «en otras palabras».

**Pasaje para revisar:** La tarea pasa a la cola. Dicho de otro modo, la tarea se encola.

**Intervención posible:** La tarea pasa a la cola.

**Caso donde abstenerse:** El arrendamiento caduca. En otras palabras, otro worker puede retomar la tarea si el primero deja de responder.

Conservar analogías o reformulaciones que permiten entender un concepto.

### HES-004 Invitación de plantilla

**Ámbito:** sentence. **Familia:** lexico. **Severidad propuesta:** medium. **Detección:** literal. **Fundamento:** RC, FM.

Localizar la invitación al comienzo de un apartado y revisar su función.

Expresiones candidatas: «vamos a sumergirnos», «adentrémonos», «exploremos juntos».

**Pasaje para revisar:** Vamos a sumergirnos en el fascinante mundo de las colas.

**Intervención posible:** La cola guarda los trabajos pendientes.

**Caso donde abstenerse:** Vamos a sumergirnos cuando el instructor dé la señal.

Excluir sentido literal, diálogo y voz narrativa deliberada.

### HES-005 Apertura genérica de época

**Ámbito:** paragraph. **Familia:** lexico. **Severidad propuesta:** medium. **Detección:** literal. **Fundamento:** RC, AD.

Buscar al abrir un apartado; revisar si hay marco temporal concreto necesario.

Expresiones candidatas: «en el mundo actual», «en la era digital», «en un mundo cada vez más».

**Pasaje para revisar:** En el mundo actual, las empresas deben guardar sus documentos.

**Intervención posible:** Las empresas deben guardar sus documentos.

**Caso donde abstenerse:** En la era digital cambió el soporte de los archivos de este museo; el apartado compara ambos periodos.

Conservar el marco si interviene en el argumento y se precisa.

### HES-006 Promesa sin contenido

**Ámbito:** paragraph. **Familia:** lexico. **Severidad propuesta:** medium. **Detección:** literal. **Fundamento:** RC, FM.

Localizar la promesa; pedir qué acción o resultado afirma realmente el pasaje.

Expresiones candidatas: «llevar al siguiente nivel», «desbloquear el potencial», «solución integral».

**Pasaje para revisar:** Esta solución integral llevará tu proceso al siguiente nivel.

**Intervención posible:** Especificar qué pasos cubre y qué cambia, con datos ya aportados.

**Caso donde abstenerse:** La solución integral de la ecuación se calcula con estas condiciones de contorno.

Excluir acepciones técnicas y promesas demostradas en el contexto.

### HES-007 Importancia sin justificación

**Ámbito:** paragraph. **Familia:** lexico. **Severidad propuesta:** medium. **Detección:** literal. **Fundamento:** RC.

Revisar qué consecuencia respalda el juicio y si ya se ha explicado.

Expresiones candidatas: «es crucial», «es fundamental», «resulta imprescindible».

**Pasaje para revisar:** Es crucial validar el fichero para garantizar la excelencia.

**Intervención posible:** Antes de analizarlo, comprobamos que se puede abrir.

**Caso donde abstenerse:** Es imprescindible conocer la contraseña para descifrar este PDF.

Conservar necesidad real y condiciones precisas; no rebajar obligación.

### HES-008 Referencia temporal vaga

**Ámbito:** sentence. **Familia:** lexico. **Severidad propuesta:** low. **Detección:** literal. **Fundamento:** RC.

Señalar usos repetidos o un marco temporal sin función; conservar la certeza temporal.

Expresiones candidatas: «a día de hoy», «hoy en día», «actualmente».

**Pasaje para revisar:** A día de hoy, actualmente usamos dos herramientas.

**Intervención posible:** Actualmente usamos dos herramientas.

**Caso donde abstenerse:** A día de hoy no hay sentencia firme; la fecha de esta revisión importa.

No suprimir temporalidad que limita una afirmación; concretar fecha solo si se dispone de ella.

### HES-009 Calco de cierre temporal

**Ámbito:** sentence. **Familia:** lexico. **Severidad propuesta:** low. **Detección:** literal. **Fundamento:** RC, FM.

Distinguir cierre figurado de una hora o periodo real.

Expresiones candidatas: «al final del día».

**Pasaje para revisar:** Al final del día, la decisión depende del coste.

**Intervención posible:** La decisión depende del coste.

**Caso donde abstenerse:** Al final del día cerramos la oficina y hacemos la copia de seguridad.

La lectura temporal literal es válida; la alternativa depende del argumento.

### HES-010 Verbo de presentación inflado

**Ámbito:** sentence. **Familia:** lexico. **Severidad propuesta:** medium. **Detección:** literal. **Fundamento:** RC, AD.

Comprobar si el giro sustituye a una relación simple o describe posicionamiento real.

Expresiones candidatas: «se erige como», «se posiciona como».

**Pasaje para revisar:** El registro se erige como la fuente de los trabajos pendientes.

**Intervención posible:** El registro contiene los trabajos pendientes.

**Caso donde abstenerse:** La marca se posiciona como alternativa económica en su campaña.

Conservar posicionamiento y lenguaje propio del género cuando aporte significado.

### HES-011 Verbo nominal innecesario

**Ámbito:** sentence. **Familia:** sintaxis. **Severidad propuesta:** low. **Detección:** linguistic. **Fundamento:** RC, FC.

Detectar perífrasis seguida de nombre de acción; comprobar si existe un verbo equivalente con la misma modalidad.

Expresiones candidatas: «proceder a», «llevar a cabo la», «realizar la».

**Pasaje para revisar:** El servidor procede a realizar la validación del fichero.

**Intervención posible:** El servidor valida el fichero.

**Caso donde abstenerse:** Antes de proceder a la firma, lee las condiciones.

No condensar si expresa fase, autorización o distinción técnica relevante.

### HES-012 Autoridad sin fuente identificable

**Ámbito:** paragraph. **Familia:** contenido. **Severidad propuesta:** high. **Detección:** context. **Fundamento:** RC, BL.

Revisar atribución y referencias próximas; pedir autor o fuente cuando faltan.

Expresiones candidatas: «los expertos afirman», «según diversos estudios», «la ciencia demuestra».

**Pasaje para revisar:** Según diversos estudios, esta técnica siempre mejora la comprensión.

**Intervención posible:** Identificar los estudios y ajustar la afirmación a lo que muestran.

**Caso donde abstenerse:** Según los estudios de Ana Pérez citados en la nota 4, el efecto depende de la muestra.

No inventar una referencia ni borrar la afirmación como forma de ocultar la falta de apoyo.

### HES-013 Contraste sin alternativa planteada

**Ámbito:** paragraph. **Familia:** discurso. **Severidad propuesta:** medium. **Detección:** context. **Fundamento:** RC.

Identificar la oposición y revisar si la alternativa aparece en el problema o aclara una confusión real.

Expresiones candidatas: «no es», «no se trata de», «sino».

**Pasaje para revisar:** No es una herramienta. Es una revolución.

**Intervención posible:** Explicar qué hace la herramienta y qué cambia.

**Caso donde abstenerse:** No es un fallo de conexión, sino de permisos: el servidor devuelve 403.

Conservar contrastes que corrigen un diagnóstico o delimitan el significado.

### HES-014 Pregunta y respuesta de plantilla

**Ámbito:** paragraph. **Familia:** discurso. **Severidad propuesta:** medium. **Detección:** context. **Fundamento:** RC.

Localizar pregunta breve seguida de respuesta enfática; revisar recurrencia y función pedagógica.

**Pasaje para revisar:** ¿El resultado? Una eficiencia sin precedentes.

**Intervención posible:** Describir el resultado concreto que ya consta en el texto.

**Caso donde abstenerse:** ¿Qué pasa si caduca el arrendamiento? Otro worker puede retomar la tarea.

Conservar preguntas útiles, entrevistas y diálogos; no prohibir el recurso.

### HES-015 Tríadas reiteradas

**Ámbito:** section. **Familia:** sintaxis. **Severidad propuesta:** low. **Detección:** metric. **Fundamento:** RC.

Candidata: tres o más enumeraciones de tres elementos en cinco párrafos; revisar si la simetría fuerza contenido.

**Pasaje para revisar:** Ágil, potente y sencillo. Rápido, seguro y fiable. Flexible, completo y eficaz.

**Intervención posible:** Mantener solo los atributos explicados por el pasaje.

**Caso donde abstenerse:** El análisis consta de extracción, detección y exportación.

Las enumeraciones de tres pasos reales son válidas. Umbral propuesto, sin calibrar.

### HES-016 Arranques repetidos

**Ámbito:** section. **Familia:** sintaxis. **Severidad propuesta:** low. **Detección:** metric. **Fundamento:** RC.

Candidata: misma secuencia inicial de dos a cuatro palabras en tres oraciones seguidas; revisar intención.

**Pasaje para revisar:** Este sistema guarda el fichero. Este sistema lo analiza. Este sistema lo exporta.

**Intervención posible:** El sistema guarda el fichero, lo analiza y permite exportarlo.

**Caso donde abstenerse:** Yo estaba allí. Yo lo vi. Yo decidí contarlo.

Conservar anáfora y énfasis deliberados; no fusionar fases distintas si se pierde orden.

### HES-017 Referente poco claro

**Ámbito:** paragraph. **Familia:** sintaxis. **Severidad propuesta:** high. **Detección:** context. **Fundamento:** RC, FC.

Pedir el antecedente inequívoco cuando hay varias entidades compatibles en el contexto.

Expresiones candidatas: «esto», «ello», «lo anterior», «este enfoque».

**Pasaje para revisar:** La API llama al worker y al extractor. Este falla.

**Intervención posible:** Precisar qué componente falla si la información está disponible.

**Caso donde abstenerse:** La petición caduca. Esto impide recibir el resultado.

No inventar el antecedente; puede quedar una pregunta editorial pendiente.

### HES-018 Actor necesario ausente

**Ámbito:** paragraph. **Familia:** sintaxis. **Severidad propuesta:** medium. **Detección:** context. **Fundamento:** RC, FC.

Revisar si el lector necesita saber quién ejecuta la acción y el contexto no lo indica.

Expresiones candidatas: «se debe», «se realizará», «se procede».

**Pasaje para revisar:** Se debe revisar el resultado antes de exportarlo.

**Intervención posible:** El autor revisa el resultado antes de exportarlo, si esa responsabilidad está confirmada.

**Caso donde abstenerse:** Se venden libros usados.

La impersonal y la pasiva son legítimas; no exigir sujeto donde no aporta.

### HES-019 Oración difícil de seguir

**Ámbito:** sentence. **Familia:** sintaxis. **Severidad propuesta:** medium. **Detección:** linguistic. **Fundamento:** RC.

Candidata: más de 45 palabras y al menos tres subordinadas; comprobar referentes y relaciones antes de avisar.

**Pasaje para revisar:** La oración acumula varias condiciones, incisos y excepciones sin dejar claro a qué operación se refieren.

**Intervención posible:** Separar el pasaje conservando cada condición y su alcance.

**Caso donde abstenerse:** Una oración larga con enumeración bien ordenada y condiciones inequívocas.

La longitud selecciona para revisar, no demuestra mala escritura. Umbral propuesto.

### HES-020 Ristra de frases telegráficas

**Ámbito:** paragraph. **Familia:** sintaxis. **Severidad propuesta:** medium. **Detección:** metric. **Fundamento:** RC.

Candidata: cuatro oraciones seguidas de seis palabras o menos en prosa explicativa.

**Pasaje para revisar:** Todo cambia. Nada encaja. Hay dudas. El equipo espera.

**Intervención posible:** Conectar la situación, sus causas y consecuencias según el contexto.

**Caso donde abstenerse:** Cuatro intervenciones breves de un diálogo.

Excluir diálogo, instrucciones breves y énfasis intencional. Umbral propuesto.

### HES-021 Cautelas redundantes

**Ámbito:** sentence. **Familia:** sintaxis. **Severidad propuesta:** medium. **Detección:** literal. **Fundamento:** RC.

Localizar acumulación de marcadores y comprobar qué incertidumbre necesita conservarse.

Expresiones candidatas: «podría posiblemente», «quizá tal vez», «puede potencialmente».

**Pasaje para revisar:** El cambio podría posiblemente afectar al resultado.

**Intervención posible:** El cambio podría afectar al resultado.

**Caso donde abstenerse:** Podría afectar al resultado, aunque todavía no sabemos en qué condiciones.

Mantener hipótesis, cautelas distintas y límites reales; no transformar posibilidad en certeza.

### HES-022 Rayas parentéticas reiteradas

**Ámbito:** section. **Familia:** presentacion. **Severidad propuesta:** low. **Detección:** metric. **Fundamento:** RC.

Candidata: tres pares de rayas parentéticas en tres párrafos; revisar legibilidad y preferencia de autor.

**Pasaje para revisar:** Una explicación usa rayas para casi todos sus incisos, con varios encajados en la misma oración.

**Intervención posible:** Proponer paréntesis o reordenar solo tras revisar la frase.

**Caso donde abstenerse:** —No voy —dijo Ana—. Nos vemos mañana.

Excluir diálogo, títulos, nombres y uso editorial deliberado. Umbral propuesto.

### HES-023 Gerundio que oscurece la relación

**Ámbito:** sentence. **Familia:** sintaxis. **Severidad propuesta:** medium. **Detección:** linguistic. **Fundamento:** FG, RC.

Analizar sujeto, vínculo temporal o causal y papel del gerundio; avisar si el enlace es incierto.

**Pasaje para revisar:** El informe se envió el lunes, aprobándose el viernes sin relación explicada.

**Intervención posible:** El informe se envió el lunes y se aprobó el viernes.

**Caso donde abstenerse:** Tropezó, rompiéndose una pierna.

Aplicar la recomendación actual, que admite ciertos usos posteriores; no reemplazar todos los gerundios.

### HES-024 Ritmo excesivamente uniforme

**Ámbito:** section. **Familia:** sintaxis. **Severidad propuesta:** low. **Detección:** metric. **Fundamento:** RC, ST.

Hipótesis: al menos diez oraciones con coeficiente de variación de longitud inferior a 0,15; revisión opcional.

**Pasaje para revisar:** Diez frases sucesivas mantienen el mismo tamaño y estructura sin necesidad del contenido.

**Intervención posible:** Revisar el pasaje completo, sin imponer una mezcla artificial de longitudes.

**Caso donde abstenerse:** Un procedimiento usa pasos breves de longitud semejante.

No activar por defecto. El umbral es experimental y depende del género.

### HES-025 Conclusión repetida en varios bloques

**Ámbito:** section. **Familia:** discurso. **Severidad propuesta:** medium. **Detección:** context. **Fundamento:** RC.

Comparar conclusión, resumen y aplicación; mostrar fragmentos si repiten el mismo argumento sin función nueva.

**Pasaje para revisar:** El mismo consejo aparece en el cuerpo, ideas clave, aplicación y cierre sin añadir nada.

**Intervención posible:** Conservar la explicación y convertir los otros bloques en aportaciones distintas si hacen falta.

**Caso donde abstenerse:** Un resumen ejecutivo permite leer la decisión sin recorrer el informe completo.

Conservar recapitulación útil y lectura por capas.

### HES-026 Cierre que explica una escena ya clara

**Ámbito:** paragraph. **Familia:** discurso. **Severidad propuesta:** medium. **Detección:** context. **Fundamento:** RC.

Revisar si la frase posterior a un ejemplo solo impone una moraleja evidente.

**Pasaje para revisar:** El equipo pudo entregar después de resolver el bloqueo. Esto demuestra la importancia de colaborar.

**Intervención posible:** Conservar la escena y quitar la moraleja solo si no añade un matiz.

**Caso donde abstenerse:** La escena termina con una conclusión técnica necesaria que no se deduce de forma directa.

Preservar la opinión sentenciosa del autor cuando cumple una función.

### HES-027 Anuncio reiterado de lo que sigue

**Ámbito:** section. **Familia:** discurso. **Severidad propuesta:** low. **Detección:** literal. **Fundamento:** RC.

Buscar recurrencia y verificar si la referencia orienta al lector hacia una dependencia real.

Expresiones candidatas: «como veremos más adelante», «en el siguiente apartado veremos», «a continuación exploraremos».

**Pasaje para revisar:** Cada apartado termina anunciando que en el siguiente veremos más detalles.

**Intervención posible:** Cerrar con el problema concreto que enlaza ambos apartados.

**Caso donde abstenerse:** La definición completa está en el apartado 4; aquí basta conocer su función.

Conservar referencias necesarias y orientación en obras largas.

### HES-028 Encabezado duplicado por la primera frase

**Ámbito:** block. **Familia:** discurso. **Severidad propuesta:** medium. **Detección:** context. **Fundamento:** RC.

Comparar título y primera oración; comprobar si la oración solo repite el rótulo.

**Pasaje para revisar:** Título: Control de costes. Primera frase: El control de costes consiste en controlar los costes.

**Intervención posible:** Empezar por cómo se limita o mide el consumo, con información disponible.

**Caso donde abstenerse:** Título: Control de costes. Primera frase: Cada trabajo tiene un presupuesto máximo de llamadas.

Una definición real puede ser necesaria aunque repita el término.

### HES-029 Transición que no conecta el argumento

**Ámbito:** section. **Familia:** discurso. **Severidad propuesta:** high. **Detección:** context. **Fundamento:** RC, FC.

Leer el final de un apartado y el principio del siguiente; localizar el enlace ausente.

**Pasaje para revisar:** Una explicación sobre extracción pasa a precios sin explicar qué gasto introduce el procesamiento.

**Intervención posible:** Explicar la relación entre procesamiento y coste si está sustentada por el contenido.

**Caso donde abstenerse:** Dos capítulos independientes de un libro de relatos.

No inventar relaciones causales ni obligar a conectar unidades independientes.

### HES-030 Ejemplo sin desarrollo suficiente

**Ámbito:** paragraph. **Familia:** discurso. **Severidad propuesta:** high. **Detección:** context. **Fundamento:** RC.

Revisar si el ejemplo permite entender situación, acción y resultado que ilustra.

**Pasaje para revisar:** Una empresa usó IA y mejoró mucho.

**Intervención posible:** Pedir qué hizo y qué cambió; completar solo con material del autor.

**Caso donde abstenerse:** Para ilustrar un formato basta mostrar un nombre de fichero.

No forzar un relato completo en cada ejemplo breve.

### HES-031 Sustitución del caso por consejo genérico

**Ámbito:** document. **Familia:** fidelidad. **Severidad propuesta:** high. **Detección:** diff. **Fundamento:** RC.

Comparar antes y después: localizar eliminación de escena o ejemplo a favor de una recomendación abstracta.

**Pasaje para revisar:** El borrador conserva una escena del equipo; la propuesta la reemplaza por «fomenta la colaboración».

**Intervención posible:** Recuperar la escena y aclarar su relación con el argumento.

**Caso donde abstenerse:** El autor pide expresamente resumir y permite omitir ejemplos.

Solo detectable con fuente de comparación; no acusar pérdida sin ella.

### HES-032 Contenido omitido al abreviar

**Ámbito:** document. **Familia:** fidelidad. **Severidad propuesta:** high. **Detección:** diff. **Fundamento:** RC.

Comparar inventario de argumentos, condiciones y referencias entre versiones.

**Pasaje para revisar:** Una propuesta elimina la excepción que limitaba cuándo aplicar la regla.

**Intervención posible:** Restituir la condición y reordenar si hace falta.

**Caso donde abstenerse:** Resumen solicitado con selección de alcance aprobada por el autor.

No usar una métrica de longitud como prueba de pérdida; revisar el significado.

### HES-033 Negrita reiterada sin función

**Ámbito:** section. **Familia:** presentacion. **Severidad propuesta:** low. **Detección:** metric. **Fundamento:** RC.

Candidata: más del 20 % de palabras en negrita en prosa de al menos 200 palabras; revisar jerarquía.

**Pasaje para revisar:** Un párrafo destaca casi todos sus sustantivos y deja de señalar una prioridad.

**Intervención posible:** Reducir el énfasis a los elementos que facilitan la lectura.

**Caso donde abstenerse:** Una tabla usa negrita en encabezados de columna.

Solo si la extracción conserva formato fiable. Umbral propuesto.

### HES-034 Explicación convertida en viñetas

**Ámbito:** section. **Familia:** presentacion. **Severidad propuesta:** medium. **Detección:** context. **Fundamento:** RC.

Revisar listas que expresan razonamiento dependiente sin conectores ni desarrollo.

**Pasaje para revisar:** Problema. Cambio. Impacto. Beneficio. Sin explicar las relaciones.

**Intervención posible:** Desarrollar el razonamiento en párrafos y conservar las enumeraciones reales.

**Caso donde abstenerse:** Lista de los cuatro ficheros que se van a descargar.

Conservar listas, tablas y pasos cuando ayudan a leer.

### HES-035 Títulos con molde repetido

**Ámbito:** document. **Familia:** presentacion. **Severidad propuesta:** low. **Detección:** context. **Fundamento:** RC.

Detectar una misma secuencia de títulos aplicada a tres o más apartados y revisar pertinencia.

**Pasaje para revisar:** Todos los apartados repiten «qué es», «por qué importa», «cómo aplicarlo» aunque no corresponda.

**Intervención posible:** Nombrar el contenido real de cada apartado.

**Caso donde abstenerse:** Una colección de fichas comparables necesita la misma estructura.

Conservar formatos de obra, fichas y plantillas solicitadas.

### HES-036 Residuo de conversación en un documento

**Ámbito:** document. **Familia:** presentacion. **Severidad propuesta:** high. **Detección:** literal. **Fundamento:** RC, BL.

Buscar fórmulas del asistente fuera de diálogo o material citado.

Expresiones candidatas: «como modelo de lenguaje», «espero que esto te ayude», «si quieres, puedo».

**Pasaje para revisar:** Espero que esto te ayude. Si quieres, puedo ampliar el documento.

**Intervención posible:** Quitar el envoltorio conversacional tras confirmar que no forma parte de la obra.

**Caso donde abstenerse:** El ensayo cita «como modelo de lenguaje» para analizar respuestas de un chatbot.

Excluir citas, diálogo, correos y cierres pertinentes.

### HES-037 Variante léxica fuera del perfil

**Ámbito:** paragraph. **Familia:** es-ES. **Severidad propuesta:** low. **Detección:** literal. **Fundamento:** RC.

Comparar con glosario del proyecto y contexto; señalar inconsistencia si existe, no procedencia.

Expresiones candidatas: «computadora», «celular», «ustedes», «vos».

**Pasaje para revisar:** Una interfaz es-ES alterna «ordenador» y «computadora» para el mismo objeto sin motivo.

**Intervención posible:** Unificar según el glosario elegido, si no es cita ni comparación regional.

**Caso donde abstenerse:** El capítulo compara el uso de «ordenador» en España y «computadora» en América.

No condenar variantes válidas, citas o personajes; «ustedes» también se usa en España.

### HES-038 Cambio injustificado de trato

**Ámbito:** section. **Familia:** es-ES. **Severidad propuesta:** medium. **Detección:** linguistic. **Fundamento:** RC.

Detectar mezcla de tú, usted y vosotros con el mismo destinatario; revisar cambio de voz.

**Pasaje para revisar:** Primero sube tu fichero. Después deberá revisar su documento.

**Intervención posible:** Mantener el trato elegido para ese destinatario.

**Caso donde abstenerse:** El narrador habla de tú y una carta citada trata al lector de usted.

No corregir cambios de interlocutor o citas; comprobar antecedentes.

### HES-039 Terminología incoherente

**Ámbito:** document. **Familia:** es-ES. **Severidad propuesta:** medium. **Detección:** linguistic. **Fundamento:** RC, FC.

Comparar usos de términos declarados equivalentes en el glosario y sus referentes.

**Pasaje para revisar:** El mismo resultado se llama informe, entrega y documento sin aclarar si son cosas distintas.

**Intervención posible:** Elegir un término o explicar las diferencias reales.

**Caso donde abstenerse:** PDF original, informe de revisión y fichero de cambios son objetos diferentes.

No introducir sinónimos para aparentar variedad ni fusionar conceptos distintos.

### HES-040 A nivel de sin altura o jerarquía

**Ámbito:** sentence. **Familia:** es-ES. **Severidad propuesta:** low. **Detección:** linguistic. **Fundamento:** FN.

Revisar si expresa altura o jerarquía; proponer una preposición solo si se mantiene la relación.

Expresiones candidatas: «a nivel de», «a nivel».

**Pasaje para revisar:** El fallo ocurre a nivel de la interfaz.

**Intervención posible:** El fallo ocurre en la interfaz.

**Caso donde abstenerse:** El asunto se tratará a nivel de dirección.

Usos físicos y jerárquicos admitidos; la preposición depende del contexto.

### HES-041 Cambio de persona narrativa

**Ámbito:** document. **Familia:** fidelidad. **Severidad propuesta:** high. **Detección:** diff. **Fundamento:** RC.

Comparar primera persona, narrador y atribución entre origen y propuesta.

**Pasaje para revisar:** «Yo decidí parar» se convierte en «Roberto recomienda detener el proceso».

**Intervención posible:** Conservar la persona narrativa y la experiencia expresada.

**Caso donde abstenerse:** El autor solicita adaptar el pasaje a una ficha biográfica en tercera persona.

Solo con comparación de origen o perfil explícito; respetar adaptación solicitada.

### HES-042 Experiencia o dato inventado

**Ámbito:** paragraph. **Familia:** fidelidad. **Severidad propuesta:** high. **Detección:** diff. **Fundamento:** RC.

Comprobar detalles nuevos contra origen y material autorizado: recuerdos, cifras, nombres y citas.

**Pasaje para revisar:** La propuesta añade «recuerdo cuando nuestro equipo ahorró un 30 %» sin fuente.

**Intervención posible:** Eliminar el detalle añadido o pedir la información real al autor.

**Caso donde abstenerse:** El dato está aportado por el autor y referenciado en el contexto.

No inventar detalles para dar apariencia humana; separar ficción autorizada.

### HES-043 Cambio de certeza o condición

**Ámbito:** paragraph. **Familia:** fidelidad. **Severidad propuesta:** high. **Detección:** diff. **Fundamento:** RC.

Comparar negaciones, modalidad, cuantificadores y cláusulas condicionales.

**Pasaje para revisar:** «Puede reducir el tiempo si el PDF tiene texto» pasa a «reduce el tiempo con cualquier PDF».

**Intervención posible:** Conservar posibilidad y condición original.

**Caso donde abstenerse:** El autor aporta pruebas nuevas y aprueba cambiar la afirmación.

No simplificar límites materiales ni sustituir hipótesis por hecho.

### HES-044 Pérdida de voz o accesibilidad oral

**Ámbito:** section. **Familia:** fidelidad. **Severidad propuesta:** medium. **Detección:** context. **Fundamento:** RC.

Revisar humor y opiniones frente al perfil; en material narrable comprobar referencias que dependen de lo visual.

**Pasaje para revisar:** «Como muestra el bloque verde de la tabla» no se entiende en audio sin descripción.

**Intervención posible:** Nombrar la condición o resultado; adaptar locución desde la misma fuente editorial.

**Caso donde abstenerse:** Un documento exclusivamente visual explica la leyenda de su gráfico.

No neutralizar provocaciones del autor ni afirmar pérdida de voz sin muestra o fuente; aplicar oralidad solo si corresponde.

## Procedencia de las fichas

- **RC**: Preferencias globales de Roberto y encargo de Humanizador. Perfil Roberto; criterios editoriales propios, sin inferencia de autoría.
- **BL**: [blader humanizer](https://github.com/blader/humanizer/tree/225a6f39ac85f76ee48dbad772ea4abe4ed6c9d8). Inspiración editorial en inglés; requiere adaptación y evaluación.
- **AD**: [adelaidasofia humanizer](https://github.com/adelaidasofia/humanizer/blob/9c764db0e7331f27f803522205f01c78a0a67ed1/SKILL.md). Patrones candidatos en español, sin validación independiente.
- **FM**: [humanizer multilingual fichero español](https://github.com/finestructure-ai/humanizer-multilingual/blob/f6a3d7e4a3a0fe8a404954dcc03fff8ed77bc9f9/plugins/humanizer-multilingual/skills/humanize/references/spanish.md). Pistas léxicas; se rechazan generalizaciones sobre usos legítimos y autoría.
- **FC**: [Conclusiones del seminario de lenguaje claro](https://www.fundeu.es/wp-content/uploads/2017/05/Conclusiones_Seminario_Lenguaje_Claro.pdf). Claridad, destinatario y conservación de precisión; no lista de marcadores de IA.
- **FN**: [Fundéu a nivel de](https://www.fundeu.es/recomendacion/a-nivel-de-usos-correctos-e-incorrectos-1054/). Distingue altura y jerarquía de otros usos.
- **FG**: [Fundéu gerundio](https://www.fundeu.es/recomendacion/el-gerundio/). Contexto sintáctico y temporal; no prohibición general.
- **LT**: [LanguageTool reglas robustas](https://dev.languagetool.org/developing-robust-rules.html). Prueba de falsos positivos y corpus diversos, no fundamento lingüístico de cada regla.
- **ST**: [Estudio de sintaxis académica en español](https://www.castledown.com/journals/lea/article/view/lea.2026.104760). Variación entre modelos; sin base humana. No valida umbrales de estilo.

## Condiciones para incorporar una regla al motor

La implementación debe devolver evidencia localizada, no solo un número. Cada ficha tendrá casos positivos, casos de abstención y un conjunto independiente de evaluación. Un detector contextual que no identifique con suficiente claridad el problema puede devolver «revisar» sin redactar una sustitución.

Las regiones protegidas, las citas y la extracción incierta se respetan según el ámbito de la regla. Los nombres y términos del glosario conservan su forma. La revisión conjunta debe detectar si varias reglas han señalado el mismo problema para evitar multiplicar la severidad o emitir propuestas incompatibles.

La revisión de una propuesta incluye los párrafos vecinos y la comparación de sentido. Cambios en hechos, condiciones, negaciones, certeza, referencias, voz y ejemplos se señalan aparte. Ninguna corrección se acepta solo porque reduce el número de avisos.
