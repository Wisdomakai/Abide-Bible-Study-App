import React, { useState, useEffect } from 'react';
import { View, Text, Switch, Pressable, ScrollView, StyleSheet, Share } from 'react-native';
import { Ionicons } from '../components/Icon';
import { useApp } from '../data/AppContext';
import { isNativeApp } from '../data/native';
import { loadReminder, setReminder } from '../data/notifications';
import { webPushSupported, webPushStatus, subscribeWebPush } from '../data/webPush';
import { backendMode } from '../data/api';
import { supabase } from '../data/supabase';
import { GROUP_CODE, SUPABASE_URL } from '../data/config';
import { Card, SectionTitle, confirmDestructive } from '../components/ui';
import { colors, fonts, spacing, radius } from '../theme';

function formatTime(hour, minute) {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const ampm = hour < 12 ? 'AM' : 'PM';
  return `${h12}:${String(minute).padStart(2, '0')} ${ampm}`;
}

export default function SettingsScreen({ navigation }) {
  const { profile, selectedGroup, signOut } = useApp();
  const [reminder, setReminderState] = useState({ enabled: false, hour: 7, minute: 0 });
  const [webState, setWebState] = useState(() => (webPushSupported() ? webPushStatus() : 'unsupported'));
  const [webMsg, setWebMsg] = useState('');
  const groupCode = selectedGroup?.code || profile?.groupCode || GROUP_CODE;

  const enableWeb = async () => {
    setWebMsg('Requesting permission…');
    const r = await subscribeWebPush();
    if (r.ok) { setWebState('granted'); setWebMsg('Notifications enabled on this device ✓'); }
    else if (r.reason === 'denied') setWebMsg('Permission was blocked. Allow notifications in your browser settings, then try again.');
    else setWebMsg('Couldn’t enable: ' + r.reason);
  };

  useEffect(() => { loadReminder().then(setReminderState); }, []);

  const toggle = async (enabled) => {
    const next = { ...reminder, enabled };
    setReminderState(next);
    try {
      if (enabled && webPushStatus() !== 'granted') {
        const subscribed = await subscribeWebPush();
        if (!subscribed.ok) throw new Error(subscribed.reason);
        setWebState('granted');
      }
      const applied = await setReminder(next);
      if (!applied && enabled) setReminderState({ ...next, enabled: false });
    } catch (_) {
      if (enabled) setReminderState({ ...next, enabled: false });
    }
  };

  const deleteAccount = () => confirmDestructive({
    title: 'Delete your Ardent account?',
    message: 'This permanently removes your journal, prayers, notes, group posts, recordings, memberships, and notification subscriptions.',
    confirmText: 'Delete account',
    onConfirm: async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const response = await fetch(`${SUPABASE_URL}/functions/v1/delete-account`, {
          method: 'POST', headers: { Authorization: `Bearer ${data.session?.access_token}` },
        });
        if (!response.ok) throw new Error(await response.text());
        window.localStorage.clear();
        await signOut();
      } catch (_) { window.alert('Account deletion failed. Nothing was removed. Please try again.'); }
    },
  });

  const onTimeChange = async (event) => {
    const [hour, minute] = event.target.value.split(':').map(Number);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return;
    const next = { ...reminder, hour, minute };
    setReminderState(next);
    try { await setReminder(next); } catch (_) {}
  };

  const shareCode = () =>
    Share.share({
      message: `Join our Bible study group on Ardent. Open the app, tap "Join", and enter this code: ${groupCode}`,
    });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <SectionTitle>You</SectionTitle>
      <Card style={styles.row}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{(profile?.name || '?')[0].toUpperCase()}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{profile?.name}</Text>
          <Text style={styles.meta}>{backendMode === 'supabase' ? 'Connected to your group' : 'On this device only'}</Text>
        </View>
      </Card>

      <SectionTitle style={{ marginTop: spacing.xl }}>Daily reminder</SectionTitle>
      <Card>
        <View style={styles.toggleRow}>
          <View style={{ flex: 1, paddingRight: spacing.md }}>
            <Text style={styles.label}>Remind me to reflect</Text>
            <Text style={styles.sub}>A gentle nudge to read today’s verse.</Text>
          </View>
          <Switch value={reminder.enabled} onValueChange={toggle} trackColor={{ true: colors.primary, false: colors.border }} thumbColor={colors.white} />
        </View>
        {reminder.enabled && (
          <>
            <View style={styles.timeRow}>
              <Ionicons name="time-outline" size={18} color={colors.primary} />
              <Text style={styles.timeValue}>{formatTime(reminder.hour, reminder.minute)}</Text>
              <input
                aria-label="Reminder time"
                type="time"
                value={`${String(reminder.hour).padStart(2, '0')}:${String(reminder.minute).padStart(2, '0')}`}
                onChange={onTimeChange}
                style={{ border: 0, background: 'transparent', color: colors.text, fontSize: 16 }}
              />
            </View>
          </>
        )}
      </Card>

      {webPushSupported() && (
        <>
          <SectionTitle style={{ marginTop: spacing.xl }}>Group notifications</SectionTitle>
          <Card>
            <Text style={styles.label}>Get notified of new group posts</Text>
            <Text style={styles.sub}>
              {isNativeApp
                ? 'Shows new group posts on the bell while Ardent is open. Alerts when the app is closed are not available in the Android app yet.'
                : 'Shows phone alerts from the installed PWA, even while Ardent is closed.'}
            </Text>
            <Pressable onPress={enableWeb} style={({ pressed }) => [styles.shareBtn, { marginTop: spacing.lg, alignSelf: 'flex-start' }, pressed && { opacity: 0.85 }]}>
              <Ionicons name="notifications-outline" size={17} color={colors.white} />
              <Text style={styles.shareText}>{webState === 'granted' ? 'Enabled ✓' : 'Enable notifications'}</Text>
            </Pressable>
            {webMsg ? <Text style={[styles.sub, { marginTop: spacing.md }]}>{webMsg}</Text> : null}
          </Card>
        </>
      )}

      <SectionTitle style={{ marginTop: spacing.xl }}>Group</SectionTitle>
      <Card>
        <Text style={styles.label}>Invite code</Text>
        <Text style={styles.sub}>Mates who enter this code share your feed.</Text>
        <View style={styles.codeRow}>
          <View style={styles.codePill}><Text style={styles.codeText}>{groupCode}</Text></View>
          <Pressable onPress={shareCode} style={({ pressed }) => [styles.shareBtn, pressed && { opacity: 0.85 }]}>
            <Ionicons name="share-outline" size={17} color={colors.white} />
            <Text style={styles.shareText}>Share invite</Text>
          </Pressable>
        </View>
        <Pressable onPress={() => navigation.navigate('JoinGroup')} style={({ pressed }) => [styles.switchRow, pressed && { opacity: 0.6 }]}>
          <Ionicons name="swap-horizontal" size={18} color={colors.primary} />
          <Text style={styles.switchText}>Create or join another group</Text>
        </Pressable>
      </Card>

      <SectionTitle style={{ marginTop: spacing.xl }}>Bible text</SectionTitle>
      <Card>
        <Text style={styles.copy}>Choose a translation on the Today and Bible screens. All four are in the public domain.</Text>
        <Text style={styles.copySmall}>
          KJV — King James Version. WEB — World English Bible. ASV — American Standard Version (1901).
          BBE — Bible in Basic English. All are public domain; chapter text is served by bible-api.com.
        </Text>
      </Card>

      <View style={styles.footer}>
        <Ionicons name="book" size={18} color={colors.faint} />
        <Text style={styles.footText}>Ardent · made for Bible study together</Text>
      </View>
      <Pressable onPress={signOut} style={styles.accountAction}><Text style={styles.switchText}>Sign out</Text></Pressable>
      <Pressable onPress={deleteAccount} style={styles.accountAction}><Text style={[styles.switchText, { color: colors.danger }]}>Delete account and data</Text></Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.white },
  name: { fontFamily: fonts.serifBold, fontSize: 18, color: colors.text },
  meta: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginTop: 2 },
  toggleRow: { flexDirection: 'row', alignItems: 'center' },
  label: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text },
  sub: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginTop: 2 },
  timeRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.lg,
    backgroundColor: colors.surfaceAlt, borderRadius: radius.md, paddingHorizontal: spacing.lg, height: 50,
  },
  timeValue: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 16, color: colors.text },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.lg },
  codePill: { backgroundColor: colors.primarySoft, paddingHorizontal: spacing.lg, paddingVertical: 10, borderRadius: radius.pill },
  codeText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.primary, letterSpacing: 0.5 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: 10, borderRadius: radius.pill },
  shareText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.white },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: spacing.xl, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border },
  switchText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.primary },
  copy: { fontFamily: fonts.body, fontSize: 14, color: colors.text, lineHeight: 21, marginBottom: spacing.md },
  copySmall: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, lineHeight: 18, marginTop: spacing.sm },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: spacing.xxl },
  footText: { fontFamily: fonts.body, fontSize: 13, color: colors.faint },
  accountAction: { alignSelf: 'center', padding: spacing.md },
});
