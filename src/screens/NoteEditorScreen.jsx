import React, { useState, useLayoutEffect } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '../components/Icon';
import { useApp } from '../data/AppContext';
import { addPost } from '../data/api';
import GroupChooser from '../components/GroupChooser';
import VoiceRecorder from '../components/VoiceRecorder';
import VoicePlayer from '../components/VoicePlayer';
import { confirmDestructive, notify, HeaderButton, ActionButton } from '../components/ui';
import { deleteVoiceIfUnreferenced, signedVoiceUrl, uploadVoice } from '../data/voice';
import { colors, fonts, spacing, radius, field } from '../theme';

export default function NoteEditorScreen({ route, navigation }) {
  const { id, prefill } = route.params || {}; // prefill: passage sent from the Bible reader
  const { notes, upsertNote, deleteNote, profile, groups } = useApp();
  const [noteId, setNoteId] = useState(id);
  const [pendingShare, setPendingShare] = useState(null); // text awaiting group choice
  const existing = notes.find((n) => n.id === noteId);

  const [title, setTitle] = useState(existing?.title || prefill?.title || '');
  const [body, setBody] = useState(existing?.body || prefill?.body || '');
  const [tag, setTag] = useState(existing?.tag || prefill?.tag || '');
  const verseRef = existing?.verseRef || prefill?.verseRef || null;
  const [audio, setAudio] = useState(existing?.audioUrl ? { path: existing.audioUrl, url: null, duration: existing.audioDuration } : null);
  const [recBusy, setRecBusy] = useState(false);
  const [sharing, setSharing] = useState(false);

  React.useEffect(() => {
    if (audio?.path && !audio.url) signedVoiceUrl(audio.path).then((url) => url && setAudio((current) => current?.path === audio.path ? { ...current, url } : current));
  }, [audio?.path, audio?.url]);

  const persist = () => upsertNote({ id: noteId, title: title.trim(), body: body.trim(), tag: tag.trim(), verseRef, audioUrl: audio?.path || null, audioDuration: audio?.duration || 0 });

  const onRecorded = async (uri, dur) => {
    setRecBusy(true);
    try {
      const previousAudio = audio;
      const path = await uploadVoice(uri);
      const url = await signedVoiceUrl(path);
      const a = { path, url, duration: dur };
      setAudio(a);
      let detachedAudioUrls = existing?.detachedAudioUrls || [];
      if (previousAudio?.path && previousAudio.path !== path) {
        try {
          const removed = await deleteVoiceIfUnreferenced(previousAudio.path);
          if (!removed) detachedAudioUrls = [...new Set([...detachedAudioUrls, previousAudio.path])];
        } catch (_) {
          detachedAudioUrls = [...new Set([...detachedAudioUrls, previousAudio.path])];
        }
      }
      const savedId = upsertNote({ id: noteId, title: title.trim(), body: body.trim(), tag: tag.trim(), verseRef, audioUrl: path, audioDuration: dur, detachedAudioUrls });
      setNoteId(savedId);
    } catch (e) {
      notify('Couldn’t save recording', String(e?.message || e));
    } finally { setRecBusy(false); }
  };

  const save = () => {
    if (!title.trim() && !body.trim()) { navigation.goBack(); return; }
    persist();
    navigation.goBack();
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => <HeaderButton title="Save" onPress={save} />,
    });
  });

  const onShare = () => {
    if (!body.trim() && !title.trim() && !audio) return;
    if (groups.length === 0) { notify('No group yet', 'Create or join a group first (Group tab).'); return; }
    const text = (title ? title + '\n\n' : '') + body;
    if (groups.length === 1) shareTo(groups[0], text);
    else setPendingShare(text);
  };

  const shareTo = async (group, text) => {
    setPendingShare(null);
    setSharing(true);
    try {
      const savedId = persist();
      setNoteId(savedId);
      const post = await addPost(group.id, {
        author: profile.name, type: 'note', text,
        audioUrl: audio?.path, audioDuration: audio?.duration,
      });
      const current = notes.find((note) => note.id === savedId);
      upsertNote({ id: savedId, sharedPostIds: [...new Set([...(current?.sharedPostIds || []), current?.sharedPostId, post.id].filter(Boolean))], sharedPostId: undefined });
      notify('Shared', `Your note was posted to ${group.name}.`);
    } catch (_) { notify('Couldn’t share', 'Check your connection and try again.'); }
    finally { setSharing(false); }
  };

  const confirmDelete = () => {
    confirmDestructive({
      title: 'Delete note?',
      message: 'This also removes it from the group feed if shared.',
      confirmText: 'Delete',
      onConfirm: async () => {
        try { await deleteNote(noteId); navigation.goBack(); }
        catch (_) { notify('Couldn’t delete', 'The shared copies could not be removed. Nothing was deleted locally.'); }
      },
    });
  };

  const removeRecording = () => confirmDestructive({
    title: 'Remove recording?',
    message: 'The recording will remain available in any group post you already shared.',
    confirmText: 'Remove',
    onConfirm: async () => {
      const previous = audio;
      try {
        const removed = await deleteVoiceIfUnreferenced(previous.path);
        setAudio(null);
        upsertNote({
          id: noteId, audioUrl: null, audioDuration: 0,
          detachedAudioUrls: removed ? (existing?.detachedAudioUrls || []) : [...new Set([...(existing?.detachedAudioUrls || []), previous.path])],
        });
      } catch (_) {
        notify('Couldn’t remove recording', 'Nothing was changed. Please check your connection and try again.');
      }
    },
  });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Title"
        placeholderTextColor={colors.faint}
        style={styles.title}
      />
      <View style={styles.tagRow} dataSet={{ fieldbox: '1' }}>
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
        autoFocus={!existing && !prefill}
      />

      <View style={styles.voiceSection}>
        {audio ? (
          <View style={styles.voiceHas}>
            <View style={{ flex: 1 }}><VoicePlayer url={audio.url} duration={audio.duration} /></View>
            <Pressable onPress={removeRecording} hitSlop={8} style={({ pressed }) => pressed && { opacity: 0.6 }} accessibilityLabel="Remove recording">
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
        <ActionButton
          icon="people-outline"
          label={sharing ? 'Sharing…' : 'Share with group'}
          onPress={sharing ? undefined : onShare}
          style={sharing && { opacity: 0.5 }}
        />
        {existing ? <ActionButton icon="trash-outline" label="Delete" tone="danger" onPress={confirmDelete} /> : null}
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
  title: { ...field.base, fontFamily: fonts.serifBold, fontSize: 22, color: colors.text, marginBottom: spacing.md },
  tagRow: {
    ...field.base, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg,
  },
  tag: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.text },
  body: {
    ...field.base, fontFamily: fonts.body, fontSize: 17, lineHeight: 27, color: colors.text, minHeight: 240,
  },
  voiceSection: { marginTop: spacing.xl, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border },
  voiceAdd: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  voiceHas: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  voiceLabel: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.muted },
  footerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.xl },
  footBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footBtnText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.primary },
});
