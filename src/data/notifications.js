import { loadJSON, saveJSON, KEYS } from './storage';
import { supabase } from './supabase';
import { isNativeApp, setNativeDailyReminder } from './native';

export const REMINDER_KEY = KEYS.reminder;

export async function loadReminder() {
  return loadJSON(REMINDER_KEY, { enabled: false, hour: 7, minute: 30 });
}

// Daily PWA reminders are sent by the notify-reminders Edge Function. Updating
// the preference here changes the active browser push subscription.
export async function setReminder({ enabled, hour, minute }) {
  const next = { enabled, hour, minute };
  await saveJSON(REMINDER_KEY, next);
  if (isNativeApp) return setNativeDailyReminder(next);
  if (!supabase) return false;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const { error } = await supabase.from('web_subscriptions').update({
    reminder_enabled: enabled,
    reminder_hour: hour,
    reminder_minute: minute,
    timezone,
  }).eq('user_id', user.id);
  if (error) throw error;
  return true;
}

// Kept as a compatibility export while the app transitions from native push.
// PWA permission is requested only by subscribeWebPush() from an explicit tap.
export async function registerPushToken() { return null; }
