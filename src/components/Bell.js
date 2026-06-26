import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../data/AppContext';
import { colors, fonts } from '../theme';

export default function Bell() {
  const navigation = useNavigation();
  const { unreadCount } = useApp();
  return (
    <Pressable
      onPress={() => navigation.navigate('Notifications')}
      hitSlop={8}
      style={({ pressed }) => [styles.btn, pressed && { opacity: 0.6 }]}
      accessibilityRole="button"
      accessibilityLabel={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
    >
      <Ionicons name="notifications-outline" size={20} color={colors.muted} />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -3, right: -3, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: colors.bg },
  badgeText: { fontFamily: fonts.bodyBold, fontSize: 10, color: colors.white },
});
