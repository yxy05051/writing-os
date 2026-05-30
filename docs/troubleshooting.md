# Troubleshooting

Use this guide when Writing OS does not start, the browser cannot connect, or agents do not produce output.

## Desktop Preview Does Not Open

First confirm the terminal window is still open. The desktop preview starts local services in the background, and closing the terminal stops them.

Windows users should start with:

```text
windows/build-desktop-preview.bat
windows/start-desktop.bat
```

macOS, Linux, or WSL users should start with:

```bash
bash scripts/build-desktop-preview.sh
bash scripts/start-desktop.sh
```

If the desktop window reports that Writing OS could not start, check that Python 3.11+, Node.js 22.12+, and npm are installed. If production mode fails, delete `frontend/.next`, run the build script again, and restart the desktop preview.

## The Website Does Not Open

First confirm the app is running:

- Windows: keep the `windows/start-dev.bat` terminal window open.
- macOS, Linux, or WSL: keep the `bash scripts/start-dev.sh` terminal open.

Then open:

```text
http://localhost:3000
```

If it still does not open, try:

```text
http://127.0.0.1:3000
```

## Port 3000 Is Already In Use

Run on alternate ports:

```bash
WRITING_OS_BACKEND_PORT=8100 WRITING_OS_FRONTEND_PORT=3100 bash scripts/start-dev.sh
```

Then open:

```text
http://localhost:3100
```

## First Startup Is Slow

The first run installs backend and frontend dependencies. This can take a few minutes.

If the terminal is still installing packages, wait until it prints the frontend URL.

## Missing API Key

Open:

```text
backend/.env
```

Set:

```env
OPENAI_API_KEY=
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o
```

Restart the app after changing `.env`.

## Agents Start But Do Not Produce Output

Check:

- The API key is present.
- The model name is valid for your provider.
- The provider base URL is correct.
- Your account has enough quota.
- The terminal window does not show upstream API errors.

If you use an OpenAI-compatible gateway, update `OPENAI_BASE_URL` and `OPENAI_MODEL` to match that gateway.

## Windows Script Cannot Resolve The Project Folder

The Windows scripts call WSL through:

```text
windows/run-wsl-script.ps1
```

Make sure WSL is installed and can run:

```powershell
wsl --status
```

If WSL is not installed, install it first, then run `windows/start-dev.bat` again.

## Planning Import Finds No Articles

Use headings like:

```md
## Article 001 | Article title
```

Minimum recommended fields:

```md
Goal: What this article should help the reader understand or do.
Key points:
- First idea
- Second idea
```

For the full format, read [Planning Model](planning-model.md).

## Editor Content Is Empty

The editor shows the current final draft. If no agent has produced a final draft yet, either:

- paste your own article into the editor and save it, or
- start the writing pipeline for that article.

## Published Article Still Changes

After publishing outside Writing OS, confirm the article as published/frozen in the editor.

Frozen articles should no longer be revised by agents.

## Run A Full Local Check

For development or release checks:

```bash
bash scripts/prepublish-check.sh
```

For a clean release rehearsal:

```bash
bash scripts/release-dry-run.sh
```
