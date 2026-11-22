import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const toolsDir = path.join(root, '.android-tools');
const androidDir = path.join(root, 'android');
const signing = JSON.parse(await fs.readFile(path.join(toolsDir, 'signing.json'), 'utf8'));

// The release name follows the versionName in android/app/build.gradle, so a
// version bump there is the only edit a new release needs.
const appGradle = await fs.readFile(path.join(androidDir, 'app', 'build.gradle'), 'utf8');
const versionName = appGradle.match(/versionName\s+"([^"]+)"/)?.[1];
if (!versionName) throw new Error('versionName not found in android/app/build.gradle');
const baseName = `Ardent-Bible-Study-v${versionName}`;

// Capacitor 8 plugins request a JDK 21 toolchain specifically, so a newer JDK
// alone (such as Android Studio's bundled 25) is not enough. Prefer JAVA_HOME,
// then the JDK 21 kept under the ignored .android-tools/jdk/.
const jdkDir = path.join(toolsDir, 'jdk');
const bundled21 = existsSync(jdkDir)
  ? (await fs.readdir(jdkDir)).filter((name) => name.startsWith('jdk-21')).sort().pop()
  : null;
const javaHome = [
  process.env.JAVA_HOME,
  bundled21 && path.join(jdkDir, bundled21, 'Contents', 'Home'),
].find((dir) => dir && existsSync(path.join(dir, 'bin', 'java')));
if (!javaHome) throw new Error('No JDK 21 found. Unpack a JDK 21 into .android-tools/jdk/jdk-21* or set JAVA_HOME.');

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
// The admin dashboard is a website-only tool; it has no place in the app.
await fs.rm(path.join(root, 'dist', 'admin'), { recursive: true, force: true });
run(path.join(root, 'node_modules', '.bin', 'cap'), ['sync', 'android']);
// The APK is for direct installs from the website; Google Play only accepts
// the App Bundle (.aab).
run(path.join(androidDir, 'gradlew'), ['assembleRelease', 'bundleRelease'], {
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

const outputs = path.join(androidDir, 'app', 'build', 'outputs');
const apk = path.join(outputs, 'apk', 'release', 'app-release.apk');
const aab = path.join(outputs, 'bundle', 'release', 'app-release.aab');
await fs.copyFile(apk, path.join(root, `${baseName}.apk`));
await fs.mkdir(path.join(root, 'public', 'downloads'), { recursive: true });
await fs.copyFile(apk, path.join(root, 'public', 'downloads', `${baseName}.apk`));
await fs.copyFile(aab, path.join(root, `${baseName}.aab`));
console.log(`Created ${baseName}.apk and ${baseName}.aab (upload the .aab to Google Play)`);
