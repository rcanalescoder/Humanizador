# Operación y publicación

## Uso local

Usa `instalar.sh` (Mac/Linux) o `instalar.ps1` (Windows): comprueba Node.js 24+, instala dependencias, compila y guarda la elección de Ollama. Para el uso diario, `arrancar.sh` / `parar.sh` o `arrancar.ps1` / `parar.ps1`. El script compila y abre la aplicación; busca un puerto alternativo si 8787 está ocupado. Al ejecutarlo de nuevo, para únicamente su instancia identificada y la reinicia. Los fallos abren un diagnóstico local. La parada pausa los trabajos, conserva el progreso válido y detiene sus procesos de forma segura. Al volver se elige continuar o dejar pendiente.

`data/humanizador.sqlite` contiene los originales y las revisiones. `data/runtime/` contiene el estado del supervisor y los logs. No borres estos datos para actualizar código. `npm run backup -- /ruta/privada/copia.sqlite` crea una copia consistente y rechaza sobrescribir otra. Para restaurar, para la aplicación, conserva una copia del estado actual y reemplaza la base con tu copia; no mezcles una base restaurada con ficheros WAL/SHM de otra sesión.

Variables útiles: `PORT`, `HUMANIZADOR_DATA_DIR`, `HUMANIZADOR_OLLAMA_ENABLED`, `HUMANIZADOR_OLLAMA_MODEL`. Los scripts no cargan `.env` automáticamente. Las variables tienen prioridad sobre `data/settings.json`, que escribe el instalador; en una ubicación de datos personalizada, las preferencias están junto a esa base. `node tools/install.mjs --configure` permite revisarlas sin reinstalar dependencias; `--check` consulta el entorno sin cambios ni inferencia. `HUMANIZADOR_NO_BROWSER=1` evita abrir el navegador. `HUMANIZADOR_SKIP_BUILD=1` es una opción técnica para pruebas con un build ya preparado.

## Servidor remoto

`npm start` mantiene servidor y worker en primer plano para un supervisor externo. No se mezcla con la instancia gestionada por los scripts sobre la misma base. Para exponer el servicio se requiere `HUMANIZADOR_PASSWORD`, `HUMANIZADOR_PUBLIC_URL` y HTTPS. El servidor rechaza escuchar fuera de bucle local sin contraseña.

`deploy/compose.yaml` conserva SQLite en un volumen y enlaza el puerto a bucle local. Configura una contraseña de al menos 12 caracteres y la URL HTTPS mediante el entorno de Compose. `deploy/nginx.conf.example` sirve como referencia de proxy. Docker requiere recursos, mantenimiento y copias propios; esta entrega no publica un servicio de procesamiento de PDF en hardMent ni en GitHub Pages. La configuración Docker no incluye Ollama.

## Publicación del proyecto

