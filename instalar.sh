#!/bin/sh
set -eu
APP_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$APP_DIR"
if [ -t 1 ] && [ "${NO_COLOR+x}" != x ]; then CYAN=$(printf '\033[1;36m'); RESET=$(printf '\033[0m'); else CYAN=''; RESET=''; fi
printf '%sHumanizador · preparación de Node.js%s\n' "$CYAN" "$RESET"
node_ok() { command -v node >/dev/null 2>&1 && node -e 'process.exit(Number(process.versions.node.split(".")[0])>=24?0:1)' 2>/dev/null; }
if ! node_ok; then
  printf '%s\n' 'Necesitas Node.js 24 o posterior, con npm. Descarga el instalador oficial:' 'https://nodejs.org/en/download' 'Mac: elige el instalador macOS para tu equipo (Apple Silicon o Intel).' 'Linux: sigue las instrucciones de Node.js para tu distribución.'
  if [ "${1:-}" = '--check' ] || [ ! -t 0 ]; then exit 1; fi
  printf '¿Abrir la página oficial? [S/n] '
  read -r answer
  case "$answer" in n|N|no|NO) ;; *)
    if command -v open >/dev/null 2>&1; then open 'https://nodejs.org/en/download'; elif command -v xdg-open >/dev/null 2>&1; then xdg-open 'https://nodejs.org/en/download'; fi ;;
  esac
  printf '%s\n' 'Completa el instalador de Node.js. No hace falta instalar Ollama para usar las reglas.'
  printf 'Pulsa Intro para volver a comprobar Node.js: '
  read -r answer
  if ! node_ok; then printf '%s\n' 'Todavía no se encuentra Node.js 24. Abre una terminal nueva y repite ./instalar.sh.'; exit 1; fi
fi
exec node "$APP_DIR/tools/install.mjs" "$@"
