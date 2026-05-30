# Publishing to GitHub

This repository is ready to publish after a final manual review.

## Local Release Dry Run

Before creating the public GitHub repository, run:

```bash
bash scripts/release-dry-run.sh
```

The script creates a clean release-candidate directory, excludes local runtime state and secrets, reinstalls dependencies, and runs the normal prepublish checks from that clean copy. Treat this as the local rehearsal for a first-time GitHub clone.

## Current Local State

- Branch: `main`
- CI workflow: `.github/workflows/ci.yml`
- Runtime files ignored: `.env`, `data/`, `backend/venv/`, `frontend/node_modules/`, `frontend/.next/`
- Private writing content should not be committed.

## Option A: Publish with GitHub CLI

Install and authenticate GitHub CLI first:

```bash
gh auth login
```

Then from the repository root:

```bash
gh repo create writing-os --public --source=. --remote=origin --push
```

Use `--private` instead of `--public` if you want to review it on GitHub before making it public.

## Option B: Publish to an Existing Empty Repository

Create an empty GitHub repository in the browser, then run:

```bash
git remote add origin https://github.com/YOUR_NAME/writing-os.git
git push -u origin main
```

## Before the First Public Push

Run the full prepublish check:

```bash
bash scripts/prepublish-check.sh
```

For the stricter clean-copy rehearsal, run:

```bash
bash scripts/release-dry-run.sh
```

On Windows with WSL, you can also run `windows/prepublish-check.bat`.

Then manually review:

- `README.md`
- `CONTRIBUTING.md`
- `SECURITY.md`
- `backend/.env.example`
- `examples/`
- screenshots under `docs/assets/`

After pushing, confirm the GitHub Actions CI run passes.
