import AsyncStorage from '@react-native-async-storage/async-storage';

// Thin wrapper around AsyncStorage with JSON (de)serialization.
export async function loadJSON(key, fallback) {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw != null ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

export async function saveJSON(key, value) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // best-effort; ignore write failures
  }
}

export const KEYS = {
  profile: 'bj.profile',
  reflections: 'bj.reflections', // { [dateKey]: { text, updatedAt } }
  notes: 'bj.notes',
  prayers: 'bj.prayers',
  streak: 'bj.streak',
  translation: 'bj.translation',
};

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function dateKey(date = new Date()) {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}
