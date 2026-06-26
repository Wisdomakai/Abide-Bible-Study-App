import React, { useCallback } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
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
import SettingsScreen from './src/screens/SettingsScreen';
import JoinGroupScreen from './src/screens/JoinGroupScreen';
import LaunchScreen from './src/screens/LaunchScreen';
import { registerPushToken } from './src/data/notifications';
import { touchPresence } from './src/data/api';

SplashScreen.preventAutoHideAsync();

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.bg, card: colors.bg, primary: colors.primary, text: colors.text, border: colors.border },
};

const TAB_ICONS = {
  Today: ['sunny', 'sunny-outline'],
  Journal: ['book', 'book-outline'],
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
      <Tab.Screen name="Journal" component={JournalScreen} />
      <Tab.Screen name="Prayer" component={PrayerScreen} />
      <Tab.Screen name="Group" component={GroupScreen} />
    </Tab.Navigator>
  );
}

function Root() {
  const { ready, profile } = useApp();
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
    </Stack.Navigator>
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
        <NavigationContainer theme={navTheme} onReady={onReady}>
          <StatusBar style="dark" />
          <Root />
        </NavigationContainer>
      </AppProvider>
    </SafeAreaProvider>
  );
}
