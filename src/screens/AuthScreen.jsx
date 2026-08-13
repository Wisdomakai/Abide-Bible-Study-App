import React, { useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/ui';
import { useApp } from '../data/AppContext';
import { colors, fonts, spacing } from '../theme';

export default function AuthScreen() {
  const { signInWithGoogle, authUser } = useApp();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const submit = async () => {
    setBusy(true); setMessage('');
    try { await signInWithGoogle(); }
    catch (error) { setMessage(error?.message || 'Couldn’t continue with Google.'); }
    finally { setBusy(false); }
  };
  return (
    <SafeAreaView style={styles.safe}><View style={styles.content}>
      <Image source={{ uri: '/icon-192.png' }} style={styles.logo} accessibilityLabel="Ardent logo" />
      <Text style={styles.brand}>Ardent</Text>
      <Text style={styles.title}>{authUser?.is_anonymous ? 'Secure your existing journal' : 'Your journal, on every device'}</Text>
      <Text style={styles.copy}>Continue with Google to keep your reflections, notes, prayers, and groups securely synced across devices.</Text>
      <Button title={busy ? 'Opening Google…' : 'Continue with Google'} icon="enter-outline" disabled={busy} onPress={submit} />
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View></SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg }, content: { flex: 1, justifyContent: 'center', width: '100%', maxWidth: 520, alignSelf: 'center', padding: spacing.xl },
  logo: { width: 76, height: 76, borderRadius: 24, marginBottom: spacing.lg },
  brand: { fontFamily: fonts.serifBold, fontSize: 38, color: colors.text }, title: { fontFamily: fonts.serifBold, fontSize: 22, color: colors.text, marginTop: spacing.xl },
  copy: { fontFamily: fonts.body, fontSize: 15, lineHeight: 23, color: colors.muted, marginVertical: spacing.lg },
  message: { marginTop: spacing.lg, fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.primary },
});
