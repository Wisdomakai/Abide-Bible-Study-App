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
import { signedVoiceUrl } from './voice';
import { generateCode } from './groupCode';

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
  async createGroup() { return { id: 'local', code: 'local' }; },
  async getMyGroups() {
    const p = await loadJSON(KEYS.profile, {});
    return [{ id: 'local', name: p?.groupName || 'My Group', code: p?.groupCode || 'local', adminName: p?.name || 'You', members: 1, lastPost: null }];
  },
  async getFeed() { return [...(await localRead())].sort((a, b) => b.createdAt - a.createdAt); },
  async addPost(_g, { author, type, text, ref, audioUrl, audioDuration, mentionedUserIds = [] }) {
    const f = await localRead();
    const post = { id: uid(), author, type, text, ref: ref || null, amens: [], mentionedUserIds, createdAt: Date.now(), audioUrl: audioUrl || null, audioDuration: audioDuration || 0 };
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
  async getGroupMembers() {
    const p = await loadJSON(KEYS.profile, {});
    return [{ userId: 'local', name: p?.name || 'You', joinedAt: Date.now(), isAdmin: true }];
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
  if (!user || user.is_anonymous) throw new Error('Sign in to continue');
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
  return {
    id: r.id,
    groupId: r.group_id,
    authorId: r.author_id || null,
    author: r.author,
    type: r.type,
    text: r.text,
    ref: r.ref,
    amens: r.amens || [],
    createdAt: new Date(r.created_at).getTime(),
    audioPath: r.audio_url || null,
    audioUrl: r.audio_url || null,
    audioDuration: r.audio_duration || 0,
    mentionedUserIds: r.mentioned_user_ids || [],
  };
}

async function signAudio(posts) {
  return Promise.all(posts.map(async (post) => post.audioPath
    ? { ...post, audioUrl: await signedVoiceUrl(post.audioPath) }
    : post));
}

const supaApi = {
  ensureSession,

  async joinGroupByCode(code, name, groupName, adminName) {
    await ensureSession();
    const res = await supabase.rpc('join_group', { p_code: code, p_name: name });
    if (res.error) throw res.error;
    return res.data;
  },

  async createGroup(code, name, groupName) {
    await ensureSession();
    let candidate = code;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const { data, error } = await supabase.rpc('create_group', {
        p_code: candidate, p_name: name, p_group_name: groupName || GROUP_NAME,
      });
      if (!error) return { id: data, code: candidate };
      if (!String(error.message || '').toLowerCase().includes('collision')) throw error;
      candidate = generateCode();
    }
    throw new Error('Could not reserve a unique invite code. Please try again.');
  },

  async touchPresence() {
    await ensureSession();
    const profile = await loadJSON(KEYS.profile, null);
    if (profile?.name) await supabase.rpc('touch_presence', { p_name: profile.name });
    if (profile?.groupCode) {
      // Ensures membership in the user's default group + stamps last_seen/login.
      try { await supaApi.joinGroupByCode(profile.groupCode, profile.name, profile.groupName, profile.name); } catch (_) {}
    }
    // The login row is written by the record-login Edge Function. It resolves
    // the country from this timezone, because Supabase's edge network forwards
    // no country header and we will not send IP addresses to a geo service.
    // Never block the app on it — analytics failing must not stop anyone.
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    supabase.functions.invoke('record-login', { body: { timezone } }).catch(() => {});
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
    return signAudio((data || []).map(mapRow));
  },

  async getGroupMembers(groupId) {
    if (!groupId) return [];
    await ensureSession();
    const { data, error } = await supabase.rpc('group_members', { p_group_id: groupId });
    if (error) throw error;
    return (data || []).map((member) => ({
      userId: member.user_id, name: member.name, isAdmin: !!member.is_admin,
      joinedAt: new Date(member.joined_at).getTime(),
    }));
  },

  async addPost(groupId, { author, type, text, ref, audioUrl, audioDuration, mentionedUserIds = [] }) {
    const userId = await currentUserId();
    if (audioDuration && audioDuration > 900) throw new Error('Voice recordings are limited to 15 minutes.');
    const row = { group_id: groupId, author_id: userId, author_name: author, type, text, ref: ref || null, mentioned_user_ids: [...new Set(mentionedUserIds)].slice(0, 20) };
    if (audioUrl) { row.audio_url = audioUrl; row.audio_duration = audioDuration || null; } // only when present (needs voice.sql)
    const { data, error } = await supabase.from('posts').insert(row).select().single();
    if (error) throw error;
    return { id: data.id, groupId, authorId: userId, author, type, text, ref: ref || null, amens: [], mentionedUserIds: row.mentioned_user_ids, createdAt: new Date(data.created_at).getTime(), audioPath: audioUrl || null, audioUrl: await signedVoiceUrl(audioUrl), audioDuration: audioDuration || 0 };
  },

  async toggleAmen(postId, voterName) {
    const userId = await currentUserId();
    const { data: existing } = await supabase.from('amens').select('post_id').eq('post_id', postId).eq('user_id', userId).maybeSingle();
    if (existing) await supabase.from('amens').delete().eq('post_id', postId).eq('user_id', userId);
    else await supabase.from('amens').insert({ post_id: postId, user_id: userId, voter_name: voterName });
    const { data } = await supabase.from('feed_with_amens').select('*').eq('id', postId).single();
    return data ? (await signAudio([mapRow(data)]))[0] : null;
  },

  async deletePost(postId) {
    if (!postId) return;
    await ensureSession();
    const { data: post } = await supabase.from('posts').select('type, audio_url').eq('id', postId).maybeSingle();
    const { error } = await supabase.from('posts').delete().eq('id', postId);
    if (error) throw error;
    if (post?.type === 'voice' && post.audio_url) {
      const { error: storageError } = await supabase.storage.from('voice').remove([post.audio_url]);
      // The message is already permanently deleted. A storage cleanup failure
      // must not make the UI restore a post that no longer exists.
      if (storageError) console.warn('Voice cleanup will need retrying', storageError.message);
    }
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
      .select('id, group_id, author_id, author_name, type, text, created_at')
      .in('group_id', groupIds).order('created_at', { ascending: false }).limit(40);
    if (error) return [];
    return (data || []).map((p) => ({ id: p.id, groupId: p.group_id, authorId: p.author_id, author: p.author_name, type: p.type, text: p.text, createdAt: new Date(p.created_at).getTime() }));
  },
};

// ===========================================================================
// Public API — picks the backend automatically.
// ===========================================================================
const api = isBackendConfigured() ? supaApi : localApi;

export const joinGroupByCode = (...a) => api.joinGroupByCode(...a);
export const createGroup = (...a) => api.createGroup(...a);
export const getMyGroups = (...a) => api.getMyGroups(...a);
export const getFeed = (...a) => api.getFeed(...a);
export const getGroupMembers = (...a) => api.getGroupMembers(...a);
export const addPost = (...a) => api.addPost(...a);
export const toggleAmen = (...a) => api.toggleAmen(...a);
export const deletePost = (...a) => api.deletePost(...a);
export const subscribe = (...a) => api.subscribe(...a);
export const touchPresence = (...a) => api.touchPresence(...a);
export const leaveGroup = (...a) => api.leaveGroup(...a);
export const getRecentPosts = (...a) => api.getRecentPosts(...a);
export const getCurrentUserId = isBackendConfigured() ? currentUserId : async () => null;
export const backendMode = isBackendConfigured() ? 'supabase' : 'local';
