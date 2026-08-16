import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TextInput, FlatList, Pressable, StyleSheet, Modal, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '../components/Icon';
import { useApp } from '../data/AppContext';
import { getFeed, getGroupMembers, addPost, toggleAmen, deletePost, subscribe } from '../data/api';
import { Pill, EmptyState, timeAgo, LinkText, LinkPreview, confirmDestructive, notify } from '../components/ui';
import VoiceRecorder from '../components/VoiceRecorder';
import VoicePlayer from '../components/VoicePlayer';
import { deleteVoice, uploadVoice } from '../data/voice';
import { colors, fonts, spacing, radius, shadow } from '../theme';

const TYPE_META = {
  reflection: { label: 'Reflection', tone: 'gold', icon: 'sunny-outline' },
  prayer: { label: 'Prayer', tone: 'primary', icon: 'hand-left-outline' },
  note: { label: 'Note', tone: 'muted', icon: 'create-outline' },
  voice: { label: 'Voice', tone: 'primary', icon: 'mic-outline' },
};
const initials = (name) => name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

export default function GroupScreen({ navigation }) {
  const { profile, userId, groups, selectedGroupId, selectGroup, selectedGroup, refreshGroups } = useApp();
  const [feed, setFeed] = useState([]);
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [members, setMembers] = useState([]);
  const [membersVisible, setMembersVisible] = useState(false);
  const requestId = useRef(0);

  const refresh = useCallback(async () => {
    if (!selectedGroupId) return;
    const id = ++requestId.current;
    const next = await getFeed(selectedGroupId);
    if (id === requestId.current) setFeed(next);
  }, [selectedGroupId]);

  // Reload groups whenever this tab gains focus.
  useEffect(() => navigation.addListener('focus', refreshGroups), [navigation, refreshGroups]);

  // Feed + realtime for the selected group.
  useEffect(() => {
    setFeed([]);
    if (!selectedGroupId) return;
    refresh().catch(() => {});
    const unsub = subscribe(selectedGroupId, (next) => setFeed([...next].sort((a, b) => b.createdAt - a.createdAt)));
    return unsub;
  }, [selectedGroupId, refresh]);

  useEffect(() => {
    let current = true;
    setMembers([]);
    if (selectedGroupId) getGroupMembers(selectedGroupId)
      .then((next) => { if (current) setMembers(next); })
      .catch(() => {});
    return () => { current = false; };
  }, [selectedGroupId]);

  const tagMember = (member) => {
    const mention = `@${member.name}`;
    setDraft((value) => value.includes(mention) ? value : `${value}${value && !/\s$/.test(value) ? ' ' : ''}${mention} `);
  };

  const post = async () => {
    if (!draft.trim() || !selectedGroupId) return;
    setSending(true);
    try {
      const mentionedUserIds = members
        .filter((member) => draft.toLocaleLowerCase().includes(`@${member.name}`.toLocaleLowerCase()))
        .map((member) => member.userId);
      await addPost(selectedGroupId, { author: profile.name, type: 'note', text: draft.trim(), mentionedUserIds });
      setDraft(''); setComposing(false); await refresh();
    } catch (_) { notify('Couldn’t post', 'Check your connection and try again.'); }
    finally { setSending(false); }
  };
  const handleVoice = async (uri, dur) => {
    if (!selectedGroupId) return;
    setSending(true);
    try {
      const path = await uploadVoice(uri);
      try {
        await addPost(selectedGroupId, { author: profile.name, type: 'voice', text: '', audioUrl: path, audioDuration: dur });
      } catch (error) {
        await deleteVoice(path).catch(() => {});
        throw error;
      }
      setComposing(false); await refresh();
    } catch (e) {
      notify('Couldn’t send voice', String(e?.message || e));
    } finally { setSending(false); }
  };

  const onAmen = async (postId) => {
    try {
      const updated = await toggleAmen(postId, profile.name);
      if (updated) setFeed((items) => items.map((item) => item.id === postId ? updated : item));
    } catch (_) { notify('Couldn’t add Amen', 'Please try again.'); }
  };
  const onDelete = (postId) => {
    confirmDestructive({
      title: 'Delete message?',
      message: 'This removes it from the group for everyone.',
      confirmText: 'Delete',
      onConfirm: async () => {
        const before = feed;
        setFeed((f) => f.filter((p) => p.id !== postId));
        try { await deletePost(postId); } catch (e) { setFeed(before); notify('Couldn’t delete', 'Please try again.'); }
        await refresh().catch(() => {});
      },
    });
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
        <View style={styles.headerRow}>
          <Text style={styles.title}>Groups</Text>
          <Pressable onPress={() => setMembersVisible(true)} style={styles.membersBtn} accessibilityLabel="View group members">
            <Ionicons name="people-outline" size={17} color={colors.primary} />
            <Text style={styles.membersBtnText}>{members.length || selectedGroup?.members || 0}</Text>
          </Pressable>
        </View>
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
          const mine = item.authorId && userId ? item.authorId === userId : item.author === profile.name;
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
              {item.text ? <LinkText style={styles.body} mentionNames={members.map((member) => member.name)}>{item.text}</LinkText> : null}
              {item.text ? <LinkPreview text={item.text} /> : null}
              {item.audioUrl ? (
                <View style={{ marginTop: item.text ? spacing.md : 0 }}>
                  <VoicePlayer url={item.audioUrl} duration={item.audioDuration} />
                </View>
              ) : null}
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
            {members.some((member) => member.userId !== userId) ? (
              <View style={styles.tagWrap}>
                <Text style={styles.tagLabel}>Tag someone</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagList} keyboardShouldPersistTaps="handled">
                  {members.filter((member) => member.userId !== userId).map((member) => (
                    <Pressable key={member.userId} onPress={() => tagMember(member)} style={styles.tagChip}>
                      <Text style={styles.tagChipText}>@{member.name}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null}
            <Pressable onPress={post} disabled={!draft.trim() || sending} style={({ pressed }) => [styles.postBtn, (!draft.trim() || sending) && { opacity: 0.4 }, pressed && { opacity: 0.85 }]}>
              <Ionicons name="send" size={18} color={colors.white} /><Text style={styles.postBtnText}>Post</Text>
            </Pressable>
            <View style={styles.voiceRow}>
              <Text style={styles.voiceLabel}>{sending ? 'Sending voice…' : 'or send a voice message (up to 15 min)'}</Text>
              <VoiceRecorder onRecorded={handleVoice} busy={sending} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={membersVisible} animationType="fade" transparent onRequestClose={() => setMembersVisible(false)}>
        <View style={styles.membersModalWrap}>
          <Pressable style={styles.backdrop} onPress={() => setMembersVisible(false)} />
          <View style={styles.membersCard}>
            <View style={styles.membersHead}>
              <View><Text style={styles.sheetTitle}>{selectedGroup?.name}</Text><Text style={styles.membersSub}>Only members of this group can see this list.</Text></View>
              <Pressable onPress={() => setMembersVisible(false)} hitSlop={10}><Ionicons name="close" size={22} color={colors.muted} /></Pressable>
            </View>
            <ScrollView style={{ maxHeight: 380 }}>
              {members.map((member) => (
                <View key={member.userId} style={styles.memberRow}>
                  <View style={[styles.avatar, member.userId === userId && styles.avatarMine]}><Text style={styles.avatarText}>{initials(member.name)}</Text></View>
                  <View style={{ flex: 1 }}><Text style={styles.author}>{member.name}{member.userId === userId ? ' (you)' : ''}</Text><Text style={styles.time}>{member.isAdmin ? 'Group admin' : 'Member'}</Text></View>
                  {member.userId !== userId ? <Pressable onPress={() => { tagMember(member); setMembersVisible(false); setComposing(true); }} style={styles.tagChip}><Text style={styles.tagChipText}>Tag</Text></Pressable> : null}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  membersBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primarySoft, paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.pill },
  membersBtnText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.primary },
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
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.xl, paddingBottom: spacing.xxl, maxHeight: '92%' },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: spacing.lg },
  sheetTitle: { fontFamily: fonts.serifBold, fontSize: 20, color: colors.text, marginBottom: spacing.md },
  sheetInput: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, padding: spacing.lg, minHeight: 120, fontFamily: fonts.body, fontSize: 16, lineHeight: 24, color: colors.text, textAlignVertical: 'top' },
  tagWrap: { marginTop: spacing.md },
  tagLabel: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.muted, marginBottom: spacing.sm },
  tagList: { gap: spacing.sm, paddingRight: spacing.md },
  tagChip: { backgroundColor: colors.primarySoft, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 8 },
  tagChipText: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.primary },
  postBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, height: 52, borderRadius: radius.pill, marginTop: spacing.lg },
  postBtnText: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.white },
  voiceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, marginTop: spacing.lg, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border },
  voiceLabel: { flex: 1, fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  membersModalWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  membersCard: { width: '100%', maxWidth: 480, backgroundColor: colors.bg, borderRadius: radius.lg, padding: spacing.xl, ...shadow.floating },
  membersHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md, marginBottom: spacing.lg },
  membersSub: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: -8 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
});
