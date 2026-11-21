# Google Play — store listing copy for Ardent

## App name (max 30 chars)
`Ardent: Bible Study Journal`  (27 chars)

> Tip: before publishing, search Play for "Ardent" to confirm the exact title isn't taken.
> The package name `com.ardentbiblestudy.app` is what must be unique.

## Short description (max 80 chars)
`A simple journal for Bible study groups — daily verses, reflections, prayer.`  (75)

## Full description (max 4000 chars)
Ardent is a calm, simple place for your Bible study group to grow together.

Each day opens with a shared Verse of the Day — the same passage for everyone in your
group — in the public-domain King James Version. Read it, then write what God is saying to you.

• Daily verse and chapter reading in KJV
• A private space to journal your reflections, with a gentle daily reminder
• Study notes you can tag and search
• Track prayer requests and mark them answered — remembering His faithfulness
• A shared group feed: post reflections, notes, and prayers, and encourage one another
  with an "Amen"
• Start in seconds with just your name — add an email later to keep your journal safe across devices
• Private invite-only groups, with reporting and blocking to keep them safe

Whether you meet weekly or stay connected through the week, Ardent helps your group
study, reflect, and pray — together.

Made with love for Bible study groups.

## Required listing assets
- App icon: 512×512 (Play resizes from your 1024 icon — `assets/icon.png`)
- Feature graphic: 1024×500 → `store/feature-graphic.png` ✅ (generated)
- Phone screenshots: 2–8 images, min 320px, 16:9 or 9:16.
  Capture these on your phone (in the app): Launch, Today (verse), Group feed,
  Prayer, Settings. (Power + Volume-Down on Android to screenshot.)
- Privacy policy URL: https://ardent-study.vercel.app/privacy.html — served from
  `public/privacy.html`, so it deploys with the app and needs no separate hosting.
- App bundle: upload `Ardent-Bible-Study-v<version>.aab` from `npm run android:build`
  (Play does not accept the .apk).

## Data safety form answers (Play Console → App content → Data safety)
Keep these in step with `public/privacy.html`.

- Does your app collect or share user data? **Yes**. Shared with third parties? **No**
  (Supabase is a service provider processing data on our behalf, which Play does not count as sharing.)
- Is all data encrypted in transit? **Yes**
- Can users request deletion? **Yes** — in-app (Settings → Delete account and data) and on the web.
- **Delete account URL:** https://ardent-study.vercel.app/privacy.html#delete-account

Data types collected (none are optional unless noted; none used for ads or sold):

| Play category → type | What it is in Ardent | Purposes |
| --- | --- | --- |
| Personal info → Name | Display name the user chooses | App functionality, Account management |
| Personal info → Email address (optional) | Added to save the account, or from Google | App functionality, Account management |
| Location → Approximate location | Country code derived from the device time zone at sign-in | Analytics |
| Messages → Other in-app messages | Group posts, prayers, reflections; reports of posts | App functionality |
| Audio → Voice or sound recordings (optional) | Voice notes the user records | App functionality |
| Personal info → Other info | Private journal entries and notes | App functionality |
| App activity → Other actions | Sign-in / last-seen times, blocks | Analytics, Fraud prevention & security |
| Device or other IDs (optional) | Web Push subscription endpoint, only after opting in | App functionality |

## App access (Play Console → App content → App access)
No login is needed: tap "Get started" and enter any name. Choose "All functionality is available
without special access". (Optional reviewer note: to test reporting and blocking, create a group in
Groups → Create or join a group, then join it from a second device or browser with the invite code
shown in Settings.)

## User-generated content (Play Console → App content)
Ardent has UGC (group posts and voice notes). In-app: ⋯ on any post → Report post / Block member;
reports are reviewed in the admin dashboard (`/admin`) within 24 hours. Guidelines:
https://ardent-study.vercel.app/community.html

## Content rating
Complete the questionnaire (Play Console → App content → Content rating).
Answer "Yes" to users interacting / sharing content (group posts). Expect "Everyone" with
a "Users Interact" notice.

## Category
Books & Reference (or Lifestyle).
