# Build and release

Ardent's primary product is the PWA. The Android app is a Capacitor shell that
loads the live site (`server.url` in `capacitor.config.json`), so web fixes reach
Android users on the next deploy without a store update. A new Android release
is only needed for native changes: permissions, plugins, icons, or the SDK
target. Expo and EAS are not used.

```bash
npm ci
npm run build
```

## Android

The Android package ID is `com.ardentbiblestudy.app`. It targets API 36
(Capacitor 8), which satisfies Google Play's target-SDK requirement.

Capacitor 8 needs **JDK 21** exactly: its plugins request a Java 21 toolchain,
so Android Studio's bundled JDK 25 is not enough. The build script uses
`JAVA_HOME` if set, otherwise the newest `jdk-21*` folder under the ignored
`.android-tools/jdk/` (Eclipse Temurin 21 for macOS, unpacked there).

```bash
npm run android:build
```

The command builds the PWA, synchronizes it into the native project, signs the
release, and writes two files named after `versionName` in
`android/app/build.gradle`:

- `Ardent-Bible-Study-v<version>.aab` — **upload this to Google Play.**
- `Ardent-Bible-Study-v<version>.apk` — for direct installs from the website;
  also copied to `public/downloads/`.

Bump `versionCode` (by one) and `versionName` in `android/app/build.gradle` for
every Play upload; Play rejects a repeated `versionCode`.

The release key and password are stored only under the ignored
`.android-tools/` directory. Back up both `.android-tools/ardent-release.jks`
and `.android-tools/signing.json` securely. On Google Play this key is the
**upload key**: Play App Signing re-signs the app with Google's own key.

### Google sign-in on Play installs

`/.well-known/assetlinks.json` must list **every** certificate the app can be
signed with, or the Google OAuth return URL opens the browser instead of the
app. After the first upload, copy the SHA-256 fingerprint from Play Console →
Test and release → App integrity → App signing key certificate, and add it to
`sha256_cert_fingerprints` next to the existing upload-key fingerprint.

Android daily reminders use the operating system's local-notification
permission and scheduler. Foreground group activity still appears in Ardent's
in-app notification UI. Background remote group push will require a later
Firebase Cloud Messaging setup and is not part of the Android app yet.

Publish `dist/` to an HTTPS static host with SPA fallback enabled. Never upload source `.env` files or Supabase service-role/VAPID private keys; those secrets belong only in Supabase Edge Function secrets.

Before release:

- Apply the SQL files in the order documented in [BACKEND.md](BACKEND.md), including `moderation.sql`.
- Deploy `notify-group`, `notify-reminders`, `admin-data`, and `delete-account`.
- Confirm email magic links return to the production origin.
- Test notification permission from a user tap and a local-time daily reminder.
- Test Google sign-in returns from the browser to the installed app.
- Test microphone permission, recording, playback, and deletion on a real device.
- Test account deletion with a disposable account.
- Test reporting a post and blocking a member with two accounts, then remove
  the reported post from the admin dashboard.
- Run `npm run build` and `npm audit --omit=dev`.
