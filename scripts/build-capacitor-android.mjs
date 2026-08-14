import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const toolsDir = path.join(root, '.android-tools');
const androidDir = path.join(root, 'android');
const outputName = 'Ardent-Bible-Study-v1.3.0.apk';
const signing = JSON.parse(await fs.readFile(path.join(toolsDir, 'signing.json'), 'utf8'));
const javaHome = path.join(toolsDir, 'jdk', 'jdk-17.0.11+9', 'Contents', 'Home');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    env: process.env,
    stdio: 'inherit',
    ...options,
  });
  if (result.status !== 0) process.exit(result.status || 1);
}

run('npm', ['run', 'build']);
// Downloadable APKs belong on the website, never recursively inside the APK.
await fs.rm(path.join(root, 'dist', 'downloads'), { recursive: true, force: true });
// iOS launch images are dead weight in an Android package (~1.3 MB).
await fs.rm(path.join(root, 'dist', 'splash'), { recursive: true, force: true });
run(path.join(root, 'node_modules', '.bin', 'cap'), ['sync', 'android']);
run(path.join(androidDir, 'gradlew'), ['assembleRelease'], {
  cwd: androidDir,
  env: {
    ...process.env,
    JAVA_HOME: javaHome,
    ANDROID_HOME: path.join(toolsDir, 'android_sdk'),
    GRADLE_USER_HOME: path.join(toolsDir, 'gradle'),
    ARDENT_KEYSTORE_PATH: path.join(toolsDir, 'ardent-release.jks'),
    ARDENT_KEYSTORE_PASSWORD: signing.password,
    ARDENT_KEY_ALIAS: 'ardent',
    ARDENT_KEY_PASSWORD: signing.password,
  },
  stdio: 'inherit',
});

const source = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
await fs.copyFile(source, path.join(root, outputName));
await fs.mkdir(path.join(root, 'public', 'downloads'), { recursive: true });
await fs.copyFile(source, path.join(root, 'public', 'downloads', outputName));
console.log(`Created ${outputName}`);
