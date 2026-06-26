import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../data/AppContext';
import { Card, Pill, EmptyState, timeAgo } from '../components/ui';
import { colors, fonts, spacing, radius, shadow } from '../theme';

export default function JournalScreen({ navigation }) {
  const { notes } = useApp();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(
      (n) =>
        (n.title || '').toLowerCase().includes(q) ||
        (n.body || '').toLowerCase().includes(q) ||
        (n.tag || '').toLowerCase().includes(q)
    );
  }, [notes, query]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Journal</Text>
        <Text style={styles.sub}>Your study notes & thoughts</Text>
      </View>

      {notes.length > 0 && (
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={colors.faint} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search notes"
            placeholderTextColor={colors.faint}
            style={styles.search}
          />
        </View>
      )}

      <FlatList
        data={filtered}
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
              {item.tag ? <View style={{ marginTop: spacing.md }}><Pill label={item.tag} tone="muted" icon="pricetag-outline" /></View> : null}
            </Card>
          </Pressable>
        )}
      />

      <Pressable
        onPress={() => navigation.navigate('NoteEditor', {})}
        style={({ pressed }) => [styles.fab, pressed && { transform: [{ scale: 0.96 }] }]}
        accessibilityRole="button"
        accessibilityLabel="New note"
      >
        <Ionicons name="add" size={30} color={colors.white} />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.md },
  title: { fontFamily: fonts.serifBold, fontSize: 30, color: colors.text },
  sub: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, marginTop: 2 },
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
  fab: {
    position: 'absolute', right: spacing.xl, bottom: spacing.xl,
    width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', ...shadow.floating,
  },
});
