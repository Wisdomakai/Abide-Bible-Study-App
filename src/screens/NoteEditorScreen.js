import React, { useState, useLayoutEffect } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../data/AppContext';
import { addPost } from '../data/api';
import { colors, fonts, spacing, radius } from '../theme';

export default function NoteEditorScreen({ route, navigation }) {
  const { id } = route.params || {};
  const { notes, upsertNote, deleteNote, profile } = useApp();
  const [noteId, setNoteId] = useState(id);
  const existing = notes.find((n) => n.id === noteId);

  const [title, setTitle] = useState(existing?.title || '');
  const [body, setBody] = useState(existing?.body || '');
  const [tag, setTag] = useState(existing?.tag || '');

  const persist = () => upsertNote({ id: noteId, title: title.trim(), body: body.trim(), tag: tag.trim() });

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

  const onShare = async () => {
    if (!body.trim() && !title.trim()) return;
    const savedId = persist();           // make sure the note exists & is current
    setNoteId(savedId);
    const post = await addPost({ author: profile.name, type: 'note', text: (title ? title + '\n\n' : '') + body });
    upsertNote({ id: savedId, sharedPostId: post.id }); // link so deleting the note removes the post
    Alert.alert('Shared', 'Your note was posted to the group feed.');
  };

  const confirmDelete = () => {
    Alert.alert('Delete note?', 'This also removes it from the group feed if shared.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { deleteNote(noteId); navigation.goBack(); } },
    ]);
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
  footerRow: { flexDirection: 'row', gap: spacing.xl, marginTop: spacing.xl },
  footBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footBtnText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.primary },
});
