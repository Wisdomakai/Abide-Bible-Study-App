import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Image, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/ui';
import { useApp } from '../data/AppContext';
import { colors, fonts, spacing, field } from '../theme';

const MIN_PASSWORD = 8;
const emailOk = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

// Supabase's messages are written for developers; translate the common ones.
function friendly(error, fallback) {
  const text = String(error?.message || '');
  if (/invalid login credentials/i.test(text)) return 'That email and password don’t match. Check them, or reset your password.';
  if (/email not confirmed/i.test(text)) return 'Confirm your email first — open the link we sent you, then sign in.';
  if (/rate limit|too many/i.test(text)) return 'Too many attempts. Wait a few minutes and try again.';
  if (/password should be|weak password/i.test(text)) return `Choose a stronger password — at least ${MIN_PASSWORD} characters, mixing letters and numbers.`;
  return text || fallback;
}

export default function AuthScreen() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, sendPasswordReset, updatePassword, passwordRecovery, startAsGuest } = useApp();
  // start | signin | signup | reset; password recovery overrides them all.
  const [mode, setMode] = useState('start');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const switchMode = (next) => { setMode(next); setMessage(''); setError(''); setPassword(''); };
  const run = async (task) => {
    setBusy(true); setMessage(''); setError('');
    try { await task(); } finally { setBusy(false); }
  };

  const guest = () => run(async () => {
    try { await startAsGuest(); } catch (e) { setError(friendly(e, 'Couldn’t start. Check your connection and try again.')); }
  });

  const google = () => run(async () => {
    try { await signInWithGoogle(); } catch (e) { setError(friendly(e, 'Couldn’t continue with Google.')); }
  });

  const submit = () => run(async () => {
    if (!emailOk(email)) { setError('Enter a valid email address.'); return; }
    if (mode === 'reset') {
      try {
        await sendPasswordReset(email.trim());
        setMessage('If an account exists for that email, a reset link is on its way. Open it on this device.');
      } catch (e) { setError(friendly(e, 'Couldn’t send the reset email.')); }
      return;
    }
    if (mode === 'signup' && password.length < MIN_PASSWORD) { setError(`Use at least ${MIN_PASSWORD} characters for your password.`); return; }
    if (!password) { setError('Enter your password.'); return; }
    try {
      if (mode === 'signup') {
        const { needsConfirmation } = await signUpWithEmail(email.trim(), password);
        if (needsConfirmation) {
          setMode('signin'); setPassword('');
          setMessage(`Almost there — we sent a confirmation link to ${email.trim()}. Open it, then sign in here.`);
        }
      } else {
        await signInWithEmail(email.trim(), password);
      }
    } catch (e) { setError(friendly(e, mode === 'signup' ? 'Couldn’t create your account.' : 'Couldn’t sign in.')); }
  });

  const savePassword = () => run(async () => {
    if (password.length < MIN_PASSWORD) { setError(`Use at least ${MIN_PASSWORD} characters for your password.`); return; }
    try { await updatePassword(password); } catch (e) { setError(friendly(e, 'Couldn’t save your new password.')); }
  });

  if (passwordRecovery) {
    return (
      <Shell title="Choose a new password" copy="Enter a new password for your Ardent account.">
        <Field label="New password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" onSubmitEditing={savePassword} autoFocus />
        <Button title={busy ? 'Saving…' : 'Save password'} disabled={busy} onPress={savePassword} style={styles.primary} />
        <Feedback message={message} error={error} />
      </Shell>
    );
  }

  if (mode === 'start') {
    return (
      <Shell title="Study, reflect, and pray together" copy="Start right away — just choose the name your group will see. No email or password needed.">
        <Button title={busy ? 'Starting…' : 'Get started'} icon="enter-outline" disabled={busy} onPress={guest} />
        <Text style={styles.note}>Your journal is saved to this device’s account. Add an email in Settings any time to keep it safe and use it on other devices.</Text>
        <Feedback message={message} error={error} />
        <View style={styles.switchRow}>
          <Text style={styles.switchText}>Already have an account? </Text>
          <Pressable onPress={() => switchMode('signin')} hitSlop={8}><Text style={styles.link}>Sign in</Text></Pressable>
        </View>
      </Shell>
    );
  }

  const titles = {
    signin: 'Welcome back',
    signup: 'Create your account',
    reset: 'Reset your password',
  };
  const copy = {
    signin: 'Sign in to pick up your reflections, notes, prayers, and groups.',
    signup: 'Use your email and a password. Your journal stays private and syncs across your devices.',
    reset: 'Enter your account email and we’ll send you a link to choose a new password.',
  };
  const action = { signin: 'Sign in', signup: 'Create account', reset: 'Send reset link' };

  return (
    <Shell title={titles[mode]} copy={copy[mode]}>
      <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" autoCapitalize="none" onSubmitEditing={mode === 'reset' ? submit : undefined} />
      {mode !== 'reset' ? (
        <Field
          label="Password" value={password} onChangeText={setPassword} secureTextEntry
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          hint={mode === 'signup' ? `At least ${MIN_PASSWORD} characters.` : null}
          onSubmitEditing={submit}
        />
      ) : null}
      {mode === 'signin' ? (
        <Pressable onPress={() => switchMode('reset')} hitSlop={8} style={styles.forgot}><Text style={styles.link}>Forgot password?</Text></Pressable>
      ) : null}

      <Button title={busy ? 'Please wait…' : action[mode]} disabled={busy} onPress={submit} style={styles.primary} />
      <Feedback message={message} error={error} />

      {mode !== 'reset' ? (
        <>
          <View style={styles.divider}><View style={styles.rule} /><Text style={styles.or}>or</Text><View style={styles.rule} /></View>
          <Button title="Continue with Google" variant="outline" icon="enter-outline" disabled={busy} onPress={google} />
        </>
      ) : null}

      <View style={styles.switchRow}>
        {mode === 'signin' ? (
          <><Text style={styles.switchText}>New to Ardent? </Text><Pressable onPress={() => switchMode('start')} hitSlop={8}><Text style={styles.link}>Get started</Text></Pressable><Text style={styles.switchText}> or </Text><Pressable onPress={() => switchMode('signup')} hitSlop={8}><Text style={styles.link}>create an account</Text></Pressable></>
        ) : (
          <><Text style={styles.switchText}>{mode === 'signup' ? 'Already have an account? ' : 'Remembered it? '}</Text><Pressable onPress={() => switchMode('signin')} hitSlop={8}><Text style={styles.link}>Sign in</Text></Pressable></>
        )}
      </View>
    </Shell>
  );
}

