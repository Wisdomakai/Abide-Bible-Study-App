# Supabase setup for the Ardent PWA

## 1. Database

For an existing Ardent project, apply these files in order in the SQL editor:

1. `supabase/schema.sql`
2. `supabase/admin.sql`
3. `supabase/multigroup.sql`
4. `supabase/webpush.sql`
5. `supabase/pwa.sql`
6. `supabase/notifications.sql`

`pwa.sql` is the current consolidation migration: cloud journal sync, separate create/join operations, strong invite codes, the voice post type, private voice storage, PWA reminder preferences, and rate-limited presence logging.

## 2. Authentication

In Authentication → Providers, enable Email and magic-link sign-in. Disable anonymous sign-ins after existing anonymous users have migrated. Set the production PWA origin as the Site URL and an allowed Redirect URL. Add the local Vite origin only for development.

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

Schedule an authenticated POST to `/functions/v1/notify-reminders` every minute using Supabase Cron. Send the `CRON_SECRET` value in the `x-cron-secret` header. The function compares each subscription’s timezone and preferred local hour/minute and records the date after a successful push, preventing duplicates.

## 5. Group notifications

`notifications.sql` installs the post-insert trigger that calls `notify-group` with the shared Vault secret. The function sends standards-based Web Push only to other group members. The payload includes the group ID so tapping the phone alert opens the correct feed.

## 6. Voice privacy

The `voice` bucket must be private. Files live under the uploader’s user-ID folder. Playback uses one-hour signed URLs; storage policies let group members sign a path only when a visible group post references it. Only the owner can upload or delete a path.
