// Edge Function: notify-group
// Fires after a post is inserted (via the posts trigger). Notifies the OTHER
// members of that post's group two ways:
//   • Native (Android/iOS builds) — Expo Push  →  FCM / APNs
//   • Web (PWA)                   — Web Push   →  the browser's push service
//
// Deploy:  npx supabase functions deploy notify-group --no-verify-jwt
// Secrets needed (web push): VAPID_PUBLIC, VAPID_PRIVATE, VAPID_SUBJECT
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC');
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE');
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com';
if (VAPID_PUBLIC && VAPID_PRIVATE) {
  try { webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE); } catch (_) {}
}

Deno.serve(async (req) => {
  try {
    const { post_id } = await req.json();
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: post } = await supabase
      .from('posts').select('group_id, author_id, author_name, type, text').eq('id', post_id).single();
    if (!post) return new Response('no post', { status: 200 });

    const { data: members } = await supabase
      .from('memberships').select('user_id').eq('group_id', post.group_id);
    const otherIds = (members ?? []).map((m) => m.user_id).filter((id) => id !== post.author_id);
    if (otherIds.length === 0) return new Response('no recipients', { status: 200 });

    const label = post.type === 'prayer' ? 'shared a prayer request'
      : post.type === 'reflection' ? 'shared a reflection' : 'posted a note';
    const title = `${post.author_name} ${label}`;
    const body = (post.text ?? '').slice(0, 120);

    // ── Native push (Expo → FCM/APNs) ──
    const { data: profiles } = await supabase
      .from('profiles').select('push_token').in('id', otherIds);
    const tokens = (profiles ?? []).map((p) => p.push_token).filter(Boolean);
    const nativePromise = tokens.length
      ? fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tokens.map((to) => ({ to, sound: 'default', title, body, data: { type: 'group_post' } }))),
        }).catch(() => {})
      : Promise.resolve();

    // ── Web push (PWA) ──
    let webPromise = Promise.resolve();
    if (VAPID_PUBLIC && VAPID_PRIVATE) {
      const { data: subs } = await supabase
        .from('web_subscriptions').select('endpoint, p256dh, auth').in('user_id', otherIds);
      const payload = JSON.stringify({ title, body, url: '/' });
      webPromise = Promise.all((subs ?? []).map((s) =>
        webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        ).catch(async (err) => {
          // Clean up expired/invalid subscriptions (410 Gone / 404).
          if (err?.statusCode === 410 || err?.statusCode === 404) {
            await supabase.from('web_subscriptions').delete().eq('endpoint', s.endpoint);
          }
        })
      ));
    }

    await Promise.all([nativePromise, webPromise]);
    return new Response('sent', { status: 200 });
  } catch (e) {
    return new Response(`error: ${e}`, { status: 200 });
  }
});
