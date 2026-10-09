# Operación y publicación

## Uso local

Node.js 24 o posterior, `npm ci` y `./arrancar.sh`. El script compila y abre la aplicación; busca un puerto alternativo si 8787 está ocupado. Al ejecutarlo de nuevo, para únicamente su instancia identificada y la reinicia. Los fallos abren un diagnóstico local. `./parar.sh` pausa los trabajos, conserva el progreso válido y detiene sus procesos de forma segura. Al volver se elige continuar o dejar pendiente.

`data/humanizador.sqlite` contiene los originales y las revisiones. `data/runtime/` contiene el estado del supervisor y los logs. No borres estos datos para actualizar código. `npm run backup -- /ruta/privada/copia.sqlite` crea una copia consistente y rechaza sobrescribir otra. Para restaurar, para la aplicación, conserva una copia del estado actual y reemplaza la base con tu copia; no mezcles una base restaurada con ficheros WAL/SHM de otra sesión.

Variables útiles: `PORT`, `HUMANIZADOR_DATA_DIR`, `HUMANIZADOR_OLLAMA_ENABLED`, `HUMANIZADOR_OLLAMA_MODEL`. Los scripts no cargan `.env` automáticamente. `HUMANIZADOR_NO_BROWSER=1` evita abrir el navegador. `HUMANIZADOR_SKIP_BUILD=1` es una opción técnica para pruebas con un build ya preparado.

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
