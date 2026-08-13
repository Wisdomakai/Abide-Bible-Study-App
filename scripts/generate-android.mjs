import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  BufferedLog,
  ConsoleLog,
  DigitalAssetLinks,
  TwaGenerator,
  TwaManifest,
} = require('@bubblewrap/core');

const root = path.resolve(import.meta.dirname, '..');
const toolsDir = path.join(root, '.android-tools');
const androidDir = path.join(root, 'android');
const signingFile = path.join(toolsDir, 'signing.json');
const keyPath = path.join(toolsDir, 'ardent-release.jks');
const javaHome = path.join(toolsDir, 'jdk', 'jdk-17.0.11+9', 'Contents', 'Home');
const keytool = path.join(javaHome, 'bin', 'keytool');
const packageId = 'com.ardentbiblestudy.app';
const keyAlias = 'ardent';

await fs.mkdir(toolsDir, { recursive: true });
await fs.mkdir(androidDir, { recursive: true });

let signing;
if (existsSync(signingFile)) {
  signing = JSON.parse(await fs.readFile(signingFile, 'utf8'));
} else {
  signing = { password: crypto.randomBytes(32).toString('base64url') };
  await fs.writeFile(signingFile, `${JSON.stringify(signing, null, 2)}\n`, { mode: 0o600 });
}

if (!existsSync(keyPath)) {
  const generated = spawnSync(keytool, [
    '-genkeypair',
    '-dname', 'CN=Ardent Bible Study, OU=Ardent, O=Ardent Bible Study, C=GH',
    '-alias', keyAlias,
    '-keypass', signing.password,
    '-keystore', keyPath,
    '-storepass', signing.password,
    '-validity', '20000',
    '-keyalg', 'RSA',
    '-keysize', '2048',
  ], { stdio: 'inherit' });
  if (generated.status !== 0) throw new Error('Could not create the Android signing key.');
  await fs.chmod(keyPath, 0o600);
}

const listed = spawnSync(keytool, [
  '-J-Duser.language=en',
  '-list',
  '-v',
  '-keystore', keyPath,
  '-alias', keyAlias,
  '-storepass', signing.password,
  '-keypass', signing.password,
], { encoding: 'utf8' });
if (listed.status !== 0) throw new Error(listed.stderr || 'Could not inspect the Android signing key.');
const fingerprint = listed.stdout.match(/SHA256:\s*([A-F0-9:]+)/)?.[1];
if (!fingerprint) throw new Error('Could not read the Android SHA-256 signing fingerprint.');

const manifest = new TwaManifest({
  packageId,
  host: 'ardent-study.vercel.app',
  name: 'Ardent Bible Study',
  launcherName: 'Ardent',
  display: 'standalone',
  themeColor: '#4B3F9E',
  themeColorDark: '#36306E',
  navigationColor: '#4B3F9E',
  navigationColorDark: '#36306E',
  navigationDividerColor: '#4B3F9E',
  navigationDividerColorDark: '#36306E',
  backgroundColor: '#4B3F9E',
  enableNotifications: true,
  enableSiteSettingsShortcut: true,
  startUrl: '/',
  iconUrl: 'https://ardent-study.vercel.app/icon-512.png',
  maskableIconUrl: 'https://ardent-study.vercel.app/icon-512.png',
  splashScreenFadeOutDuration: 300,
  signingKey: { path: keyPath, alias: keyAlias },
  appVersion: '1.0.0',
  appVersionCode: 1,
  shortcuts: [],
  generatorApp: 'bubblewrap-cli',
  webManifestUrl: 'https://ardent-study.vercel.app/manifest.webmanifest',
  fallbackType: 'customtabs',
  features: {},
  minSdkVersion: 23,
  orientation: 'portrait',
  fullScopeUrl: 'https://ardent-study.vercel.app/',
  fingerprints: [{ name: 'Ardent release key', value: fingerprint }],
});

const manifestPath = path.join(androidDir, 'twa-manifest.json');
await manifest.saveToFile(manifestPath);

const log = new BufferedLog(new ConsoleLog('android'));
await new TwaGenerator().createTwaProject(androidDir, manifest, log);
log.flush();

const manifestContents = await fs.readFile(manifestPath);
await fs.writeFile(
  path.join(androidDir, 'manifest-checksum.txt'),
  crypto.createHash('sha1').update(manifestContents).digest('hex'),
);

const assetLinksDir = path.join(root, 'public', '.well-known');
await fs.mkdir(assetLinksDir, { recursive: true });
await fs.writeFile(
  path.join(assetLinksDir, 'assetlinks.json'),
  DigitalAssetLinks.generateAssetLinks(packageId, fingerprint),
);

console.log(`Android project generated for ${packageId}.`);
console.log(`Signing fingerprint: ${fingerprint}`);
