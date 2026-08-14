import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { NavigationContainer, DefaultTheme, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from './src/components/Icon';

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
import AuthScreen from './src/screens/AuthScreen';

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
  // Installed on iOS the app draws under the home indicator, so the bar has to
  // grow by the real inset rather than a fixed guess.
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 12);
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.faint,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 58 + bottomInset,
          paddingTop: 8,
          paddingBottom: bottomInset,
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
  const { ready, authReady, authUser, profile, groups, selectGroup, notificationAlert, dismissNotificationAlert } = useApp();
  const [launching, setLaunching] = React.useState(true);
  const insets = useSafeAreaInsets();

  React.useEffect(() => {
    const t = setTimeout(() => setLaunching(false), 2000);
    return () => clearTimeout(t);
  }, []);

  React.useEffect(() => {
    if (!ready || !groups.length) return;
    const url = new URL(window.location.href);
    const groupId = url.searchParams.get('group');
    if (!groupId || !groups.some((group) => group.id === groupId)) return;
    selectGroup(groupId);
    if (navigationRef.isReady()) navigationRef.navigate('Tabs', { screen: 'Group' });
    url.searchParams.delete('group');
    window.history.replaceState({}, '', url);
  }, [ready, groups, selectGroup]);

  // Branded launch screen on every cold start (and until data is loaded).
  if (launching || !ready || !authReady) return <LaunchScreen />;
  if (!authUser || authUser.is_anonymous) return <AuthScreen />;
  if (!profile?.name) return <OnboardingScreen />;

  return (
    <View style={styles.appWrap}>
      <Stack.Navigator
        screenOptions={({ navigation }) => ({
          headerStyle: { backgroundColor: colors.bg },
          headerShadowVisible: false,
          headerTintColor: colors.primary,
          headerTitleStyle: { fontFamily: fonts.bodySemi, color: colors.text },
          contentStyle: { backgroundColor: colors.bg },
          // The library's own back arrow is a bundled PNG loaded via require(),
          // which the production build cannot resolve — it renders an invisible
          // but tappable button. Drawing it from our icon set keeps it visible
          // and matches the rest of the app.
          headerLeft: navigation.canGoBack()
            ? () => (
                <Pressable
                  onPress={() => navigation.goBack()}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel="Go back"
                  style={({ pressed }) => [styles.headerBack, pressed && { opacity: 0.6 }]}
                >
                  <Ionicons name="chevron-back" size={24} color={colors.primary} />
                </Pressable>
              )
            : undefined,
        })}
      >
        <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
        <Stack.Screen name="NoteEditor" component={NoteEditorScreen} options={{ title: 'Note', headerBackTitleVisible: false }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings', headerBackTitleVisible: false }} />
        <Stack.Screen name="JoinGroup" component={JoinGroupScreen} options={{ title: 'Group', headerBackTitleVisible: false }} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications', headerBackTitleVisible: false }} />
      </Stack.Navigator>
      {notificationAlert ? (
        <Pressable
          onPress={() => {
            dismissNotificationAlert();
            if (navigationRef.isReady()) navigationRef.navigate('Notifications');
          }}
          style={({ pressed }) => [styles.webAlert, { top: insets.top + 14 }, pressed && { opacity: 0.9 }]}
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
  return (
    <SafeAreaProvider>
      <AppProvider>
        <NavigationContainer ref={navigationRef} theme={navTheme}>
          <Root />
        </NavigationContainer>
      </AppProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  appWrap: { flex: 1 },
  headerBack: { paddingRight: 6, justifyContent: 'center' },
  webAlert: {
    position: 'absolute',
    left: 16,
    right: 16,
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
