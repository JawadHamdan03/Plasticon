import 'react-native-url-polyfill/auto';
import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/auth/AuthContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { LocaleProvider } from './src/context/LocaleContext';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LocaleProvider>
          <NavigationContainer>
            <AuthProvider>
              <StatusBar style="light" backgroundColor="#0D1321" />
              <RootNavigator />
            </AuthProvider>
          </NavigationContainer>
        </LocaleProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
