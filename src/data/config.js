// ─────────────────────────────────────────────────────────────────────────────
// BACKEND CONFIG
//
// Paste your Supabase project values here to turn on the real shared group feed.
// Until you do, the app runs in LOCAL mode (on-device, seeded sample feed) so it
// always works. See BACKEND.md for the 10-minute setup.
//
//   1. Create a free project at https://supabase.com
//   2. Project Settings → API → copy the Project URL and the anon/public key
//   3. Paste them below
//   4. Run the SQL in supabase/schema.sql (SQL Editor → paste → Run)
//
// GROUP_CODE is the secret word that ties your study mates to the same feed.
// Everyone who uses this app build joins that one group. Pick anything memorable.
// ─────────────────────────────────────────────────────────────────────────────
export const SUPABASE_URL = 'https://udnczmdjjiltpehtvtas.supabase.co';        // e.g. https://abcd1234.supabase.co
export const SUPABASE_ANON_KEY = 'sb_publishable_sp9QVgDEqcd0YBpyL8h9xQ__84AG-1I';
export const GROUP_CODE = 'grace-group';                // share this with your mates
export const GROUP_NAME = 'Our Bible Study';

// ─────────────────────────────────────────────────────────────────────────────
// BIBLE TEXT API (optional)
//
// • KJV works with NO key (fetched from the free bible-api.com).
// • NIV / NLT are copyrighted and need a licensed source. The app supports
//   API.Bible (https://scripture.api.bible): create a free key, then request
//   access to the NIV / NLT Bibles and paste their Bible IDs below. Until then,
//   NIV/NLT fall back to the bundled verses (with attribution) automatically.
//
// Leave BIBLE_API_KEY empty to use the no-key KJV path only.
// ─────────────────────────────────────────────────────────────────────────────
export const BIBLE_API_KEY = ''; // API.Bible key (optional)
export const BIBLE_IDS = {
  KJV: 'de4e12af7f28f599-02', // API.Bible KJV (public)
  NIV: '',                    // paste your licensed NIV Bible ID
  NLT: '',                    // paste your licensed NLT Bible ID
};

export function isBackendConfigured() {
  return (
    SUPABASE_URL.startsWith('http') &&
    SUPABASE_ANON_KEY.length > 20 &&
    SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY'
  );
}
