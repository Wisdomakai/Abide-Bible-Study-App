// Edge Function: notify-group
// Triggered after a post is inserted. Looks up the other members of that post's
// group and sends them an Expo push notification.
//
// Deploy:  npx supabase functions deploy notify-group --no-verify-jwt
// (Needs the SERVICE ROLE key as an env secret so it can read tokens.)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const { post_id } = await req.json();
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // The post that was just created.
    const { data: post } = await supabase
      .from('posts')
      .select('group_id, author_id, author_name, type, text')
      .eq('id', post_id)
      .single();
    if (!post) return new Response('no post', { status: 200 });

    // Everyone in the group except the author.
    const { data: members } = await supabase
      .from('memberships')
      .select('user_id')
      .eq('group_id', post.group_id);
    const otherIds = (members ?? []).map((m) => m.user_id).filter((id) => id !== post.author_id);
    if (otherIds.length === 0) return new Response('no recipients', { status: 200 });

    const { data: profiles } = await supabase
      .from('profiles')
      .select('push_token')
      .in('id', otherIds);
    const tokens = (profiles ?? []).map((p) => p.push_token).filter(Boolean);
    if (tokens.length === 0) return new Response('no tokens', { status: 200 });

    const label = post.type === 'prayer' ? 'shared a prayer request' : post.type === 'reflection' ? 'shared a reflection' : 'posted a note';
    const messages = tokens.map((to) => ({
      to,
      sound: 'default',
      title: `${post.author_name} ${label}`,
      body: (post.text ?? '').slice(0, 120),
      data: { type: 'group_post' },
    }));

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });

    return new Response('sent', { status: 200 });
  } catch (e) {
    return new Response(`error: ${e}`, { status: 200 });
  }
});
