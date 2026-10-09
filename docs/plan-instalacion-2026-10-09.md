# Instalación guiada y uso de Ollama

Trabajo de código, documentación y entrega pública. Una sola línea de ejecución; sin inferencia real ni descargas de modelos para las pruebas.

| Unidad | Resultado y rutas | Comprobación | Riesgo y cierre |
| --- | --- | --- | --- |
| Diagnóstico | Estados accionables de Ollama y ayuda Mac/Windows en `server/ollama.mjs`, `src/` | API simulada: apagado, sin modelo, remoto rechazado y preparado; comprobación visual | No confundir «no responde» con «no instalado» ni arrancar inferencia al consultar |
| Instalación | `instalar.sh`, `instalar.ps1` y asistente común en `tools/`: entorno, dependencias, modo reglas/Ollama, elección y descarga consentida de modelo, resumen y arranque opcional | Pruebas con preguntas y procesos simulados; sin tocar modelos reales | No ejecutar texto del usuario como shell ni sobrescribir datos; conservar configuración al repetir |
| Ciclo de vida | Arranque/parada PowerShell y soporte de procesos Windows; pausa antes de terminar procesos | Contratos locales y matriz CI macOS/Windows/Linux | Windows no entrega SIGTERM como Unix: asegurar pausa y control de procesos propios; no afirmar prueba física en Windows |
| Guías y transparencia | README, manual, ayuda integrada y hardMent ES/EN con Mac, Windows, memoria, GPU, diagnóstico y «construido con Codex» | Enlaces, build, auditoría pública y revisión visual | La opción pequeña es una alternativa de recursos, no una calidad editorial demostrada |
| Publicación | GitHub, Pages y hardMent actualizados, evidencia y operación | CI y URLs reales | Mantener privados PDF, notas, configuración y logs |

Fuentes oficiales consultadas el 9 de octubre de 2026: [Ollama macOS](https://docs.ollama.com/macos), [Windows](https://docs.ollama.com/windows), [FAQ](https://docs.ollama.com/faq), [Qwen3.5 4B](https://ollama.com/library/qwen3.5:4b), [Node.js](https://nodejs.org/en/download). Se toma de SDDApp el patrón de bienvenida, diagnóstico, preguntas y cierre, sin reutilizar su instalador específico.

## Avance

- [x] Identificadas la falta de diagnóstico concreto y la dependencia de `ps` en el ciclo de vida.
- [x] Ayuda y diagnóstico: servicio, modelo, instrucciones por sistema y enlace al manual.
- [x] Instalador y configuración persistente: elección explícita, descargas consentidas y prueba interactiva sin Ollama.
- [x] Arranque/parada y pruebas Windows: 53 pruebas y build correctos en los tres sistemas (CI 37928853157).
- [x] Documentación, Codex y publicación verificada en GitHub Pages y hardMent ES/EN; comprobación visual de la ayuda integrada y de los enlaces del manual.

## Incidencia de compatibilidad encontrada en CI

La primera matriz (ejecución 37928541349) pasó en macOS y Linux. Windows pasó el ciclo de vida, pero la extracción y las anotaciones fallaron porque PDF.js exige rutas de recursos con barra final `/` y recibía separadores `\`. Se normalizan las rutas en `server/extract.mjs` y `server/annotations.mjs`; las pruebas existentes de PDF y anotaciones cubren el comportamiento afectado. No se reduce la batería ni se omite Windows.
