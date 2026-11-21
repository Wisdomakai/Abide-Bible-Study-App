import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Card, SectionTitle, Button } from './ui';
import { useApp } from '../data/AppContext';
import { colors, fonts, spacing, field } from '../theme';

const MIN_PASSWORD = 8;
const emailOk = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

// Guests (anonymous accounts) save their account here: attach an email, confirm
// it, then set a password. The user ID never changes, so nothing is lost.
// Renders nothing for accounts that are already saved.
export default function AccountCard({ navigation }) {
  const { authUser, saveAccountEmail, setAccountPassword, refreshAuthUser } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [changingEmail, setChangingEmail] = useState(false);

  const isGuest = !!authUser?.is_anonymous;
  const pendingEmail = isGuest ? authUser?.new_email : null;
  const needsPassword = !isGuest
    && authUser?.identities?.some((identity) => identity.provider === 'email')
    && !authUser?.user_metadata?.has_password;

  // Confirmation usually happens in the mail app or browser; check again
  // whenever Settings comes back into view.
  useEffect(() => {
    if (!pendingEmail) return undefined;
    return navigation.addListener('focus', () => { refreshAuthUser().catch(() => {}); });
  }, [navigation, pendingEmail, refreshAuthUser]);

  const run = async (task) => {
    setBusy(true); setMessage(''); setError('');
    try { await task(); } catch (e) { setError(e?.message || 'Something went wrong. Please try again.'); } finally { setBusy(false); }
  };

  const sendEmail = () => run(async () => {
    if (!emailOk(email)) { setError('Enter a valid email address.'); return; }
    await saveAccountEmail(email.trim());
    setChangingEmail(false);
    await refreshAuthUser().catch(() => {});
    setMessage(`We sent a confirmation link to ${email.trim()}. Open it, then come back here to set your password.`);
  });

  const checkConfirmed = () => run(async () => {
    await refreshAuthUser();
    setMessage('Not confirmed yet. Open the link in the email we sent, then try again.');
  });

  const savePassword = () => run(async () => {
    if (password.length < MIN_PASSWORD) { setError(`Use at least ${MIN_PASSWORD} characters.`); return; }
    await setAccountPassword(password);
    setPassword('');
  });

  if (!isGuest && !needsPassword) return null;

  return (
    <>
      <SectionTitle style={{ marginTop: spacing.xl }}>{isGuest ? 'Save your account' : 'Finish saving your account'}</SectionTitle>
      <Card>
        {needsPassword ? (
          <>
            <Text style={styles.copy}>Your email is confirmed. Choose a password so you can sign in on another device or after reinstalling.</Text>
            <TextInput value={password} onChangeText={setPassword} placeholder="New password" placeholderTextColor={colors.faint} secureTextEntry autoComplete="new-password" style={styles.input} accessibilityLabel="New password" onSubmitEditing={savePassword} />
            <Text style={styles.hint}>At least {MIN_PASSWORD} characters.</Text>
            <Button title={busy ? 'Saving…' : 'Save password'} disabled={busy} onPress={savePassword} style={styles.btn} />
          </>
        ) : pendingEmail && !changingEmail ? (
          <>
            <Text style={styles.copy}>Waiting for you to confirm <Text style={styles.strong}>{pendingEmail}</Text>. Open the link in that email, then tap below.</Text>
            <Button title={busy ? 'Checking…' : 'I’ve confirmed my email'} disabled={busy} onPress={checkConfirmed} style={styles.btn} />
            <Pressable onPress={() => { setChangingEmail(true); setMessage(''); setError(''); }} hitSlop={8} style={styles.linkWrap}><Text style={styles.link}>Use a different email</Text></Pressable>
          </>
        ) : (
          <>
            <Text style={styles.copy}>You’re using Ardent as a guest. If you lose this phone, clear the browser, or reinstall, your journal can’t be recovered. Add an email to keep it safe and sign in on other devices.</Text>
            <TextInput value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor={colors.faint} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" style={styles.input} accessibilityLabel="Email" onSubmitEditing={sendEmail} />
            <Button title={busy ? 'Sending…' : 'Save my account'} disabled={busy} onPress={sendEmail} style={styles.btn} />
          </>
        )}
        {error ? <Text style={[styles.feedback, { color: colors.danger }]}>{error}</Text> : null}
        {message ? <Text style={styles.feedback}>{message}</Text> : null}
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  copy: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.text, marginBottom: spacing.md },
  strong: { fontFamily: fonts.bodySemi },
  input: { ...field.base, height: 50, fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.text },
  hint: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 6 },
  btn: { marginTop: spacing.md },
  linkWrap: { alignSelf: 'center', marginTop: spacing.md },
  link: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.primary },
  feedback: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.primary, marginTop: spacing.md },
});
