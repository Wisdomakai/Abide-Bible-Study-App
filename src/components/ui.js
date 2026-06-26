import React from 'react';
import { View, Text, Pressable, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, spacing, radius, shadow } from '../theme';

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children, style }) {
  return <Text style={[styles.sectionTitle, style]}>{children}</Text>;
}

export function Pill({ label, tone = 'primary', icon }) {
  const map = {
    primary: [colors.primarySoft, colors.primary],
    gold: [colors.accentSoft, colors.accent],
    green: [colors.answeredSoft, colors.answered],
    muted: [colors.surfaceAlt, colors.muted],
  };
  const [bg, fg] = map[tone] || map.primary;
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      {icon ? <Ionicons name={icon} size={13} color={fg} style={{ marginRight: 5 }} /> : null}
      <Text style={[styles.pillText, { color: fg }]}>{label}</Text>
    </View>
  );
}

export function Button({ title, onPress, variant = 'primary', icon, disabled, style }) {
  const isPrimary = variant === 'primary';
  const isGhost = variant === 'ghost';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        isPrimary && styles.btnPrimary,
        variant === 'outline' && styles.btnOutline,
        isGhost && styles.btnGhost,
        pressed && !disabled && { opacity: 0.85, transform: [{ translateY: 1 }] },
        disabled && { opacity: 0.5 },
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={18}
          color={isPrimary ? colors.white : colors.primary}
          style={{ marginRight: 8 }}
        />
      ) : null}
      <Text style={[styles.btnText, isPrimary ? { color: colors.white } : { color: colors.primary }]}>
        {title}
      </Text>
    </Pressable>
  );
}

export function EmptyState({ icon, title, subtitle }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={28} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySub}>{subtitle}</Text> : null}
    </View>
  );
}

const URL_RE = /(https?:\/\/[^\s]+)/g;
// Renders text with any URLs as tappable links that open in the device browser.
export function LinkText({ children, style }) {
  const text = String(children ?? '');
  if (!URL_RE.test(text)) return <Text style={style}>{text}</Text>;
  const parts = text.split(URL_RE);
  return (
    <Text style={style}>
      {parts.map((p, i) =>
        /^https?:\/\//.test(p) ? (
          <Text key={i} style={{ color: colors.primary, textDecorationLine: 'underline' }} onPress={() => Linking.openURL(p).catch(() => {})}>
            {p}
          </Text>
        ) : (
          p
        )
      )}
    </Text>
  );
}

export function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'yesterday';
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  sectionTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.muted,
    marginBottom: spacing.md,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  pillText: { fontFamily: fonts.bodySemi, fontSize: 12 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
  },
  btnPrimary: { backgroundColor: colors.primary, ...shadow.floating },
  btnOutline: { borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  btnGhost: { backgroundColor: 'transparent', height: 44 },
  btnText: { fontFamily: fonts.bodySemi, fontSize: 16 },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl, paddingHorizontal: spacing.xl },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg,
  },
  emptyTitle: { fontFamily: fonts.serifBold, fontSize: 18, color: colors.text, marginBottom: 6, textAlign: 'center' },
  emptySub: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 21 },
});
