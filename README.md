# Abide — Bible Study Journal

A calm, modern journaling app for a Bible study group. Built with **Expo (React Native)** so it runs as a real app on iOS and Android.

## Features
- **Today** — a shared Verse of the Day (same verse for everyone each day) with a space to write your reflection. A gentle **streak** counter rewards daily reflection.
- **Journal** — free-form study notes with titles, tags, and search.
- **Prayer** — track prayer requests and move them to **Answered** with a tap, giving thanks.
- **Group** — a shared feed where mates post reflections, notes, and prayer requests and encourage each other with **Amen** (❤).
- Onboarding asks only for a first name. Everything is stored on-device.

## Run it (5 minutes, no Mac/Xcode needed)
1. Install Node.js 18+.
2. In this folder:
   ```bash
   npm install
   npx expo start
   ```
3. On your phone, install **Expo Go** (App Store / Play Store).
4. Scan the QR code shown in the terminal. The app opens on your phone.

> Tip: `npx expo start --tunnel` if your phone and computer aren’t on the same Wi-Fi.

## How the "shared group feed" works
The group feed talks to one small module: [`src/data/api.js`](src/data/api.js).

- **Right now** it uses on-device storage seeded with sample mates, so the whole app works and demos end-to-end on a single phone.
- **To make it truly shared across phones**, replace the four functions in that file (`getFeed`, `addPost`, `toggleAmen`, `subscribe`) with calls to a backend. The screens never change. The file contains a ready-to-use **Supabase** sketch (Postgres + Auth + Realtime is the quickest path).

## Project structure
```
App.js                  Navigation, fonts, onboarding gate
src/theme.js            Colors, fonts, spacing, shadows
src/data/
  verses.js             Bundled daily verses (offline)
  storage.js            AsyncStorage helpers
  AppContext.js         App state: reflections, notes, prayers, streak
  api.js                GROUP FEED backend seam (swap for Supabase/Firebase)
src/components/ui.js    Card, Button, Pill, EmptyState, etc.
src/screens/            Onboarding, Today, Journal, NoteEditor, Prayer, Group
```

## Design
Calm & reflective: warm cream canvas, deep indigo, soft gold accent. **Lora** serif for scripture and titles, **Inter** for UI. Large tap targets, generous spacing, SVG icons (no emoji), accessible contrast.
