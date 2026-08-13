import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '../components/Icon';
import { useApp } from '../data/AppContext';
import { Card, Pill, EmptyState, confirmDestructive, timeAgo } from '../components/ui';
import { colors, fonts, spacing, radius, shadow, penFor } from '../theme';

export default function JournalScreen({ navigation }) {
  const { notes, highlights, removeHighlights } = useApp();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('notes');

  const marks = useMemo(
    () => Object.entries(highlights || {})
      .map(([key, h]) => ({ key, ...h }))
      .sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0)),
    [highlights]
  );

  const q = query.trim().toLowerCase();

  const filteredNotes = useMemo(() => {
    if (!q) return notes;
    return notes.filter(
      (n) =>
        (n.title || '').toLowerCase().includes(q) ||
        (n.body || '').toLowerCase().includes(q) ||
        (n.tag || '').toLowerCase().includes(q)
    );
  }, [notes, q]);

  const filteredMarks = useMemo(() => {
    if (!q) return marks;
    return marks.filter((m) => (m.ref || '').toLowerCase().includes(q) || (m.text || '').toLowerCase().includes(q));
  }, [marks, q]);

  const showingNotes = tab === 'notes';

  const noteFromHighlight = (m) =>
    navigation.navigate('NoteEditor', {
      prefill: {
        title: m.ref,
        body: `${m.text}\n— ${m.ref}\n\n`,
        tag: m.book || '',
        verseRef: m.ref,
      },
    });

  const confirmRemove = (m) =>
    confirmDestructive({
      title: 'Remove highlight?',
      message: `${m.ref} will no longer be marked in the reader. Any notes you wrote are kept.`,
      confirmText: 'Remove',
      onConfirm: () => removeHighlights([m.key]),
    });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Journal</Text>
        <Text style={styles.sub}>Your study notes & highlighted verses</Text>
      </View>

      <View style={styles.tabs}>
        {[['notes', `Notes${notes.length ? ` (${notes.length})` : ''}`], ['highlights', `Highlights${marks.length ? ` (${marks.length})` : ''}`]].map(([key, label]) => (
          <Pressable key={key} onPress={() => setTab(key)} style={[styles.tab, tab === key && styles.tabOn]}>
            <Text style={[styles.tabText, tab === key && styles.tabTextOn]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {(showingNotes ? notes.length : marks.length) > 0 && (
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={colors.faint} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={showingNotes ? 'Search notes' : 'Search highlights'}
            placeholderTextColor={colors.faint}
            style={styles.search}
          />
        </View>
      )}

      {showingNotes ? (
        <FlatList
          data={filteredNotes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <EmptyState
              icon="create-outline"
              title="No notes yet"
              subtitle="Capture what you’re learning — a verse, a sermon, a question. Tap the + button to start."
            />
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => navigation.navigate('NoteEditor', { id: item.id })}
              style={({ pressed }) => [pressed && { opacity: 0.85 }]}
            >
              <Card style={styles.noteCard}>
                <View style={styles.noteTop}>
                  <Text style={styles.noteTitle} numberOfLines={1}>{item.title || 'Untitled'}</Text>
                  <Text style={styles.noteTime}>{timeAgo(item.updatedAt)}</Text>
                </View>
                {item.body ? <Text style={styles.noteBody} numberOfLines={2}>{item.body}</Text> : null}
                <View style={styles.pillRow}>
                  {item.verseRef ? <Pill label={item.verseRef} tone="gold" icon="book-outline" /> : null}
                  {item.tag ? <Pill label={item.tag} tone="muted" icon="pricetag-outline" /> : null}
                </View>
              </Card>
            </Pressable>
          )}
        />
      ) : (
        <FlatList
          data={filteredMarks}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <EmptyState
              icon="color-palette-outline"
              title="No highlights yet"
              subtitle="Open the Bible tab, tap a verse, and pick a colour. Your highlights collect here."
            />
          }
          renderItem={({ item }) => (
            <Card style={styles.markCard}>
              <View style={[styles.markBar, { backgroundColor: penFor(item.color).bar }]} />
              <View style={styles.markBody}>
                <View style={styles.noteTop}>
                  <Text style={styles.markRef} numberOfLines={1}>{item.ref}</Text>
                  <Text style={styles.noteTime}>{timeAgo(item.updatedAt || item.createdAt)}</Text>
                </View>
                <Text style={[styles.markText, { backgroundColor: penFor(item.color).bg }]} numberOfLines={4}>
                  {item.text}
                </Text>
                <View style={styles.markActions}>
                  <Pressable onPress={() => noteFromHighlight(item)} style={({ pressed }) => [styles.markBtn, pressed && { opacity: 0.7 }]}>
                    <Ionicons name="create-outline" size={16} color={colors.primary} />
                    <Text style={styles.markBtnText}>Write a note</Text>
                  </Pressable>
                  <Pressable onPress={() => confirmRemove(item)} style={({ pressed }) => [styles.markBtn, pressed && { opacity: 0.7 }]}>
                    <Ionicons name="trash-outline" size={16} color={colors.danger} />
                    <Text style={[styles.markBtnText, { color: colors.danger }]}>Remove</Text>
                  </Pressable>
                </View>
              </View>
            </Card>
          )}
        />
      )}

      {showingNotes ? (
        <Pressable
          onPress={() => navigation.navigate('NoteEditor', {})}
          style={({ pressed }) => [styles.fab, pressed && { transform: [{ scale: 0.96 }] }]}
          accessibilityRole="button"
          accessibilityLabel="New note"
        >
          <Ionicons name="add" size={30} color={colors.white} />
        </Pressable>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.md },
  title: { fontFamily: fonts.serifBold, fontSize: 30, color: colors.text },
  sub: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, marginTop: 2 },
  tabs: {
    flexDirection: 'row', alignSelf: 'flex-start', gap: 2,
    marginHorizontal: spacing.xl, marginBottom: spacing.md,
    backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, padding: 3,
  },
  tab: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: radius.pill },
  tabOn: { backgroundColor: colors.primary },
  tabText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.muted },
  tabTextOn: { color: colors.white },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginHorizontal: spacing.xl, marginBottom: spacing.md,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.pill, paddingHorizontal: spacing.lg, height: 46,
  },
  search: { flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.text },
  list: { paddingHorizontal: spacing.xl, paddingBottom: 120, gap: spacing.md },
  noteCard: { padding: spacing.lg },
  noteTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  noteTitle: { fontFamily: fonts.serifBold, fontSize: 17, color: colors.text, flex: 1 },
  noteTime: { fontFamily: fonts.body, fontSize: 12, color: colors.faint },
  noteBody: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.muted, marginTop: 6 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  markCard: { flexDirection: 'row', padding: 0, overflow: 'hidden' },
  markBar: { width: 5 },
  markBody: { flex: 1, padding: spacing.lg },
  markRef: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text, flex: 1 },
  markText: {
    fontFamily: fonts.serif, fontSize: 15, lineHeight: 25, color: colors.text,
    marginTop: spacing.sm, paddingHorizontal: 4, borderRadius: radius.sm,
  },
  markActions: { flexDirection: 'row', gap: spacing.xl, marginTop: spacing.md },
  markBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  markBtnText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.primary },
  fab: {
    position: 'absolute', right: spacing.xl, bottom: spacing.xl,
    width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', ...shadow.floating,
  },
});
