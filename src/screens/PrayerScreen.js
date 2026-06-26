import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, FlatList, Pressable, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../data/AppContext';
import { addPost } from '../data/api';
import GroupChooser from '../components/GroupChooser';
import { Card, EmptyState, timeAgo } from '../components/ui';
import { colors, fonts, spacing, radius, shadow } from '../theme';

export default function PrayerScreen() {
  const { prayers, addPrayer, togglePrayerAnswered, deletePrayer, setPrayerShared, profile, groups } = useApp();
  const [draft, setDraft] = useState('');
  const [tab, setTab] = useState('active'); // 'active' | 'answered'
  const [pendingPrayer, setPendingPrayer] = useState(null);

  const list = useMemo(
    () => prayers.filter((p) => (tab === 'answered' ? p.answered : !p.answered)),
    [prayers, tab]
  );
  const answeredCount = prayers.filter((p) => p.answered).length;

  const submit = () => {
    if (!draft.trim()) return;
    addPrayer(draft);
    setDraft('');
  };

  const shareToGroup = (p) => {
    if (groups.length === 0) { Alert.alert('No group yet', 'Create or join a group first (Group tab).'); return; }
    if (groups.length === 1) sharePrayerTo(groups[0], p);
    else setPendingPrayer(p);
  };

  const sharePrayerTo = async (group, p) => {
    setPendingPrayer(null);
    const post = await addPost(group.id, { author: profile.name, type: 'prayer', text: p.text });
    setPrayerShared(p.id, post.id);
    Alert.alert('Shared', `Your prayer request was posted to ${group.name}.`);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Prayer</Text>
        <Text style={styles.sub}>Bring your requests, remember His faithfulness</Text>
      </View>

      <View style={styles.composer}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="What would you like to pray about?"
          placeholderTextColor={colors.faint}
          style={styles.composerInput}
          multiline
        />
        <Pressable
          onPress={submit}
          disabled={!draft.trim()}
          style={({ pressed }) => [styles.addBtn, !draft.trim() && { opacity: 0.4 }, pressed && { opacity: 0.8 }]}
          accessibilityRole="button"
          accessibilityLabel="Add prayer"
        >
          <Ionicons name="add" size={24} color={colors.white} />
        </Pressable>
      </View>

      <View style={styles.tabs}>
        <Tab label="Praying" active={tab === 'active'} onPress={() => setTab('active')} />
        <Tab label={`Answered${answeredCount ? ` · ${answeredCount}` : ''}`} active={tab === 'answered'} onPress={() => setTab('answered')} />
      </View>

      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          tab === 'active' ? (
            <EmptyState icon="hand-left-outline" title="Nothing here yet" subtitle="Add a prayer request above and carry it with you through the day." />
          ) : (
            <EmptyState icon="checkmark-done-outline" title="No answered prayers yet" subtitle="When God answers, tap the circle to move a prayer here and give thanks." />
          )
        }
        renderItem={({ item }) => (
          <Card style={[styles.prayerCard, item.answered && styles.prayerCardDone]}>
            <View style={styles.prayerRow}>
              <Pressable
                onPress={() => togglePrayerAnswered(item.id)}
                hitSlop={8}
                style={[styles.check, item.answered && styles.checkDone]}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: item.answered }}
                accessibilityLabel={item.answered ? 'Mark as still praying' : 'Mark as answered'}
              >
                {item.answered ? <Ionicons name="checkmark" size={16} color={colors.white} /> : null}
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={[styles.prayerText, item.answered && styles.prayerTextDone]}>{item.text}</Text>
                <Text style={styles.prayerMeta}>
                  {item.answered ? `Answered ${timeAgo(item.answeredAt)}` : `Added ${timeAgo(item.createdAt)}`}
                </Text>
              </View>
            </View>
            <View style={styles.prayerActions}>
              <Pressable onPress={() => shareToGroup(item)} hitSlop={8} style={({ pressed }) => pressed && { opacity: 0.6 }}>
                <Ionicons name="people-outline" size={19} color={colors.muted} />
              </Pressable>
              <Pressable
                onPress={() => Alert.alert('Remove prayer?', '', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Remove', style: 'destructive', onPress: () => deletePrayer(item.id) },
                ])}
                hitSlop={8}
                style={({ pressed }) => pressed && { opacity: 0.6 }}
              >
                <Ionicons name="trash-outline" size={19} color={colors.muted} />
              </Pressable>
            </View>
          </Card>
        )}
      />
      <GroupChooser visible={!!pendingPrayer} groups={groups} onPick={(g) => sharePrayerTo(g, pendingPrayer)} onClose={() => setPendingPrayer(null)} />
    </SafeAreaView>
  );
}

function Tab({ label, active, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.tab, active && styles.tabActive]}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.md },
  title: { fontFamily: fonts.serifBold, fontSize: 30, color: colors.text },
  sub: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, marginTop: 2 },
  composer: {
    flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm,
    marginHorizontal: spacing.xl, marginBottom: spacing.lg,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md, ...shadow.card,
  },
  composerInput: { flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.text, minHeight: 40, maxHeight: 120, paddingTop: 8 },
  addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  tabs: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.xl, marginBottom: spacing.md },
  tab: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.muted },
  tabTextActive: { color: colors.white },
  list: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.md },
  prayerCard: { padding: spacing.lg },
  prayerCardDone: { backgroundColor: colors.answeredSoft, borderColor: '#D6E8DC' },
  prayerRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  check: {
    width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: colors.faint,
    alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },
  checkDone: { backgroundColor: colors.answered, borderColor: colors.answered },
  prayerText: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24, color: colors.text },
  prayerTextDone: { color: colors.muted },
  prayerMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.faint, marginTop: 6 },
  prayerActions: { flexDirection: 'row', gap: spacing.xl, justifyContent: 'flex-end', marginTop: spacing.md },
});
