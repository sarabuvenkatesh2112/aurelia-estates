import { spawn } from 'node:child_process';
const child = spawn(
  process.execPath,
  ['node_modules/next/dist/bin/next', ...process.argv.slice(2)],
  {
    env: { ...process.env, DB_TARGET: 'local' },
    stdio: 'inherit',
    windowsHide: true,
  },
);
child.on('exit', (code) => {
  process.exitCode = code || 0;
});
