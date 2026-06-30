import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import { loadJSON, saveJSON, KEYS, uid, dateKey } from './storage';
import { deletePost, getMyGroups, touchPresence, getRecentPosts, getCurrentUserId } from './api';

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

export function AppProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState(null);          // { name }
  const [reflections, setReflections] = useState({});     // { dateKey: { text, updatedAt } }
  const [notes, setNotes] = useState([]);                 // [{ id, title, body, tag, updatedAt }]
  const [prayers, setPrayers] = useState([]);             // [{ id, text, answered, createdAt, answeredAt }]
  const [streak, setStreak] = useState({ count: 0, lastDate: null });
  const [translation, setTranslationState] = useState('NIV'); // KJV | NIV | NLT
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    (async () => {
      const [p, r, n, pr, s, t] = await Promise.all([
        loadJSON(KEYS.profile, null),
        loadJSON(KEYS.reflections, {}),
        loadJSON(KEYS.notes, []),
        loadJSON(KEYS.prayers, []),
        loadJSON(KEYS.streak, { count: 0, lastDate: null }),
        loadJSON(KEYS.translation, 'NIV'),
      ]);
      setProfile(p); setReflections(r); setNotes(n); setPrayers(pr); setStreak(s); setTranslationState(t);
      setReady(true);
    })();
  }, []);

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
      await touchPresence();
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
    if (profile?.name) refreshGroups();
  }, [profile?.name, refreshGroups]);

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
      if (Platform.OS === 'web' && notificationPollReady.current && newest && newest.createdAt > lastSeen && newest.createdAt > lastAlertAt.current) {
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
      const yesterday = dateKey(new Date(Date.now() - 86400000));
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

  const deleteNote = useCallback((id) => {
    setNotes((prev) => {
      const note = prev.find((n) => n.id === id);
      if (note?.sharedPostId) deletePost(note.sharedPostId); // also remove from group feed
      const next = prev.filter((n) => n.id !== id);
      saveJSON(KEYS.notes, next);
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
      const next = prev.map((p) => (p.id === id ? { ...p, sharedPostId: postId } : p));
      saveJSON(KEYS.prayers, next);
      return next;
    });
  }, []);

  const deletePrayer = useCallback((id) => {
    setPrayers((prev) => {
      const prayer = prev.find((p) => p.id === id);
      if (prayer?.sharedPostId) deletePost(prayer.sharedPostId); // also remove from group feed
      const next = prev.filter((p) => p.id !== id);
      saveJSON(KEYS.prayers, next);
      return next;
    });
  }, []);

  const value = {
    ready, profile, saveProfile, userId,
    reflections, saveReflection,
    notes, upsertNote, deleteNote,
    prayers, addPrayer, togglePrayerAnswered, deletePrayer, setPrayerShared,
    streak,
    translation, setTranslation,
    groups, groupsLoading, selectedGroupId, selectGroup, refreshGroups,
    selectedGroup: groups.find((g) => g.id === selectedGroupId) || null,
    notifications, unreadCount, refreshNotifications, markNotificationsRead, notificationAlert, dismissNotificationAlert,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
