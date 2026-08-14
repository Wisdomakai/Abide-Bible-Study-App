import React from 'react';
import { View, Text, Pressable, StyleSheet, Linking, Alert, Platform } from 'react-native';
import { Ionicons } from './Icon';
import { colors, fonts, spacing, radius, shadow } from '../theme';
import { openExternalUrl } from '../data/native';

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

const URL_RE = /https?:\/\/[^\s<]+/i;
const TRAILING_URL_PUNCTUATION = /[),.!?;:'\]]+$/;

function cleanUrl(value) {
  return String(value || '').replace(TRAILING_URL_PUNCTUATION, '');
}

export function firstUrl(value) {
  return cleanUrl(String(value || '').match(URL_RE)?.[0]);
}

// Renders stable tappable URLs and visually distinct member mentions.
export function LinkText({ children, style, mentionNames = [] }) {
  const text = String(children ?? '');
  const names = [...new Set(mentionNames.filter(Boolean))]
    .sort((a, b) => b.length - a.length)
    .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const tokenPattern = names.length
    ? new RegExp(`(https?:\\/\\/[^\\s<]+|@(?:${names.join('|')}))`, 'gi')
    : /(https?:\/\/[^\s<]+)/gi;
  const parts = text.split(tokenPattern);
  return (
    <Text style={style}>
      {parts.map((part, i) => {
        if (/^https?:\/\//i.test(part)) {
          const url = cleanUrl(part);
          const suffix = part.slice(url.length);
          return <React.Fragment key={i}>
            <Text style={styles.inlineLink} onPress={() => openExternalUrl(url).catch(() => Linking.openURL(url).catch(() => {}))}>{url}</Text>{suffix}
          </React.Fragment>;
        }
        if (part.startsWith('@')) return <Text key={i} style={styles.mention}>{part}</Text>;
        return part;
      })}
    </Text>
  );
}

// A privacy-friendly preview: no third-party metadata service receives the URL.
export function LinkPreview({ text }) {
  const url = firstUrl(text);
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const detail = decodeURIComponent(`${parsed.pathname}${parsed.search}`);
    return (
      <Pressable onPress={() => openExternalUrl(url).catch(() => Linking.openURL(url).catch(() => {}))} style={({ pressed }) => [styles.linkCard, pressed && { opacity: 0.78 }]} accessibilityRole="link">
        <View style={styles.linkIcon}><Ionicons name="share-outline" size={18} color={colors.primary} /></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.linkHost} numberOfLines={1}>{parsed.hostname.replace(/^www\./, '')}</Text>
          <Text style={styles.linkDetail} numberOfLines={2}>{detail && detail !== '/' ? detail : 'Open link'}</Text>
        </View>
        <Ionicons name="chevron-forward" size={17} color={colors.faint} />
      </Pressable>
    );
  } catch (_) { return null; }
}

export function confirmDestructive({ title, message, confirmText = 'Delete', onConfirm }) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const ok = window.confirm(`${title}${message ? `\n\n${message}` : ''}`);
    if (ok) onConfirm?.();
    return;
  }
  Alert.alert(title, message || '', [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmText, style: 'destructive', onPress: onConfirm },
  ]);
}

// react-native-web's Alert.alert is an empty function, so every Alert.alert in
// this app was silently discarded — failures looked like the button doing
// nothing at all. Route messages through window.alert on web, the same way
// confirmDestructive already handles confirmations.
export function notify(title, message) {
  const text = `${title}${message ? `\n\n${message}` : ''}`;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(text);
    return;
  }
  Alert.alert(title, message || '');
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
  inlineLink: { color: colors.primary, textDecorationLine: 'underline' },
  mention: { color: colors.primary, backgroundColor: colors.primarySoft, fontFamily: fonts.bodySemi },
  linkCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md, padding: spacing.md, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md },
  linkIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  linkHost: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text },
  linkDetail: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: colors.muted, marginTop: 2 },
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
