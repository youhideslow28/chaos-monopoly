import { spawn } from 'node:child_process';
import net from 'node:net';
import http from 'node:http';

/**
 * Checks if a TCP port is currently open and accepting connections.
 */
export function isPortOpen(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port, host, timeout: 600 });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => {
      resolve(false);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

/**
 * Waits until a TCP port begins accepting connections, or throws if timeout exceeded.
 */
export async function waitForPort(port, host = '127.0.0.1', timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const open = await isPortOpen(port, host);
    if (open) return true;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Timed out waiting for port ${port} on ${host} after ${timeoutMs}ms`);
}

/**
 * Ensures both Vite frontend and multiplayer backend servers are up and running.
 */
export async function startServers({ vitePort = 3000, mpPort = 3001 } = {}) {
  const spawnedProcesses = [];

  const isViteUp = await isPortOpen(vitePort);
  if (!isViteUp) {
    const viteProcess = spawn('npx', ['vite', '--port', String(vitePort), '--host', '0.0.0.0'], {
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'test' },
    });
    spawnedProcesses.push(viteProcess);
  }

  const isMpUp = await isPortOpen(mpPort);
  if (!isMpUp) {
    const mpProcess = spawn('npx', ['tsx', 'src/server/index.ts'], {
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        MULTIPLAYER_PORT: String(mpPort),
        MULTIPLAYER_HOST: '0.0.0.0',
        AI_ACTION_DELAY_MS: '200', // Speed up AI turns for tests
      },
    });
    spawnedProcesses.push(mpProcess);
  }

  // Wait for both to be ready
  await Promise.all([
    waitForPort(vitePort, '127.0.0.1', 25000),
    waitForPort(mpPort, '127.0.0.1', 25000),
  ]);

  const viteUrl = `http://localhost:${vitePort}`;
  const mpWsUrl = `ws://localhost:${mpPort}/ws`;
  const mpHttpUrl = `http://localhost:${mpPort}`;

  const stop = async () => {
    for (const proc of spawnedProcesses) {
      try {
        if (proc.pid) {
          // On Windows, taskkill /pid /t /f ensures child processes are killed
          if (process.platform === 'win32') {
            spawn('taskkill', ['/pid', String(proc.pid), '/t', '/f'], { shell: true });
          } else {
            proc.kill('SIGTERM');
          }
        }
      } catch {
        // Ignore kill errors during cleanup
      }
    }
  };

  return {
    viteUrl,
    mpWsUrl,
    mpHttpUrl,
    stop,
    spawnedCount: spawnedProcesses.length,
  };
}
