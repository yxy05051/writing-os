const http = require('http');
const net = require('net');
const { execFileSync } = require('child_process');

const listenPort = Number(process.env.WRITING_OS_PROXY_PORT || 3030);
const frontendPort = Number(process.env.WRITING_OS_FRONTEND_PORT || 3000);
const backendPort = Number(process.env.WRITING_OS_BACKEND_PORT || 8000);
let cachedHost = process.env.WRITING_OS_TARGET_HOST || '';
let cachedAt = 0;

function getTargetHost() {
  if (process.env.WRITING_OS_TARGET_HOST) return process.env.WRITING_OS_TARGET_HOST;
  const now = Date.now();
  if (cachedHost && now - cachedAt < 5000) return cachedHost;
  const output = execFileSync('wsl.exe', ['-d', 'Ubuntu-24.04', '--user', 'root', '--exec', 'hostname', '-I'], {
    encoding: 'utf8',
    timeout: 5000,
    windowsHide: true,
  });
  cachedHost = output.trim().split(/\s+/)[0];
  cachedAt = now;
  return cachedHost;
}

function proxyHttp(req, res) {
  const isWsPath = req.url === '/ws' || req.url.startsWith('/ws?');
  const targetPort = isWsPath ? backendPort : frontendPort;
  let targetHost;
  try {
    targetHost = getTargetHost();
  } catch (error) {
    res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(`Writing OS proxy could not resolve WSL IP: ${error.message}`);
    return;
  }
  const options = {
    hostname: targetHost,
    port: targetPort,
    method: req.method,
    path: req.url,
    headers: {
      ...req.headers,
      host: `${targetHost}:${targetPort}`,
    },
  };

  const upstream = http.request(options, (upstreamRes) => {
    res.writeHead(upstreamRes.statusCode || 502, upstreamRes.headers);
    upstreamRes.pipe(res);
  });
  upstream.setTimeout(10000, () => upstream.destroy(new Error('upstream timeout')));

  upstream.on('error', (error) => {
    res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(`Writing OS proxy error (${targetHost}:${targetPort}): ${error.message}`);
  });

  req.pipe(upstream);
}

const server = http.createServer(proxyHttp);

server.on('upgrade', (req, socket, head) => {
  let targetHost;
  try {
    targetHost = getTargetHost();
  } catch {
    socket.destroy();
    return;
  }
  const targetSocket = net.connect(backendPort, targetHost, () => {
    targetSocket.write(
      `${req.method} ${req.url} HTTP/${req.httpVersion}\r\n` +
        Object.entries({
          ...req.headers,
          host: `${targetHost}:${backendPort}`,
        })
          .map(([key, value]) => `${key}: ${value}`)
          .join('\r\n') +
        '\r\n\r\n'
    );
    if (head.length) targetSocket.write(head);
    targetSocket.pipe(socket);
    socket.pipe(targetSocket);
  });

  targetSocket.on('error', () => socket.destroy());
});

server.listen(listenPort, '127.0.0.1', () => {
  console.log(`Writing OS proxy listening on http://localhost:${listenPort}/`);
});
