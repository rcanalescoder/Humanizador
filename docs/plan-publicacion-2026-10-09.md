# Publicación de Humanizador

Encargo: publicar la herramienta gratuita con documentación comprensible, capturas reales autorizadas y enlaces entre GitHub, el manual en GitHub Pages y hardMent. Trabajo de código, documentación y despliegue en una sola línea de ejecución.

| Unidad | Resultado observable y rutas | Comprobación y cierre | Riesgo y límite |
| --- | --- | --- | --- |
| 1. Separar lo publicable | `.gitignore`, archivo privado fuera de Git, documentación técnica depurada, verificador de publicación | Índice Git y paquete sin PDF, bases de datos, exportaciones, secretos ni datos de revisión | Conservar los originales y el historial útil local; publicar solo las capturas seleccionadas por el autor |
| 2. Explicar y enseñar | `README.md`, licencia, `manual/` con guía, capturas y enlaces | Instalación reproducible, enlaces locales e imágenes comprobados; revisión en escritorio y móvil | No presentar candidatos como pruebas de autoría ni atribuir cobertura a reglas pendientes |
| 3. Publicar código y manual | Repositorio limpio y público, workflow de Pages limitado a `manual/` | `npm run check`, auditoría del índice y comprobación de URLs públicas | Ningún directorio de datos entra en el artefacto de Pages |
| 4. Presentar en hardMent | Nueva sección Proyectos y ficha Humanizador en una copia de trabajo separada del sitio | Build del sitio, navegación, enlaces cruzados y comprobación tras despliegue | No publicar cambios ajenos del checkout de trabajo original |
| 5. Cerrar | `docs/operacion.md` y evidencia compacta | Registrar versiones publicadas, pruebas, límites y continuidad | Distinguir preparación local y publicación realmente comprobada |

## Criterios editoriales

La herramienta ayuda a revisar textos nacidos de clases, locuciones y borradores que han pasado por composición o corrección con IA. El autor conserva la responsabilidad de la edición final. No promete ocultar autoría, sortear detectores ni garantizar corrección. El catálogo se presenta con su estado real: 30 comprobaciones deterministas, 12 criterios opcionales con Ollama y 38 especificaciones pendientes.

## Destinos

- Código: https://github.com/rcanalescoder/Humanizador
- Manual: https://rcanalescoder.github.io/Humanizador/
- Presentación: https://hardment.com/proyectos/humanizador.html
- Proyectos: https://hardment.com/proyectos.html

## Avance

- [x] Repositorio remoto existente, privado y vacío; no hay historial Git local que limpiar.
- [x] Aislada la edición de hardMent desde su rama remota actual.
- [x] Separación y auditoría de contenidos.
- [x] README, manual, licencia y capturas.
- [x] GitHub público y Pages verificados.
- [x] hardMent publicado y enlaces comprobados.
- [x] Cierre de operación y retro.

Cierre: publicación realizada y comprobada en los tres destinos. Evidencia: [publicacion-verificada-2026-10-09.json](publicacion-verificada-2026-10-09.json). Código y documentación propia con MIT; los fragmentos de las capturas conservan los derechos del autor.
