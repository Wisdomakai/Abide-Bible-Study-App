import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { loadJSON, saveJSON, KEYS, uid, dateKey, verseKey } from './storage';
import { deletePost, getMyGroups, touchPresence, getRecentPosts, getCurrentUserId } from './api';
import { deleteVoice } from './voice';
import { supabase } from './supabase';
import { initializeNativeRuntime, isNativeApp, startNativeGoogleSignIn } from './native';

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

export function AppProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [authUser, setAuthUser] = useState(null);
  const [profile, setProfile] = useState(null);          // { name }
  const [reflections, setReflections] = useState({});     // { dateKey: { text, updatedAt } }
  const [notes, setNotes] = useState([]);                 // [{ id, title, body, tag, updatedAt }]
  const [prayers, setPrayers] = useState([]);             // [{ id, text, answered, createdAt, answeredAt }]
  const [highlights, setHighlights] = useState({});        // { 'John|3|16': { color, ref, text, createdAt } }
  const [streak, setStreak] = useState({ count: 0, lastDate: null });
  const [translation, setTranslationState] = useState('KJV');
  const [userId, setUserId] = useState(null);
  const cloudReady = useRef(false);
  const cloudTimer = useRef(null);

  useEffect(() => {
    initializeNativeRuntime(supabase).catch(() => {});
    (async () => {
      const [p, r, n, pr, s, t, h, sessionResult] = await Promise.all([
        loadJSON(KEYS.profile, null),
        loadJSON(KEYS.reflections, {}),
        loadJSON(KEYS.notes, []),
        loadJSON(KEYS.prayers, []),
        loadJSON(KEYS.streak, { count: 0, lastDate: null }),
        loadJSON(KEYS.translation, 'KJV'),
        loadJSON(KEYS.highlights, {}),
        supabase?.auth.getSession() || Promise.resolve({ data: { session: null } }),
      ]);
      const user = sessionResult?.data?.session?.user || null;
      setAuthUser(user);
      setAuthReady(true);
      let state = { profile: p, reflections: r, notes: n, prayers: pr, streak: s, translation: t, highlights: h };
      if (user && !user.is_anonymous) {
        const { data } = await supabase.from('journal_state').select('data').eq('user_id', user.id).maybeSingle();
        if (data?.data) state = { ...state, ...data.data };
        else await supabase.from('journal_state').upsert({ user_id: user.id, data: state });
      }
      setProfile(state.profile); setReflections(state.reflections || {}); setNotes(state.notes || []);
      setPrayers(state.prayers || []); setStreak(state.streak || { count: 0, lastDate: null });
      setHighlights(state.highlights || {});
      setTranslationState('KJV');
      cloudReady.current = true;
      setReady(true);
    })();
    const authListener = supabase?.auth.onAuthStateChange((_event, session) => setAuthUser(session?.user || null));
    return () => authListener?.data?.subscription?.unsubscribe();
  }, []);

  useEffect(() => {
    if (!cloudReady.current || !authUser || authUser.is_anonymous) return undefined;
    clearTimeout(cloudTimer.current);
    cloudTimer.current = setTimeout(() => {
      supabase.from('journal_state').upsert({
        user_id: authUser.id,
        data: { profile, reflections, notes, prayers, streak, translation, highlights },
        updated_at: new Date().toISOString(),
      }).then(() => {});
    }, 500);
    return () => clearTimeout(cloudTimer.current);
  }, [authUser?.id, profile, reflections, notes, prayers, streak, translation, highlights]);

  const signInWithGoogle = useCallback(async () => {
    if (authUser?.is_anonymous) await supabase.auth.signOut();
    if (isNativeApp) return startNativeGoogleSignIn(supabase);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: { prompt: 'select_account' },
      },
    });
    if (error) throw error;
  }, [authUser?.is_anonymous]);

  const signOut = useCallback(async () => { await supabase.auth.signOut(); window.location.reload(); }, []);

  const setTranslation = useCallback((t) => {
    setTranslationState(t);
    saveJSON(KEYS.translation, t);
  }, []);

  // ── Groups (multi-group) ──
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [groupsLoading, setGroupsLoading] = useState(false);

  const refreshGroups = useCallback(async () => {
    setGroupsLoading(true);
    try {
      setUserId(await getCurrentUserId());
      const gs = await getMyGroups();
      setGroups(gs);
      const stored = await loadJSON(KEYS.selectedGroup, null);
      setSelectedGroupId((prev) => {
        const has = (id) => gs.some((g) => g.id === id);
        return has(prev) ? prev : has(stored) ? stored : (gs[0]?.id || null);
      });
    } catch (_) {
      // offline / not yet configured — leave groups as-is
    } finally {
      setGroupsLoading(false);
    }
  }, []);

  const selectGroup = useCallback((id) => {
    setSelectedGroupId(id);
    saveJSON(KEYS.selectedGroup, id);
  }, []);

  useEffect(() => {
    if (!profile?.name || !authUser || authUser.is_anonymous) return;
    touchPresence().then(refreshGroups).catch(() => refreshGroups());
  }, [profile?.name, authUser?.id, refreshGroups]);

  // ── Notifications (in-app bell) ──
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationAlert, setNotificationAlert] = useState(null);
  const notificationPollReady = useRef(false);
  const lastAlertAt = useRef(0);

  const refreshNotifications = useCallback(async () => {
    try {
      const ids = groups.map((g) => g.id);
      if (!ids.length) { setNotifications([]); setUnreadCount(0); return; }
      const posts = await getRecentPosts(ids);
      const nameOf = (id) => groups.find((g) => g.id === id)?.name || 'Group';
      const list = posts
        .filter((p) => (p.authorId && userId ? p.authorId !== userId : p.author !== profile?.name))
        .map((p) => ({ ...p, group: nameOf(p.groupId) }));
      const lastSeen = await loadJSON(KEYS.lastNotif, 0);
      setNotifications(list);
      setUnreadCount(list.filter((p) => p.createdAt > lastSeen).length);
      const newest = list[0];
      if (notificationPollReady.current && newest && newest.createdAt > lastSeen && newest.createdAt > lastAlertAt.current) {
        lastAlertAt.current = newest.createdAt;
        setNotificationAlert(newest);
      }
      notificationPollReady.current = true;
    } catch (_) {}
  }, [groups, profile?.name, userId]);

  const dismissNotificationAlert = useCallback(() => setNotificationAlert(null), []);

  const markNotificationsRead = useCallback(async () => {
    await saveJSON(KEYS.lastNotif, Date.now());
    setUnreadCount(0);
  }, []);

  useEffect(() => { if (groups.length) refreshNotifications(); }, [groups, refreshNotifications]);
  useEffect(() => {
    if (!groups.length || !supabase) return undefined;
    let channel = supabase.channel(`notifications-${authUser?.id || 'guest'}`);
    for (const group of groups) {
      channel = channel.on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'posts', filter: `group_id=eq.${group.id}`,
      }, () => refreshNotifications());
    }
    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [groups, authUser?.id, refreshNotifications]);
  useEffect(() => {
    if (!groups.length) return undefined;
    const id = setInterval(refreshNotifications, 25000);
    return () => clearInterval(id);
  }, [groups.length, refreshNotifications]);

  // ── Profile ── (accepts a name string or a partial patch object)
  const saveProfile = useCallback((patch) => {
    setProfile((prev) => {
      const fields = typeof patch === 'string' ? { name: patch.trim() } : patch;
      const next = { ...(prev || {}), ...fields };
      saveJSON(KEYS.profile, next);
      return next;
    });
  }, []);

  // ── Streak: counts a day when the user records a reflection ──
  const touchStreak = useCallback(() => {
    setStreak((prev) => {
      const today = dateKey();
      if (prev.lastDate === today) return prev;
      const yesterdayDate = new Date();
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterday = dateKey(yesterdayDate);
      const count = prev.lastDate === yesterday ? prev.count + 1 : 1;
      const next = { count, lastDate: today };
      saveJSON(KEYS.streak, next);
      return next;
    });
  }, []);

  // ── Reflections (one per day, tied to the daily verse) ──
  const saveReflection = useCallback((text) => {
    const key = dateKey();
    setReflections((prev) => {
      const next = { ...prev, [key]: { text, updatedAt: Date.now() } };
      saveJSON(KEYS.reflections, next);
      return next;
    });
    if (text.trim()) touchStreak();
  }, [touchStreak]);

  // ── Notes ── (returns the note id so callers can link a shared post to it)
  const upsertNote = useCallback((note) => {
    const id = note.id || uid();
    setNotes((prev) => {
      let next;
      if (note.id) {
        next = prev.map((n) => (n.id === note.id ? { ...n, ...note, updatedAt: Date.now() } : n));
      } else {
        next = [{ id, updatedAt: Date.now(), ...note }, ...prev];
      }
      saveJSON(KEYS.notes, next);
      return next;
    });
    return id;
  }, []);

  const deleteNote = useCallback(async (id) => {
    const note = notes.find((n) => n.id === id);
    if (!note) return;
    const postIds = [...new Set([...(note.sharedPostIds || []), note.sharedPostId].filter(Boolean))];
    await Promise.all(postIds.map(deletePost));
    const audioPaths = [...new Set([note.audioUrl, ...(note.detachedAudioUrls || [])].filter(Boolean))];
    await Promise.all(audioPaths.map(deleteVoice));
    const next = notes.filter((n) => n.id !== id);
    setNotes(next);
    await saveJSON(KEYS.notes, next);
  }, [notes]);

  // ── Verse highlights ── keyed by book|chapter|verse so the reader can look
  // one up while rendering, and the Journal can list them by recency.
  const highlightVerses = useCallback((verses, color) => {
    setHighlights((prev) => {
      const now = Date.now();
      const next = { ...prev };
      for (const v of verses) {
        const key = verseKey(v.book, v.chapter, v.verse);
        next[key] = {
          book: v.book, chapter: v.chapter, verse: v.verse,
          ref: `${v.book} ${v.chapter}:${v.verse}`,
          text: v.text, translation: v.translation || null,
          color, createdAt: prev[key]?.createdAt || now, updatedAt: now,
        };
      }
      saveJSON(KEYS.highlights, next);
      return next;
    });
  }, []);

  const removeHighlights = useCallback((keys) => {
    setHighlights((prev) => {
      const next = { ...prev };
      for (const key of keys) delete next[key];
      saveJSON(KEYS.highlights, next);
      return next;
    });
  }, []);

  // ── Prayers ──
  const addPrayer = useCallback((text) => {
    setPrayers((prev) => {
      const next = [{ id: uid(), text: text.trim(), answered: false, createdAt: Date.now(), answeredAt: null }, ...prev];
      saveJSON(KEYS.prayers, next);
      return next;
    });
  }, []);

  const togglePrayerAnswered = useCallback((id) => {
    setPrayers((prev) => {
      const next = prev.map((p) =>
        p.id === id ? { ...p, answered: !p.answered, answeredAt: !p.answered ? Date.now() : null } : p
      );
      saveJSON(KEYS.prayers, next);
      return next;
    });
  }, []);

  // Link a prayer to the group post created when it was shared.
  const setPrayerShared = useCallback((id, postId) => {
    setPrayers((prev) => {
      const next = prev.map((p) => p.id === id
        ? { ...p, sharedPostIds: [...new Set([...(p.sharedPostIds || []), p.sharedPostId, postId].filter(Boolean))], sharedPostId: undefined }
        : p);
      saveJSON(KEYS.prayers, next);
      return next;
    });
  }, []);

  const deletePrayer = useCallback(async (id) => {
    const prayer = prayers.find((p) => p.id === id);
    if (!prayer) return;
    const postIds = [...new Set([...(prayer.sharedPostIds || []), prayer.sharedPostId].filter(Boolean))];
    await Promise.all(postIds.map(deletePost));
    const next = prayers.filter((p) => p.id !== id);
    setPrayers(next);
    await saveJSON(KEYS.prayers, next);
  }, [prayers]);

  const value = {
    ready, authReady, authUser, signInWithGoogle, signOut, profile, saveProfile, userId,
    reflections, saveReflection,
    notes, upsertNote, deleteNote,
    highlights, highlightVerses, removeHighlights,
    prayers, addPrayer, togglePrayerAnswered, deletePrayer, setPrayerShared,
    streak,
    translation, setTranslation,
    groups, groupsLoading, selectedGroupId, selectGroup, refreshGroups,
    selectedGroup: groups.find((g) => g.id === selectedGroupId) || null,
    notifications, unreadCount, refreshNotifications, markNotificationsRead, notificationAlert, dismissNotificationAlert,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
