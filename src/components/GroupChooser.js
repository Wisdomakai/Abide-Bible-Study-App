import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, spacing, radius } from '../theme';

// A small modal that lets the user pick which group to share to.
export default function GroupChooser({ visible, groups, onPick, onClose, title = 'Share to which group?' }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{title}</Text>
          <ScrollView style={{ maxHeight: 340 }}>
            {groups.map((g) => (
              <Pressable key={g.id} onPress={() => onPick(g)} style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceAlt }]}>
                <View style={styles.icon}><Ionicons name="people" size={18} color={colors.primary} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{g.name}</Text>
                  <Text style={styles.meta}>{g.members} member{g.members === 1 ? '' : 's'} · {g.code}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.faint} />
              </Pressable>
            ))}
          </ScrollView>
          <Pressable onPress={onClose} style={styles.cancel}><Text style={styles.cancelText}>Cancel</Text></Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(43,37,64,0.45)', justifyContent: 'center', padding: spacing.xl },
  sheet: { backgroundColor: colors.bg, borderRadius: radius.lg, padding: spacing.lg },
  title: { fontFamily: fonts.serifBold, fontSize: 18, color: colors.text, marginBottom: spacing.md, paddingHorizontal: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md },
  icon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text },
  meta: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 1 },
  cancel: { marginTop: spacing.sm, padding: spacing.md, alignItems: 'center' },
  cancelText: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.muted },
});
