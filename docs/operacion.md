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

En preparación: código sin historial privado, README, manual y sección Proyectos. El estado final, commits, verificación pública y límites se registrarán al terminar la publicación.
