import { supabase } from './supabase';
import { VAPID_PUBLIC, isBackendConfigured } from './config';
import { touchPresence } from './api';
import { loadJSON, KEYS } from './storage';
import { isNativeApp, nativeNotificationStatus, requestNativeNotificationPermission } from './native';

// Web Push only runs in the browser / installed PWA.
export function webPushSupported() {
  if (isNativeApp) return true;
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function webPushStatus() {
  if (isNativeApp) return nativeNotificationStatus();
  return webPushSupported() ? Notification.permission : 'unsupported'; // default | granted | denied
}

function urlB64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

// Requests permission (must be called from a tap on iOS), subscribes via the
// service worker, and stores the subscription so the server can push to it.
export async function subscribeWebPush() {
  if (isNativeApp) return requestNativeNotificationPermission();
  if (!webPushSupported() || !isBackendConfigured() || !supabase) return { ok: false, reason: 'unsupported' };
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return { ok: false, reason: 'denied' };

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC),
      });
    }
    const json = sub.toJSON();

    await touchPresence(); // refresh the authenticated member's presence
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, reason: 'no-session' };
    const reminder = await loadJSON(KEYS.reminder, { enabled: false, hour: 7, minute: 30 });
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

    const { error } = await supabase.rpc('claim_web_subscription', {
      p_endpoint: json.endpoint, p_p256dh: json.keys.p256dh, p_auth: json.keys.auth,
      p_timezone: timezone, p_reminder_enabled: !!reminder.enabled,
      p_reminder_hour: reminder.hour, p_reminder_minute: reminder.minute,
    });
    if (error) return { ok: false, reason: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e.message || String(e) };
  }
}
