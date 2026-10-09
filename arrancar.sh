#!/bin/sh
set -eu
APP_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
if ! command -v node >/dev/null 2>&1; then
  REPORT="${TMPDIR:-/tmp}/humanizador-node.html"
  printf '%s\n' '<!doctype html><meta charset="utf-8"><h1>Humanizador necesita Node.js 24 o posterior</h1><p>Ejecuta sh instalar.sh en la carpeta del proyecto. El asistente te explica cómo instalar Node.js y prepara la aplicación.</p>' > "$REPORT"
  if command -v open >/dev/null 2>&1; then open "$REPORT"; elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$REPORT"; fi
  exit 1
fi
exec node "$APP_DIR/tools/lifecycle.mjs" start
