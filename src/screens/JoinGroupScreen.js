import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useApp } from '../data/AppContext';
import { joinGroupByCode } from '../data/api';
import GroupPicker from '../components/GroupPicker';
import { Button } from '../components/ui';
import { colors, fonts, spacing } from '../theme';

export default function JoinGroupScreen({ navigation }) {
  const { profile, refreshGroups, selectGroup } = useApp();
  const [picker, setPicker] = useState({ code: '', groupName: '' });
  const [busy, setBusy] = useState(false);

  const apply = async () => {
    if (!picker.code) return;
    setBusy(true);
    try {
      const id = await joinGroupByCode(picker.code, profile.name, picker.groupName || 'Bible Study', profile.name);
      await refreshGroups();
      if (id) selectGroup(id);
      navigation.goBack();
    } catch (e) {
      Alert.alert('Couldn’t join', 'Please check the code and your connection, then try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.intro}>Start a new group or join one with a code your mates shared. You can belong to several groups and switch between them.</Text>
      <GroupPicker onChange={setPicker} />
      <Button title={busy ? 'Saving…' : 'Save group'} icon="checkmark" disabled={!picker.code || busy} onPress={apply} style={{ marginTop: spacing.xl }} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: spacing.xl },
  intro: { fontFamily: fonts.body, fontSize: 15, color: colors.muted, lineHeight: 23, marginBottom: spacing.xl },
});
