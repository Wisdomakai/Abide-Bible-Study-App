# Supabase setup for the Ardent PWA

## 1. Database

For an existing Ardent project, apply these files in order in the SQL editor:

1. `supabase/schema.sql`
2. `supabase/admin.sql`
3. `supabase/multigroup.sql`
4. `supabase/webpush.sql`
5. `supabase/pwa.sql`
6. `supabase/notifications.sql`
7. `supabase/reminders-cron.sql` — schedules the daily-reminder push (after `notify-reminders` is deployed).
8. `supabase/moderation.sql` — post reports and member blocking, required by Google Play and the App Store for group content. Apply after `group-collaboration.sql`, because it redefines `feed_with_amens` to hide blocked members. Redeploy `admin-data` and `notify-group` afterwards: the admin dashboard gains a Reports table, and members who blocked an author are no longer notified about that author's posts.

`pwa.sql` is the current consolidation migration: cloud journal sync, separate create/join operations, strong invite codes, the voice post type, private voice storage, PWA reminder preferences, and rate-limited presence logging.

## 2. Authentication

People start as **guests**: an anonymous Supabase account with only the name they choose, no email or password. A guest's journal syncs like any other account's. In Settings a guest can save the account by adding an email (Supabase sends a confirmation link) and then a password; the user ID stays the same, so nothing moves. Returning users sign in with email and password or Google.

In Authentication → Providers, keep **Anonymous sign-ins**, **Email** (with "Confirm email" on) and **Google** enabled. Under Authentication → Emails, configure custom SMTP: Supabase's built-in sender only delivers to project team members, so without it nobody else receives confirmation or password-reset emails. Under Attack Protection, enable CAPTCHA (Cloudflare Turnstile or hCaptcha) to stop scripted guest sign-ups; the app then needs the site key passed to `signInAnonymously`. Set the production PWA origin as the Site URL and an allowed Redirect URL. Add the local Vite origin only for development.

## 3. Edge Functions

Deploy:

```bash
npx supabase functions deploy notify-group
npx supabase functions deploy notify-reminders
npx supabase functions deploy admin-data
npx supabase functions deploy delete-account
```

Set secrets:

```bash
npx supabase secrets set VAPID_PUBLIC=... VAPID_PRIVATE=... VAPID_SUBJECT=mailto:your-real-contact@example.com
npx supabase secrets set NOTIFY_SECRET=... CRON_SECRET=... ADMIN_KEY=... ALLOWED_ORIGINS=https://your-pwa.example
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided to deployed Supabase functions. Never place the service-role key or VAPID private key in browser code.

The release bundles only public-domain KJV scripture. Do not enable or bundle another translation without documenting the provider license and its required attribution.

Store the same `NOTIFY_SECRET` value in Supabase Vault before applying `notifications.sql`:

```sql
select vault.create_secret('replace-with-the-same-random-value', 'notify_secret');
```

## 4. Scheduled reminders

Daily reminders for the installed PWA run from `supabase/reminders-cron.sql`, which enables `pg_cron` and schedules a POST to `/functions/v1/notify-reminders` every minute. The job sends the Vault `notify_secret` (the same secret the post trigger uses) in the `x-cron-secret` header, and the function accepts it through its `NOTIFY_SECRET`; set a separate `CRON_SECRET` only if you want the two callers to use different secrets, and update the job to match. The function compares each subscription’s timezone and preferred local hour/minute and records the date after a successful push, preventing duplicates.

## 5. Group notifications

`notifications.sql` installs the post-insert trigger that calls `notify-group` with the shared Vault secret. The function sends standards-based Web Push only to other group members. The payload includes the group ID so tapping the phone alert opens the correct feed.

## 6. Voice privacy

The `voice` bucket must be private. Files live under the uploader’s user-ID folder. Playback uses one-hour signed URLs; storage policies let group members sign a path only when a visible group post references it. Only the owner can upload or delete a path.
