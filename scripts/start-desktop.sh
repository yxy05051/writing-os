#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required to start the desktop preview." >&2
  exit 1
fi

if [ ! -d "$ROOT/desktop/node_modules" ]; then
  (cd "$ROOT/desktop" && npm install)
fi

(cd "$ROOT/desktop" && npm start)
