# Diseño público con fondo blanco

Preferencia del usuario: fondo blanco y secciones con el ritmo de https://robertocanales.com/proyectos/libro-sdd. La referencia se ha inspeccionado en el navegador: base blanca, cabecera amplia, bloques separados por espacio, títulos con jerarquía y tarjetas para contenido paralelo.

Alcance: `manual/index.html`, `manual/style.css` y páginas de Proyectos ES/EN en el repositorio de hardMent. Se conserva el contenido de instalación, los enlaces y las dos capturas autorizadas; no se cambia la interfaz del editor PDF.

1. Manual: retirar la columna lateral permanente, mantener un índice desplegable, centrar la entrada en escritorio y dar a las secciones un ancho cómodo de lectura sobre blanco.
2. hardMent: base blanca, secciones con más aire y tarjetas de instalación parejas, conservando la tipografía corporativa y llevando el menú principal a páginas propias.
3. Validar en navegador a 1280, 768, 390 y 320 px: desbordamiento, navegación, tablas, comandos y capturas. Auditar los archivos públicos y compilar el sitio.
4. Publicar en ambos repositorios y verificar las URLs reales; cerrar con evidencia breve y capturas de comprobación locales.

Aclaración del usuario: solo el menú principal de HardMent pasa a páginas independientes. El manual de GitHub Pages conserva sus secciones y enlaces por ancla.

## Resultado y validación local

Manual blanco, con entrada centrada en escritorio, índice desplegable y ancho de lectura limitado. En móvil conserva alineación izquierda, controles legibles y desplazamiento interno de tablas y comandos. El contenido y sus anclas permanecen completos; las dos capturas autorizadas no cambian.

Se ha inspeccionado en navegador a 1280, 768, 390 y 320 px, sin desbordamiento horizontal observado. El índice lleva a `#problemas`, el acordeón de ayuda se abre y los títulos quedan bajo la cabecera. `npm run check`: 53 pruebas y build correctos. La auditoría pública se ejecuta sobre el índice antes de publicar.

En HardMent se crean cinco páginas por idioma, se acorta la portada, se unifica la cabecera y se conserva el texto de las doce secciones trasladadas. La evidencia de ese sitio queda en su repositorio, `docs/revision-visual-humanizador-2026-10-09.md`. Ambos sitios deben comprobarse en producción tras el push.

Cierre: ambos sitios publicados y comprobados; evidencia de despliegue y CI registrada en `docs/operacion.md`.
