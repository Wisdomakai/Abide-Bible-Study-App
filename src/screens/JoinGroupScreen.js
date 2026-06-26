import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useApp } from '../data/AppContext';
import { resetGroup } from '../data/api';
import GroupPicker from '../components/GroupPicker';
import { Button } from '../components/ui';
import { colors, fonts, spacing } from '../theme';

export default function JoinGroupScreen({ navigation }) {
  const { saveProfile } = useApp();
  const [code, setCode] = useState('');

  const apply = () => {
    if (!code) return;
    saveProfile({ groupCode: code, groupName: 'Our Bible Study' });
    resetGroup(); // rebind the feed to the new group on next load
    navigation.goBack();
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.intro}>Create a new group or join one with a code your mates shared. Your journal and prayers stay with you — only the shared feed changes.</Text>
      <GroupPicker onChange={setCode} />
      <Button title="Save group" icon="checkmark" disabled={!code} onPress={apply} style={{ marginTop: spacing.xl }} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: spacing.xl },
  intro: { fontFamily: fonts.body, fontSize: 15, color: colors.muted, lineHeight: 23, marginBottom: spacing.xl },
});
