import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { loadJSON, saveJSON } from './storage';
import { isBackendConfigured } from './config';
import { supabase } from './supabase';

export const REMINDER_KEY = 'bj.reminder'; // { enabled, hour, minute }

// Show banners while the app is foregrounded too (gentle in-app notifications).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function ensureAndroidChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Reminders & group',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#4B3F9E',
    });
  }
}

export async function requestPermission() {
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return true;
  const { status: asked } = await Notifications.requestPermissionsAsync();
  return asked === 'granted';
}

// ── Daily local reminder to journal ──────────────────────────────────────────
export async function loadReminder() {
  return loadJSON(REMINDER_KEY, { enabled: false, hour: 7, minute: 30 });
}

export async function setReminder({ enabled, hour, minute }) {
  await ensureAndroidChannel();
  // Clear any previously scheduled reminder first.
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (enabled) {
    const granted = await requestPermission();
    if (!granted) { await saveJSON(REMINDER_KEY, { enabled: false, hour, minute }); return false; }
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Time with the Word',
        body: 'Take a quiet moment to read today’s verse and reflect.',
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
    });
  }
  await saveJSON(REMINDER_KEY, { enabled, hour, minute });
  return enabled;
}

// ── Push token (so mates can be notified of new group posts) ─────────────────
export async function registerPushToken() {
  if (!isBackendConfigured() || !supabase) return null;
  if (!Device.isDevice) return null; // simulators can't get a push token
  await ensureAndroidChannel();
  const granted = await requestPermission();
  if (!granted) return null;
  try {
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
    const token = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData?.user?.id;
    if (uid && token) {
      await supabase.from('profiles').update({ push_token: token }).eq('id', uid);
    }
    return token;
  } catch (e) {
    return null; // push needs a dev/production build; ignore in Expo Go
  }
}
