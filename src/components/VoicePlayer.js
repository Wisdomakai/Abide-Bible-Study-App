import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { fmtDuration } from '../data/voice';
import { colors, fonts, spacing, radius } from '../theme';

// Play/pause a voice recording from a URL (works on web + native).
export default function VoicePlayer({ url, duration = 0, tint = colors.primary }) {
  const soundRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => () => { soundRef.current?.unloadAsync?.().catch(() => {}); }, []);

  const onStatus = (st) => {
    if (!st?.isLoaded) return;
    setPlaying(st.isPlaying);
    setPos(Math.round((st.positionMillis || 0) / 1000));
    if (st.didJustFinish) { setPlaying(false); setPos(0); soundRef.current?.setPositionAsync(0).catch(() => {}); }
  };

  const toggle = async () => {
    try {
      if (!soundRef.current) {
        setLoading(true);
        const { sound } = await Audio.Sound.createAsync({ uri: url }, { shouldPlay: true }, onStatus);
        soundRef.current = sound; setPlaying(true); setLoading(false);
        return;
      }
      const st = await soundRef.current.getStatusAsync();
      if (st.isPlaying) await soundRef.current.pauseAsync();
      else await soundRef.current.playAsync();
    } catch (e) { setLoading(false); }
  };

  const total = duration || pos || 1;
  const pct = Math.min(100, Math.round((pos / total) * 100));

  return (
    <View style={styles.wrap}>
      <Pressable onPress={toggle} style={[styles.btn, { backgroundColor: tint }]} accessibilityLabel={playing ? 'Pause' : 'Play voice message'}>
        <Ionicons name={loading ? 'hourglass-outline' : playing ? 'pause' : 'play'} size={18} color={colors.white} />
      </Pressable>
      <View style={styles.track}><View style={[styles.fill, { width: `${pct}%`, backgroundColor: tint }]} /></View>
      <Text style={styles.time}>{fmtDuration(playing || pos ? pos : duration)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 8 },
  btn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  track: { flex: 1, height: 5, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: 5, borderRadius: 3 },
  time: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.muted, minWidth: 38, textAlign: 'right' },
});
