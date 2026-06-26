// Fetches verse text from a Bible API, with on-device caching and a graceful
// fallback to the bundled verses (so the daily verse always works offline).
//
// Layers, in order:
//   1. API.Bible (if BIBLE_API_KEY + a Bible ID for the translation are set)
//   2. bible-api.com (no key) — for KJV and other public-domain versions
//   3. null  → caller uses the bundled text
import { loadJSON, saveJSON } from './storage';
import { BIBLE_API_KEY, BIBLE_IDS } from './config';

const CACHE_KEY = 'bj.verseCache';
const NO_KEY_CODES = { KJV: 'kjv', NIV: null, NLT: null }; // bible-api.com lacks NIV/NLT

function stripHtml(s) {
  return (s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function fetchWithTimeout(url, opts = {}, ms = 7000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function fromApiBible(ref, translation) {
  const bibleId = BIBLE_IDS[translation];
  if (!BIBLE_API_KEY || !bibleId) return null;
  const url = `https://api.scripture.api.bible/v1/bibles/${bibleId}/search?query=${encodeURIComponent(ref)}&limit=1`;
  const res = await fetchWithTimeout(url, { headers: { 'api-key': BIBLE_API_KEY } });
  if (!res.ok) return null;
  const json = await res.json();
  const passage = json?.data?.passages?.[0];
  return passage?.content ? stripHtml(passage.content) : null;
}

async function fromBibleApiCom(ref, translation) {
  const code = NO_KEY_CODES[translation];
  if (!code) return null;
  const url = `https://bible-api.com/${encodeURIComponent(ref)}?translation=${code}`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) return null;
  const json = await res.json();
  return json?.text ? json.text.replace(/\s+/g, ' ').trim() : null;
}

// bible-api.com supports public-domain translations by code (KJV, WEB…).
// NIV/NLT aren't available there, so the reader shows KJV for those.
const CHAPTER_CODE = { KJV: 'kjv', WEB: 'web', NIV: 'kjv', NLT: 'kjv' };
const CHAPTER_CACHE = 'bj.chapterCache';

// Fetch a whole chapter: returns { verses: [{ verse, text }], translationName }.
export async function fetchChapter(book, chapter, translation = 'KJV') {
  const code = CHAPTER_CODE[translation] || 'kjv';
  const key = `${book}|${chapter}|${code}`;
  const cache = await loadJSON(CHAPTER_CACHE, {});
  if (cache[key]) return cache[key];

  const url = `https://bible-api.com/${encodeURIComponent(book + ' ' + chapter)}?translation=${code}`;
  const res = await fetchWithTimeout(url, {}, 12000);
  if (!res.ok) throw new Error('Could not load chapter');
  const json = await res.json();
  const out = {
    verses: (json.verses || []).map((v) => ({ verse: v.verse, text: (v.text || '').replace(/\s+/g, ' ').trim() })),
    translationName: json.translation_name || 'King James Version',
    code,
  };
  cache[key] = out;
  saveJSON(CHAPTER_CACHE, cache);
  return out;
}

// Returns the verse text from the network, or null if unavailable.
export async function fetchVerseText(ref, translation) {
  const cache = await loadJSON(CACHE_KEY, {});
  const key = `${ref}|${translation}`;
  if (cache[key]) return cache[key];

  let text = null;
  try { text = await fromApiBible(ref, translation); } catch (_) {}
  if (!text) { try { text = await fromBibleApiCom(ref, translation); } catch (_) {} }

  if (text) {
    cache[key] = text;
    saveJSON(CACHE_KEY, cache); // fire-and-forget; persists for offline use
  }
  return text;
}
