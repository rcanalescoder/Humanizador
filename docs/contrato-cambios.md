# Contrato del fichero de cambios

La salida será un conjunto de operaciones sobre una versión concreta del texto. Cada operación identifica el fragmento de origen, lo que debe encontrarse y lo que lo sustituirá. El fichero distingue los hallazgos detectados de los cambios aprobados y permite comprobar que una exportación se aplica sobre el documento correcto.

## Tres garantías diferentes

El análisis por reglas explícitas es reproducible si se fijan texto canónico, extractor, segmentador, catálogo, perfil y configuración. El motor devuelve los mismos hallazgos y propuestas mecánicas para esos mismos datos.

Las propuestas de un LLM no tienen esa garantía al regenerarlas. Se almacenan una vez, con su procedencia. Tras aprobarlas, su aplicación sí es reproducible porque el fichero ya contiene el texto exacto de sustitución. Una caché permite reutilizar una propuesta almacenada; no convierte la generación del modelo en determinista.

La equivalencia editorial requiere revisión: reemplazar siempre la misma secuencia no demuestra que el cambio conserve el sentido. La aplicación bloquea cambios pendientes, conflictivos o mal anclados, y conserva la decisión que autorizó cada operación.

## Representación canónica

El destino inicial es el texto estructurado extraído, no los bytes internos del PDF. Cada bloque tiene un ID derivado de la versión de extracción, página y posición ordinal. Contiene texto NFC con LF, papel editorial, geometría y mapa de origen. Su hash cubre todo su texto canónico. El documento tiene otro hash que cubre bloques y orden de lectura.

Los offsets se expresan en puntos de código Unicode, con intervalo semiabierto `[start, end)`. Un emoji fuera del plano básico cuenta como un punto de código aunque JavaScript lo represente con dos unidades UTF-16. El visor debe convertir entre ambas representaciones. Una operación siempre comprueba además la igualdad exacta de `expected_text` y el hash del bloque; no busca otra ocurrencia parecida cuando falla el anclaje.

Una propuesta que afecta a varios bloques se expresa como un grupo atómico de operaciones por bloque. Se aprueba y aplica el grupo completo o ninguno. Si exige reordenar párrafos o reformular un argumento completo, la interfaz mostrará su alcance ampliado y el antes/después de todos los bloques afectados.

## Campos del paquete

| Campo | Función |
| --- | --- |
| `format_version` | Versión del contrato de intercambio. |
| `source_pdf_sha256` | Identidad de los bytes originales. |
| `canonical_document_sha256` | Identidad del texto estructurado y orden analizado. |
| `extraction` | Extractor, versión, configuración y hash del mapa. |
| `analysis` | Motor, segmentador, catálogo y perfil, con versiones y hashes. |
| `decisions_sha256` | Identidad de las decisiones editoriales efectivas. |
| `operations` | Solo cambios aprobados y aplicables. |
| `unresolved_findings` | Hallazgos pendientes, sin permiso de aplicación. |
| `excluded_regions` | Zonas no analizadas y motivo. |

Cada operación lleva ID estable, grupo opcional, bloque, offsets, hash del bloque, `expected_text`, `replacement`, ID y versión de regla, origen de propuesta y referencia de decisión. El origen será `rule`, `llm` o `user`. Las metadatas de ejecución, fechas, logs y UUID de sesión quedan en un manifiesto separado para no alterar los bytes del paquete reproducible.

## Ejemplo de operación

Sobre el bloque «A día de hoy, usamos dos herramientas.», el usuario aprueba abreviar la referencia temporal como «Actualmente». El ejemplo representa la forma del contrato; los hashes que figuran abajo son marcadores ilustrativos, no hashes calculados ni un paquete aplicable.

```json
{
  "format_version": "1.0",
  "source_pdf_sha256": "<sha256 del PDF>",
  "canonical_document_sha256": "<sha256 del texto estructurado>",
  "operations": [
    {
      "id": "<id derivado del contenido de la operación>",
      "block_id": "p0001-b0003",
      "start": 0,
      "end": 12,
      "block_sha256": "<sha256 del bloque completo>",
      "expected_text": "A día de hoy,",
      "replacement": "Actualmente,",
      "rule_id": "HES-008",
      "rule_version": "0.1.0",
      "origin": "user",
      "decision": "approved"
    }
  ],
  "unresolved_findings": []
}
```

El usuario también podría decidir que la referencia temporal es necesaria o redactar una frase distinta. El catálogo no autoriza la sustitución global de «A día de hoy».

## Aplicación y conflictos

Antes de escribir se validan contrato, hashes, anclajes, igualdad del fragmento y decisiones. Cualquier error hace fallar la aplicación completa y devuelve el motivo; no se produce una versión parcialmente corregida. La validación también comprueba que todos los intervalos caben en su bloque y que no se solapan.

Dos propuestas con intersección de intervalos necesitan resolución humana o una operación conjunta explícita. No gana silenciosamente la regla de mayor severidad. Una vez validadas, las operaciones se aplican sobre una copia del origen, de mayor a menor offset por bloque, y el resultado se verifica y guarda como nueva versión. Dos inserciones en el mismo offset se consideran un conflicto salvo que pertenezcan a una operación compuesta ya resuelta.

El paquete incorpora hashes del resultado esperado por bloque y del documento corregido para detectar errores de aplicación. El PDF original permanece inmutable. Si cambia el texto o se vuelve a extraer con otra versión, se crea una nueva base; los cambios antiguos requieren reasignación y revisión, no se aplican por búsqueda aproximada.

## Reproducción exacta

La especificación propone serialización JSON canónica según [RFC 8785](https://www.rfc-editor.org/rfc/rfc8785), sin marcas temporales variables en el paquete. Los arrays se ordenan por orden documental, offset e ID estable. Los IDs se derivan del contenido normalizado. El mismo origen, catálogo, perfil y decisiones debe generar el mismo paquete byte a byte y el mismo texto corregido.

La reejecución de análisis determinista no depende de la hora, usuario del sistema, número de worker o orden de finalización de tareas. Los parámetros de OCR o NLP que afecten al resultado se fijan y se conservan junto a la extracción. Se reutiliza la extracción almacenada para reproducir un análisis anterior.

## Comprobaciones de aceptación

La construcción deberá verificar ejemplos con frases duplicadas, Unicode combinado, emoji, guiones entre líneas, fragmentos de varias páginas, operaciones solapadas, cambios de fuente y reejecución en otro worker. También debe demostrar rechazo por hash incorrecto, inversión de orden y precondición incumplida.

El resultado editorial se revisará con el párrafo anterior y posterior. Se comprobarán cifras, unidades, nombres, citas, enlaces, negaciones, modalidad, condiciones y persona narrativa. Un chequeo automático puede señalar cambios en esos elementos; no garantiza por sí solo equivalencia de significado.
