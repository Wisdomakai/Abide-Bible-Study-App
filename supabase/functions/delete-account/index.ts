import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (request) => {
  const origin = request.headers.get('origin') || '';
  const allowed = (Deno.env.get('ALLOWED_ORIGINS') || '').split(',').map((value) => value.trim()).filter(Boolean);
  const nativeOrigins = ['https://localhost', 'http://localhost'];
  const originAllowed = allowed.includes(origin) || nativeOrigins.includes(origin);
  const cors = {
    'Access-Control-Allow-Origin': originAllowed ? origin : allowed[0] || '',
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (!originAllowed) return new Response('Origin not allowed', { status: 403, headers: cors });
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return new Response('Unauthorized', { status: 401, headers: cors });
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return new Response('Unauthorized', { status: 401, headers: cors });

  // Always list from offset zero because each successful batch is removed.
  // Do not delete the auth user if storage cleanup fails: that would orphan
  // recordings under an owner ID that can no longer authenticate.
  while (true) {
    const { data: objects, error: listError } = await admin.storage.from('voice').list(user.id, { limit: 1000, offset: 0 });
    if (listError) return new Response(listError.message, { status: 500, headers: cors });
    if (!objects?.length) break;
    const paths = objects.filter((object) => object.id).map((object) => `${user.id}/${object.name}`);
    if (!paths.length) break;
    const { error: removeError } = await admin.storage.from('voice').remove(paths);
    if (removeError) return new Response(removeError.message, { status: 500, headers: cors });
  }
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) return new Response(deleteError.message, { status: 500, headers: cors });
  return new Response(null, { status: 204, headers: cors });
});
