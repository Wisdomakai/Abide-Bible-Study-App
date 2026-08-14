# Build and release

Ardent's primary product is the PWA. The Android testing app is a Capacitor
package with the production web bundle stored inside the APK. It uses the same
authenticated Supabase data, but its interface is updated by installing a newer
APK. Expo and EAS are not used.

```bash
npm ci
npm run build
```

## Android

The Android package ID is `com.ardentbiblestudy.app`.

```bash
npm run android:build
```

The command builds the PWA, synchronizes it into the native project, signs the
release, and writes `Ardent-Bible-Study-v1.3.3.apk` both at the
repository root and under `public/downloads/`. The release key and password are
stored only under the ignored `.android-tools/` directory. Back up both
`.android-tools/ardent-release.jks` and `.android-tools/signing.json` securely;
losing them prevents compatible APK updates outside Google Play App Signing.

The matching certificate fingerprint must remain published at
`/.well-known/assetlinks.json` so the Google OAuth return URL opens the app.

Android daily reminders use the operating system's local-notification
permission and scheduler. Foreground group activity still appears in Ardent's
in-app notification UI. Background remote group push will require a later
Firebase Cloud Messaging setup and is not part of this test APK.

Publish `dist/` to an HTTPS static host with SPA fallback enabled. Never upload source `.env` files or Supabase service-role/VAPID private keys; those secrets belong only in Supabase Edge Function secrets.

Before release:

- Apply the SQL files in the order documented in [BACKEND.md](BACKEND.md).
- Deploy `notify-group`, `notify-reminders`, `admin-data`, and `delete-account`.
- Confirm email magic links return to the production origin.
- Test notification permission from a user tap and a local-time daily reminder.
- Test Google sign-in returns from the browser to the installed app.
- Test microphone permission, recording, playback, and deletion on a real device.
- Test account deletion with a disposable account.
- Run `npm run build` and `npm audit --omit=dev`.
