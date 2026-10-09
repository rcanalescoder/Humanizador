# Ver qué está pasando

Dentro de «Revisar PDF», abre «Estado y alcance del análisis · Ver actividad». El panel permite consultar fase, progreso, actividad y fallos. La revisión de Ollama puede tardar: leer un libro completo implica varias peticiones por fragmento. El estado del proceso y sus métricas ayudan a distinguir actividad de un fallo.

Si un análisis falla, el PDF original y las notas se conservan. Lee el detalle antes de reintentar. Las respuestas de un modelo pueden incumplir el esquema, referirse a índices inexistentes o proponer citas no localizables; se rechazan para no asociar un cambio al lugar equivocado. Los fallos de formato deben incluir etapa y contexto técnico suficiente en el diagnóstico.

El diagnóstico descargable y los logs son material privado. Antes de compartirlos, revisa si contienen texto, nombres de documentos o respuestas del modelo. Para una incidencia pública, usa un caso sintético mínimo.

Los logs de la instancia gestionada están en `data/runtime/server.log`. Un fallo de `arrancar.sh` abre un diagnóstico local. `parar.sh` conserva trabajos pendientes para que el usuario decida si continuar al volver. No borres la base de datos para solucionar un fallo de inferencia.
