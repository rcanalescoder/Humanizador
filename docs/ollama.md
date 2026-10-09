# Revisión opcional con Ollama

Humanizador funciona con sus reglas sin instalar un modelo. La revisión contextual usa la [API de chat de Ollama](https://docs.ollama.com/api/chat) y [salidas JSON estructuradas](https://docs.ollama.com/capabilities/structured-outputs). Solo admite HTTP de bucle local, sin redirecciones ni etiquetas o metadatos de modelos remotos.

## Instalación y elección del modelo

Ollama y sus modelos se instalan por separado. Ejecuta `instalar.sh` en Mac/Linux o `instalar.ps1` en Windows y elige «Reglas y Ollama local». Si el servicio no responde, el asistente te ofrece abrir la descarga oficial, comprobar de nuevo o seguir solo con reglas. No atribuye una falta de conexión a una desinstalación: Ollama también puede estar cerrado.

| Sistema | Preparación |
| --- | --- |
| Mac | Descarga el instalador, lleva Ollama a Aplicaciones y ábrelo. Necesita macOS 14 o posterior. Apple Silicon utiliza CPU/GPU; Intel utiliza CPU. |
| Windows | Ejecuta OllamaSetup, abre Ollama y después una terminal nueva para recoger el PATH. Necesita Windows 10 22H2 o posterior; la GPU depende del hardware y controladores compatibles. |
| Linux | Sigue la instalación oficial para tu distribución y comprueba que el servicio esté iniciado. |

Fuentes y requisitos actualizados: [Mac](https://docs.ollama.com/macos), [Windows](https://docs.ollama.com/windows), [Linux](https://docs.ollama.com/linux). En Windows el instalador habitual funciona en la cuenta de usuario; no hace falta abrir el puerto de Ollama a la red ni desactivar el cortafuegos. En Mac Intel un modelo puede funcionar solo con CPU y tardar mucho.

El asistente ofrece modelos instalados y una descarga opcional de [`qwen3.5:4b`](https://ollama.com/library/qwen3.5:4b), que ocupa varios GB. Es una alternativa para probar con menos recursos, no una recomendación de calidad demostrada. La configuración histórica del código es [`qwen3.6:27b-q8_0`](https://ollama.com/library/qwen3.6:27b-q8_0), de unos 30 GB de descarga. El instalador **no la descarga automáticamente**. Revisa disco, memoria y licencia del modelo; el contexto añade consumo y el tamaño en disco no es una estimación fiable de RAM necesaria. Actualiza Ollama si no reconoce un modelo reciente.

Para cambiar de elección después:

```sh
# Mac / Linux, desde la carpeta del proyecto
./instalar.sh --configure
./instalar.sh --check
```

```powershell
# Windows PowerShell, desde la carpeta del proyecto
.\instalar.ps1 -Configure
.\instalar.ps1 -Check
```

Si ya tienes Node, `node tools/install.mjs --configure` es la alternativa común sin wrappers. `--check` solo diagnostica; no instala dependencias, no guarda preferencias y no genera texto. Las preferencias quedan en `data/settings.json` (o en `HUMANIZADOR_DATA_DIR`), separadas de los documentos. Volver a ejecutar el asistente permite conservarlas. Ante un fallo no se guarda una elección nueva de Ollama; si la instalación ya había completado dependencias, se pueden aprovechar al repetirla.

## Configuración avanzada

Las variables de entorno tienen prioridad sobre las preferencias del instalador. `HUMANIZADOR_OLLAMA_MODEL` elige la etiqueta exacta; `HUMANIZADOR_OLLAMA_ENABLED=0` desactiva la integración y `=1` la habilita. `HUMANIZADOR_OLLAMA_URL` vale por defecto `http://127.0.0.1:11434`. No se carga `.env` automáticamente. Sin preferencias ni variables se conserva el comportamiento anterior: integración habilitada fuera de producción con el modelo histórico, sin descargarlo.

```sh
HUMANIZADOR_OLLAMA_ENABLED=1 HUMANIZADOR_OLLAMA_MODEL='modelo-local:etiqueta' ./arrancar.sh
```

```powershell
$env:HUMANIZADOR_OLLAMA_ENABLED = '1'
$env:HUMANIZADOR_OLLAMA_MODEL = 'modelo-local:etiqueta'
.\arrancar.ps1
```

## Saber qué está pasando

En «Revisar PDF» y «Configuración», despliega **Instalación y ayuda**. Verás si la integración está desactivada, si el servicio no responde, si falta el modelo o si está preparado. «Volver a comprobar» consulta `/api/tags` y `/api/show`; no inicia inferencia. Para instalar, el asistente abre instrucciones oficiales y pide una confirmación aparte antes de `ollama pull`. No ejecuta `ollama run`.

Subir un PDF no inicia Ollama. La revisión empieza cuando pulsas «Revisar con Ollama» y confirmas cuando corresponda, o continúas una revisión pausada. Abre «Estado y alcance del análisis · Ver actividad» para ver fase, páginas, progreso y errores. El original y las notas se conservan si falla el modelo.

| Situación | Qué hacer |
| --- | --- |
| No responde | Abre Ollama. Si falta, instálalo. Comprueba que atiende en la dirección local configurada. |
| Falta el modelo | Repite la configuración y elige uno instalado o acepta su descarga. `ollama list` enumera los modelos. |
| Modelo remoto rechazado | Elige una etiqueta local; Humanizador no acepta modelos cloud ni metadatos que indiquen un servicio remoto. |
| El comando no aparece | Abre una terminal nueva tras instalar. En Mac comprueba que abriste Ollama desde Aplicaciones; en Windows revisa la instalación de usuario. |
| Ollama ocupa memoria | `ollama ps` muestra modelos cargados y uso CPU/GPU. Un modelo puede seguir cargado aunque no esté generando. Comprueba la actividad de Humanizador antes de detenerlo. |
| Respuesta editorial inválida | Consulta el detalle del fallo. Actualiza Ollama, comprueba recursos y reintenta; otro modelo puede comportarse de forma distinta. No se da la revisión por correcta por devolver JSON. |

Para descargar memoria, `ollama stop etiqueta` descarga ese modelo de RAM; puede interrumpir a otros programas que lo usan. Primero pausa el análisis de Humanizador si está activo. Los logs de Ollama están en `~/.ollama/logs` en Mac y `%LOCALAPPDATA%\Ollama` en Windows. Consulta también la [FAQ oficial](https://docs.ollama.com/faq). No publiques logs que contengan texto privado.

## Qué comprueba

El análisis divide el texto en fragmentos de hasta 4.600 caracteres Unicode con contexto vecino. Genera propuestas, comprueba su validez editorial y, cuando hay sustituciones, revisa su fidelidad. El protocolo actual incorpora ocho principios de conservación de la voz y controles conservadores sobre cantidades, negaciones, condiciones y certeza. Puede retirar una sustitución y mantener el diagnóstico para que el autor redacte otra.

Se valida la estructura JSON, la correspondencia entre propuestas, la cita y sus offsets. La recuperación de espacios y palabras partidas exige una correspondencia única con el original. No se acepta una cita inventada. Estas comprobaciones reducen errores mecánicos; no garantizan que un diagnóstico o una sustitución sean correctos.

## Recursos y continuidad

Solo se procesa una tarea cada vez. Temperatura 0, semilla 42 y los parámetros registrados en el análisis permiten comparar condiciones, pero no garantizan inferencia determinista. Las peticiones pueden durar bastante; el límite por petición es una hora. Las métricas separan generación, revisión editorial y fidelidad, además de los resultados reutilizados.

Los fragmentos terminados se guardan. Para reutilizarlos deben coincidir texto, contexto, género, modelo y digest, prompt, esquema y parámetros. Cambiar las reglas o el protocolo puede requerir nuevo trabajo. `parar.sh` (Mac/Linux) o `parar.ps1` (Windows) pausa con seguridad; al volver, la interfaz permite continuar o dejar pendiente. Cerrar la pestaña mantiene el procesamiento del servidor.

Un servidor remoto necesita su propio Ollama y recursos. Dentro de Docker, `localhost` es el contenedor; la conexión debe prepararse expresamente. La configuración de ejemplo de despliegue mantiene esta función desactivada. No publiques el puerto de Ollama en Internet.

## Evaluación y límites

No hay una medida de precisión general sobre un corpus representativo, ni una comparación suficiente entre modelos. Encontrar menos candidatos puede significar omisiones o menos falsas alarmas: hace falta revisar casos y negativos, no contar avisos. El modelo no lee todas las relaciones entre capítulos ni consulta fuentes externas.

Para evaluaciones privadas reproducibles, `npm run eval:local -- muestra.json salida.json` guarda intercambios y resultados sin modificar la base activa; rechaza una salida que ya exista. Los datos con texto real deben quedar fuera de Git. `tools/ollama-evaluate.mjs` ejecuta solo dos controles sintéticos y sirve como prueba funcional, no como medición de calidad. Véase [cómo incorporar y validar reglas](aprendizaje-reglas.md).
