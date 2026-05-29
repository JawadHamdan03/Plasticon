import React from 'react';
import { createBottomTabNavigator }   from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons }                   from '@expo/vector-icons';
import { colors }                     from '../theme';

import {
  AdminTabParamList,
  AdminDashStackParamList,
  AdminPeopleStackParamList,
  AdminOpsStackParamList,
  AdminAuditStackParamList,
} from './types';

// ─── Dashboard screens ────────────────────────────────────────────────────────
import { AdminDashScreen }      from '../screens/admin/AdminDashScreen';
import { AdminAnalyticsScreen } from '../screens/admin/AdminAnalyticsScreen';

// ─── People screens ───────────────────────────────────────────────────────────
import { PeopleMenuScreen }        from '../screens/admin/PeopleMenuScreen';
import { UsersAdminScreen }        from '../screens/admin/UsersAdminScreen';
import { AttendanceAdminScreen }   from '../screens/admin/AttendanceAdminScreen';
import { PayrollAdminScreen }      from '../screens/admin/PayrollAdminScreen';
import { WorkerRecordsScreen }     from '../screens/admin/WorkerRecordsScreen';
import { EngineerOverviewScreen }  from '../screens/admin/EngineerOverviewScreen';
import { RegistrationsScreen }     from '../screens/admin/RegistrationsScreen';

// ─── Operations screens ───────────────────────────────────────────────────────
import { OpsMenuScreen }       from '../screens/admin/OpsMenuScreen';
import { MachinesAdminScreen } from '../screens/admin/MachinesAdminScreen';
import { ShiftsAdminScreen }   from '../screens/admin/ShiftsAdminScreen';
import { ElectricityScreen }   from '../screens/admin/ElectricityScreen';
import { SettingsAdminScreen } from '../screens/admin/SettingsAdminScreen';

// ─── Audit screens ────────────────────────────────────────────────────────────
import { AuditMenuScreen }  from '../screens/admin/AuditMenuScreen';
import { AuditLogsScreen }  from '../screens/admin/AuditLogsScreen';
import { AdminSnapsScreen } from '../screens/admin/AdminSnapsScreen';
import { AIHubScreen }      from '../screens/shared/AIHubScreen';
import { AssistantScreen }  from '../screens/shared/AssistantScreen';
import { NotificationsScreen } from '../screens/shared/NotificationsScreen';

// ─── Profile ─────────────────────────────────────────────────────────────────
import { ProfileScreen } from '../screens/shared/ProfileScreen';

// ─── Stack: Dashboard tab ─────────────────────────────────────────────────────
const DashStack = createNativeStackNavigator<AdminDashStackParamList>();
function DashNavigator() {
  return (
    <DashStack.Navigator screenOptions={{ headerShown: false }}>
      <DashStack.Screen name="AdminDash"  component={AdminDashScreen} />
      <DashStack.Screen name="Analytics"  component={AdminAnalyticsScreen} />
    </DashStack.Navigator>
  );
}

// ─── Stack: People tab ────────────────────────────────────────────────────────
const PeopleStack = createNativeStackNavigator<AdminPeopleStackParamList>();
function PeopleNavigator() {
  return (
    <PeopleStack.Navigator screenOptions={{ headerShown: false }}>
      <PeopleStack.Screen name="PeopleMenu"       component={PeopleMenuScreen} />
      <PeopleStack.Screen name="Users"            component={UsersAdminScreen} />
      <PeopleStack.Screen name="AttendanceAdmin"  component={AttendanceAdminScreen} />
      <PeopleStack.Screen name="PayrollAdmin"     component={PayrollAdminScreen} />
      <PeopleStack.Screen name="WorkerRecords"    component={WorkerRecordsScreen} />
      <PeopleStack.Screen name="EngineerOverview" component={EngineerOverviewScreen} />
      <PeopleStack.Screen name="Registrations"    component={RegistrationsScreen} />
    </PeopleStack.Navigator>
  );
}

// ─── Stack: Operations tab ────────────────────────────────────────────────────
const OpsStack = createNativeStackNavigator<AdminOpsStackParamList>();
function OpsNavigator() {
  return (
    <OpsStack.Navigator screenOptions={{ headerShown: false }}>
      <OpsStack.Screen name="OpsMenu"     component={OpsMenuScreen} />
      <OpsStack.Screen name="Machines"    component={MachinesAdminScreen} />
      <OpsStack.Screen name="Shifts"      component={ShiftsAdminScreen} />
      <OpsStack.Screen name="Electricity" component={ElectricityScreen} />
      <OpsStack.Screen name="Settings"    component={SettingsAdminScreen} />
    </OpsStack.Navigator>
  );
}

// ─── Stack: Audit tab ─────────────────────────────────────────────────────────
const AuditStack = createNativeStackNavigator<AdminAuditStackParamList>();
function AuditNavigator() {
  return (
    <AuditStack.Navigator screenOptions={{ headerShown: false }}>
      <AuditStack.Screen name="AuditMenu"     component={AuditMenuScreen} />
      <AuditStack.Screen name="AuditLogs"     component={AuditLogsScreen} />
      <AuditStack.Screen name="AdminSnaps"    component={AdminSnapsScreen} />
      <AuditStack.Screen name="AIHub"         component={AIHubScreen} />
      <AuditStack.Screen name="Assistant"     component={AssistantScreen} />
      <AuditStack.Screen name="Notifications" component={NotificationsScreen} />
    </AuditStack.Navigator>
  );
}

// ─── Bottom Tabs ──────────────────────────────────────────────────────────────
const Tab = createBottomTabNavigator<AdminTabParamList>();

export function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
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
            Dashboard:  ['home',     'home-outline'],
            People:     ['people',   'people-outline'],
            Operations: ['settings', 'settings-outline'],
            Audit:      ['shield',   'shield-outline'],
            Profile:    ['person',   'person-outline'],
          };
          const [active, inactive] = icons[route.name] ?? ['ellipse', 'ellipse-outline'];
          return <Ionicons name={(focused ? active : inactive) as any} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard"  component={DashNavigator}    options={{ tabBarLabel: 'Dashboard' }}  />
      <Tab.Screen name="People"     component={PeopleNavigator}  options={{ tabBarLabel: 'People' }}     />
      <Tab.Screen name="Operations" component={OpsNavigator}     options={{ tabBarLabel: 'Operations' }} />
      <Tab.Screen name="Audit"      component={AuditNavigator}   options={{ tabBarLabel: 'Audit' }}      />
      <Tab.Screen name="Profile"    component={ProfileScreen}    options={{ tabBarLabel: 'Profile' }}    />
    </Tab.Navigator>
  );
}
