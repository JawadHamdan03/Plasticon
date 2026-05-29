import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
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
import { colors }         from '../theme';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.tabBar }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!user) {
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

  switch (user.role) {
    case 'WORKER':     return <WorkerTabs />;
    case 'ENGINEER':   return <EngineerTabs />;
    case 'ACCOUNTANT': return <AccountantTabs />;
    case 'ADMIN':      return <AdminTabs />;
    default:           return <WorkerTabs />;
  }
}
