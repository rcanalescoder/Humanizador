# Historias de usuario de Humanizador

La primera versión ya permite subida, procesamiento persistente, revisión, decisiones y exportaciones. Las historias siguientes siguen siendo el backlog de producto; no se consideran cerradas automáticamente por ese recorrido. Consulta [operacion.md](operacion.md) para distinguir la cobertura construida de los criterios pendientes.

El primer recorrido completo permite a Roberto subir un PDF, leerlo mientras el servidor lo analiza, discutir cada aviso y exportar las correcciones aprobadas. El producto se construirá alrededor de ese recorrido y de la conservación del significado, antes de ampliar métricas o formatos.

Las prioridades son P0 (necesaria para ese recorrido), P1 (ampliación siguiente) y P2 (evolución). Las historias son una propuesta de construcción, no funcionalidades ya implementadas. Se identifican dependencias por ID; los criterios describen comportamiento observable.

## Documentos y lectura

### HU-01 Subir un PDF · P0

Como autor, quiero subir un PDF para revisarlo sin copiar y pegar su contenido.

La subida comprueba tipo real y límites configurados, conserva nombre original y hash y crea una versión privada. Un fichero inválido o demasiado grande muestra un error concreto. El análisis posterior utiliza el fichero del servidor, no una copia que solo existe en el navegador.

### HU-02 Leer el PDF original · P0 · Depende de HU-01

Como autor, quiero ver el original en pantalla para situar cada aviso en su página.

El visor permite cambiar página, buscar y ajustar zoom. Abrir el documento no espera al análisis completo. Tras seleccionar un hallazgo, la página y el resaltado coinciden con su anclaje, también después de cambiar zoom o rotación.

### HU-03 Comprobar la extracción · P0 · Depende de HU-01

Como autor, quiero saber qué texto ha podido leer el sistema para no revisar errores introducidos por la extracción.

Se muestra cobertura por página y aviso en columnas o zonas inciertas. El texto extraído conserva un mapa al PDF. Una página sin texto seleccionable solicita OCR o queda explícitamente excluida; nunca se anuncia como analizada sin contenido.

### HU-04 Elegir el contexto editorial · P0

Como autor, quiero indicar género, destinatario, trato y perfil para recibir avisos adecuados.

El perfil es-ES se mantiene en todo el análisis. Los campos admiten explicación técnica, ensayo, comunicación profesional y narrativa como valores iniciales. El sistema conserva la configuración usada y crea un análisis nuevo si la cambio; no recalcula silenciosamente un resultado anterior.

### HU-05 Analizar PDF escaneado · P1 · Depende de HU-03 y HU-10

Como autor, quiero extraer texto mediante OCR cuando el PDF es una imagen.

El trabajo se ejecuta en servidor con idioma y versiones registrados. El visor distingue el original de su derivado con OCR. Zonas dudosas suspenden propuestas hasta revisar la extracción; los errores OCR no se contabilizan como problemas de estilo.

### HU-06 Trabajar con versiones y fuentes editables · P2 · Depende de HU-01 y HU-26

Como autor, quiero asociar nuevas versiones y la fuente editable para aplicar cambios donde redacto realmente.

Cada versión tiene hashes y anclajes propios. Al importar Markdown o DOCX se valida la correspondencia con el PDF y se señalan discrepancias. Los hallazgos antiguos no se trasladan por coincidencia aproximada sin revisión.

## Procesamiento en servidor

### HU-07 Iniciar el análisis asíncrono · P0 · Depende de HU-03 y HU-04

Como autor, quiero lanzar un análisis y seguir leyendo mientras termina.

La API registra el trabajo y devuelve su ID sin mantener abierta la petición durante todo el proceso. El análisis fija catálogo, configuración y versión del documento. Repetir la petición con la misma clave de idempotencia no crea dos trabajos.

### HU-08 Recuperar el progreso · P0 · Depende de HU-07

Como autor, quiero volver a la revisión después de cerrar el navegador.

El servidor continúa trabajando con la pestaña cerrada. Al regresar veo etapa, unidades procesadas, errores y resultados persistidos. Un trabajo terminado no se vuelve a lanzar solo por abrir la pantalla.

### HU-09 Cancelar o reintentar un trabajo · P0 · Depende de HU-07

