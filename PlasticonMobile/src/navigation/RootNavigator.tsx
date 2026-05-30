import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthContext';
import { AuthStackParamList } from './types';

import { LoginScreen }          from '../screens/auth/LoginScreen';
import { RegisterScreen }       from '../screens/auth/RegisterScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { ResetPasswordScreen }  from '../screens/auth/ResetPasswordScreen';
import { VerifyEmailScreen }    from '../screens/auth/VerifyEmailScreen';
import { RequestAccessScreen }  from '../screens/auth/RequestAccessScreen';

import { WorkerTabs }     from './WorkerTabs';
import { EngineerTabs }   from './EngineerTabs';
import { AccountantTabs } from './AccountantTabs';
import { AdminTabs }      from './AdminTabs';
import { AppTopBar }      from '../components/AppTopBar';
import { colors }         from '../theme';
import { useAppTheme }    from '../context/ThemeContext';

const Stack = createNativeStackNavigator<AuthStackParamList>();

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="Login"          component={LoginScreen} />
      <Stack.Screen name="Register"       component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetPassword"  component={ResetPasswordScreen} />
      <Stack.Screen name="VerifyEmail"    component={VerifyEmailScreen} />
      <Stack.Screen name="RequestAccess"  component={RequestAccessScreen} />
    </Stack.Navigator>
  );
}

function AppTabs({ role }: { role: string }) {
  switch (role) {
    case 'WORKER':     return <WorkerTabs />;
    case 'ENGINEER':   return <EngineerTabs />;
    case 'ACCOUNTANT': return <AccountantTabs />;
    case 'ADMIN':      return <AdminTabs />;
    default:           return <WorkerTabs />;
  }
}

function AuthenticatedLayout({ role, user }: { role: string; user: any }) {
  const insets        = useSafeAreaInsets();
  const { colors: c } = useAppTheme();

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <AppTopBar user={user} />
      {/*
        Override the top safe-area inset to 0 for all tab content.
        AppTopBar already consumed the top inset (status bar padding),
        so individual screens should not add it again.
      */}
      <SafeAreaInsetsContext.Provider
        value={{ top: 0, bottom: insets.bottom, left: insets.left, right: insets.right }}
      >
        <AppTabs role={role} />
      </SafeAreaInsetsContext.Provider>
    </View>
  );
}

export function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!user) {
    return <AuthStack />;
  }

  return <AuthenticatedLayout role={user.role} user={user} />;
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: colors.tabBar },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.tabBar },
});
