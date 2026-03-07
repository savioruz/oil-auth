#!/usr/bin/env bun
/**
 * stops the e2e server by reading its PID from .e2e-server.pid
 */
import { existsSync, readFileSync, unlinkSync } from 'node:fs';

const pidFile = '.e2e-server.pid';

if (!existsSync(pidFile)) {
  console.log('No e2e server PID file found, nothing to stop');
  process.exit(0);
}

const pid = parseInt(readFileSync(pidFile, 'utf-8').trim(), 10);
unlinkSync(pidFile);

try {
  process.kill(pid, 'SIGTERM');
  console.log(`Stopped e2e server (PID ${pid})`);
} catch {
  console.log(`e2e server (PID ${pid}) already stopped`);
}
