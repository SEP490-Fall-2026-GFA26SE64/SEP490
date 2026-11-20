// Build the isolated Brightpath frontend with its required feature flags.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const windows = process.platform === 'win32';
const result = spawnSync(windows ? (process.env.ComSpec || 'cmd.exe') : 'npm',
  windows ? ['/d', '/s', '/c', 'npm.cmd run build'] : ['run', 'build'], {
    cwd: fileURLToPath(new URL('../../frontend/', import.meta.url)),
    stdio: 'inherit',
    env: {
      ...process.env,
      VITE_ADAPTIVE_BASELINE_ENABLED: 'true',
      VITE_EMPLOYEE_ADAPTIVE_BASELINE_ENABLED: 'true',
      VITE_LOCAL_BASELINE_DEMO_ENABLED: 'false',
      VITE_DEMO_CHECKPOINT_ENABLED: 'true',
    },
  });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
