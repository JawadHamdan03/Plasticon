import React from 'react';
import { createBottomTabNavigator }   from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons }                   from '@expo/vector-icons';
import { useAppTheme }                from '../context/ThemeContext';
import { useUnreadCount }             from '../hooks/useUnreadCount';

import {
  SalesRepTabParamList,
  SalesRepOverviewStackParamList,
  SalesRepSalesStackParamList,
  SalesRepPersonalStackParamList,
} from './types';

// ─── Overview tab ─────────────────────────────────────────────────────────────
import { SalesRepHomeScreen } from '../screens/sales-rep/SalesRepHomeScreen';

// ─── Sales tab ────────────────────────────────────────────────────────────────
import { SalesMenuScreen }   from '../screens/sales-rep/SalesMenuScreen';
import { CustomersScreen }   from '../screens/sales-rep/CustomersScreen';
import { QuotationsScreen }  from '../screens/sales-rep/QuotationsScreen';
import { VisitsScreen }      from '../screens/sales-rep/VisitsScreen';
import { TargetsScreen }     from '../screens/sales-rep/TargetsScreen';

// ─── Personal tab ─────────────────────────────────────────────────────────────
import { PersonalMenuScreen }  from '../screens/worker/PersonalMenuScreen';
import { AttendanceScreen }    from '../screens/shared/AttendanceScreen';
import { PayrollScreen }       from '../screens/worker/PayrollScreen';
import { NotificationsScreen } from '../screens/shared/NotificationsScreen';
import { ChatScreen }          from '../screens/shared/ChatScreen';
import { ProfileScreen }       from '../screens/shared/ProfileScreen';

// ─── Stacks ──────────────────────────────────────────────────────────────────
const OverviewStack = createNativeStackNavigator<SalesRepOverviewStackParamList>();
function OverviewNavigator() {
  return (
    <OverviewStack.Navigator screenOptions={{ headerShown: false }}>
      <OverviewStack.Screen name="SalesRepHome" component={SalesRepHomeScreen} />
    </OverviewStack.Navigator>
  );
}

const SalesStack = createNativeStackNavigator<SalesRepSalesStackParamList>();
function SalesNavigator() {
  return (
    <SalesStack.Navigator screenOptions={{ headerShown: false }}>
      <SalesStack.Screen name="SalesMenu"   component={SalesMenuScreen} />
      <SalesStack.Screen name="Customers"   component={CustomersScreen} />
      <SalesStack.Screen name="Quotations"  component={QuotationsScreen} />
      <SalesStack.Screen name="Visits"      component={VisitsScreen} />
      <SalesStack.Screen name="Targets"     component={TargetsScreen} />
    </SalesStack.Navigator>
  );
}

const PersonalStack = createNativeStackNavigator<SalesRepPersonalStackParamList>();
function PersonalNavigator() {
  return (
    <PersonalStack.Navigator screenOptions={{ headerShown: false }}>
      <PersonalStack.Screen name="PersonalMenu"  component={PersonalMenuScreen} />
      <PersonalStack.Screen name="Attendance"    component={AttendanceScreen} />
      <PersonalStack.Screen name="Payroll"       component={PayrollScreen} />
      <PersonalStack.Screen name="Notifications" component={NotificationsScreen} />
      <PersonalStack.Screen name="Chat"          component={ChatScreen} />
      <PersonalStack.Screen name="Profile"       component={ProfileScreen} />
    </PersonalStack.Navigator>
  );
}

// ─── Bottom Tabs ──────────────────────────────────────────────────────────────
const Tab = createBottomTabNavigator<SalesRepTabParamList>();

export function SalesRepTabs() {
  const { colors }    = useAppTheme();
  const unreadCount   = useUnreadCount();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopWidth: 0,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor:   colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        tabBarIcon: ({ focused, color }) => {
          const icons: Record<string, [string, string]> = {
            Overview: ['grid',         'grid-outline'],
            Sales:    ['briefcase',    'briefcase-outline'],
            Personal: ['person',       'person-outline'],
          };
          const [active, inactive] = icons[route.name] ?? ['ellipse', 'ellipse-outline'];
          return <Ionicons name={(focused ? active : inactive) as any} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Overview" component={OverviewNavigator} options={{ tabBarLabel: 'نظرة عامة' }} />
      <Tab.Screen name="Sales"    component={SalesNavigator}    options={{ tabBarLabel: isAr ? 'مبيعاتي'   : 'My Sales' }} />
      <Tab.Screen name="Personal" component={PersonalNavigator} options={{ tabBarLabel: 'شخصي', tabBarBadge: unreadCount > 0 ? unreadCount : undefined }} />
    </Tab.Navigator>
  );
}
