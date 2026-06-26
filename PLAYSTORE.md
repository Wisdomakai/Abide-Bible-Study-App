# Publishing Abide to the Google Play Store

A start-to-finish checklist. The build runs in Expo's cloud; the rest is the Play Console
(web). Plan ~1–2 hours for first-time setup, then Google reviews the app (hours–days).

## 0. One-time prerequisites
- A **Google Play Developer account** — one-time **$25** at
  https://play.google.com/console/signup (sign in with the Google account you want to own
  the app). Identity verification can take a day or two — start this first.
- Your EAS/Expo login (already set up).

## 1. Build the release bundle (.aab)
Play needs an **Android App Bundle**, which the `production` profile already produces:
```bash
cd bible-journal
npx eas-cli build --profile production --platform android
```
- It reuses your EAS-managed keystore (let it). ~10–15 min → a downloadable **.aab** link.
- Download the `.aab` (you'll upload it to Play in step 4).

## 2. Host the privacy policy (Play requires a public URL)
Easiest: GitHub Pages from your repo.
1. First edit `store/privacy.html` → replace `REPLACE_WITH_YOUR_EMAIL` with your contact email, commit & push.
2. On GitHub: repo **Settings → Pages → Build and deployment → Source: "Deploy from a branch"**,
   Branch **main**, folder **/ (root)** → Save.
3. After a minute your policy is at:
   `https://wisdomakai.github.io/Abide-Bible-Study-App/store/privacy.html`
   (Open it to confirm, then use this as the privacy policy URL in Play.)

## 3. Create the app in Play Console
- Play Console → **Create app** → name `Abide: Bible Study Journal` (see store/listing.md
  about the name), language, **App**, **Free** → create.
- Work through **Set up your app / Dashboard** tasks:
  - **App access** — all features available without special login → "All functionality is available without restrictions" (anonymous account is automatic).
  - **Ads** — No ads.
  - **Content rating** — fill the questionnaire → Everyone.
  - **Target audience** — 13+ (not directed at children).
  - **Data safety** — use the answers in `store/listing.md`.
  - **Privacy policy** — paste the URL from step 2.

## 4. Upload the build to a testing track first
Don't go straight to production. Start with **Internal testing** (instant, no review):
- Play Console → **Testing → Internal testing → Create new release**.
- Upload your **.aab** from step 1. (Play will manage app signing — accept.)
- Add release notes, **Save → Review release → Start rollout to Internal testing**.
- Add your mates' emails as testers; share the opt-in link Play gives you. They install via Play.

When it's solid, promote to **Production**:
- **Production → Create new release** → reuse the same bundle → fill the store listing
  (title, short/full description from `store/listing.md`, feature graphic
  `store/feature-graphic.png`, 2+ phone screenshots, icon) → **Send for review**.
- Google reviews new apps (typically a few hours to a few days). Then it's live. 🎉

## 5. Updating later
- **Code changes (JS only):** no new upload needed — `npx eas-cli update --branch production -m "..."`.
- **New native module / version bump:** rebuild (`eas build … production`) and upload the new
  `.aab` as a new release. `versionCode` auto-increments (`autoIncrement` is on).

## Optional: automated submission
Instead of manual upload you can use `eas submit -p android`, but it needs a Google Play
service-account JSON key (Play Console → Setup → API access). Manual upload is simpler for
the first release; switch to `eas submit` later if you publish often.
