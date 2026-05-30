#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT"

echo "== Backend compile =="
python3 -m py_compile backend/*.py backend/agents/*.py

echo "== Backend tests =="
if [ -x backend/venv/bin/pytest ]; then
  (cd backend && PYTHONPATH=. venv/bin/pytest -q)
else
  (cd backend && PYTHONPATH=. pytest -q)
fi

echo "== Frontend type check =="
(cd frontend && node node_modules/typescript/bin/tsc --noEmit)

echo "== Frontend build =="
(cd frontend && npm run build)

echo "== Frontend audit =="
(cd frontend && npm audit --audit-level=moderate)

echo "== Repository safety scan =="
if command -v rg >/dev/null 2>&1; then
  rg -n \
    -e 'sk-[A-Za-z0-9_-]{20,}' \
    -e 'OPENAI_API_KEY=[^[:space:]]+' \
    -e 'C:\\Users\\' \
    -e '/Users/[A-Za-z0-9._-]+' \
    -e '/home/beris/' \
    -e 'Beris_YANG' \
    . \
    --glob '!frontend/package-lock.json' \
    --glob '!backend/__pycache__/**' \
    --glob '!backend/agents/__pycache__/**' \
    --glob '!frontend/node_modules/**' \
    --glob '!frontend/.next/**' \
    --glob '!backend/venv/**' \
    --glob '!backend/.pytest_cache/**' \
    --glob '!data/**' \
    --glob '!scripts/prepublish-check.sh' \
    && {
      echo "Repository safety scan found potential secrets or local paths."
      exit 1
    }

  if [ -f forbidden-patterns.local ]; then
    rg -n -f forbidden-patterns.local . \
      --glob '!frontend/package-lock.json' \
      --glob '!backend/__pycache__/**' \
      --glob '!backend/agents/__pycache__/**' \
      --glob '!frontend/node_modules/**' \
      --glob '!frontend/.next/**' \
      --glob '!backend/venv/**' \
      --glob '!backend/.pytest_cache/**' \
      --glob '!data/**' \
      && {
        echo "Local forbidden-pattern scan found a match."
        exit 1
      }
  fi
else
  echo "ripgrep is not installed; skipping repository safety scan."
fi

echo "== Git status =="
git status --short --ignored

echo "Prepublish checks passed."
