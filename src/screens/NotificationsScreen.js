import React, { useEffect } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../data/AppContext';
import { EmptyState, timeAgo } from '../components/ui';
import { colors, fonts, spacing, radius } from '../theme';

const META = {
  reflection: { icon: 'sunny-outline', verb: 'shared a reflection', tone: colors.accent },
  prayer: { icon: 'hand-left-outline', verb: 'shared a prayer', tone: colors.primary },
  note: { icon: 'create-outline', verb: 'posted a note', tone: colors.muted },
};
const initials = (n) => (n || '?').trim().slice(0, 2).toUpperCase();

export default function NotificationsScreen({ navigation }) {
  const { notifications, markNotificationsRead, refreshNotifications, selectGroup } = useApp();

  useEffect(() => { refreshNotifications().then(markNotificationsRead); }, []);

  const open = (item) => {
    selectGroup(item.groupId);
    navigation.navigate('Tabs', { screen: 'Group' });
  };

  return (
    <View style={styles.screen}>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState icon="notifications-outline" title="No notifications" subtitle="When your mates post in a group, you’ll see it here." />}
        renderItem={({ item }) => {
          const m = META[item.type] || META.note;
          return (
            <Pressable onPress={() => open(item)} style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}>
              <View style={[styles.avatar, { backgroundColor: m.tone }]}><Text style={styles.avatarText}>{initials(item.author)}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.line}><Text style={styles.name}>{item.author}</Text> {m.verb} in <Text style={styles.group}>{item.group}</Text></Text>
                {item.text ? <Text style={styles.snippet} numberOfLines={1}>{item.text}</Text> : null}
                <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.faint} />
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.lg, gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.lg },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.white },
  line: { fontFamily: fonts.body, fontSize: 14, color: colors.text, lineHeight: 20 },
  name: { fontFamily: fonts.bodySemi },
  group: { fontFamily: fonts.bodySemi, color: colors.primary },
  snippet: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginTop: 2 },
  time: { fontFamily: fonts.body, fontSize: 12, color: colors.faint, marginTop: 3 },
});
