import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from './Icon';
import { generateCode, normalizeCode } from '../data/groupCode';
import { openExternalUrl } from '../data/native';

const COMMUNITY_URL = 'https://ardent-study.vercel.app/community.html';
import { colors, fonts, spacing, radius } from '../theme';

// Create a new group (name + auto code) or join one by code.
// Calls onChange({ mode, code, groupName, agreed }) whenever the selection changes.
// `agreed` is the member's acceptance of the community guidelines, which App
// Store guideline 1.2 requires before anyone can take part in a group.
export default function GroupPicker({ onChange }) {
  const [mode, setMode] = useState('create');
  const [createdCode] = useState(() => generateCode());
  const [groupName, setGroupName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [agreed, setAgreed] = useState(false);

  const code = mode === 'create' ? createdCode : normalizeCode(joinCode);
  useEffect(() => { onChange({ mode, code, groupName: mode === 'create' ? groupName.trim() : '', agreed }); }, [code, groupName, mode, agreed, onChange]);

  const openGuidelines = () => { openExternalUrl(COMMUNITY_URL).catch(() => {}); };

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
          <TextInput value={joinCode} onChangeText={setJoinCode} placeholder="e.g. GRACE27" placeholderTextColor={colors.faint} autoCapitalize="characters" autoCorrect={false} style={styles.input} />
        </View>
      )}

      <Pressable onPress={() => setAgreed((v) => !v)} style={styles.agreeRow} accessibilityRole="checkbox" accessibilityState={{ checked: agreed }}>
        <View style={[styles.box, agreed && styles.boxOn]}>
          {agreed ? <Ionicons name="checkmark" size={15} color={colors.white} /> : null}
        </View>
        <Text style={styles.agreeText}>
          I agree to the <Text style={styles.agreeLink} onPress={(e) => { e?.stopPropagation?.(); openGuidelines(); }} accessibilityRole="link">Community Guidelines</Text>. There is no tolerance for objectionable or abusive content; it is removed and its author can lose access.
        </Text>
      </Pressable>
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
  agreeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, marginTop: spacing.lg },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  boxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  agreeText: { flex: 1, fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.muted },
  agreeLink: { color: colors.primary, textDecorationLine: 'underline' },
  input: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.lg, height: 54, fontFamily: fonts.bodyMedium, fontSize: 17, color: colors.text, marginBottom: spacing.sm },
});
