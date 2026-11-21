# Ardent — web-first Bible study journal

Ardent is now a pure installable Progressive Web App. It uses React + Vite in the browser, Supabase for authenticated journal sync and group data, private Supabase Storage for voice recordings, and standards-based Web Push for in-app and phone alerts.

Production PWA: https://ardent-study.vercel.app

## Run locally

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run preview
```

The production output is `dist/`. It contains an installable manifest and a generated, versioned service worker. Deploy `dist/` to an HTTPS static host with SPA fallback to `index.html`.

## Backend setup

Follow [BACKEND.md](BACKEND.md). People start as guests (anonymous Supabase accounts with just a display name) and can save the account later with an email and password; Google sign-in is also offered. Anonymous, Email, and Google providers must all be enabled.

Before a public launch, complete the operator-owned items in [COMPLIANCE.md](COMPLIANCE.md); the repository cannot supply a legal entity, privacy contact, retention policy, or jurisdiction on the operator's behalf.

## Notifications

- While Ardent is open, new group posts appear in the notification bell and as an in-app banner.
- After a user explicitly enables notifications, the service worker shows device/phone alerts even when the installed PWA is closed.
- Daily reflection reminders are sent by the scheduled `notify-reminders` Edge Function in the user’s saved timezone.

Mobile store builds are intentionally paused. See [MOBILE_LATER.md](MOBILE_LATER.md) for the later iOS/Android packaging boundary.
