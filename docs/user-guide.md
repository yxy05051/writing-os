# Writing OS User Guide

This guide is for first-time users who want to run Writing OS locally and use it to plan, draft, review, and finalize a writing project.

## 1. What Writing OS Is

Writing OS is a local writing app. It can run in a desktop preview window or as a local web app in your browser.

The app has three main areas:

- **Planning**: import an existing article plan or create one from a rough idea.
- **Agent workspace**: run the writing agents and watch their status and deliverables.
- **Editor**: paste, revise, save, and freeze final drafts.

## 2. Requirements

You need:

- Python 3.11 or newer.
- Node.js 20 or newer for browser/dev mode.
- Node.js 22.12 or newer is recommended for the desktop preview.
- npm.
- An OpenAI-compatible API key.

For browser/dev mode on Windows, WSL is recommended. The desktop preview can run from a normal Windows checkout if Python, Node.js, and npm are installed.

## 3. Start The App

### Option A: Desktop Preview

The desktop preview opens Writing OS in an app window and starts the backend and frontend services for you.

Windows:

```text
windows/start-desktop.bat
```

macOS, Linux, or WSL:

```bash
bash scripts/start-desktop.sh
```

Keep the terminal window open while using the desktop preview.

### Option B: Browser / Dev Mode

Windows:

```text
windows/start-dev.bat
```

macOS, Linux, or WSL:

```bash
bash scripts/start-dev.sh
```

Then open:

```text
http://localhost:3000
```

The first run may take longer because dependencies are installed automatically.

## 4. Add Your API Key

On first start, Writing OS creates:

```text
backend/.env
```

Open that file and set:

```env
OPENAI_API_KEY=
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o
```

Restart the app after changing `.env`.

If you use an OpenAI-compatible provider, update `OPENAI_BASE_URL` and `OPENAI_MODEL` to match that provider.

## 5. Create Or Import A Writing Plan

Open the **Planning** view.

If you already know your article list:

1. Choose **Import existing plan**.
2. Paste a Markdown plan.
3. Click **Preview plan**.
4. If the detected articles look right, click **Import plan**.

Recommended format:

```md
## Article 001 | Why this topic matters

Goal: Help readers understand the promise of the series.
Reader level: Beginner.
Tree position: Foundation > Orientation.
Key points:
- Why the topic matters now
- What readers will learn
- What comes next
Next hook: Move to the core workflow.
```

If you only have a rough idea:

1. Choose **Create guided draft**.
2. Fill in topic, audience, desired outcome, depth, channel, and article count.
3. Click **Generate local draft** for a no-API draft, or **Generate with AI** for an AI-generated plan.
4. Review and edit the generated Markdown.
5. Click **Preview plan**, then **Import plan**.

## 6. Start Writing An Article

You can start an article in two ways:

- Use the main system command box, for example: `start article 1`.
- Select an article from Planning, then start the pipeline from the app controls.

The required pipeline agents are:

- Research
- Structure
- Writing
- Final editor

Optional agents, such as reader simulation, fact check, style, review, growth, and distribution, are only used when the instruction needs them and your settings allow them.

## 7. Watch Agent Work

Open **Agent workspace** to see:

- Which agent is running.
- Which agent is done.
- Whether an agent has an error.
- What each agent delivered.
- The final editor's integrated result.

If the app reports an error, read the agent output and retry the task after fixing the cause, such as an invalid API key or provider error.

## 8. Edit The Final Draft

Open **Editor** to:

- Paste your own article and save it as the final draft.
- Edit an agent-generated article.
- Change formatting.
- Save the current content as the latest final draft.

Before publication, the editor is always the source of truth for the latest final draft.

## 9. Freeze A Published Article

After publishing the article outside Writing OS, click the published/frozen confirmation button in the editor.

Once an article is frozen:

- Agents should not revise it.
- Later edits are treated as your personal published-copy notes.
- The system moves you to the next article.

## 10. Control API Cost

Use agent settings to:

- Keep the four required agents.
- Limit optional specialist agents.
- Cap how many optional agents can join a collaboration round.

For lower cost, start with fewer optional agents and only enable specialists when needed.

## 11. Stop The App

Close the desktop window or terminal window, or press:

```text
Ctrl + C
```

The local frontend and backend will stop.

## 12. Before Publishing Your Own Fork

Run:

```bash
bash scripts/prepublish-check.sh
```

For a stricter clean-copy rehearsal, run:

```bash
bash scripts/release-dry-run.sh
```

The dry run creates a clean candidate folder, reinstalls dependencies, and runs all checks outside your working tree.