El código se publica en [GitHub](https://github.com/rcanalescoder/Humanizador), el manual estático en [GitHub Pages](https://rcanalescoder.github.io/Humanizador/) y la presentación en [hardMent](https://hardment.com/proyectos/humanizador.html). El workflow solo sube `manual/`, con documentación y capturas seleccionadas expresamente para su difusión.

Antes de un commit público: revisar el índice, ejecutar `npm run check:public` y `npm run check`. El verificador rechaza archivos de datos, PDFs, secretos reconocibles, rutas personales y exportaciones reales; comprueba las huellas de las capturas autorizadas y los enlaces locales del manual. Es una barrera adicional, no sustituye revisar qué se publica. Los ejemplos de pruebas deben ser sintéticos.

No se publica el historial editorial del proyecto usado en las capturas. Sus originales, notas, exportaciones y respaldos permanecen locales y excluidos. Las capturas limitadas muestran la interfaz con permiso del autor, sin distribuir el libro completo.

## Cierre de la entrega del 9 de octubre de 2026

Publicados el repositorio público, el manual de Pages y las cuatro páginas ES/EN de Proyectos en hardMent. El primer commit del código es `e5aa389`; hardMent se publicó en `78642a17f282f8ef3fd10467decbe1e519c8070a`. Se comprobaron 10 recursos públicos y el enlace Proyectos en las dos portadas. Ocho recursos coinciden byte a byte. Hostinger recodifica las dos capturas y reduce la grande de 2782 a 1600 píxeles de ancho; ambas se contrastaron visualmente en el navegador. GitHub Pages conserva sus bytes originales. [Evidencia de publicación](publicacion-verificada-2026-10-09.json).

Validación: 47 pruebas correctas, build de Humanizador, auditoría de 102 archivos en el índice inicial, dos capturas autorizadas y rechazo de una exportación sintética añadida deliberadamente al índice. El workflow pasó en GitHub Actions sobre Node 24. HardMent pasó build, paridad y descubrimiento de sus 82 páginas. El manual y la ficha se inspeccionaron a 1280 y 390 píxeles; no se observó desbordamiento horizontal.

Los documentos privados y sus revisiones permanecen locales. La entrega no ejecutó inferencia real ni aporta una nueva medida de precisión editorial. El aviso de tamaño del paquete del visor sigue siendo una advertencia de build, no un error.

### Retro breve

- Trabajo: publicación del código, guía ilustrada, sección Proyectos y enlaces cruzados verificados.
- Ejecución: una sola línea, sin agentes auxiliares ni nuevas llamadas a modelos locales o APIs de pago.
- Se conservaron los datos del usuario y se apartó el historial privado antes de inicializar Git.
- Sobró salida de las primeras búsquedas amplias; después se usaron rutas, hashes y resúmenes.
- Automatizado: auditoría del índice y capturas, publicación limitada a `manual/` y contrato de imágenes en hardMent.
- Aprendizaje: comprobar los bytes servidos y documentar las optimizaciones de imágenes del alojamiento sin atribuirles igualdad binaria.
- Pendiente de producto: OCR, validación nativa en Windows y evaluación editorial representativa; no impiden usar la revisión actual.
- No hay una medida fiable de tokens o coste facturado por esta tanda; no se atribuyen ahorros monetarios.

## Instalación 0.6 y Windows

Los wrappers guían la instalación oficial de Node sin modificar políticas globales ni instalar servicios. El asistente común usa procesos con argumentos separados, confirma las descargas de modelos y conserva los datos. Un archivo de bloqueo evita dos instaladores simultáneos. Si se interrumpió de forma abrupta, cerrar el instalador y retirar solo `data/installer.lock` antes de repetir; con directorio personalizado, usar esa ubicación.

El supervisor identifica procesos por token y rutas conocidas. En Windows, donde terminar un proceso no ejecuta los manejadores SIGTERM de Unix, la parada invalida primero las reclamaciones de trabajo en SQLite, termina los procesos de su instancia y confirma la pausa. La prueba integrada comprueba puerto alternativo, reinicio, pausa, recuperación de hijos huérfanos y conservación de un servicio ajeno. La matriz CI ejecuta las pruebas en Windows, macOS y Linux; no representa una validación de todas las GPU ni de calidad editorial del modelo ligero.

### Evidencia de la entrega 0.6 (9 de octubre de 2026)

La [matriz de CI 37928853157](https://github.com/rcanalescoder/Humanizador/actions/runs/37928853157) verifica el código `087cea362c5bb972120220ae197efc17090d9374`: 53 pruebas y build correctos en Windows, macOS y Linux. Incluye el diagnóstico del wrapper en Windows PowerShell y shell Unix. La primera ejecución descubrió rutas incompatibles de fuentes y mapas PDF en Windows; se corrigieron en extracción y anotaciones antes de cerrar la entrega.

El asistente se probó también de forma interactiva en Mac sobre un directorio sintético: elegir reglas guarda las preferencias, rechazar el arranque no levanta servicios y se retira el bloqueo. La ayuda integrada se inspeccionó en el navegador para Mac y Windows. No se inició inferencia real ni se descargaron modelos. No se ha validado físicamente una GPU Windows ni comparado la calidad editorial del modelo ligero.

GitHub Pages y hardMent ES/EN muestran instalación por sistema, requisitos, límites de modelos y atribución a Codex. Las dos capturas autorizadas son las mismas; el control público excluye originales, bases, notas, preferencias y exportaciones. La aplicación local se reinició sin trabajo pendiente ni borradores abiertos y conservó las anotaciones.

Retro: se completaron instalador, diagnóstico, soporte Windows y publicación, en una sola línea de ejecución. Las lecturas iniciales de JSX y HTML generaron más salida de la necesaria; conviene extraer solo el bloque afectado. La nueva matriz CI evita volver a descubrir incompatibilidades de rutas Windows en una entrega pública. Se usaron procesos y pruebas deterministas; no se midieron tokens ni coste facturado. Quedan como límites la comprobación física de GPU y la evaluación editorial comparativa de modelos, no requisitos pendientes de esta instalación. No hace falta abrir otra sesión para continuar esta entrega.

## Diseño público blanco y navegación (9 de octubre de 2026)

El [plan de diseño](plan-diseno-publico-2026-10-09.md) aplica fondo blanco al manual de Pages y a la ficha de hardMent. El manual conserva una sola página con índice desplegable, las secciones originales, enlaces y capturas autorizadas. Solo el menú principal de HardMent se divide en páginas, según la aclaración expresa del usuario; su portada se reduce y conserva los accesos a todas las áreas.

Validación local: 53 pruebas y build de Humanizador correctos. Revisión visual del manual a 1280, 768, 390 y 320 px; índice, anclas, acordeones y desplazamiento interno de tablas comprobados, sin desbordamiento horizontal de página. HardMent supera su build de 92 páginas y la comprobación de enlaces, paridad, metadatos y sitemap. Las capturas nuevas de comprobación no se publican. No se han ejecutado inferencias ni modificado los datos o la interfaz del editor local.

Para mantener esta composición, editar `manual/style.css`; conservar los IDs del manual porque son destinos públicos desde README y hardMent. Antes del push, auditar el índice con `npm run check:public`. Tras el despliegue, comprobar la página y su CSS reales, además de inspeccionar el navegador.

Retro: una sola línea de ejecución, sin agentes; la separación de estilos por página requirió comprobar sus dependencias visuales. Se conservan planes y evidencia de navegación en los repositorios; las capturas de comprobación son desechables. No se dispone de una medida de coste facturado o tokens de esta tanda.

Publicación confirmada: Pages sirve el HTML y CSS de `9a3d160` con las mismas huellas que las fuentes locales. La [ejecución 37942456514](https://github.com/rcanalescoder/Humanizador/actions/runs/37942456514) termina con pruebas y build correctos en Windows, macOS y Linux, y despliegue satisfactorio. HardMent sirve las diez páginas nuevas, las dos portadas y las dos fichas de Humanizador con el menú actualizado y respuesta 200; sus HTML coinciden con el build `7741f6c`. Su repositorio conserva las huellas en `docs/publicacion-diseno-2026-10-09.json`. Se contrastaron ambos sitios en el navegador de producción.
