# Revisión opcional con Ollama

Humanizador funciona con sus reglas sin instalar un modelo. La revisión contextual usa la [API de chat de Ollama](https://docs.ollama.com/api/chat) y [salidas JSON estructuradas](https://docs.ollama.com/capabilities/structured-outputs). Solo admite HTTP de bucle local, sin redirecciones ni etiquetas o metadatos de modelos remotos.

## Configuración

Instala [Ollama](https://ollama.com/download). El modelo predeterminado del código es `qwen3.6:27b-q8_0`; la variante es grande y requiere memoria y disco suficientes. Consulta su [ficha de etiquetas](https://ollama.com/library/qwen3.6/tags) antes de descargarla. El proyecto no afirma que sea el mejor modelo editorial ni que otro modelo más pequeño mantenga su calidad.

```sh
ollama pull qwen3.6:27b-q8_0
./arrancar.sh
```

Para usar otra etiqueta que ya tengas instalada, establece `HUMANIZADOR_OLLAMA_MODEL` al arrancar. `HUMANIZADOR_OLLAMA_ENABLED=0` desactiva la integración; `=1` la habilita también en producción. `HUMANIZADOR_OLLAMA_URL` tiene por defecto `http://127.0.0.1:11434`. El programa lee variables de entorno, no carga automáticamente un fichero `.env`.

Subir un PDF no inicia inferencia. Abre «Revisar PDF», comprueba Ollama desde la configuración y pulsa «Revisar con Ollama» cuando quieras comenzar. No se usan APIs de pago. Consulta la actividad desde el mismo espacio de revisión.

## Qué comprueba

El análisis divide el texto en fragmentos de hasta 4.600 caracteres Unicode con contexto vecino. Genera propuestas, comprueba su validez editorial y, cuando hay sustituciones, revisa su fidelidad. El protocolo actual incorpora ocho principios de conservación de la voz y controles conservadores sobre cantidades, negaciones, condiciones y certeza. Puede retirar una sustitución y mantener el diagnóstico para que el autor redacte otra.

Se valida la estructura JSON, la correspondencia entre propuestas, la cita y sus offsets. La recuperación de espacios y palabras partidas exige una correspondencia única con el original. No se acepta una cita inventada. Estas comprobaciones reducen errores mecánicos; no garantizan que un diagnóstico o una sustitución sean correctos.

## Recursos y continuidad

Solo se procesa una tarea cada vez. Temperatura 0, semilla 42 y los parámetros registrados en el análisis permiten comparar condiciones, pero no garantizan inferencia determinista. Las peticiones pueden durar bastante; el límite por petición es una hora. Las métricas separan generación, revisión editorial y fidelidad, además de los resultados reutilizados.

Los fragmentos terminados se guardan. Para reutilizarlos deben coincidir texto, contexto, género, modelo y digest, prompt, esquema y parámetros. Cambiar las reglas o el protocolo puede requerir nuevo trabajo. `parar.sh` pausa con seguridad; al volver, la interfaz permite continuar o dejar pendiente. Cerrar la pestaña mantiene el procesamiento del servidor.

Un servidor remoto necesita su propio Ollama y recursos. Dentro de Docker, `localhost` es el contenedor; la conexión debe prepararse expresamente. La configuración de ejemplo de despliegue mantiene esta función desactivada. No publiques el puerto de Ollama en Internet.

## Evaluación y límites

No hay una medida de precisión general sobre un corpus representativo, ni una comparación suficiente entre modelos. Encontrar menos candidatos puede significar omisiones o menos falsas alarmas: hace falta revisar casos y negativos, no contar avisos. El modelo no lee todas las relaciones entre capítulos ni consulta fuentes externas.

Para evaluaciones privadas reproducibles, `npm run eval:local -- muestra.json salida.json` guarda intercambios y resultados sin modificar la base activa; rechaza una salida que ya exista. Los datos con texto real deben quedar fuera de Git. `tools/ollama-evaluate.mjs` ejecuta solo dos controles sintéticos y sirve como prueba funcional, no como medición de calidad. Véase [cómo incorporar y validar reglas](aprendizaje-reglas.md).
