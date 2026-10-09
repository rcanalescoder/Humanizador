#!/bin/sh
set -eu
APP_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec node "$APP_DIR/tools/lifecycle.mjs" stop
