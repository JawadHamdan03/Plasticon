import 'react-native-url-polyfill/auto';
import 'react-native-gesture-handler';
import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { AuthProvider } from './src/auth/AuthContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { LocaleProvider } from './src/context/LocaleContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import {
  requestNotificationPermission,
  startNotificationPolling,
  stopNotificationPolling,
} from './src/notifications/notificationService';

function AppContent() {
  const navigationRef = useRef<NavigationContainerRef<any>>(null);

  useEffect(() => {
    // Request permission then start polling regardless — polling tracks
    // unread IDs even without permission; it just skips showing banners.
    requestNotificationPermission().then((granted) => {
      startNotificationPolling(granted);
    });

    return () => stopNotificationPolling();
  }, []);

  // Navigate to Notifications screen when user taps a notification banner
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      // Navigate to the shared Notifications screen — works for all roles
      // since every tab stack has a Notifications route
      try {
        navigationRef.current?.navigate('Notifications' as never);
      } catch {
        // navigation not ready or route not found — ignore
      }
    });
    return () => sub.remove();
  }, []);

  return (
    <NavigationContainer ref={navigationRef}>
      <AuthProvider>
        <StatusBar style="light" backgroundColor="#0D1321" />
        <RootNavigator />
      </AuthProvider>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LocaleProvider>
          <AppContent />
        </LocaleProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
