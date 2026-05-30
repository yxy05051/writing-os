# Writing OS

Writing OS is a local multi-agent writing workspace for planning, drafting, reviewing, and polishing long-form article projects.

It is designed for two kinds of writers:

- Writers who already have a plan and want to import article briefs.
- Writers who only have a rough idea and need guided planning before writing.

The current open-source version runs as a local web app. Use the included start scripts to run the backend and frontend together. A desktop wrapper can be added later with Tauri or Electron after the core workflow is stable.

![Writing OS dashboard](docs/assets/writing-os-open-source-dashboard.png)

## What It Does

- Runs a four-agent writing pipeline: research, structure, writing, and final editing.
- Lets optional specialist agents join when needed: reader simulation, fact check, style, review, growth, and distribution.
- Shows a visual agent workspace with agent status and deliverables.
- Provides a rich-text final draft editor.
- Freezes published articles so agents stop revising them.
- Supports imported plans and guided plan creation.
- Includes cost controls for optional specialist agents.

## Start Here

For complete setup and usage instructions, open the documentation center:

**[docs/README.md](docs/README.md)**

Fast start:

- Windows: double-click `windows/start-dev.bat`
- macOS, Linux, or WSL: run `bash scripts/start-dev.sh`
- Browser URL: `http://localhost:3000`

The first run creates `backend/.env`. Add your API key there, then restart the app.

```env
OPENAI_API_KEY=
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o
```

## Documentation

- [Documentation Center](docs/README.md)
- [User Guide](docs/user-guide.md)
- [Planning Model](docs/planning-model.md)
- [Troubleshooting](docs/troubleshooting.md)
- [GitHub Publishing](docs/github-publishing.md)

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
