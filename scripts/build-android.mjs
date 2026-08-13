import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const toolsDir = path.join(root, '.android-tools');
const androidDir = path.join(root, 'android');
const signing = JSON.parse(await fs.readFile(path.join(toolsDir, 'signing.json'), 'utf8'));

const result = spawnSync(
  path.join(root, 'node_modules', '.bin', 'bubblewrap'),
  ['build'],
  {
    cwd: androidDir,
    env: {
      ...process.env,
      BUBBLEWRAP_CONFIG_HOME: toolsDir,
      BUBBLEWRAP_KEYSTORE_PASSWORD: signing.password,
      BUBBLEWRAP_KEY_PASSWORD: signing.password,
    },
    stdio: 'inherit',
  },
);

if (result.status !== 0) process.exit(result.status || 1);
