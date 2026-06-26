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
import { colors, fonts, spacing, radius, shadow } from '../theme';

export default function TodayScreen({ navigation }) {
  const { profile, reflections, saveReflection, streak, translation, setTranslation } = useApp();
  const verse = getVerseForDate();
  const { text: verseText } = useVerseText(verse, translation);
  const todayKey = dateKey();
  const existing = reflections[todayKey]?.text || '';
  const [text, setText] = useState(existing);
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef(null);

  useEffect(() => setText(existing), [existing]);
  useEffect(() => () => clearTimeout(savedTimer.current), []);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  const onSave = () => {
    saveReflection(text);
    Keyboard.dismiss();
    setSaved(true);
    clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), 2200);
  };

  const onShare = async () => {
    if (!text.trim()) return;
    await addPost({ author: profile.name, type: 'reflection', ref: verse.ref, text: text.trim() });
    setSaved(true);
    clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), 2200);
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
          <Button title={saved ? 'Saved' : 'Save reflection'} icon={saved ? 'checkmark' : 'bookmark-outline'} onPress={onSave} style={{ flex: 1 }} />
          <Pressable
            onPress={onShare}
            disabled={!text.trim()}
            style={({ pressed }) => [styles.shareBtn, !text.trim() && { opacity: 0.4 }, pressed && { opacity: 0.8 }]}
            accessibilityRole="button"
            accessibilityLabel="Share with group"
          >
            <Ionicons name="people-outline" size={20} color={colors.primary} />
          </Pressable>
        </View>
        <Text style={styles.shareHint}>Tap the people icon to share this reflection with your group.</Text>
      </ScrollView>
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
});
