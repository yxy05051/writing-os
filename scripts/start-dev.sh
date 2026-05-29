#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_HOST="${WRITING_OS_BACKEND_HOST:-0.0.0.0}"
BACKEND_PORT="${WRITING_OS_BACKEND_PORT:-8000}"
FRONTEND_HOST="${WRITING_OS_FRONTEND_HOST:-0.0.0.0}"
FRONTEND_PORT="${WRITING_OS_FRONTEND_PORT:-3000}"

if [ ! -d "$ROOT/backend/venv" ]; then
  python3 -m venv "$ROOT/backend/venv"
fi

"$ROOT/backend/venv/bin/pip" install -q -r "$ROOT/backend/requirements.txt"

if [ ! -f "$ROOT/backend/.env" ]; then
  cp "$ROOT/backend/.env.example" "$ROOT/backend/.env"
fi

if [ ! -d "$ROOT/frontend/node_modules" ]; then
  (cd "$ROOT/frontend" && npm install)
fi

(cd "$ROOT/backend" && "$ROOT/backend/venv/bin/uvicorn" main:app --host "$BACKEND_HOST" --port "$BACKEND_PORT") &
BACKEND_PID=$!

(cd "$ROOT/frontend" && \
  WRITING_OS_BACKEND_URL="http://127.0.0.1:$BACKEND_PORT" \
  NEXT_PUBLIC_WRITING_OS_WS_URL="ws://127.0.0.1:$BACKEND_PORT/ws" \
  npm run dev -- --hostname "$FRONTEND_HOST" --port "$FRONTEND_PORT") &
FRONTEND_PID=$!

cleanup() {
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
}
trap cleanup EXIT

echo "Writing OS is starting:"
echo "  Frontend: http://localhost:$FRONTEND_PORT"
echo "  Backend:  http://localhost:$BACKEND_PORT"
wait
