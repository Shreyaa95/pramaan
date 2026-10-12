const { spawn } = require('child_process');
const path = require('path');

console.log('====================================================');
console.log('  Starting PRAMAAN Fullstack Development Suite...');
console.log('====================================================');

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';
const nodeCmd = 'node';

// Spawn backend server
const backendProcess = spawn(nodeCmd, ['backend/server.js'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

// Spawn frontend dev server
const frontendProcess = spawn(npmCmd, ['run', 'dev'], {
  cwd: path.join(__dirname, 'frontend'),
  stdio: 'inherit',
  shell: true
});

function cleanup() {
  console.log('\nShutting down PRAMAAN dev servers...');
  try {
    if (backendProcess && !backendProcess.killed) {
      if (isWindows && backendProcess.pid) {
        spawn('taskkill', ['/pid', backendProcess.pid, '/f', '/t']);
      } else {
        backendProcess.kill();
      }
    }
  } catch (e) {}

  try {
    if (frontendProcess && !frontendProcess.killed) {
      if (isWindows && frontendProcess.pid) {
        spawn('taskkill', ['/pid', frontendProcess.pid, '/f', '/t']);
      } else {
        frontendProcess.kill();
      }
    }
  } catch (e) {}

  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
