import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, Pressable, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../data/AppContext';
import { getVerseForDate, TRANSLATIONS } from '../data/verses';
import useVerseText from '../hooks/useVerseText';
import { addPost } from '../data/api';
import { dateKey } from '../data/storage';
import { Card, Pill, Button } from '../components/ui';
import GroupChooser from '../components/GroupChooser';
import Bell from '../components/Bell';
import { colors, fonts, spacing, radius, shadow } from '../theme';

export default function TodayScreen({ navigation }) {
  const { profile, saveReflection, streak, translation, setTranslation, groups, refreshNotifications } = useApp();
  const verse = getVerseForDate();
  const { text: verseText } = useVerseText(verse, translation);
  const [text, setText] = useState('');
  const [sharing, setSharing] = useState(false);
  const [chooseGroup, setChooseGroup] = useState(false);
  const [toast, setToast] = useState(null); // { msg, ok }
  const toastTimer = useRef(null);

  useEffect(() => () => clearTimeout(toastTimer.current), []);
  useEffect(() => navigation.addListener('focus', () => refreshNotifications && refreshNotifications()), [navigation, refreshNotifications]);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  };

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  const onSave = () => {
    if (!text.trim()) { showToast('Write something first', false); return; }
    saveReflection(text);
    setText('');
    Keyboard.dismiss();
    showToast('Reflection saved');
  };

  const onShare = () => {
    if (!text.trim()) { showToast('Write something first', false); return; }
    if (groups.length === 0) { showToast('Join or create a group first', false); return; }
    if (groups.length === 1) shareTo(groups[0]);
    else setChooseGroup(true);
  };

  const shareTo = async (group) => {
    setChooseGroup(false);
    setSharing(true);
    Keyboard.dismiss();
    try {
      await addPost(group.id, { author: profile.name, type: 'reflection', ref: verse.ref, text: text.trim() });
      showToast(`Shared to ${group.name} ✓`);
    } catch (e) {
      showToast('Couldn’t share — check your connection', false);
    } finally {
      setSharing(false);
    }
  };

  const todayLabel = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.date}>{todayLabel}</Text>
            <Text style={styles.greeting}>{greeting}, {profile.name}.</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.streak}>
              <Ionicons name="flame" size={16} color={colors.accent} />
              <Text style={styles.streakNum}>{streak.count}</Text>
            </View>
            <Bell />
            <Pressable
              onPress={() => navigation.navigate('Settings')}
              hitSlop={8}
              style={({ pressed }) => [styles.gear, pressed && { opacity: 0.6 }]}
              accessibilityRole="button"
              accessibilityLabel="Settings"
            >
              <Ionicons name="settings-outline" size={20} color={colors.muted} />
            </Pressable>
          </View>
        </View>

        {/* Verse of the day */}
        <Card style={styles.verseCard}>
          <Pill label="Verse of the day" tone="gold" icon="sunny-outline" />
          <Text style={styles.verseText}>“{verseText}”</Text>
          <View style={styles.verseFoot}>
            <Text style={styles.verseRef}>{verse.ref}</Text>
            <View style={styles.transToggle}>
              {TRANSLATIONS.map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setTranslation(t)}
                  style={[styles.transBtn, translation === t && styles.transBtnOn]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: translation === t }}
                  accessibilityLabel={`Show ${t} translation`}
                >
                  <Text style={[styles.transText, translation === t && styles.transTextOn]}>{t}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Card>

        {/* Reflection */}
        <Text style={styles.prompt}>What is God saying to you through this?</Text>
        <View style={styles.editor}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Write your reflection…"
            placeholderTextColor={colors.faint}
            style={styles.input}
            multiline
            textAlignVertical="top"
            scrollEnabled={false}
          />
        </View>

        <View style={styles.actions}>
          <Button title="Save reflection" icon="bookmark-outline" onPress={onSave} style={{ flex: 1 }} />
          <Pressable
            onPress={onShare}
            disabled={!text.trim() || sharing}
            style={({ pressed }) => [styles.shareBtn, (!text.trim() || sharing) && { opacity: 0.5 }, pressed && { opacity: 0.8 }]}
            accessibilityRole="button"
            accessibilityLabel="Share with group"
          >
            {sharing ? (
              <Ionicons name="sync" size={20} color={colors.primary} style={{ transform: [{ rotate: '45deg' }] }} />
            ) : (
              <Ionicons name="people-outline" size={20} color={colors.primary} />
            )}
          </Pressable>
        </View>

        {toast ? (
          <View style={[styles.toast, toast.ok ? styles.toastOk : styles.toastErr]}>
            <Ionicons name={toast.ok ? 'checkmark-circle' : 'alert-circle'} size={18} color={toast.ok ? colors.answered : colors.danger} />
            <Text style={[styles.toastText, { color: toast.ok ? colors.answered : colors.danger }]}>{toast.msg}</Text>
          </View>
        ) : (
          <Text style={styles.shareHint}>Tap the people icon to share this reflection with your group.</Text>
        )}
      </ScrollView>
      <GroupChooser visible={chooseGroup} groups={groups} onPick={shareTo} onClose={() => setChooseGroup(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.xl, paddingBottom: spacing.xxl },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xl },
  date: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.muted, marginBottom: 2 },
  greeting: { fontFamily: fonts.serifBold, fontSize: 24, color: colors.text },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  gear: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  streak: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.accentSoft, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill,
  },
  streakNum: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.accent },
  verseCard: { backgroundColor: colors.primary, borderColor: colors.primary, marginBottom: spacing.xl },
  verseText: { fontFamily: fonts.serif, fontSize: 22, lineHeight: 33, color: colors.white, marginTop: spacing.md, marginBottom: spacing.md },
  verseFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.md },
  verseRef: { fontFamily: fonts.bodySemi, fontSize: 14, color: '#C9C2F0' },
  transToggle: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: radius.pill, padding: 3 },
  transBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill },
  transBtnOn: { backgroundColor: colors.white },
  transText: { fontFamily: fonts.bodySemi, fontSize: 12, color: '#C9C2F0' },
  transTextOn: { color: colors.primary },
  prompt: { fontFamily: fonts.serifBold, fontSize: 18, color: colors.text, marginBottom: spacing.md },
  editor: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.lg, minHeight: 150, ...shadow.card,
  },
  input: { fontFamily: fonts.body, fontSize: 16, lineHeight: 25, color: colors.text, minHeight: 120 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.lg },
  shareBtn: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  shareHint: { fontFamily: fonts.body, fontSize: 13, color: colors.faint, marginTop: spacing.md, textAlign: 'center' },
  toast: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: spacing.lg, paddingVertical: 12, paddingHorizontal: spacing.lg, borderRadius: radius.md, borderWidth: 1,
  },
  toastOk: { backgroundColor: colors.answeredSoft, borderColor: '#D6E8DC' },
  toastErr: { backgroundColor: '#FBEAEA', borderColor: '#F1C9C9' },
  toastText: { fontFamily: fonts.bodySemi, fontSize: 14 },
});