Como autor, quiero detener un análisis o reintentar un fallo sin perder el original.

La cancelación impide publicar resultados posteriores como completos. Un reintento conserva la causa del fallo anterior y reutiliza solo etapas compatibles. Reiniciar el worker recupera trabajos con arrendamiento vencido sin duplicar hallazgos o exportaciones.

### HU-10 Conocer límites y fallos · P0 · Depende de HU-07

Como autor, quiero distinguir un análisis parcial, un fallo y una revisión terminada.

Cada trabajo tiene límites configurados de tiempo, tamaño, páginas y consumo. Un fallo indica etapa y acción posible. Si una parte queda excluida o el LLM no responde, la pantalla y la exportación muestran esa cobertura; un cero de hallazgos no significa que toda la obra se haya leído.

## Hallazgos y evaluación editorial

### HU-11 Detectar patrones explícitos · P0 · Depende de HU-07 y HU-29

Como autor, quiero localizar expresiones y repeticiones que conviene revisar.

El motor aplica las reglas habilitadas del perfil y produce ID estable, localización y fragmento exacto. Excluye citas y zonas protegidas según cada regla. Con los mismos datos y versiones devuelve los mismos hallazgos en el mismo orden.

### HU-12 Entender un hallazgo · P0 · Depende de HU-11

Como autor, quiero saber por qué se ha marcado una frase antes de cambiarla.

La ficha muestra regla, explicación, evidencia observada, severidad y procedencia. Distingue coincidencia literal de interpretación con contexto. No presenta el aviso como una prueba de autoría ni un porcentaje de IA.

### HU-13 Filtrar y recorrer hallazgos · P0 · Depende de HU-02 y HU-11

Como autor, quiero recorrer los avisos por página, familia y estado.

Puedo filtrar por severidad, regla y decisión pendiente o resuelta. Un clic o la navegación por teclado llevan al pasaje correcto. El número mostrado representa hallazgos únicos y no suma varias veces un mismo problema agrupado.

### HU-14 Identificar problemas entre párrafos · P1 · Depende de HU-11 y HU-31

Como autor, quiero localizar cierres repetidos, explicaciones vacías y saltos de argumento que no se ven en una sola frase.

Cada aviso estructural muestra todos los fragmentos que lo justifican y el contexto utilizado. Puede indicar que necesita revisión en lugar de inventar una sustitución. Las reglas experimentales permanecen separadas de las activadas por defecto.

### HU-15 Ver un resumen comparable · P0 · Depende de HU-11

Como autor, quiero conocer cuánto trabajo editorial queda y cómo cambia entre versiones.

El resumen presenta pendientes por familia, severidad, cobertura y densidad por mil palabras analizadas. La comparación ordinaria exige mismo catálogo y perfil. Si difieren, muestra la diferencia de configuración y permite un reanálisis común antes de atribuir la variación a la redacción.

Las condiciones de revisión del perfil determinan el estado mostrado. «Listo para exportar» comprueba operaciones y conflictos; «Revisión completa» exige resolver los hallazgos y cobertura acordados. La severidad editorial y la confianza o tipo de evidencia se muestran por separado.

### HU-16 Examinar métricas auxiliares · P2 · Depende de HU-15

Como autor, quiero explorar legibilidad, repetición y ritmo para decidir dónde leer con más atención.

Las métricas indican fórmula, versión, denominador y zonas incluidas. Una oración larga o un índice de legibilidad no bloquean por sí solos un documento. No hay una puntuación global opaca que premie recortar contenido.

## Decisiones y conservación de la voz

### HU-17 Aprobar una propuesta concreta · P0 · Depende de HU-12

Como autor, quiero aceptar una corrección por ocurrencia para controlar lo que cambia.

Veo el antes/después y los párrafos vecinos. La aprobación guarda el texto exacto y la versión de origen. Si la propuesta afecta a varios bloques, se muestra y aprueba su alcance completo de forma atómica.

### HU-18 Redactar mi propia corrección · P0 · Depende de HU-17

Como autor, quiero editar la propuesta cuando no expresa lo que quería decir.

Puedo modificar la sustitución y comparar el pasaje completo. El cambio queda atribuido al usuario y pasa las mismas comprobaciones de anclaje y conflicto. Cancelar la edición conserva el original y la decisión anterior.

