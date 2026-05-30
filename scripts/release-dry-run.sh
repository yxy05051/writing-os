#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="${1:-${WRITING_OS_RELEASE_TEST_DIR:-${TMPDIR:-/tmp}/writing-os-open-source-release-test}}"

if [ -z "$DEST" ] || [ "$DEST" = "/" ] || [ "$DEST" = "$ROOT" ]; then
  echo "Refusing unsafe release-test directory: $DEST" >&2
  exit 1
fi

if ! command -v rsync >/dev/null 2>&1; then
  echo "rsync is required for the release dry run." >&2
  exit 1
fi

echo "== Prepare clean release candidate =="
echo "Source: $ROOT"
echo "Target: $DEST"
rm -rf "$DEST"
mkdir -p "$DEST"

rsync -a "$ROOT"/ "$DEST"/ \
  --exclude '.git/' \
  --exclude '.env' \
  --exclude 'backend/.env' \
  --exclude 'backend/venv/' \
  --exclude 'backend/__pycache__/' \
  --exclude 'backend/agents/__pycache__/' \
  --exclude 'data/' \
  --exclude 'plans/' \
  --exclude 'frontend/node_modules/' \
  --exclude 'frontend/.next/' \
  --exclude 'frontend/test-results/' \
  --exclude 'frontend/tsconfig.tsbuildinfo' \
  --exclude '**/__pycache__/' \
  --exclude '*.pyc' \
  --exclude '*.log' \
  --exclude 'forbidden-patterns.local'

cd "$DEST"
git init -q
git add .

echo "== Install backend dependencies =="
python3 -m venv backend/venv
backend/venv/bin/python -m pip install --upgrade pip
backend/venv/bin/pip install -r backend/requirements-dev.txt

echo "== Install frontend dependencies =="
(cd frontend && npm ci)

echo "== Install desktop dependencies =="
(cd desktop && npm ci --ignore-scripts)

echo "== Run prepublish checks in clean candidate =="
bash scripts/prepublish-check.sh

echo "Release dry run passed."
echo "Clean candidate: $DEST"
