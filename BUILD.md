# Build installable apps (Android + iPhone)

Expo Go is only for previewing. To get real apps your mates **install and keep**, use
**EAS Build** (Expo's free cloud builder). The builds run in the cloud — you don't need
Android Studio or Xcode.

> Notifications (push when a mate posts) only work in these real builds, **not** in Expo Go.

## 0. One-time prep
```bash
npm install -g eas-cli
eas login            # create a free Expo account if you don't have one
cd bible-journal
eas init             # creates the project on Expo + fills the projectId
```
`eas init` will write your real `projectId` into `app.json` (replacing the placeholder).

## 1. Android — the easy one (APK you can sideload)
```bash
eas build --profile preview --platform android
```
- Wait ~10–15 min. EAS gives you a link to download an **`.apk`**.
- Send that link to your mates. On Android: open it → "install anyway" (allow unknown
  sources if asked). Done — it installs like a normal app.

## 2. iPhone — needs an Apple decision
Apple won't let you freely install outside the App Store. Pick one:

**A. TestFlight (recommended for a group)** — needs an **Apple Developer account** ($99/yr).
```bash
eas build --profile production --platform ios
eas submit --platform ios          # uploads to App Store Connect / TestFlight
```
Then invite your mates' emails in TestFlight; they install the **TestFlight** app and tap
your app. Lasts 90 days per build, easy to renew.

**B. Free Apple ID (no paid account)** — each phone must be registered, and apps expire
after **7 days** (fine for trying it out, annoying long-term):
```bash
eas device:create                  # register each iPhone (one-time per device)
eas build --profile development --platform ios
```

> If you don't have a Mac or Apple account, start with **Android** today and add iPhone
> later — the code is identical.

## 3. Turn on push notifications (after the backend is set up)
1. Run the SQL in [`supabase/notifications.sql`](supabase/notifications.sql)
   (Supabase → SQL Editor → paste → Run). It adds the `push_token` column + the trigger.
2. Deploy the Edge Function (sends the actual push):
   ```bash
   npm install -g supabase
   supabase login
   supabase link --project-ref YOURREF        # the subdomain of your project URL
   supabase functions deploy notify-group --no-verify-jwt
   ```
3. Point the trigger at the function — run these in the SQL Editor (replace values):
   ```sql
   alter database postgres set app.settings.notify_url = 'https://YOURREF.functions.supabase.co/notify-group';
   alter database postgres set app.settings.anon_key   = 'YOUR_PUBLISHABLE_OR_ANON_KEY';
   ```
4. In the app, allow notifications when prompted. Now when anyone posts to the Group,
   the others get a push. A **daily reflection reminder** is also available in
   **Settings** (gear icon, top-right of the Today screen) — that one works on-device,
   no backend needed.

## Updating the app (over-the-air, no rebuild)

The app uses **EAS Update**, so most changes reach everyone's phones in ~30 seconds
without a new build or reinstall. Updates apply the next time someone opens the app.

> Only works on builds made **after** EAS Update was enabled. The very first APK
> doesn't receive OTA — rebuild once, then OTA works from then on.

**Push an update to everyone on the preview (APK) build:**
```bash
cd bible-journal
npx eas-cli update --branch preview --message "What changed"
```

**Push to the production (store) build:**
```bash
npx eas-cli update --branch production --message "What changed"
```

### When OTA is enough vs. a full rebuild

| Change | What to run |
|--------|-------------|
| Verses, text, colors, layout, bug fixes (JS/assets only) | `npx eas-cli update --branch preview -m "..."` |
| New native package (`expo-*`, `@react-native-*`) | full `eas build …` again |
| App icon, splash, app name, or runtime version | full `eas build …` again |

## Quick recap
| Goal | Command |
|------|---------|
| Android app (APK) | `npx eas-cli build --profile preview --platform android` |
| iPhone via TestFlight | `npx eas-cli build --profile production --platform ios` then `npx eas-cli submit -p ios` |
| iPhone, free, 7-day | `npx eas-cli device:create` then `npx eas-cli build --profile development --platform ios` |
| Push a JS/content change (no rebuild) | `npx eas-cli update --branch preview -m "..."` |
| Full rebuild (native change) | re-run the matching `eas build` command |
