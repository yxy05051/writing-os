const { app, BrowserWindow, dialog } = require("electron");
const { spawn, spawnSync } = require("child_process");
const fs = require("fs");
const http = require("http");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const backendDir = path.join(rootDir, "backend");
const frontendDir = path.join(rootDir, "frontend");

const backendPort = String(process.env.WRITING_OS_BACKEND_PORT || "8000");
const frontendPort = String(process.env.WRITING_OS_FRONTEND_PORT || "3000");
const backendUrl = `http://127.0.0.1:${backendPort}`;
const frontendUrl = `http://127.0.0.1:${frontendPort}`;

const isWindows = process.platform === "win32";
const children = [];
let mainWindow;

function npmCommand() {
  return isWindows ? "npm.cmd" : "npm";
}

function pythonCommand() {
  return isWindows ? "python" : "python3";
}

function venvPythonPath() {
  return isWindows
    ? path.join(backendDir, "venv", "Scripts", "python.exe")
    : path.join(backendDir, "venv", "bin", "python");
}

function setStatus(title, detail = "") {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  const html = `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Writing OS</title>
      <style>
        body {
          margin: 0;
          min-height: 100vh;
          display: grid;
          place-items: center;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          color: #1f2937;
          background: #f7f5ef;
        }
        main {
          width: min(560px, calc(100vw - 48px));
          padding: 28px;
          border: 1px solid #ded8ca;
          border-radius: 12px;
          background: #fffdfa;
          box-shadow: 0 18px 45px rgba(31, 41, 55, 0.12);
        }
        h1 {
          margin: 0 0 10px;
          font-size: 22px;
          font-weight: 700;
        }
        p {
          margin: 0;
          color: #6b7280;
          line-height: 1.6;
        }
        .bar {
          width: 100%;
          height: 8px;
          margin-top: 22px;
          overflow: hidden;
          border-radius: 999px;
          background: #e7e1d4;
        }
        .bar::before {
          content: "";
          display: block;
          width: 42%;
          height: 100%;
          border-radius: inherit;
          background: #3f7f72;
          animation: loading 1.2s ease-in-out infinite;
        }
        @keyframes loading {
          0% { transform: translateX(-105%); }
          100% { transform: translateX(245%); }
        }
      </style>
    </head>
    <body>
      <main>
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(detail)}</p>
        <div class="bar"></div>
      </main>
    </body>
  </html>`;

  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function runChecked(command, args, options, label) {
  setStatus(label, "This may take a moment on first run.");
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env || process.env,
    shell: false,
    stdio: "inherit"
  });

  if (result.status !== 0) {
    throw new Error(`${label} failed. Check the terminal output for details.`);
  }
}

function ensureEnvFile() {
  const envPath = path.join(backendDir, ".env");
  const examplePath = path.join(backendDir, ".env.example");
  if (!fs.existsSync(envPath) && fs.existsSync(examplePath)) {
    fs.copyFileSync(examplePath, envPath);
  }
}

function ensureBackend() {
  const venvPython = venvPythonPath();
  if (!fs.existsSync(venvPython)) {
    runChecked(pythonCommand(), ["-m", "venv", path.join(backendDir, "venv")], { cwd: rootDir }, "Creating Python environment");
    runChecked(venvPythonPath(), ["-m", "pip", "install", "--upgrade", "pip"], { cwd: backendDir }, "Updating Python installer");
    runChecked(venvPythonPath(), ["-m", "pip", "install", "-r", "requirements.txt"], { cwd: backendDir }, "Installing backend dependencies");
  }
}

function ensureFrontend() {
  if (!fs.existsSync(path.join(frontendDir, "node_modules"))) {
    runChecked(npmCommand(), ["install"], { cwd: frontendDir }, "Installing frontend dependencies");
  }
}

function startProcess(command, args, options) {
  const child = spawn(command, args, {
    cwd: options.cwd,
    env: options.env || process.env,
    detached: !isWindows,
    shell: false,
    stdio: "inherit"
  });

  children.push(child);
  child.on("exit", (code, signal) => {
    if (!app.isQuitting && code !== 0 && signal !== "SIGTERM") {
      setStatus("A service stopped unexpectedly", `${command} exited with code ${code ?? signal}.`);
    }
  });
  return child;
}

function startServices() {
  setStatus("Starting Writing OS", "Preparing local services.");
  ensureEnvFile();
  ensureBackend();
  ensureFrontend();

  startProcess(venvPythonPath(), ["-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", backendPort], {
    cwd: backendDir
  });

  startProcess(npmCommand(), ["run", "dev", "--", "--hostname", "127.0.0.1", "--port", frontendPort], {
    cwd: frontendDir,
    env: {
      ...process.env,
      WRITING_OS_BACKEND_URL: backendUrl,
      NEXT_PUBLIC_WRITING_OS_WS_URL: `ws://127.0.0.1:${backendPort}/ws`
    }
  });
}

function waitForHttp(url, timeoutMs = 60000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    function ping() {
      const request = http.get(url, (response) => {
        response.resume();
        resolve();
      });

      request.on("error", () => {
        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error(`Timed out waiting for ${url}`));
          return;
        }
        setTimeout(ping, 700);
      });

      request.setTimeout(1500, () => {
        request.destroy();
      });
    }

    ping();
  });
}

function stopServices() {
  for (const child of children.splice(0)) {
    if (child.killed || !child.pid) {
      continue;
    }

    if (isWindows) {
      spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], { stdio: "ignore" });
    } else {
      try {
        process.kill(-child.pid, "SIGTERM");
      } catch {
        child.kill();
      }
    }
  }
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 900,
    minWidth: 1040,
    minHeight: 720,
    title: "Writing OS",
    backgroundColor: "#f7f5ef",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  try {
    startServices();
    setStatus("Opening Writing OS", "Waiting for the local web app to be ready.");
    await waitForHttp(frontendUrl);
    await mainWindow.loadURL(frontendUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setStatus("Writing OS could not start", message);
    dialog.showErrorBox("Writing OS could not start", message);
  }
}

app.on("before-quit", () => {
  app.isQuitting = true;
  stopServices();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.whenReady().then(createWindow);
