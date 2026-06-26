import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, spacing } from '../theme';

// Branded splash shown on every cold start (before onboarding / the app).
export default function LaunchScreen() {
  const fade = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(16)).current;
  const ring = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(lift, { toValue: 0, duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(ring, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [fade, lift, ring]);

  return (
    <View style={styles.screen}>
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <Animated.View style={{ opacity: fade, transform: [{ translateY: lift }], alignItems: 'center' }}>
        <Animated.View style={[styles.ring, { transform: [{ scale: ring }] }]}>
          <View style={styles.logo}>
            <Ionicons name="book" size={44} color={colors.white} />
          </View>
        </Animated.View>
        <Text style={styles.wordmark}>Abide</Text>
        <Text style={styles.tagline}>Study · Reflect · Pray · Together</Text>
      </Animated.View>

      <Animated.Text style={[styles.verse, { opacity: fade }]}>
        “Abide in me, and I in you.”{'\n'}John 15:4
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  glowTop: { position: 'absolute', top: -120, width: 360, height: 360, borderRadius: 180, backgroundColor: '#5B4FB0' },
  glowBottom: { position: 'absolute', bottom: -140, right: -80, width: 300, height: 300, borderRadius: 150, backgroundColor: '#3A3180' },
  ring: {
    width: 116, height: 116, borderRadius: 34, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    marginBottom: spacing.xl,
  },
  logo: {
    width: 84, height: 84, borderRadius: 26, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  wordmark: { fontFamily: fonts.serifBold, fontSize: 48, color: colors.white, letterSpacing: 0.5 },
  tagline: { fontFamily: fonts.bodyMedium, fontSize: 14, color: '#C9C2F0', marginTop: spacing.sm, letterSpacing: 1 },
  verse: {
    position: 'absolute', bottom: 56, textAlign: 'center',
    fontFamily: fonts.serifItalic, fontSize: 15, lineHeight: 24, color: 'rgba(255,255,255,0.7)',
  },
});
