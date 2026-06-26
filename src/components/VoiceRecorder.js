import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { fmtDuration, MAX_VOICE_SECONDS } from '../data/voice';
import { colors, fonts, spacing, radius } from '../theme';

// A compact record button. While recording it shows a timer (auto-stops at 15m)
// and a Stop button. Calls onRecorded(localUri, durationSeconds) when done.
export default function VoiceRecorder({ onRecorded, busy, label = 'Record voice' }) {
  const [active, setActive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recRef = useRef(null);
  const timerRef = useRef(null);
  const secRef = useRef(0);

  useEffect(() => () => { clearInterval(timerRef.current); recRef.current?.stopAndUnloadAsync?.().catch(() => {}); }, []);

  const start = async () => {
    if (Platform.OS === 'web') { Alert.alert('Use the app', 'Voice recording works in the installed Ardent app, not the web version.'); return; }
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) { Alert.alert('Microphone needed', 'Please allow microphone access to record.'); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      recRef.current = rec; secRef.current = 0; setSeconds(0); setActive(true);
      timerRef.current = setInterval(() => {
        secRef.current += 1; setSeconds(secRef.current);
        if (secRef.current >= MAX_VOICE_SECONDS) stop();
      }, 1000);
    } catch (e) {
      Alert.alert('Couldn’t start recording', String(e?.message || e));
    }
  };

  const stop = async () => {
    clearInterval(timerRef.current);
    const rec = recRef.current; recRef.current = null; setActive(false);
    if (!rec) return;
    try {
      const status = await rec.getStatusAsync().catch(() => null);
      await rec.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = rec.getURI();
      const dur = Math.round((status?.durationMillis || secRef.current * 1000) / 1000) || secRef.current;
      if (uri && dur > 0) onRecorded(uri, dur);
    } catch (e) {
      Alert.alert('Recording failed', String(e?.message || e));
    }
    setSeconds(0);
  };

  if (active) {
    return (
      <View style={styles.recBar}>
        <View style={styles.dot} />
        <Text style={styles.timer}>{fmtDuration(seconds)} / 15:00</Text>
        <Pressable onPress={stop} style={({ pressed }) => [styles.stopBtn, pressed && { opacity: 0.85 }]}>
          <Ionicons name="stop" size={16} color={colors.white} /><Text style={styles.stopText}>Stop &amp; send</Text>
        </Pressable>
      </View>
    );
  }
  return (
    <Pressable onPress={start} disabled={busy} style={({ pressed }) => [styles.micBtn, pressed && { opacity: 0.8 }, busy && { opacity: 0.5 }]} accessibilityLabel={label}>
      <Ionicons name="mic" size={20} color={colors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  micBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  recBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, paddingHorizontal: spacing.lg, height: 52 },
  dot: { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.danger },
  timer: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text },
  stopBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.danger, paddingHorizontal: spacing.lg, paddingVertical: 9, borderRadius: radius.pill },
  stopText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.white },
});
