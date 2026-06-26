import React, { useState, useEffect } from 'react';
import { View, Text, Switch, Pressable, ScrollView, StyleSheet, Share, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../data/AppContext';
import { loadReminder, setReminder } from '../data/notifications';
import { webPushSupported, webPushStatus, subscribeWebPush } from '../data/webPush';
import { backendMode } from '../data/api';
import { GROUP_CODE } from '../data/config';
import { Card, SectionTitle } from '../components/ui';
import { colors, fonts, spacing, radius } from '../theme';

function formatTime(hour, minute) {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const ampm = hour < 12 ? 'AM' : 'PM';
  return `${h12}:${String(minute).padStart(2, '0')} ${ampm}`;
}
function timeAsDate(hour, minute) {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}

export default function SettingsScreen({ navigation }) {
  const { profile } = useApp();
  const [reminder, setReminderState] = useState({ enabled: false, hour: 7, minute: 0 });
  const [showPicker, setShowPicker] = useState(false);
  const [webState, setWebState] = useState(() => (webPushSupported() ? webPushStatus() : 'unsupported'));
  const [webMsg, setWebMsg] = useState('');
  const groupCode = profile?.groupCode || GROUP_CODE;

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
    if (!enabled) setShowPicker(false);
    const applied = await setReminder(next);
    if (!applied && enabled) setReminderState({ ...next, enabled: false });
  };

  const onPickerChange = async (event, date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (event?.type === 'dismissed' || !date) return;
    const next = { ...reminder, hour: date.getHours(), minute: date.getMinutes() };
    setReminderState(next);
    await setReminder(next);
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
            <Pressable onPress={() => setShowPicker((s) => !s)} style={styles.timeRow}>
              <Ionicons name="time-outline" size={18} color={colors.primary} />
              <Text style={styles.timeValue}>{formatTime(reminder.hour, reminder.minute)}</Text>
              <Ionicons name={showPicker ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
            </Pressable>
            {showPicker && (
              <View style={styles.pickerWrap}>
                <DateTimePicker
                  value={timeAsDate(reminder.hour, reminder.minute)}
                  mode="time"
                  is24Hour={false}
                  display={Platform.OS === 'ios' ? 'spinner' : 'clock'}
                  onChange={onPickerChange}
                  textColor={colors.text}
                />
                {Platform.OS === 'ios' && (
                  <Pressable onPress={() => setShowPicker(false)} style={styles.doneBtn}>
                    <Text style={styles.doneText}>Done</Text>
                  </Pressable>
                )}
              </View>
            )}
          </>
        )}
      </Card>

      {webPushSupported() && (
        <>
          <SectionTitle style={{ marginTop: spacing.xl }}>Group notifications</SectionTitle>
          <Card>
            <Text style={styles.label}>Get notified of new group posts</Text>
            <Text style={styles.sub}>Works in this browser or the installed web app.</Text>
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

      <SectionTitle style={{ marginTop: spacing.xl }}>Bible translations</SectionTitle>
      <Card>
        <Text style={styles.copy}>Verses are shown in KJV, NIV, or NLT — switch on the Today screen.</Text>
        <Text style={styles.copySmall}>Scripture quotations marked KJV are from the King James Version (public domain).</Text>
        <Text style={styles.copySmall}>NIV: Scripture taken from the Holy Bible, New International Version®, NIV®. © 1973, 1978, 1984, 2011 by Biblica, Inc.™ Used by permission.</Text>
        <Text style={styles.copySmall}>NLT: Scripture taken from the Holy Bible, New Living Translation, © 1996, 2004, 2015 by Tyndale House Foundation. Used by permission.</Text>
      </Card>

      <View style={styles.footer}>
        <Ionicons name="book" size={18} color={colors.faint} />
        <Text style={styles.footText}>Ardent · made for Bible study together</Text>
      </View>
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
  pickerWrap: { marginTop: spacing.sm },
  doneBtn: { alignSelf: 'flex-end', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  doneText: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.primary },
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
});
