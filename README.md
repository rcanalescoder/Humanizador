# Humanizador

**Un espacio de revisión editorial para leer, anotar y decidir sobre un PDF.** Gratuito, con reglas en castellano de España y revisión opcional con un modelo local.

[Manual de usuario](https://rcanalescoder.github.io/Humanizador/) · [El proyecto en hardMent](https://hardment.com/proyectos/humanizador.html) · [Proyectos de hardMent](https://hardment.com/proyectos.html)

## Para qué sirve

Una clase, una locución o unas notas personales pueden convertirse en un libro con ayuda de una IA. Durante esa composición se pueden perder sujetos, ejemplos, condiciones, humor o relaciones entre ideas. Humanizador ayuda a localizar pasajes que conviene releer, contrastarlos con el documento y reunir las decisiones del autor.

El objetivo es facilitar la edición y la revisión manual final. No está pensado para plagiar, engañar sobre la autoría ni eludir detectores de IA. Una coincidencia es un **candidato editorial**, no una prueba de que un texto lo haya escrito una máquina. La persona que edita decide qué conservar y qué corregir.

![PDF original con notas amarillas y sugerencias azules; tabla de revisión a la derecha](manual/assets/revision-pdf.png)

*Captura real de una revisión de IAHPT, utilizada con permiso de su autor, Roberto Canales Mora. El libro completo, sus notas y su base de datos no se distribuyen. [Derechos de las capturas](manual/assets/README.md).*

## Qué puedes hacer

- Crear proyectos y cargar PDF con texto seleccionable; empezar a leer y anotar sin lanzar un modelo.
- Seleccionar frases o marcar zonas e infografías, escribir una nota y conservar su ubicación exacta.
- Pedir una revisión con reglas o con Ollama, de forma explícita; consultar el progreso y los errores.
- Ver notas y sugerencias sobre el mismo PDF y en dos pestañas, con una tabla compacta para aprobar, conservar o reabrir cada propuesta.
- Ajustar el ancho de los paneles, intercambiarlos, contraer el menú o el PDF y cambiar de página desde el propio visor.
- Exportar un único JSON editorial con notas, recortes, sugerencias, decisiones, contexto y referencias para trabajar con otra IA. Exportarlo no envía el documento a ningún servicio.
- Detener la aplicación de forma segura y decidir si continuar los análisis pendientes al volver.

El PDF original permanece intacto. Aprobar una propuesta guarda una decisión; **no reescribe el PDF**. La edición definitiva se hace sobre el manuscrito y se revisa manualmente.

## Reglas y límites

| Parte del catálogo | Estado en la versión 0.6 |
| --- | --- |
| 30 comprobaciones deterministas | Buscan patrones y expresiones sin un modelo |
| 12 criterios editoriales | Revisión contextual opcional con Ollama |
| 38 especificaciones | Documentadas, pendientes de implementación o validación |

Las 80 fichas incluyen orientaciones, excepciones y fuentes; no equivalen a 80 detectores comprobados. El catálogo combina patrones de redacción con criterios de claridad y fidelidad. Las preferencias editoriales incluyen conservar sujeto, escenas, postura, condiciones y grado de certeza, además de releer cada cambio con sus vecinos.

Puede haber falsas alarmas y omisiones. Tener más hallazgos no demuestra mayor calidad. No se ha medido la precisión general en un corpus representativo. Los PDF escaneados necesitan OCR externo; la aplicación no lo incluye. Columnas, tablas y palabras partidas requieren contrastar la extracción con el original. Ollama revisa fragmentos con contexto vecino, no toda la coherencia del libro de una sola vez.

## Tecnología y requisitos

React 19 y Vite 8 para la interfaz; PDF.js 6 para representar y extraer el PDF; Node.js con HTTP nativo, SQLite y un proceso de trabajo independiente para guardar y procesar las revisiones. Las versiones exactas están fijadas en `package-lock.json`.

Necesitas **Node.js 24 o posterior con npm**, un navegador actual y macOS, Windows o Linux. Git es opcional: también puedes descargar el ZIP del repositorio y descomprimirlo. Los modelos locales necesitan disco y memoria adicionales; las reglas no necesitan Ollama ni una cuenta de IA.

**Humanizador está construido con Codex, bajo la dirección de Roberto Canales Mora.** Se comprueba con pruebas automatizadas y revisión humana. Esto no garantiza que todas las recomendaciones sean correctas. Codex es una herramienta de desarrollo: no necesitas instalarlo ni tener una cuenta para usar Humanizador.

## Instalación y arranque

Descarga el [ZIP del código](https://github.com/rcanalescoder/Humanizador/archive/refs/heads/main.zip) o clona el repositorio. Abre una terminal **en la carpeta descomprimida**. No ejecutes el instalador dentro del ZIP.

### Mac y Linux

```sh
git clone https://github.com/rcanalescoder/Humanizador.git
cd Humanizador
./instalar.sh
```

Si descargaste el ZIP, empieza directamente con `sh instalar.sh`. El asistente comprueba Node, ofrece abrir su instalador oficial si falta, instala las dependencias, compila la aplicación y pregunta cómo quieres revisar. Muestra el progreso con colores cuando la terminal lo permite (`NO_COLOR=1` los desactiva).

### Windows

Con PowerShell, en la carpeta descomprimida:

```powershell
.\instalar.ps1
```

Si Windows bloquea los scripts descargados, revisa el archivo y ejecuta `powershell -NoProfile -ExecutionPolicy Bypass -File .\instalar.ps1`. Esta excepción afecta a ese proceso, no modifica la política global del equipo. Si es un ordenador administrado, respeta su política; el [manual de instalación](https://rcanalescoder.github.io/Humanizador/#empezar) incluye la alternativa con Node ya instalado.

El asistente explica cómo instalar Node si falta. Tras completar el instalador oficial, comprueba de nuevo. No instala servicios del sistema ni cambia el cortafuegos. Puedes elegir **solo reglas**, conservar tu configuración o preparar Ollama. Descargar un modelo requiere una confirmación aparte; no se descargan modelos por defecto.

### Uso diario y diagnóstico

| Acción | Mac / Linux | Windows PowerShell |
| --- | --- | --- |
| Instalar o repetir la preparación | `./instalar.sh` | `.\instalar.ps1` |
| Cambiar la elección de Ollama sin reinstalar dependencias | `./instalar.sh --configure` | `.\instalar.ps1 -Configure` |
| Comprobar el entorno sin cambios | `./instalar.sh --check` | `.\instalar.ps1 -Check` |
| Arrancar y abrir el navegador | `./arrancar.sh` | `.\arrancar.ps1` |
| Parar de forma segura | `./parar.sh` | `.\parar.ps1` |

La aplicación suele abrirse en `http://127.0.0.1:8787/`. Si el puerto está ocupado busca otro y lo explica. Si falla, abre un diagnóstico local. Repetir el arranque detiene su instancia identificada y la reinicia. No mezcles distintos supervisores sobre la misma base de datos.

Los documentos y decisiones permanecen en `data/`, fuera de Git. La parada pausa las revisiones; al volver puedes continuar desde los fragmentos válidos compatibles o dejarlas pendientes. Cerrar la pestaña no detiene el servidor. El instalador conserva los datos y guarda tu elección en `data/settings.json`; las variables de entorno tienen prioridad.

### Ollama opcional

Instala [Ollama desde su web oficial](https://ollama.com/download), ábrelo y repite el asistente con la opción de configuración. En **Mac** requiere macOS 14 o posterior: Apple Silicon puede usar GPU; Intel usa CPU. En **Windows** requiere Windows 10 22H2 o posterior; la aceleración depende del hardware y los controladores. Consulta la [guía con las particularidades de cada sistema](docs/ollama.md).

El asistente permite elegir un modelo ya instalado o descargar uno. Ofrece `qwen3.5:4b` como opción de menor tamaño (varios GB), **sin afirmar que tenga la misma calidad editorial** que un modelo mayor. La configuración histórica del código, `qwen3.6:27b-q8_0`, ronda los 30 GB de descarga y necesita muchos más recursos. El tamaño del archivo no equivale a la memoria necesaria: también cuenta el contexto. No hay un modelo universal recomendado ni una comparación editorial suficiente.

La aplicación muestra si Ollama no responde, está desactivado, falta el modelo o está preparado, y ofrece ayuda de instalación. Solo consulta el catálogo al comprobarlo; la inferencia empieza al pedir **Revisar con Ollama** o continuar un análisis. No se usan APIs de pago. [Configuración, actividad y resolución de problemas](docs/ollama.md).

## Comandos

| Comando | Función |
| --- | --- |
| `node tools/install.mjs --check` | Diagnóstico sin instalaciones, descargas ni inferencia |
| `node tools/lifecycle.mjs start` / `stop` | Alternativa común a los scripts de arranque y parada |
| `npm run dev` | Desarrollo; interfaz en el puerto 5187 y API en 8787 |
| `npm start` | Servidor y worker en primer plano; para supervisión de servidor |
| `npm run build` | Compilar la interfaz en `dist/` |
| `npm test` | Pruebas automatizadas, sin inferencia real |
| `npm run check` | Pruebas y compilación |
| `npm run check:public` | Auditar los archivos del índice Git y los recursos del manual |
| `npm run backup -- /ruta/privada/copia.sqlite` | Copia consistente con PDF, notas y revisiones; conservar fuera de Git |
| `npm run apply -- texto-origen.json cambios.json texto-revisado.txt` | Aplicar operaciones aprobadas al texto, comprobando precondiciones |
| `npm run eval:local -- muestra.json resultado.json` | Evaluación privada con Ollama; consume recursos locales |

No mezcles `npm start` o `npm run dev` con la instancia de `arrancar.sh` sobre la misma base de datos. Consulta [operación y despliegue](docs/operacion.md) antes de exponer el servidor a una red. GitHub Pages aloja el manual; **la aplicación necesita un servidor Node** y no funciona como aplicación estática en Pages.

## Estructura

```text
src/         Interfaz, visor y paneles de revisión
server/      API, SQLite, extracción y trabajos de análisis
core/        Reglas, anclajes, exportación y controles de cambios
rules/es-ES/ Catálogo, patrones y fuentes
evaluation/  Casos sintéticos compartibles
test/        Pruebas automatizadas
tools/       Instalación, arranque, copias, aplicación y evaluación
deploy/      Docker Compose y ejemplo de proxy
docs/        Arquitectura, investigación y contratos
manual/      Guía estática y capturas autorizadas para GitHub Pages
data/        Documentos y revisiones locales (ignorado)
privado/     Archivo de trabajo privado (ignorado)
```

## Privacidad, colaboración y licencia

En uso local, los PDF y revisiones se guardan en tu ordenador. Si despliegas en un servidor, se guardan en ese servidor. Ollama solo admite conexión de bucle local y modelos locales. Tú decides si compartes la exportación con otra IA; puede contener texto y recortes del documento.

Para proponer mejoras, abre una [incidencia](https://github.com/rcanalescoder/Humanizador/issues) con un ejemplo sintético, comportamiento esperado y versión. No adjuntes manuscritos, exportaciones reales, bases de datos ni credenciales. [Cómo añadir conocimiento y evaluar reglas](docs/aprendizaje-reglas.md).

Código y documentación propia bajo [licencia MIT](LICENSE). Las dependencias conservan sus licencias. Los fragmentos del libro visibles en las capturas se muestran con permiso y mantienen los derechos de su autor; no forman parte de la licencia del software.

[Arquitectura](docs/arquitectura.md) · [Contrato de cambios](docs/contrato-cambios.md) · [Fuentes](docs/investigacion.md) · [Manual completo](https://rcanalescoder.github.io/Humanizador/)
