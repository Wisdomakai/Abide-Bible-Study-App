// ─────────────────────────────────────────────────────────────────────────────
// GROUP FEED — data layer with two interchangeable backends.
//
// The four functions below are the ONLY thing the screens call:
//   getFeed()                  -> Post[]
//   addPost({author, type, text, ref})
//   toggleAmen(postId, name)
//   subscribe(listener)        -> unsubscribe()
//
// • If Supabase keys are set in config.js  -> REAL shared feed (Postgres + Realtime)
// • Otherwise                              -> LOCAL on-device feed (seeded demo)
//
// Post shape stays identical in both modes:
//   { id, author, type, text, ref, amens: string[], createdAt: number(ms) }
// ─────────────────────────────────────────────────────────────────────────────
import { loadJSON, saveJSON, uid, KEYS } from './storage';
import { isBackendConfigured, GROUP_CODE, GROUP_NAME } from './config';
import { supabase } from './supabase';

// ===========================================================================
// LOCAL backend (no server) — keeps the app fully working without any setup.
// ===========================================================================
const FEED_KEY = 'bj.groupFeed';
const localListeners = new Set();

function seed() {
  const now = Date.now();
  const hr = 3600 * 1000;
  return [
    { id: uid(), author: 'Ama', type: 'reflection', ref: 'Psalm 23:1-3',
      text: 'Reading this slowly today, "he refreshes my soul" really stood out. I needed that reminder after a hard week.',
      amens: ['Kojo', 'Esi'], createdAt: now - 2 * hr },
    { id: uid(), author: 'Kojo', type: 'prayer',
      text: 'Please pray for my mum’s surgery on Thursday. Trusting God for steady hands and peace for the family.',
      amens: ['Ama', 'Esi', 'Yaw'], createdAt: now - 6 * hr },
    { id: uid(), author: 'Esi', type: 'note',
      text: 'Group thought: what does it look like to "seek first the kingdom" in our ordinary Monday routines?',
      amens: ['Kojo'], createdAt: now - 26 * hr },
  ];
}

async function localRead() {
  let feed = await loadJSON(FEED_KEY, null);
  if (!feed) { feed = seed(); await saveJSON(FEED_KEY, feed); }
  return feed;
}
function localNotify(feed) { localListeners.forEach((fn) => fn(feed)); }

const localApi = {
  async getFeed() {
    return [...(await localRead())].sort((a, b) => b.createdAt - a.createdAt);
  },
  async addPost({ author, type, text, ref }) {
    const feed = await localRead();
    const post = { id: uid(), author, type, text, ref: ref || null, amens: [], createdAt: Date.now() };
    const next = [post, ...feed];
    await saveJSON(FEED_KEY, next);
    localNotify(next);
    return post;
  },
  async toggleAmen(postId, userId) {
    const feed = await localRead();
    const next = feed.map((p) => {
      if (p.id !== postId) return p;
      const has = p.amens.includes(userId);
      return { ...p, amens: has ? p.amens.filter((u) => u !== userId) : [...p.amens, userId] };
    });
    await saveJSON(FEED_KEY, next);
    localNotify(next);
    return next.find((p) => p.id === postId);
  },
  async deletePost(postId) {
    if (!postId) return;
    const feed = await localRead();
    const next = feed.filter((p) => p.id !== postId);
    await saveJSON(FEED_KEY, next);
    localNotify(next);
  },
  subscribe(listener) {
    localListeners.add(listener);
    return () => localListeners.delete(listener);
  },
};

// ===========================================================================
// SUPABASE backend — real shared feed across phones.
// ===========================================================================
let groupIdPromise = null;

