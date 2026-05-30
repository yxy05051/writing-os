# Contributing to Writing OS

Thanks for helping improve Writing OS. This project is a local-first multi-agent writing workspace, so contributions should keep setup simple, private by default, and cost-conscious.

## Local Development

Backend:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
cp .env.example .env
uvicorn main:app --host 0.0.0.0 --port 8000
```

Frontend:

```bash
cd frontend
npm install
npm run dev -- --hostname 0.0.0.0 --port 3000
```

## Checks

Run these before opening a pull request:

```bash
cd backend
PYTHONPATH=. pytest -q
```

```bash
cd frontend
node node_modules/typescript/bin/tsc --noEmit
npm run build
npm audit --audit-level=moderate
```

## Contribution Guidelines

- Keep AI calls explicit. Optional agents and planning flows should not spend API credits unless the user clearly starts them.
- Keep private writing content out of fixtures, examples, screenshots, and docs.
- Prefer generic project language over platform-specific assumptions.
- Add focused tests when changing planning import, instruction routing, pipeline orchestration, or final-draft behavior.
- Preserve the four default required agents unless a change includes migration notes and UI updates.
