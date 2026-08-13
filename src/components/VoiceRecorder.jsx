import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from './Icon';
import { fmtDuration, MAX_VOICE_SECONDS, MAX_VOICE_BYTES } from '../data/voice';
import { colors, fonts, spacing, radius } from '../theme';

export default function VoiceRecorder({ onRecorded, busy, label = 'Record voice' }) {
  const [active, setActive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recorder = useRef(null);
  const stream = useRef(null);
  const chunks = useRef([]);
  const timer = useRef(null);
  const elapsed = useRef(0);

  const cleanup = () => {
    clearInterval(timer.current);
    stream.current?.getTracks?.().forEach((track) => track.stop());
    stream.current = null;
  };
  useEffect(() => cleanup, []);

  const stop = () => {
    clearInterval(timer.current);
    setActive(false);
    if (recorder.current?.state !== 'inactive') recorder.current?.stop();
    setSeconds(0);
  };

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia || !globalThis.MediaRecorder) {
      window.alert('Voice recording is not supported in this browser.');
      return;
    }
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
      const mimeType = types.find((type) => MediaRecorder.isTypeSupported(type)) || '';
      const rec = new MediaRecorder(audioStream, mimeType ? { mimeType } : undefined);
      stream.current = audioStream;
      recorder.current = rec;
      chunks.current = [];
      elapsed.current = 0;
      rec.ondataavailable = (event) => { if (event.data?.size) chunks.current.push(event.data); };
      rec.onstop = () => {
        const blob = new Blob(chunks.current, { type: mimeType || chunks.current[0]?.type || 'audio/webm' });
        if (blob.size > MAX_VOICE_BYTES) window.alert('This recording is over 20 MB. Please send a shorter recording.');
        else if (elapsed.current > 0 && blob.size > 0) onRecorded(blob, Math.min(elapsed.current, MAX_VOICE_SECONDS));
        cleanup();
      };
      rec.start();
      setActive(true);
      setSeconds(0);
      timer.current = setInterval(() => {
        elapsed.current += 1;
        setSeconds(elapsed.current);
        if (elapsed.current >= MAX_VOICE_SECONDS) stop();
      }, 1000);
    } catch (error) {
      window.alert(error?.name === 'NotAllowedError' ? 'Please allow microphone access to record.' : `Couldn’t start recording: ${error?.message || error}`);
      cleanup();
    }
  };

  if (active) return (
    <View style={styles.recBar}>
      <View style={styles.dot} />
      <Text style={styles.timer}>{fmtDuration(seconds)} / {fmtDuration(MAX_VOICE_SECONDS)}</Text>
      <Pressable onPress={stop} style={styles.stopBtn}>
        <Ionicons name="stop" size={16} color={colors.white} /><Text style={styles.stopText}>Stop &amp; send</Text>
      </Pressable>
    </View>
  );

  return (
    <Pressable onPress={start} disabled={busy} style={[styles.micBtn, busy && { opacity: 0.5 }]} accessibilityLabel={label}>
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
