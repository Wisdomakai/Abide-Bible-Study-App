import React, { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Lora_400Regular_Italic,
  Lora_500Medium,
  Lora_600SemiBold,
} from '@expo-google-fonts/lora';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

import { AppProvider, useApp } from './src/data/AppContext';
import { colors, fonts } from './src/theme';
import OnboardingScreen from './src/screens/OnboardingScreen';
import TodayScreen from './src/screens/TodayScreen';
import JournalScreen from './src/screens/JournalScreen';
import NoteEditorScreen from './src/screens/NoteEditorScreen';
import PrayerScreen from './src/screens/PrayerScreen';
import GroupScreen from './src/screens/GroupScreen';
import BibleScreen from './src/screens/BibleScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import JoinGroupScreen from './src/screens/JoinGroupScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import LaunchScreen from './src/screens/LaunchScreen';
import { registerPushToken } from './src/data/notifications';
import { touchPresence } from './src/data/api';

SplashScreen.preventAutoHideAsync();

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const navigationRef = createNavigationContainerRef();

const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.bg, card: colors.bg, primary: colors.primary, text: colors.text, border: colors.border },
};

const TAB_ICONS = {
  Today: ['sunny', 'sunny-outline'],
  Bible: ['book', 'book-outline'],
  Journal: ['create', 'create-outline'],
  Prayer: ['heart', 'heart-outline'],
  Group: ['people', 'people-outline'],
};

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.faint,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 86,
          paddingTop: 8,
          paddingBottom: 28,
        },
        tabBarLabelStyle: { fontFamily: fonts.bodyMedium, fontSize: 11, marginTop: 2 },
        tabBarIcon: ({ focused, color }) => {
          const [on, off] = TAB_ICONS[route.name];
          return <Ionicons name={focused ? on : off} size={23} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Today" component={TodayScreen} />
      <Tab.Screen name="Bible" component={BibleScreen} />
      <Tab.Screen name="Journal" component={JournalScreen} />
      <Tab.Screen name="Prayer" component={PrayerScreen} />
      <Tab.Screen name="Group" component={GroupScreen} />
    </Tab.Navigator>
  );
}

function Root() {
  const { ready, profile, notificationAlert, dismissNotificationAlert } = useApp();
  const [launching, setLaunching] = React.useState(true);

  React.useEffect(() => {
    const t = setTimeout(() => setLaunching(false), 2000);
    return () => clearTimeout(t);
  }, []);

  React.useEffect(() => {
    if (profile?.name) { registerPushToken(); touchPresence(); }
  }, [profile?.name]);

  // Branded launch screen on every cold start (and until data is loaded).
  if (launching || !ready) return <LaunchScreen />;
  if (!profile?.name) return <OnboardingScreen />;

  return (
    <View style={styles.appWrap}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerShadowVisible: false,
          headerTintColor: colors.primary,
          headerTitleStyle: { fontFamily: fonts.bodySemi, color: colors.text },
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
        <Stack.Screen name="NoteEditor" component={NoteEditorScreen} options={{ title: 'Note', headerBackTitleVisible: false }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings', headerBackTitleVisible: false }} />
        <Stack.Screen name="JoinGroup" component={JoinGroupScreen} options={{ title: 'Group', headerBackTitleVisible: false }} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications', headerBackTitleVisible: false }} />
      </Stack.Navigator>
      {Platform.OS === 'web' && notificationAlert ? (
        <Pressable
          onPress={() => {
            dismissNotificationAlert();
            if (navigationRef.isReady()) navigationRef.navigate('Notifications');
          }}
          style={({ pressed }) => [styles.webAlert, pressed && { opacity: 0.9 }]}
        >
          <Ionicons name="notifications" size={18} color={colors.white} />
          <View style={{ flex: 1 }}>
            <Text style={styles.webAlertTitle}>New post in {notificationAlert.group}</Text>
            <Text style={styles.webAlertText} numberOfLines={1}>{notificationAlert.author}: {notificationAlert.text || 'Voice message'}</Text>
          </View>
          <Pressable
            onPress={(e) => { e.stopPropagation?.(); dismissNotificationAlert(); }}
            hitSlop={8}
            accessibilityLabel="Dismiss notification"
          >
            <Ionicons name="close" size={18} color={colors.white} />
          </Pressable>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Lora_400Regular_Italic,
    Lora_500Medium,
    Lora_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const onReady = useCallback(async () => {
    if (fontsLoaded) await SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <AppProvider>
        <NavigationContainer ref={navigationRef} theme={navTheme} onReady={onReady}>
          <StatusBar style="dark" />
          <Root />
        </NavigationContainer>
      </AppProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  appWrap: { flex: 1 },
  webAlert: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 18,
    zIndex: 1000,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.primary,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  webAlertTitle: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.white },
  webAlertText: { fontFamily: fonts.body, fontSize: 12, color: 'rgba(255,255,255,0.82)', marginTop: 1 },
});