// Lazily: sign in anonymously, then join/create the group by code (also upserts
// the display name). Cached so it only runs once per launch.
async function ensureReady() {
  if (!groupIdPromise) {
    groupIdPromise = (async () => {
      // Validate against the server (getUser), not just the cached session, so a
      // device whose account was deleted re-signs-in cleanly instead of erroring.
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const { error } = await supabase.auth.signInAnonymously();
        if (error) throw error;
      }
      const profile = await loadJSON(KEYS.profile, { name: 'Friend' });
      // The user's own group code (chosen at onboarding) wins; fall back to the
      // config default so already-onboarded users keep their existing group.
      const code = profile?.groupCode || GROUP_CODE;
      const name = profile?.groupName || GROUP_NAME;
      const { data, error } = await supabase.rpc('join_group', {
        p_code: code,
        p_name: profile?.name || 'Friend',
        p_group_name: name,
      });
      if (error) throw error;
      return data; // group id
    })().catch((e) => { groupIdPromise = null; throw e; });
  }
  return groupIdPromise;
}

// Call after the user creates/joins a different group so the next feed call rebinds.
export function resetGroup() {
  groupIdPromise = null;
}

// Record an app open (updates profiles.last_seen via join_group). No-op locally.
export async function touchPresence() {
  if (!isBackendConfigured()) return;
  try { await ensureReady(); } catch (_) {}
}

async function currentUserId() {
  const { data } = await supabase.auth.getUser();
  return data?.user?.id;
}

function mapRow(r) {
  return {
    id: r.id,
    author: r.author,
    type: r.type,
    text: r.text,
    ref: r.ref,
    amens: r.amens || [],
    createdAt: new Date(r.created_at).getTime(),
  };
}

const supaApi = {
  async getFeed() {
    const groupId = await ensureReady();
    const { data, error } = await supabase
      .from('feed_with_amens')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapRow);
  },

  async addPost({ author, type, text, ref }) {
    const groupId = await ensureReady();
    const userId = await currentUserId();
    const { data, error } = await supabase
      .from('posts')
      .insert({ group_id: groupId, author_id: userId, author_name: author, type, text, ref: ref || null })
      .select()
      .single();
    if (error) throw error;
    return { id: data.id, author, type, text, ref: ref || null, amens: [], createdAt: new Date(data.created_at).getTime() };
  },

  async toggleAmen(postId, voterName) {
    await ensureReady();
    const userId = await currentUserId();
    const { data: existing } = await supabase
      .from('amens')
      .select('post_id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle();
    if (existing) {
      await supabase.from('amens').delete().eq('post_id', postId).eq('user_id', userId);
    } else {
      await supabase.from('amens').insert({ post_id: postId, user_id: userId, voter_name: voterName });
    }
    const { data } = await supabase.from('feed_with_amens').select('*').eq('id', postId).single();
    return data ? mapRow(data) : null;
  },

  async deletePost(postId) {
    if (!postId) return;
    await ensureReady();
    // RLS (posts_delete) only lets the author delete their own post.
    await supabase.from('posts').delete().eq('id', postId);
  },

  subscribe(listener) {
    let channel;
    let cancelled = false;
    const reload = async () => {
      try { const feed = await supaApi.getFeed(); if (!cancelled) listener(feed); } catch (_) {}
    };
    ensureReady().then((groupId) => {
      if (cancelled) return;
      channel = supabase
        .channel(`group-${groupId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'posts', filter: `group_id=eq.${groupId}` }, reload)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'amens' }, reload)
        .subscribe();
    });
    return () => { cancelled = true; if (channel) supabase.removeChannel(channel); };
  },
};

// ===========================================================================
// Public API — picks the backend automatically.
// ===========================================================================
const api = isBackendConfigured() ? supaApi : localApi;

export const getFeed = (...a) => api.getFeed(...a);
export const addPost = (...a) => api.addPost(...a);
export const toggleAmen = (...a) => api.toggleAmen(...a);
export const deletePost = (...a) => api.deletePost(...a);
export const subscribe = (...a) => api.subscribe(...a);
export const backendMode = isBackendConfigured() ? 'supabase' : 'local';