### HU-19 Conservar una ocurrencia · P0 · Depende de HU-12

Como autor, quiero descartar un aviso cuando la expresión es deliberada.

Conservar una frase resuelve ese hallazgo sin cambiar las reglas generales. Puedo anotar el motivo y reabrirlo. Un reanálisis con el mismo catálogo y anclaje recupera la decisión; una nueva versión requiere correspondencia verificada.

### HU-20 Proteger citas, ejemplos y términos · P0 · Depende de HU-03

Como autor, quiero proteger pasajes cuya forma debe conservarse.

Puedo marcar cita literal, código, título, nombre o expresión propia. El motor no propone cambios automáticos en esas regiones. Los avisos de riesgo pueden mostrarse aparte y explican que el pasaje está protegido.

### HU-21 Mantener un perfil de voz · P1 · Depende de HU-04 y HU-29

Como autor, quiero incorporar mis preferencias y muestras representativas para evitar una redacción uniforme.

El perfil distingue preferencias globales de reglas de una obra. Conserva primera persona, humor y expresiones deliberadas. Una muestra orienta al modelo pero no le autoriza a inventar vivencias; las preferencias derivadas se revisan antes de activarlas.

### HU-22 Resolver propuestas incompatibles · P0 · Depende de HU-17

Como autor, quiero resolver conflictos antes de exportar.

El sistema detecta intervalos solapados e inserciones en el mismo punto. Muestra las alternativas y permite escoger o redactar una propuesta conjunta. Ninguna operación conflictiva llega al paquete aplicable.

## Cambios y entregas

### HU-23 Descargar el fichero de sustituciones · P0 · Depende de HU-17, HU-22 y HU-29

Como autor, quiero descargar cambios reproducibles para aplicarlos fuera de la aplicación.

El JSON incluye origen, hashes, anclajes, versiones y operaciones aprobadas. Los pendientes van en una sección sin permiso de aplicación. El mismo origen y decisiones produce el mismo contenido canónico y hash.

### HU-24 Aplicar y deshacer el paquete · P0 · Depende de HU-23

Como autor, quiero comprobar los cambios sobre una copia y poder volver al texto anterior.

La aplicación valida todas las precondiciones antes de escribir. Un hash o fragmento incorrecto hace fallar el conjunto sin resultado parcial. Se guarda una nueva versión y el original permite deshacer sin reconstruirlo desde sustituciones inversas.

### HU-25 Descargar el informe editorial · P0 · Depende de HU-12 y HU-23

Como autor, quiero compartir el razonamiento de la revisión junto a los cambios.

El informe muestra fragmento, localización, explicación, decisión y fuente de regla. Incluye cobertura y configuración. Se exporta inicialmente como HTML imprimible y texto estructurado; un PDF de informe posterior se verifica visualmente.

### HU-26 Exportar el texto corregido · P0 · Depende de HU-24

Como autor, quiero recuperar el texto revisado sin confundirme con el PDF de entrada.

Se exporta texto estructurado y TXT legible, identificados como extracción corregida. Se conservan bloques, orden y referencias al original. No se promete el mismo diseño del PDF; una nueva maquetación lleva esa indicación.

## Catálogo y fuentes

### HU-27 Consultar reglas y ejemplos · P0

Como autor, quiero consultar las reglas para entender qué estilo se está evaluando.

Cada ficha contiene problema, ámbito, ejemplo, contraejemplo, fundamento y versión. Distingue preferencia personal de norma lingüística y candidato de regla validada. Puedo ver qué reglas estaban activadas en un análisis anterior.

### HU-28 Ampliar el catálogo · P1 · Depende de HU-27

Como editor, quiero añadir una regla con casos de prueba sin modificar toda la aplicación.

El formato valida campos, IDs y referencias. El editor de reglas admite patrones declarativos acotados, no código arbitrario. La regla nueva nace desactivada, exige casos positivos y negativos y no altera análisis históricos.

### HU-29 Fijar versiones del catálogo y perfil · P0 · Depende de HU-27

Como autor, quiero poder repetir una revisión con las mismas reglas.

Cada análisis guarda versiones inmutables y hashes del catálogo, perfil y dependencias que afectan al resultado. Una actualización crea otra versión. Los cambios ya aprobados siguen vinculados a la versión que los propuso.

