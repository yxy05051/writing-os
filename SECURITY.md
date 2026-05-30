# Security Policy

Writing OS is local-first, but it can still handle sensitive drafts, API keys, and optional integration tokens.

## Supported Versions

Security fixes are handled on the `main` branch until release versioning is introduced.

## Reporting a Vulnerability

Please do not open a public issue for secrets, credential exposure, prompt-injection paths, or data-loss risks.

Until a dedicated security contact is added, use a private GitHub security advisory after the repository is published, or contact the maintainer through the repository owner profile.

When reporting, include:

- The affected area: backend, frontend, agent pipeline, editor, plan import, or integration.
- Steps to reproduce.
- Whether private drafts, local files, API keys, or external services may be exposed.
- Suggested mitigation, if you have one.

## Handling Secrets

Never commit:

- `.env` files
- API keys
- external integration tokens
- private drafts
- private planning documents
- local machine paths that identify a contributor

Use `backend/.env.example` for placeholder configuration only.
