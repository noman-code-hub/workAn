import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const rootDir = process.cwd();
const isWindows = process.platform === 'win32';

const processes = [];
let shuttingDown = false;

const shutdown = (exitCode = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of processes) {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  }

  setTimeout(() => process.exit(exitCode), 250);
};

const startService = (name, cwd, args) => {
  const child = isWindows
    ? spawn('cmd.exe', ['/d', '/s', '/c', `npm ${args.join(' ')}`], {
        cwd,
        stdio: 'inherit',
        env: process.env,
      })
    : spawn('npm', args, {
        cwd,
        stdio: 'inherit',
        env: process.env,
      });

  child.on('exit', (code, signal) => {
    const detail = signal ? `signal ${signal}` : `code ${code ?? 0}`;
    console.log(`[dev] ${name} exited with ${detail}`);
    shutdown(code ?? (signal ? 1 : 0));
  });

  child.on('error', (error) => {
    console.error(`[dev] Failed to start ${name}:`, error);
    shutdown(1);
  });

  processes.push(child);
};

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

console.log('[dev] Starting frontend and Node PDF backend...');

startService('server', path.join(rootDir, 'server'), ['run', 'dev']);
startService('client', rootDir, ['run', 'dev:client']);
