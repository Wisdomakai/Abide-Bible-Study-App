import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { LocalNotifications } from '@capacitor/local-notifications';

export const isNativeApp = Capacitor.isNativePlatform();
const AUTH_RETURN = 'ardent-study.vercel.app';
const REMINDER_ID = 730;
let initialized = false;

async function completeNativeAuth(urlValue, supabase) {
  if (!isNativeApp || !urlValue) return false;
  let url;
  try { url = new URL(urlValue); } catch (_) { return false; }
  if (url.hostname !== AUTH_RETURN || url.searchParams.get('native_auth') !== '1') return false;

  const fragment = new URLSearchParams(url.hash.replace(/^#/, ''));
  const accessToken = fragment.get('access_token');
  const refreshToken = fragment.get('refresh_token');
  const code = url.searchParams.get('code');
  try {
    if (accessToken && refreshToken) {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) throw error;
    } else if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
    } else {
      throw new Error('Google did not return a valid login session.');
    }
    await Browser.close().catch(() => {});
    return true;
  } catch (error) {
    await Browser.close().catch(() => {});
    window.alert(error?.message || 'Could not finish Google sign-in.');
    return false;
  }
}

export async function initializeNativeRuntime(supabase) {
  if (!isNativeApp || initialized) return;
  initialized = true;
  await App.addListener('appUrlOpen', ({ url }) => completeNativeAuth(url, supabase));
  const launch = await App.getLaunchUrl();
  if (launch?.url) await completeNativeAuth(launch.url, supabase);
}

export async function startNativeGoogleSignIn(supabase) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'https://ardent-study.vercel.app/?native_auth=1',
      skipBrowserRedirect: true,
      queryParams: { prompt: 'select_account' },
    },
  });
  if (error) throw error;
  if (!data?.url) throw new Error('Google sign-in URL was not created.');
  await Browser.open({ url: data.url, presentationStyle: 'popover' });
}

export async function openExternalUrl(url) {
  if (isNativeApp) return Browser.open({ url });
  return window.open(url, '_blank', 'noopener,noreferrer');
}

export function nativeNotificationStatus() {
  if (!isNativeApp) return 'unsupported';
  return window.localStorage.getItem('ardent.nativeNotifications') || 'default';
}

export async function requestNativeNotificationPermission() {
  if (!isNativeApp) return { ok: false, reason: 'unsupported' };
  const current = await LocalNotifications.checkPermissions();
  const result = current.display === 'granted'
    ? current
    : await LocalNotifications.requestPermissions();
  const granted = result.display === 'granted';
  window.localStorage.setItem('ardent.nativeNotifications', granted ? 'granted' : 'denied');
  if (granted) {
    await LocalNotifications.createChannel({
      id: 'ardent-reminders',
      name: 'Daily Bible reminders',
      description: 'Your scheduled Ardent Bible study reminder',
      importance: 4,
      visibility: 1,
    }).catch(() => {});
  }
  return { ok: granted, reason: granted ? null : 'denied' };
}

export async function setNativeDailyReminder({ enabled, hour, minute }) {
  if (!isNativeApp) return false;
  await LocalNotifications.cancel({ notifications: [{ id: REMINDER_ID }] }).catch(() => {});
  if (!enabled) return true;
  const permission = await requestNativeNotificationPermission();
  if (!permission.ok) return false;
  await LocalNotifications.schedule({
    notifications: [{
      id: REMINDER_ID,
      title: 'Ardent Bible Study',
      body: 'Take a quiet moment for today’s Scripture and reflection.',
      channelId: 'ardent-reminders',
      schedule: {
        on: { hour, minute },
        repeats: true,
        allowWhileIdle: true,
      },
      autoCancel: true,
      extra: { destination: 'today' },
    }],
  });
  return true;
}
