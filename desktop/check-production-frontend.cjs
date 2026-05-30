const http = require("http");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const frontendDir = path.join(rootDir, "frontend");
const port = Number(process.env.WRITING_OS_DESKTOP_CHECK_PORT || "3333");
const backendPort = String(process.env.WRITING_OS_BACKEND_PORT || "8333");

process.env.WRITING_OS_BACKEND_URL = `http://127.0.0.1:${backendPort}`;
process.env.NEXT_PUBLIC_WRITING_OS_WS_URL = `ws://127.0.0.1:${backendPort}/ws`;

async function main() {
  const next = require(path.join(frontendDir, "node_modules", "next"));
  const nextApp = next({
    dev: false,
    dir: frontendDir,
    hostname: "127.0.0.1",
    port
  });
  const handler = nextApp.getRequestHandler();

  await nextApp.prepare();

  const server = http.createServer((request, response) => handler(request, response));

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });

  try {
    const statusCode = await requestRoot();
    if (statusCode !== 200) {
      throw new Error(`Production frontend returned HTTP ${statusCode}.`);
    }
    console.log("Production frontend smoke test passed.");
  } finally {
    server.close();
  }
}

function requestRoot() {
  return new Promise((resolve, reject) => {
    const request = http.get(`http://127.0.0.1:${port}`, (response) => {
      response.resume();
      resolve(response.statusCode);
    });
    request.on("error", reject);
    request.setTimeout(10000, () => {
      request.destroy(new Error("Timed out waiting for production frontend."));
    });
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
