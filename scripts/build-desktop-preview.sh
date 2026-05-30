#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_PORT="${WRITING_OS_BACKEND_PORT:-8000}"

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required to prepare the desktop preview." >&2
  exit 1
fi

echo "== Install frontend dependencies =="
(cd "$ROOT/frontend" && npm ci)

echo "== Build frontend for desktop preview =="
(
  cd "$ROOT/frontend"
  WRITING_OS_BACKEND_URL="http://127.0.0.1:$BACKEND_PORT" \
  NEXT_PUBLIC_WRITING_OS_WS_URL="ws://127.0.0.1:$BACKEND_PORT/ws" \
  npm run build
)

echo "== Install desktop dependencies =="
(cd "$ROOT/desktop" && npm ci)

echo "Desktop preview is prepared."
echo "Start it with: WRITING_OS_DESKTOP_MODE=production bash scripts/start-desktop.sh"
