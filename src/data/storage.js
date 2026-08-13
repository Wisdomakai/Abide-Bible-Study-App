// Web-only persistence. Product data is mirrored to Supabase by AppContext;
// localStorage is retained as an offline cache and migration source.
export async function loadJSON(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw != null ? JSON.parse(raw) : fallback;
  } catch (_) {
    return fallback;
  }
}

export async function saveJSON(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (_) {
    return false;
  }
}

export const KEYS = {
  profile: 'bj.profile', reflections: 'bj.reflections', notes: 'bj.notes', prayers: 'bj.prayers',
  streak: 'bj.streak', translation: 'bj.translation', selectedGroup: 'bj.selectedGroup',
  biblePos: 'bj.biblePos', lastNotif: 'bj.lastNotif', reminder: 'bj.reminder',
  highlights: 'bj.highlights',
};

// Stable id for a highlighted verse, shared by the reader and the Journal.
export function verseKey(book, chapter, verse) {
  return `${book}|${chapter}|${verse}`;
}

export function uid() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}

export function dateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