function Shell({ title, copy, children }) {
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Image source={{ uri: '/icon-192.png' }} style={styles.logo} accessibilityLabel="Ardent logo" />
          <Text style={styles.brand}>Ardent</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.copy}>{copy}</Text>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, hint, ...props }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor={colors.faint} autoCorrect={false} style={styles.input} accessibilityLabel={label} {...props} />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

function Feedback({ message, error }) {
  if (error) return <Text style={[styles.feedback, { color: colors.danger }]} accessibilityLiveRegion="polite">{error}</Text>;
  if (message) return <Text style={styles.feedback} accessibilityLiveRegion="polite">{message}</Text>;
  return null;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { flexGrow: 1, justifyContent: 'center', width: '100%', maxWidth: 520, alignSelf: 'center', padding: spacing.xl },
  logo: { width: 76, height: 76, borderRadius: 24, marginBottom: spacing.lg },
  brand: { fontFamily: fonts.serifBold, fontSize: 38, color: colors.text },
  title: { fontFamily: fonts.serifBold, fontSize: 22, color: colors.text, marginTop: spacing.xl },
  copy: { fontFamily: fonts.body, fontSize: 15, lineHeight: 23, color: colors.muted, marginTop: spacing.sm, marginBottom: spacing.lg },
  field: { marginBottom: spacing.md },
  label: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text, marginBottom: spacing.sm },
  input: { ...field.base, height: 52, fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.text },
  hint: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 6 },
  note: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.muted, marginTop: spacing.md },
  forgot: { alignSelf: 'flex-end', marginBottom: spacing.md },
  primary: { marginTop: spacing.sm },
  feedback: { marginTop: spacing.lg, fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.primary },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginVertical: spacing.lg },
  rule: { flex: 1, height: 1, backgroundColor: colors.border },
  or: { fontFamily: fonts.body, fontSize: 13, color: colors.faint },
  switchRow: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', marginTop: spacing.xl },
  switchText: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
  link: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.primary },
});
