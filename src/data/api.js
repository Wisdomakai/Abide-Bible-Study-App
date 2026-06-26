// ─────────────────────────────────────────────────────────────────────────────
// GROUP DATA LAYER — multi-group aware.
//
// Screens call these. Each feed/post call takes a groupId so a user can belong
// to several groups and read/post to whichever they pick.
//   ensureSession()                         -> signs in (anon) if needed
//   joinGroupByCode(code, name, gName, admin)-> group id (creates if new)
//   getMyGroups()                           -> [{ id, name, code, adminName, members, lastPost }]
//   getFeed(groupId)                        -> Post[]
//   addPost(groupId, { author, type, text, ref })
//   toggleAmen(postId, name)
//   deletePost(postId)
//   subscribe(groupId, listener)            -> unsubscribe()
//   touchPresence()                         -> stamp last_seen / login
//   leaveGroup(groupId)
//
// Post shape: { id, author, type, text, ref, amens: string[], createdAt: number }
// ─────────────────────────────────────────────────────────────────────────────
import { loadJSON, saveJSON, uid, KEYS } from './storage';
import { isBackendConfigured, GROUP_CODE, GROUP_NAME } from './config';
import { supabase } from './supabase';

// ===========================================================================
// LOCAL backend (no server) — single on-device group, ignores groupId.
// ===========================================================================
const FEED_KEY = 'bj.groupFeed';
const localListeners = new Set();

function seed() {
  const now = Date.now(), hr = 3600 * 1000;
  return [
    { id: uid(), author: 'Ama', type: 'reflection', ref: 'Psalm 23:1-3', text: '"He refreshes my soul" really stood out today.', amens: ['Kojo'], createdAt: now - 2 * hr },
  ];
}
async function localRead() {
  let f = await loadJSON(FEED_KEY, null);
  if (!f) { f = seed(); await saveJSON(FEED_KEY, f); }
  return f;
}
const localApi = {
  async ensureSession() {},
  async touchPresence() {},
  async joinGroupByCode() { return 'local'; },
  async getMyGroups() {
    const p = await loadJSON(KEYS.profile, {});
    return [{ id: 'local', name: p?.groupName || 'My Group', code: p?.groupCode || 'local', adminName: p?.name || 'You', members: 1, lastPost: null }];
  },
  async getFeed() { return [...(await localRead())].sort((a, b) => b.createdAt - a.createdAt); },
  async addPost(_g, { author, type, text, ref, audioUrl, audioDuration }) {
    const f = await localRead();
    const post = { id: uid(), author, type, text, ref: ref || null, amens: [], createdAt: Date.now(), audioUrl: audioUrl || null, audioDuration: audioDuration || 0 };
    const next = [post, ...f]; await saveJSON(FEED_KEY, next); localListeners.forEach((fn) => fn(next));
    return post;
  },
  async toggleAmen(postId, userId) {
    const f = await localRead();
    const next = f.map((p) => p.id !== postId ? p : { ...p, amens: p.amens.includes(userId) ? p.amens.filter((u) => u !== userId) : [...p.amens, userId] });
    await saveJSON(FEED_KEY, next); localListeners.forEach((fn) => fn(next));
    return next.find((p) => p.id === postId);
  },
  async deletePost(postId) {
    const f = await localRead(); const next = f.filter((p) => p.id !== postId);
    await saveJSON(FEED_KEY, next); localListeners.forEach((fn) => fn(next));
  },
  subscribe(_g, listener) { localListeners.add(listener); return () => localListeners.delete(listener); },
  async leaveGroup() {},
  async getRecentPosts() { return []; },
};

// ===========================================================================
// SUPABASE backend — real, multi-group.
// ===========================================================================
let sessionPromise = null;

async function ensureSessionInner() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
  }
}
function ensureSession() {
  if (!sessionPromise) sessionPromise = ensureSessionInner().catch((e) => { sessionPromise = null; throw e; });
  return sessionPromise;
}
async function currentUserId() {
  const { data } = await supabase.auth.getUser();
  return data?.user?.id;
}
function mapRow(r) {
  return { id: r.id, author: r.author, type: r.type, text: r.text, ref: r.ref, amens: r.amens || [], createdAt: new Date(r.created_at).getTime(), audioUrl: r.audio_url || null, audioDuration: r.audio_duration || 0 };
}

