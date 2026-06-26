import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, FlatList, Pressable, StyleSheet, Modal, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../data/AppContext';
import { getFeed, addPost, toggleAmen, deletePost, subscribe } from '../data/api';
import { Pill, EmptyState, timeAgo, LinkText } from '../components/ui';
import { colors, fonts, spacing, radius, shadow } from '../theme';

const TYPE_META = {
  reflection: { label: 'Reflection', tone: 'gold', icon: 'sunny-outline' },
  prayer: { label: 'Prayer', tone: 'primary', icon: 'hand-left-outline' },
  note: { label: 'Note', tone: 'muted', icon: 'create-outline' },
};
const initials = (name) => name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

export default function GroupScreen({ navigation }) {
  const { profile, groups, selectedGroupId, selectGroup, selectedGroup, refreshGroups } = useApp();
  const [feed, setFeed] = useState([]);
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState('');

  const refresh = useCallback(async () => {
    if (selectedGroupId) setFeed(await getFeed(selectedGroupId));
  }, [selectedGroupId]);

  // Reload groups whenever this tab gains focus.
  useEffect(() => navigation.addListener('focus', refreshGroups), [navigation, refreshGroups]);

  // Feed + realtime for the selected group.
  useEffect(() => {
    setFeed([]);
    if (!selectedGroupId) return;
    refresh();
    const unsub = subscribe(selectedGroupId, (next) => setFeed([...next].sort((a, b) => b.createdAt - a.createdAt)));
    return unsub;
  }, [selectedGroupId, refresh]);

  const post = async () => {
    if (!draft.trim() || !selectedGroupId) return;
    await addPost(selectedGroupId, { author: profile.name, type: 'note', text: draft.trim() });
    setDraft(''); setComposing(false); refresh();
  };
  const onAmen = async (postId) => { await toggleAmen(postId, profile.name); };
  const onDelete = (postId) => {
    Alert.alert('Delete message?', 'This removes it from the group for everyone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        setFeed((f) => f.filter((p) => p.id !== postId));
        try { await deletePost(postId); } catch (e) { Alert.alert('Couldn’t delete', 'Please try again.'); }
        refresh();
      } },
    ]);
  };

  // No groups yet → invite to create/join.
  if (groups.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}><Text style={styles.title}>Groups</Text></View>
        <EmptyState icon="people-outline" title="No groups yet" subtitle="Create a group for your Bible study, or join one with an invite code." />
        <View style={{ paddingHorizontal: spacing.xl }}>
          <Pressable onPress={() => navigation.navigate('JoinGroup')} style={({ pressed }) => [styles.cta, pressed && { opacity: 0.9 }]}>
            <Ionicons name="add" size={20} color={colors.white} /><Text style={styles.ctaText}>Create or join a group</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Groups</Text>
        {selectedGroup ? (
          <Text style={styles.sub}>
            {[
              selectedGroup.members ? `${selectedGroup.members} member${selectedGroup.members === 1 ? '' : 's'}` : null,
              selectedGroup.adminName ? `admin ${selectedGroup.adminName}` : null,
              `code ${selectedGroup.code}`,
            ].filter(Boolean).join(' · ')}
          </Text>
        ) : null}
      </View>

      {/* Group selector */}
      <View style={styles.tabsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {groups.map((g) => {
            const on = g.id === selectedGroupId;
            return (
              <Pressable key={g.id} onPress={() => selectGroup(g.id)} style={[styles.gtab, on && styles.gtabOn]}>
                <Text style={[styles.gtabText, on && styles.gtabTextOn]} numberOfLines={1}>{g.name}</Text>
              </Pressable>
            );
          })}
          <Pressable onPress={() => navigation.navigate('JoinGroup')} style={styles.gtabAdd} accessibilityLabel="Add group">
            <Ionicons name="add" size={18} color={colors.primary} />
          </Pressable>
        </ScrollView>
      </View>

      <FlatList
        data={feed}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState icon="chatbubbles-outline" title="Quiet for now" subtitle={`Share a reflection, note, or prayer to ${selectedGroup?.name || 'this group'}.`} />}
        renderItem={({ item }) => {
          const meta = TYPE_META[item.type] || TYPE_META.note;
          const mine = item.author === profile.name;
          const amened = item.amens.includes(profile.name);
          return (
            <View style={styles.post}>
              <View style={styles.postHead}>
                <View style={[styles.avatar, mine && styles.avatarMine]}><Text style={styles.avatarText}>{initials(item.author)}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.author}>{item.author}{mine ? ' (you)' : ''}</Text>
                  <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
                </View>
                <Pill label={meta.label} tone={meta.tone} icon={meta.icon} />
              </View>
              {item.ref ? <Text style={styles.ref}>{item.ref}</Text> : null}
              <LinkText style={styles.body}>{item.text}</LinkText>
              <View style={styles.postFoot}>
                <Pressable onPress={() => onAmen(item.id)} style={({ pressed }) => [styles.amen, amened && styles.amenOn, pressed && { opacity: 0.8 }]}>
                  <Ionicons name={amened ? 'heart' : 'heart-outline'} size={16} color={amened ? colors.white : colors.primary} />
                  <Text style={[styles.amenText, amened && { color: colors.white }]}>Amen{item.amens.length ? ` · ${item.amens.length}` : ''}</Text>
                </Pressable>
                {mine && (
                  <Pressable onPress={() => onDelete(item.id)} hitSlop={8} style={({ pressed }) => [styles.delBtn, pressed && { opacity: 0.6 }]} accessibilityLabel="Delete message">
                    <Ionicons name="trash-outline" size={18} color={colors.muted} />
                  </Pressable>
                )}
              </View>
            </View>
          );
        }}
      />

      <Pressable onPress={() => setComposing(true)} style={({ pressed }) => [styles.fab, pressed && { transform: [{ scale: 0.96 }] }]} accessibilityLabel="New post">
        <Ionicons name="add" size={30} color={colors.white} />
      </Pressable>

      <Modal visible={composing} animationType="slide" transparent onRequestClose={() => setComposing(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalWrap}>
          <Pressable style={styles.backdrop} onPress={() => setComposing(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Post to {selectedGroup?.name || 'group'}</Text>
            <TextInput value={draft} onChangeText={setDraft} placeholder="Write something encouraging…" placeholderTextColor={colors.faint} style={styles.sheetInput} multiline autoFocus />
            <Pressable onPress={post} disabled={!draft.trim()} style={({ pressed }) => [styles.postBtn, !draft.trim() && { opacity: 0.4 }, pressed && { opacity: 0.85 }]}>
              <Ionicons name="send" size={18} color={colors.white} /><Text style={styles.postBtnText}>Post</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  title: { fontFamily: fonts.serifBold, fontSize: 30, color: colors.text },
  sub: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginTop: 2 },
  tabsWrap: { paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  tabs: { paddingHorizontal: spacing.xl, gap: spacing.sm, alignItems: 'center' },
  gtab: { paddingHorizontal: spacing.lg, paddingVertical: 9, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt, maxWidth: 180 },
  gtabOn: { backgroundColor: colors.primary },
  gtabText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.muted },
  gtabTextOn: { color: colors.white },
  gtabAdd: { width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: spacing.xl, paddingVertical: spacing.lg, paddingBottom: 120, gap: spacing.md },
  post: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, ...shadow.card },
  postHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  avatarMine: { backgroundColor: colors.primary },
  avatarText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.white },
  author: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text },
  time: { fontFamily: fonts.body, fontSize: 12, color: colors.faint, marginTop: 1 },
  ref: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.accent, marginBottom: 4 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 23, color: colors.text },
  postFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.lg },
  amen: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.lg, paddingVertical: 9, borderRadius: radius.pill, backgroundColor: colors.primarySoft },
  amenOn: { backgroundColor: colors.primary },
  amenText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.primary },
  delBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, height: 52, borderRadius: radius.pill, ...shadow.floating },
  ctaText: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.white },
  fab: { position: 'absolute', right: spacing.xl, bottom: spacing.xl, width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', ...shadow.floating },
  modalWrap: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(43,37,64,0.4)' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.xl, paddingBottom: spacing.xxl },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: spacing.lg },
  sheetTitle: { fontFamily: fonts.serifBold, fontSize: 20, color: colors.text, marginBottom: spacing.md },
  sheetInput: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.lg, minHeight: 120, fontFamily: fonts.body, fontSize: 16, lineHeight: 24, color: colors.text, textAlignVertical: 'top' },
  postBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, height: 52, borderRadius: radius.pill, marginTop: spacing.lg },
  postBtnText: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.white },
});
