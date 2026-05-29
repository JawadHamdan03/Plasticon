import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../auth/AuthContext';
import { AuthStackParamList } from './types';
import { LoginScreen }    from '../screens/auth/LoginScreen';
import { WorkerTabs }     from './WorkerTabs';
import { EngineerTabs }   from './EngineerTabs';
import { AccountantTabs } from './AccountantTabs';
import { AdminTabs }      from './AdminTabs';
import { colors } from '../theme';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function RootNavigator() {
  const { user, loading } = useAuth();

  // Restore session on app launch
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.tabBar }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!user) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
      </Stack.Navigator>
    );
  }

  // Route to correct tab set based on role
  switch (user.role) {
    case 'WORKER':     return <WorkerTabs />;
    case 'ENGINEER':   return <EngineerTabs />;
    case 'ACCOUNTANT': return <AccountantTabs />;
    case 'ADMIN':      return <AdminTabs />;
    default:           return <WorkerTabs />;
  }
}
