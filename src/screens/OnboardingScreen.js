import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../data/AppContext';
import { Button } from '../components/ui';
import GroupPicker from '../components/GroupPicker';
import { colors, fonts, spacing, radius } from '../theme';

export default function OnboardingScreen() {
  const { saveProfile } = useApp();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  const finish = () => {
    if (!name.trim() || !code) return;
    saveProfile({ name: name.trim(), groupCode: code, groupName: 'Our Bible Study' });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.mark}>
            <Ionicons name="book" size={32} color={colors.white} />
          </View>
          <Text style={styles.brand}>Ardent</Text>

          {step === 1 ? (
            <>
              <Text style={styles.tagline}>A quiet place to study, reflect, and pray with your group.</Text>
              <View style={styles.field}>
                <Text style={styles.label}>What should we call you?</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Your first name"
                  placeholderTextColor={colors.faint}
                  style={styles.input}
                  autoFocus
                  returnKeyType="next"
                  onSubmitEditing={() => name.trim() && setStep(2)}
                  maxLength={24}
                />
              </View>
            </>
          ) : (
            <>
              <Text style={styles.tagline}>Hi {name.trim()}. Start a new study group, or join one your mates already created.</Text>
              <GroupPicker onChange={setCode} />
            </>
          )}
        </ScrollView>

        <View style={styles.footer}>
          {step === 1 ? (
            <Button title="Continue" icon="arrow-forward" disabled={!name.trim()} onPress={() => setStep(2)} />
          ) : (
            <>
              <Button title="Begin" icon="checkmark" disabled={!code} onPress={finish} />
              <Button title="Back" variant="ghost" onPress={() => setStep(1)} style={{ marginTop: spacing.sm }} />
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.xxl },
  mark: { width: 72, height: 72, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  brand: { fontFamily: fonts.serifBold, fontSize: 38, color: colors.text, marginBottom: spacing.md },
  tagline: { fontFamily: fonts.body, fontSize: 16, color: colors.muted, lineHeight: 24, marginBottom: spacing.xl },
  field: { marginTop: spacing.sm },
  label: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text, marginBottom: spacing.sm },
  input: {
    backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: spacing.lg, height: 54, fontFamily: fonts.bodyMedium, fontSize: 17, color: colors.text,
  },
  footer: { padding: spacing.xl },
});
