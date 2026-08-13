import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from './Icon';
import { fmtDuration } from '../data/voice';
import { colors, fonts, spacing, radius } from '../theme';

export default function VoicePlayer({ url, duration = 0, tint = colors.primary }) {
  const audio = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!url) {
      audio.current = null;
      return undefined;
    }
    const element = new Audio(url);
    audio.current = element;
    const update = () => setPos(Math.round(element.currentTime || 0));
    const ended = () => { setPlaying(false); setPos(0); };
    element.addEventListener('timeupdate', update);
    element.addEventListener('ended', ended);
    return () => { element.pause(); element.removeEventListener('timeupdate', update); element.removeEventListener('ended', ended); };
  }, [url]);

  const toggle = async () => {
    if (!audio.current) return;
    try {
      if (audio.current.paused) { setLoading(true); await audio.current.play(); setPlaying(true); }
      else { audio.current.pause(); setPlaying(false); }
    } catch (_) {} finally { setLoading(false); }
  };

  const total = duration || audio.current?.duration || pos || 1;
  const pct = Math.min(100, Math.round((pos / total) * 100));
  return (
    <View style={styles.wrap}>
      <Pressable disabled={!url} onPress={toggle} style={[styles.btn, { backgroundColor: tint, opacity: url ? 1 : 0.55 }]} accessibilityLabel={url ? (playing ? 'Pause' : 'Play voice message') : 'Loading voice message'}>
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
