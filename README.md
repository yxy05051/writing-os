# Writing OS

![CI](https://github.com/yxy05051/writing-os/actions/workflows/ci.yml/badge.svg)
![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)

Writing OS is a local multi-agent writing workspace for planning, drafting, reviewing, editing, and publishing long-form writing projects.

It is built for writers who want an AI writing system that keeps the whole project visible: the plan, the agent work, the final draft, and the publication state.

## Who It Is For

Writing OS supports two common starting points:

- Writers who already have a plan and want to import article briefs.
- Writers who only have a rough idea and need guided planning before writing.

The current open-source version runs as a local web app. A desktop wrapper can be added later after the core workflow is stable.

![Writing OS dashboard](docs/assets/writing-os-open-source-dashboard.png)

## What It Does

- Runs a four-agent writing pipeline: research, structure, writing, and final editing.
- Lets optional specialist agents join when needed: reader simulation, fact check, style, review, growth, and distribution.
- Shows a visual agent workspace with agent status and deliverables.
- Provides a rich-text final draft editor.
- Freezes published articles so agents stop revising them.
- Supports imported plans and guided plan creation.
- Includes cost controls for optional specialist agents.

## Quick Start

Clone the repository, then start the app:

- Windows: double-click `windows/start-dev.bat`
- macOS, Linux, or WSL: run `bash scripts/start-dev.sh`
- Browser URL: `http://localhost:3000`

The first run creates `backend/.env`. Add your API key, then restart the app.

```env
OPENAI_API_KEY=
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o
```

For full setup and usage instructions, start here:

**[Documentation Center](docs/README.md)**

## Documentation

- [Documentation Center](docs/README.md)
- [User Guide](docs/user-guide.md)
- [Planning Model](docs/planning-model.md)
- [Troubleshooting](docs/troubleshooting.md)
- [GitHub Publishing](docs/github-publishing.md)

## Project Status

Writing OS is an early open-source release. The core local workflow is usable, but the product is still evolving. Expect the planning model, agent settings, and desktop packaging to keep improving.

## Development Checks

Run the normal local check:

```bash
bash scripts/prepublish-check.sh
```

Run a clean release rehearsal before publishing:

```bash
bash scripts/release-dry-run.sh
```

The dry run creates a clean candidate folder, excludes local state and secrets, reinstalls dependencies, and runs checks outside the working tree.

## Repository Safety

Do not commit:

- `.env`
- local state under `data/`
- generated build artifacts
- private article drafts
- private planning documents

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for local development, test commands, and privacy rules for public contributions.

For vulnerability reporting and secret-handling guidance, see [SECURITY.md](SECURITY.md).

## License

MIT
