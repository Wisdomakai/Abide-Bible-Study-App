# App Review notes (paste into App Store Connect → App Review Information → Notes)

Screen recording: attached below (recorded on a physical iPhone running the latest iOS). It starts at launch and shows: Get started (account creation), journal, Bible reading, joining the demo group, posting, reporting and blocking a post, saving the account with an email, and deleting the account in Settings.

1. PURPOSE AND AUDIENCE
Ardent is a Bible study journal for Christians aged 13+ and small church study groups. It helps people read Scripture daily, write reflections and prayers, and study together in private groups. It solves the problem of keeping personal study and group discussion in one place, without social-media noise: groups are private and joined only by invite code.

2. HOW TO ACCESS THE MAIN FEATURES
No login credentials are needed.
- Launch the app, tap "Get started" and type any name. This creates a guest account instantly.
- Today tab: daily verse and reflection. Journal and Prayer tabs: personal notes and prayer requests.
- Bible tab: read any chapter (public-domain translations such as KJV and WEB).
- After entering a name, choose Join, enter the invite code vine65, tick "I agree to the Community Guidelines" and tap Begin to join "Ardent Demo Group". (Later groups: Group tab → + → same steps.) Post a note, prayer or voice message (the microphone permission prompt appears for voice).
- Report and block: on the welcome post from "Ardent Demo", tap ⋯ → Report post (choose a reason) or Block. Blocked members are listed, and can be unblocked, in Settings.
- Content safeguards: users must agree to the Community Guidelines (zero tolerance for objectionable content) before joining or creating a group; posts, group names and display names are filtered for objectionable language; reports are reviewed within 24 hours and offending content is removed.
- Save account: Settings → Account → add an email and password (optional; lets the user sign in on other devices).
- Delete account: Settings (gear icon) → "Delete account and data". This permanently deletes the account and all its data.
- Reminders: Settings → daily reminder (local notification).
- Help: Settings → Help & support, or https://ardent-study.vercel.app/support.html

3. EXTERNAL SERVICES
- Supabase (supabase.com): authentication (guest and email/password accounts), database, voice-message storage, and server functions for group notifications and account deletion.
- bible-api.com: public-domain Bible text (KJV, WEB, ASV, BBE). No copyrighted translations are used.
- Gmail SMTP: sends account confirmation and password-reset emails.
- Vercel: hosts the privacy policy, community guidelines and support pages.
No payments, ads, analytics SDKs or AI services are used.

4. REGIONAL DIFFERENCES
None. The app works the same in every region where it is available.

5. REGULATED INDUSTRY / THIRD-PARTY MATERIAL
Not applicable. The app is not in a regulated industry. Bible text comes only from public-domain translations.
