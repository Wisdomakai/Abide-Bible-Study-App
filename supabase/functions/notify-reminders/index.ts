import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const publicKey = Deno.env.get('VAPID_PUBLIC');
const privateKey = Deno.env.get('VAPID_PRIVATE');
const subject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:notifications@ardent.app';
if (publicKey && privateKey) webpush.setVapidDetails(subject, publicKey, privateKey);

Deno.serve(async (request) => {
  const expected = Deno.env.get('CRON_SECRET');
  if (!expected || request.headers.get('x-cron-secret') !== expected) return new Response('Unauthorized', { status: 401 });
  if (!publicKey || !privateKey) return new Response('VAPID is not configured', { status: 500 });

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: subscriptions, error } = await supabase.from('web_subscriptions')
    .select('endpoint,p256dh,auth,timezone,reminder_hour,reminder_minute,last_reminded_on')
    .eq('reminder_enabled', true);
  if (error) return new Response(error.message, { status: 500 });

  let sent = 0;
  for (const sub of subscriptions ?? []) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: sub.timezone || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date());
    const value = (type: string) => parts.find((part) => part.type === type)?.value || '';
    const localDate = `${value('year')}-${value('month')}-${value('day')}`;
    if (Number(value('hour')) !== sub.reminder_hour || Number(value('minute')) !== sub.reminder_minute || sub.last_reminded_on === localDate) continue;
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify({
        title: 'Time with the Word', body: 'Take a quiet moment to read today’s verse and reflect.', url: '/', tag: `reflection-${localDate}`,
      }));
      await supabase.from('web_subscriptions').update({ last_reminded_on: localDate }).eq('endpoint', sub.endpoint);
      sent++;
    } catch (pushError: any) {
      if (pushError?.statusCode === 404 || pushError?.statusCode === 410) await supabase.from('web_subscriptions').delete().eq('endpoint', sub.endpoint);
    }
  }
  return new Response(JSON.stringify({ sent }), { headers: { 'Content-Type': 'application/json' } });
});
