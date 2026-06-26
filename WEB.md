# Ardent on the web (PWA — works on iPhone)

The app is also deployed as an installable **Progressive Web App**, so iPhone (and any
browser) users can use it without the App Store.

**Live URL:** https://bible-study-journal.expo.app

## Install on iPhone (no App Store / no Apple account)
1. Open **https://bible-study-journal.expo.app** in **Safari**.
2. Tap the **Share** button → **Add to Home Screen** → **Add**.
3. "Ardent" appears as an app icon and opens full-screen (standalone), like a native app.

(On Android/Chrome it's the same idea: menu → "Install app".)

## Re-deploy after code changes
```bash
cd bible-journal
npx expo export --platform web --output-dir dist   # build web
node scripts/pwa-postbuild.mjs                      # add manifest, icons, SW, meta
npx eas-cli deploy --prod                           # publish to the production URL
```
The production URL stays the same, so installed PWAs get the new version on next open
(the service worker refreshes assets in the background).

## Notes / limitations on web
- Works: onboarding, daily verse + KJV/NIV/NLT toggle, journal, prayers, the shared group
  feed (Supabase), invite codes.
- Limited on iOS PWAs: push notifications and the native time picker behave differently
  than on the installed app — the core journaling + group features are the focus on web.
- The PWA and the native builds share the same Supabase backend, so a web user and a
  phone user in the same group code see the same feed.
