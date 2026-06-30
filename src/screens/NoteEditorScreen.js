import React, { useState, useLayoutEffect } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../data/AppContext';
import { addPost } from '../data/api';
import GroupChooser from '../components/GroupChooser';
import VoiceRecorder from '../components/VoiceRecorder';
import VoicePlayer from '../components/VoicePlayer';
import { confirmDestructive } from '../components/ui';
import { uploadVoice } from '../data/voice';
import { colors, fonts, spacing, radius } from '../theme';

export default function NoteEditorScreen({ route, navigation }) {
  const { id } = route.params || {};
  const { notes, upsertNote, deleteNote, profile, groups } = useApp();
  const [noteId, setNoteId] = useState(id);
  const [pendingShare, setPendingShare] = useState(null); // text awaiting group choice
  const existing = notes.find((n) => n.id === noteId);

  const [title, setTitle] = useState(existing?.title || '');
  const [body, setBody] = useState(existing?.body || '');
  const [tag, setTag] = useState(existing?.tag || '');
  const [audio, setAudio] = useState(existing?.audioUrl ? { url: existing.audioUrl, duration: existing.audioDuration } : null);
  const [recBusy, setRecBusy] = useState(false);

  const persist = () => upsertNote({ id: noteId, title: title.trim(), body: body.trim(), tag: tag.trim(), audioUrl: audio?.url || null, audioDuration: audio?.duration || 0 });

  const onRecorded = async (uri, dur) => {
    setRecBusy(true);
    try {
      const url = await uploadVoice(uri);
      const a = { url, duration: dur };
      setAudio(a);
      const savedId = upsertNote({ id: noteId, title: title.trim(), body: body.trim(), tag: tag.trim(), audioUrl: url, audioDuration: dur });
      setNoteId(savedId);
    } catch (e) {
      Alert.alert('Couldn’t save recording', String(e?.message || e));
    } finally { setRecBusy(false); }
  };

  const save = () => {
    if (!title.trim() && !body.trim()) { navigation.goBack(); return; }
    persist();
    navigation.goBack();
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={save} hitSlop={10} style={({ pressed }) => pressed && { opacity: 0.6 }}>
          <Text style={styles.saveBtn}>Save</Text>
        </Pressable>
      ),
    });
  });

  const onShare = () => {
    if (!body.trim() && !title.trim() && !audio) return;
    if (groups.length === 0) { Alert.alert('No group yet', 'Create or join a group first (Group tab).'); return; }
    const text = (title ? title + '\n\n' : '') + body;
    if (groups.length === 1) shareTo(groups[0], text);
    else setPendingShare(text);
  };

  const shareTo = async (group, text) => {
    setPendingShare(null);
    const savedId = persist();
    setNoteId(savedId);
    const post = await addPost(group.id, {
      author: profile.name, type: 'note', text,
      audioUrl: audio?.url, audioDuration: audio?.duration,
    });
    upsertNote({ id: savedId, sharedPostId: post.id });
    Alert.alert('Shared', `Your note was posted to ${group.name}.`);
  };

  const confirmDelete = () => {
    confirmDestructive({
      title: 'Delete note?',
      message: 'This also removes it from the group feed if shared.',
      confirmText: 'Delete',
      onConfirm: () => { deleteNote(noteId); navigation.goBack(); },
    });
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Title"
        placeholderTextColor={colors.faint}
        style={styles.title}
      />
      <View style={styles.tagRow}>
        <Ionicons name="pricetag-outline" size={16} color={colors.muted} />
        <TextInput
          value={tag}
          onChangeText={setTag}
          placeholder="Add a tag (e.g. Romans, Faith)"
          placeholderTextColor={colors.faint}
          style={styles.tag}
        />
      </View>
      <TextInput
        value={body}
        onChangeText={setBody}
        placeholder="Start writing…"
        placeholderTextColor={colors.faint}
        style={styles.body}
        multiline
        textAlignVertical="top"
        scrollEnabled={false}
        autoFocus={!existing}
      />

      <View style={styles.voiceSection}>
        {audio ? (
          <View style={styles.voiceHas}>
            <View style={{ flex: 1 }}><VoicePlayer url={audio.url} duration={audio.duration} /></View>
            <Pressable onPress={() => { setAudio(null); upsertNote({ id: noteId, audioUrl: null, audioDuration: 0 }); }} hitSlop={8} style={({ pressed }) => pressed && { opacity: 0.6 }}>
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </Pressable>
          </View>
        ) : (
          <View style={styles.voiceAdd}>
            <Text style={styles.voiceLabel}>{recBusy ? 'Saving recording…' : 'Add a voice note (up to 15 min)'}</Text>
            <VoiceRecorder onRecorded={onRecorded} busy={recBusy} />
          </View>
        )}
      </View>

      <View style={styles.footerRow}>
        <Pressable onPress={onShare} style={({ pressed }) => [styles.footBtn, pressed && { opacity: 0.7 }]}>
          <Ionicons name="people-outline" size={18} color={colors.primary} />
          <Text style={styles.footBtnText}>Share with group</Text>
        </Pressable>
        {existing ? (
          <Pressable onPress={confirmDelete} style={({ pressed }) => [styles.footBtn, pressed && { opacity: 0.7 }]}>
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
            <Text style={[styles.footBtnText, { color: colors.danger }]}>Delete</Text>
          </Pressable>
        ) : null}
      </View>

      <GroupChooser
        visible={!!pendingShare}
        groups={groups}
        onPick={(g) => shareTo(g, pendingShare)}
        onClose={() => setPendingShare(null)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, paddingBottom: spacing.xxl },
  saveBtn: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.primary },
  title: { fontFamily: fonts.serifBold, fontSize: 26, color: colors.text, paddingVertical: spacing.sm },
  tagRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: spacing.md, marginBottom: spacing.lg,
  },
  tag: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.text },
  body: { fontFamily: fonts.body, fontSize: 17, lineHeight: 27, color: colors.text, minHeight: 240 },
  voiceSection: { marginTop: spacing.xl, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border },
  voiceAdd: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  voiceHas: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  voiceLabel: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.muted },
  footerRow: { flexDirection: 'row', gap: spacing.xl, marginTop: spacing.xl },
  footBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footBtnText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.primary },
});
