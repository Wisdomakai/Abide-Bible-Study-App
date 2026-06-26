// Edge Function: admin-data
// Returns aggregated admin info (users, groups, recent logins, stats) using the
// service-role key SERVER-SIDE. Protected by an admin password compared against
// the ADMIN_KEY secret — so the hosted admin page never holds the service key.
//
// Deploy:  npx supabase functions deploy admin-data --no-verify-jwt
// Secret:  npx supabase secrets set ADMIN_KEY=your-password
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-admin-key, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const key = req.headers.get('x-admin-key') ?? '';
  if (!key || key !== Deno.env.get('ADMIN_KEY')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // logins table may not exist yet (admin.sql not run) — tolerate that.
  const loginsQuery = supabase.from('logins').select('name, group_code, created_at')
    .order('created_at', { ascending: false }).limit(150)
    .then((r) => r.data ?? []).catch(() => []);

  const [{ data: profiles }, { data: memberships }, { data: groups }, { data: posts }, logins] =
    await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('memberships').select('group_id, user_id, created_at'),
      supabase.from('groups').select('id, name, code'),
      supabase.from('posts').select('id, group_id, author_id, author_name, type, created_at'),
      loginsQuery,
    ]);

  const groupsById = new Map((groups ?? []).map((g) => [g.id, g]));
  const memberGroup = new Map<string, any>(); // user_id -> first group
  for (const m of memberships ?? []) {
    if (!memberGroup.has(m.user_id)) memberGroup.set(m.user_id, groupsById.get(m.group_id));
  }

  const postsByUser = new Map<string, { count: number; last: string | null }>();
  const postsByGroup = new Map<string, number>();
  for (const p of posts ?? []) {
    const u = postsByUser.get(p.author_id) ?? { count: 0, last: null };
    u.count++; if (!u.last || p.created_at > u.last) u.last = p.created_at;
    postsByUser.set(p.author_id, u);
    postsByGroup.set(p.group_id, (postsByGroup.get(p.group_id) ?? 0) + 1);
  }
  const membersByGroup = new Map<string, number>();
  for (const m of memberships ?? []) membersByGroup.set(m.group_id, (membersByGroup.get(m.group_id) ?? 0) + 1);

  const users = (profiles ?? []).map((u) => {
    const g = memberGroup.get(u.id);
    const pu = postsByUser.get(u.id) ?? { count: 0, last: null };
    return {
      name: u.name, group: g?.name ?? '—', groupCode: g?.code ?? '',
      joined: u.created_at, lastSeen: u.last_seen ?? u.created_at,
      posts: pu.count, lastPost: pu.last, push: !!u.push_token,
    };
  }).sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());

  const groupList = (groups ?? []).map((g) => ({
    name: g.name, code: g.code,
    members: membersByGroup.get(g.id) ?? 0,
    posts: postsByGroup.get(g.id) ?? 0,
  })).sort((a, b) => b.members - a.members);

  const now = Date.now(), DAY = 86400000;
  const t = (d: string) => new Date(d).getTime();
  const stats = {
    users: users.length,
    active24: users.filter((u) => now - t(u.lastSeen) < DAY).length,
    active7: users.filter((u) => now - t(u.lastSeen) < 7 * DAY).length,
    pushOn: users.filter((u) => u.push).length,
    groups: groupList.length,
    posts: (posts ?? []).length,
    loginsToday: (logins ?? []).filter((l) => now - t(l.created_at) < DAY).length,
  };

  return new Response(JSON.stringify({ stats, users, groups: groupList, logins: logins ?? [] }), {
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
});
