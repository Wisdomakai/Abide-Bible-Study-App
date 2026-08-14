// Edge Function: record-login
//
// Records one login row per user per 30 minutes, stamped with the country the
// sign-in came from.
//
// Country is resolved from the caller's IANA timezone (e.g. Africa/Accra -> GH)
// against the tzdata map in timezones.ts. Supabase's edge network does not
// forward any country header — it passes cf-connecting-ip, cf-ray and
// cf-visitor but no cf-ipcountry — so the only alternatives were sending user
// IP addresses to a third-party geo service or reading nothing at all. The
// timezone never leaves our own infrastructure and no IP is stored or used.
//
// The caller's JWT is verified before anything is written, so a login can only
// ever be recorded against the user actually making the request.
//
// Deploy: npx supabase functions deploy record-login
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { TZ_COUNTRY } from './timezones.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const WINDOW_MINUTES = 30;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const authorization = req.headers.get('Authorization') ?? '';
  if (!authorization.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

  const url = Deno.env.get('SUPABASE_URL')!;

  // Verify the caller with their own token before touching anything.
  const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: { user }, error: authError } = await caller.auth.getUser();
  if (authError || !user || user.is_anonymous) return json({ error: 'Unauthorized' }, 401);

  // Prefer a real country header if the platform ever starts sending one;
  // otherwise resolve it from the caller's timezone.
  const header = (req.headers.get('cf-ipcountry') ?? req.headers.get('x-vercel-ip-country') ?? '').toUpperCase();
  let country = /^[A-Z]{2}$/.test(header) && header !== 'XX' && header !== 'T1' ? header : null;
  if (!country) {
    let timezone = '';
    try {
      const body = await req.json();
      timezone = typeof body?.timezone === 'string' ? body.timezone : '';
    } catch (_) {
      // No body, or not JSON — country simply stays unknown.
    }
    country = TZ_COUNTRY[timezone] ?? null;
  }

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();
  const { data: recent } = await admin
    .from('logins').select('id').eq('user_id', user.id).gt('created_at', since).limit(1);
  if (recent?.length) return json({ recorded: false, reason: 'within-window' });

  const { data: profile } = await admin
    .from('profiles').select('name').eq('id', user.id).maybeSingle();

  // Earliest membership stands in for "their" group, matching what the old SQL
  // recorded before this function took over.
  const { data: membership } = await admin
    .from('memberships').select('group_id').eq('user_id', user.id)
    .order('created_at', { ascending: true }).limit(1).maybeSingle();
  let groupCode: string | null = null;
  if (membership?.group_id) {
    const { data: group } = await admin
      .from('groups').select('code').eq('id', membership.group_id).maybeSingle();
    groupCode = group?.code ?? null;
  }

  const { error: insertError } = await admin.from('logins').insert({
    user_id: user.id,
    name: profile?.name ?? null,
    group_code: groupCode,
    country,
  });
  if (insertError) return json({ error: insertError.message }, 500);

  return json({ recorded: true, country });
});