### HU-30 Consultar la procedencia · P0 · Depende de HU-27

Como autor, quiero ver de dónde viene cada regla y qué demuestra su fuente.

La ficha enlaza fuente, fecha de consulta y revisión fijada cuando existe. Registra si es investigación, recomendación o patrón comunitario. Varias adaptaciones de un mismo repositorio no se presentan como corroboraciones independientes.

### HU-31 Validar falsos positivos · P1 · Depende de HU-28

Como editor, quiero medir la utilidad de una regla antes de activarla para todos los textos.

Los casos de evaluación están separados del desarrollo por documento y autor. Se registran avisos pertinentes, falsos positivos y desacuerdos humanos. La aplicación muestra tamaños de muestra y evita declarar validada una regla basándose solo en ejemplos sintéticos.

## Ayuda de un modelo

### HU-32 Solicitar propuestas con contexto · P1 · Depende de HU-12 y HU-34

Como autor, quiero pedir una propuesta para un pasaje que necesita más que una sustitución literal.

El adaptador envía el fragmento, párrafos vecinos y restricciones del perfil. Recibe una propuesta estructurada anclada al origen y conserva la respuesta. Una propuesta que inventa datos o no corresponde al pasaje se rechaza; las restantes quedan pendientes de aprobación.

### HU-33 Comprobar fidelidad de una propuesta · P1 · Depende de HU-32

Como autor, quiero ver si una corrección cambia datos, certeza, condiciones o voz.

El comparador señala cambios en cifras, nombres, citas, negaciones y modalidad. La revisión contextual distingue propuesta estilística de cambio de contenido. El sistema solicita revisión ante una diferencia relevante y no presenta su chequeo como garantía de equivalencia semántica.

### HU-34 Controlar uso y coste del LLM · P1 · Depende de HU-10 y HU-35

Como autor, quiero decidir cuándo se usa un proveedor y limitar el consumo.

Puedo completar el recorrido P0 sin LLM. Al activarlo conozco destino y contexto enviado, límite de consumo y comportamiento ante fallo. Las respuestas almacenadas se reutilizan sin volver a generar; las nuevas llamadas registran modelo, prompt y consumo disponible.

## Privacidad y despliegue

### HU-35 Mantener mis documentos privados · P0

Como autor, quiero que mis manuscritos y correcciones solo sean accesibles desde mi cuenta.

Cada acceso comprueba permisos de servidor, también al descargar archivos o conocer trabajos. Los documentos no entran en Git, directorios públicos ni logs de texto. El borrado elimina originales y derivados activos y explica la retención residual en backups.

### HU-36 Ejecutar y verificar en Hostinger · P0 · Depende de HU-08, HU-09 y HU-35

Como propietario, quiero que el servidor procese los documentos sin depender de mi Mac.

Se verifica el plan elegido, dependencias, persistencia y límites antes del despliegue. Una prueba con navegador y Mac desconectados termina y conserva su resultado. Se comprueba recuperación tras reiniciar el worker, acceso autenticado, backup y restauración de un documento de prueba.

## Entregas y dependencias

| Entrega | Historias | Condición de cierre |
| --- | --- | --- |
| Prueba vertical | Subconjunto de HU-01, 02, 03, 07, 11, 17 y 23 | Una página real pasa de PDF a hallazgo y paquete correctamente anclado. |
| MVP privado | Todas las P0: 26 historias | Recorrido completo sin LLM, decisiones y exportaciones persistentes; comprobación en Hostinger. |
| Revisión con contexto | Las ocho P1 | OCR, reglas nuevas evaluadas, perfil de voz y propuestas LLM con límites. |
| Fuentes editables y métricas | Las dos P2 | Importación con correspondencia y métricas auxiliares interpretables. |

El orden de implementación debe resolver primero el contrato de texto y anclajes. La API y la cola pueden construirse mientras se trabaja en el visor; todas las funciones de corrección dependen de que el pasaje de origen se identifique sin ambigüedad.

No se fija calendario todavía. Las historias de extracción, OCR, fidelidad y adaptación de Hostinger necesitan una prueba concreta para estimar esfuerzo. El alcance MVP se puede reducir en número de reglas activadas, pero debe conservar privacidad, persistencia, decisiones y contrato de exportación.
