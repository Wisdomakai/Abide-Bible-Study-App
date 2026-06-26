import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { generateCode, normalizeCode } from '../data/groupCode';
import { colors, fonts, spacing, radius } from '../theme';

// Create a new group (name + auto code) or join one by code.
// Calls onChange({ code, groupName }) whenever the selection changes.
export default function GroupPicker({ onChange }) {
  const [mode, setMode] = useState('create');
  const [createdCode] = useState(() => generateCode());
  const [groupName, setGroupName] = useState('');
  const [joinCode, setJoinCode] = useState('');

  const code = mode === 'create' ? createdCode : normalizeCode(joinCode);
  useEffect(() => { onChange({ code, groupName: mode === 'create' ? groupName.trim() : '' }); }, [code, groupName, mode, onChange]);

  return (
    <View>
      <View style={styles.segment}>
        <Pressable onPress={() => setMode('create')} style={[styles.segBtn, mode === 'create' && styles.segOn]}>
          <Ionicons name="add-circle-outline" size={17} color={mode === 'create' ? colors.white : colors.muted} />
          <Text style={[styles.segText, mode === 'create' && styles.segTextOn]}>Create</Text>
        </Pressable>
        <Pressable onPress={() => setMode('join')} style={[styles.segBtn, mode === 'join' && styles.segOn]}>
          <Ionicons name="enter-outline" size={17} color={mode === 'join' ? colors.white : colors.muted} />
          <Text style={[styles.segText, mode === 'join' && styles.segTextOn]}>Join</Text>
        </Pressable>
      </View>

      {mode === 'create' ? (
        <View>
          <Text style={styles.codeLabel}>Group name</Text>
          <TextInput value={groupName} onChangeText={setGroupName} placeholder="e.g. Tuesday Morning Study" placeholderTextColor={colors.faint} style={styles.input} maxLength={40} />
          <View style={styles.codeBox}>
            <Text style={styles.codeLabel}>Invite code</Text>
            <Text style={styles.code}>{createdCode}</Text>
            <Text style={styles.codeHint}>Share this code so your mates can join. You’ll be the group admin.</Text>
          </View>
        </View>
      ) : (
        <View>
          <Text style={styles.codeLabel}>Enter your group’s code</Text>
          <TextInput value={joinCode} onChangeText={setJoinCode} placeholder="e.g. grace-274" placeholderTextColor={colors.faint} autoCapitalize="none" autoCorrect={false} style={styles.input} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  segment: { flexDirection: 'row', gap: spacing.sm, backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, padding: 4, marginBottom: spacing.lg },
  segBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: radius.pill },
  segOn: { backgroundColor: colors.primary },
  segText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.muted },
  segTextOn: { color: colors.white },
  codeLabel: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.muted, marginBottom: 6 },
  codeBox: { backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: spacing.lg, alignItems: 'center', marginTop: spacing.lg },
  code: { fontFamily: fonts.serifBold, fontSize: 30, color: colors.primary, letterSpacing: 1 },
  codeHint: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, textAlign: 'center', marginTop: 8, lineHeight: 19 },
  input: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.lg, height: 54, fontFamily: fonts.bodyMedium, fontSize: 17, color: colors.text, marginBottom: spacing.sm },
});
