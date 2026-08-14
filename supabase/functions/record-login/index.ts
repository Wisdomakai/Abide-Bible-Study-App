// Edge Function: record-login
//
// Records one login row per user per 30 minutes, stamped with the country the
// request came from. The country is read from the edge network's own header
// server-side, so a client cannot forge it, and the IP address is used only to
// derive that two-letter code — it is never stored or returned.
//
// The caller's JWT is verified before anything is written, so a login can only
// ever be recorded against the user actually making the request.
//
// Deploy: npx supabase functions deploy record-login
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

  // Cloudflare sets cf-ipcountry in front of Supabase Edge Functions; the
  // Vercel header is accepted too so this keeps working if it moves. 'XX' and
  // 'T1' are the network's own "unknown"/Tor markers, not real countries.
  const header = (req.headers.get('cf-ipcountry') ?? req.headers.get('x-vercel-ip-country') ?? '').toUpperCase();
  const country = /^[A-Z]{2}$/.test(header) && header !== 'XX' && header !== 'T1' ? header : null;

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
