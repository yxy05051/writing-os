# Open Source Release Checklist

This checklist tracks what must be true before publishing Writing OS as a public repository.

## Current Status

- The open-source version is kept in its own project folder and can be published as a standalone repository.
- It is a local web app first.
- A desktop wrapper can be added later with Tauri or Electron.
- Private project content has been removed from the open-source folder.
- The default workflow uses four required agents: research, structure, writing, and final editor.
- Optional agents are available on demand: reader simulation, fact check, style, review, growth, and distribution.

## Verified

- Backend Python files compile.
- Frontend TypeScript check passes.
- Frontend production build passes.
- `npm audit` reports zero vulnerabilities.
- Private keyword scan has no hits for the private article series, custom branding, personal paths, or platform-specific WeChat wording.
- Plan import supports a structured Markdown template and a loose-import path for future Planning Agent normalization.
- Project Planner now has UI entry points for importing an existing Markdown plan and creating an editable guided plan draft.
- Project Planner has an optional AI Planning Agent flow that only calls the model when users explicitly request it.
- Backend plan parsing has a focused pytest test.
- Instruction routing has focused tests for English and Chinese article-start commands, including non-start instructions that mention article numbers.
- Notion export is documented as an optional integration rather than a required core workflow.
- Contributor guidance, issue templates, and a pull request template have been added.
- A standalone local Git repository has been initialized.
- README includes a generated dashboard screenshot.
- Runtime state, local environment files, dependency folders, and build artifacts are ignored by Git.
- GitHub Actions CI has been added for backend tests, frontend type checks, build, and audit.
- Dependabot has been added for npm, pip, and GitHub Actions updates.
- Security reporting and GitHub publishing docs have been added.
- A local prepublish check script has been added for tests, build, audit, and repository safety scanning.

## Before Publishing

- Do a final manual file review before the first public push.
- Install or authenticate GitHub CLI, or create an empty GitHub repository in the browser.
- Push `main` to GitHub and confirm CI passes.

## Product Roadmap

- Plan import normalizer for rough outlines, spreadsheets, and pasted notes.
- Agent configuration screen to control cost and optional specialist agents.
- Local project templates for different writing use cases.
- Optional desktop app wrapper after the web app workflow stabilizes.
