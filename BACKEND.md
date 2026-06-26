# Backend setup — shared Group feed (Supabase)

The app already works in **local mode** (on-device feed). Follow these steps once to
turn on the **real shared feed** so your study mates see each other's posts across
phones. ~10 minutes, free tier.

## 1. Create a Supabase project
1. Go to https://supabase.com → sign in → **New project**.
2. Give it a name, set a database password, pick a region near you, **Create**.
3. Wait ~2 minutes for it to provision.

## 2. Create the database
1. In your project, open **SQL Editor** (left sidebar) → **New query**.
2. Open [`supabase/schema.sql`](supabase/schema.sql) from this repo, copy everything,
   paste it in, and click **Run**. You should see "Success".
   - This creates the tables, security rules, the `join_group` function, the feed
     view, and turns on Realtime.

## 3. Turn on anonymous sign-in
The app signs each phone in **anonymously** (no passwords — keeps it simple).
1. Go to **Authentication → Providers** (or **Sign In / Providers**).
2. Enable **Anonymous sign-ins** → Save.

## 4. Add your keys to the app
1. Go to **Project Settings → API**.
2. Copy the **Project URL** and the **anon / public** key.
3. Open [`src/data/config.js`](src/data/config.js) and fill in:
   ```js
   export const SUPABASE_URL = 'https://YOURPROJECT.supabase.co';
   export const SUPABASE_ANON_KEY = 'eyJhbGci...';   // the anon/public key
   export const GROUP_CODE = 'grace-group';          // your group's secret word
   export const GROUP_NAME = 'Our Bible Study';
   ```
4. Restart Expo: stop the server and run `npx expo start -c` (the `-c` clears the cache).

## 5. Share with your mates
Everyone runs the **same app build** (same `config.js`). On first launch each phone:
- signs in anonymously,
- joins the group identified by `GROUP_CODE`,
- and starts seeing the shared feed update **live**.

To use separate groups later, just change `GROUP_CODE` — the first person to use a new
code creates that group; everyone with the same code shares one feed.

## How it's wired
- `src/data/config.js` — your keys + group code. `isBackendConfigured()` flips the app
  between local and Supabase automatically.
- `src/data/supabase.js` — the client (sessions persist on-device via AsyncStorage).
- `src/data/api.js` — same four functions (`getFeed`, `addPost`, `toggleAmen`,
  `subscribe`); the Supabase versions use the `feed_with_amens` view + Realtime.
- `supabase/schema.sql` — the database. Row-Level Security ensures people only read and
  write inside groups they belong to.

## Security notes
- The anon key is meant to ship in the app; **Row-Level Security** (in the schema) is
  what protects the data, not the key.
- "Amen" is de-duplicated per signed-in device. Display names aren't unique, so the
  "you amen'd this" highlight matches by name — fine for a small group.
- Posts are deletable only by their author (policy `posts_delete`).