const supaApi = {
  ensureSession,

  async joinGroupByCode(code, name, groupName, adminName) {
    await ensureSession();
    // Prefer the multi-group signature (with admin name); fall back to the older
    // 3-arg one if multigroup.sql hasn't been run yet.
    let res = await supabase.rpc('join_group', {
      p_code: code, p_name: name, p_group_name: groupName || GROUP_NAME, p_admin_name: adminName || name,
    });
    if (res.error) {
      res = await supabase.rpc('join_group', { p_code: code, p_name: name, p_group_name: groupName || GROUP_NAME });
    }
    if (res.error) throw res.error;
    return res.data;
  },

  async touchPresence() {
    await ensureSession();
    const profile = await loadJSON(KEYS.profile, null);
    if (profile?.groupCode) {
      // Ensures membership in the user's default group + stamps last_seen/login.
      try { await supaApi.joinGroupByCode(profile.groupCode, profile.name, profile.groupName, profile.name); } catch (_) {}
    }
  },

  async getMyGroups() {
    await ensureSession();
    // Rich RPC (member counts + admin name) when available…
    const rpc = await supabase.rpc('my_groups');
    if (!rpc.error && rpc.data) {
      return rpc.data.map((g) => ({
        id: g.id, name: g.name, code: g.code, adminName: g.admin_name,
        members: Number(g.members) || 0, lastPost: g.last_post ? new Date(g.last_post).getTime() : null,
      }));
    }
    // …otherwise list groups via memberships (works before multigroup.sql).
    const uid = await currentUserId();
    const { data } = await supabase.from('memberships').select('group_id, groups(id, name, code)').eq('user_id', uid);
    return (data || []).filter((m) => m.groups).map((m) => ({
      id: m.groups.id, name: m.groups.name, code: m.groups.code, adminName: null, members: 0, lastPost: null,
    }));
  },

  async getFeed(groupId) {
    if (!groupId) return [];
    const { data, error } = await supabase.from('feed_with_amens').select('*').eq('group_id', groupId).order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapRow);
  },

  async addPost(groupId, { author, type, text, ref, audioUrl, audioDuration }) {
    const userId = await currentUserId();
    const row = { group_id: groupId, author_id: userId, author_name: author, type, text, ref: ref || null };
    if (audioUrl) { row.audio_url = audioUrl; row.audio_duration = audioDuration || null; } // only when present (needs voice.sql)
    const { data, error } = await supabase.from('posts').insert(row).select().single();
    if (error) throw error;
    return { id: data.id, author, type, text, ref: ref || null, amens: [], createdAt: new Date(data.created_at).getTime(), audioUrl: audioUrl || null, audioDuration: audioDuration || 0 };
  },

  async toggleAmen(postId, voterName) {
    const userId = await currentUserId();
    const { data: existing } = await supabase.from('amens').select('post_id').eq('post_id', postId).eq('user_id', userId).maybeSingle();
    if (existing) await supabase.from('amens').delete().eq('post_id', postId).eq('user_id', userId);
    else await supabase.from('amens').insert({ post_id: postId, user_id: userId, voter_name: voterName });
    const { data } = await supabase.from('feed_with_amens').select('*').eq('id', postId).single();
    return data ? mapRow(data) : null;
  },

  async deletePost(postId) {
    if (!postId) return;
    await ensureSession();
    await supabase.from('posts').delete().eq('id', postId);
  },

  subscribe(groupId, listener) {
    let channel, cancelled = false;
    const reload = async () => { try { const f = await supaApi.getFeed(groupId); if (!cancelled) listener(f); } catch (_) {} };
    ensureSession().then(() => {
      if (cancelled || !groupId) return;
      channel = supabase.channel(`group-${groupId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'posts', filter: `group_id=eq.${groupId}` }, reload)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'amens' }, reload)
        .subscribe();
    });
    return () => { cancelled = true; if (channel) supabase.removeChannel(channel); };
  },

  async leaveGroup(groupId) {
    await ensureSession();
    await supabase.rpc('leave_group', { p_group_id: groupId });
  },

  async getRecentPosts(groupIds) {
    if (!groupIds?.length) return [];
    const { data, error } = await supabase.from('posts')
      .select('id, group_id, author_name, type, text, created_at')
      .in('group_id', groupIds).order('created_at', { ascending: false }).limit(40);
    if (error) return [];
    return (data || []).map((p) => ({ id: p.id, groupId: p.group_id, author: p.author_name, type: p.type, text: p.text, createdAt: new Date(p.created_at).getTime() }));
  },
};

// ===========================================================================
// Public API — picks the backend automatically.
// ===========================================================================
const api = isBackendConfigured() ? supaApi : localApi;

export const joinGroupByCode = (...a) => api.joinGroupByCode(...a);
export const getMyGroups = (...a) => api.getMyGroups(...a);
export const getFeed = (...a) => api.getFeed(...a);
export const addPost = (...a) => api.addPost(...a);
export const toggleAmen = (...a) => api.toggleAmen(...a);
export const deletePost = (...a) => api.deletePost(...a);
export const subscribe = (...a) => api.subscribe(...a);
export const touchPresence = (...a) => api.touchPresence(...a);
export const leaveGroup = (...a) => api.leaveGroup(...a);
export const getRecentPosts = (...a) => api.getRecentPosts(...a);
export const backendMode = isBackendConfigured() ? 'supabase' : 'local';
