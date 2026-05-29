import React from 'react';
import { createBottomTabNavigator }    from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator }  from '@react-navigation/native-stack';
import { Ionicons }                    from '@expo/vector-icons';
import { colors }                      from '../theme';

import {
  WorkerTabParamList,
  WorkerHomeStackParamList,
  WorkerWorkStackParamList,
  WorkerAIStackParamList,
} from './types';

// ─── Screens ──────────────────────────────────────────────────────────────────
import { WorkerHubScreen }      from '../screens/worker/WorkerHubScreen';
import { SnapshotsScreen }      from '../screens/worker/SnapshotsScreen';
import { WorkMenuScreen }       from '../screens/worker/WorkMenuScreen';
import { ProductionScreen }     from '../screens/worker/ProductionScreen';
import { AttendanceScreen }     from '../screens/shared/AttendanceScreen';
import { PayrollScreen }        from '../screens/worker/PayrollScreen';
import { ReportsScreen }        from '../screens/shared/ReportsScreen';
import { AIHubScreen }          from '../screens/shared/AIHubScreen';
import { AssistantScreen }      from '../screens/shared/AssistantScreen';
import { ShiftHandoverScreen }  from '../screens/worker/ShiftHandoverScreen';
import { WorkerCoachingScreen } from '../screens/worker/WorkerCoachingScreen';
import { NotificationsScreen }  from '../screens/shared/NotificationsScreen';
import { ProfileScreen }        from '../screens/shared/ProfileScreen';

// ─── Stack: Home tab ─────────────────────────────────────────────────────────
const HomeStack = createNativeStackNavigator<WorkerHomeStackParamList>();
function HomeNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="WorkerHub"  component={WorkerHubScreen} />
      <HomeStack.Screen name="Snapshots"  component={SnapshotsScreen} />
    </HomeStack.Navigator>
  );
}

// ─── Stack: Work tab ─────────────────────────────────────────────────────────
const WorkStack = createNativeStackNavigator<WorkerWorkStackParamList>();
function WorkNavigator() {
  return (
    <WorkStack.Navigator screenOptions={{ headerShown: false }}>
      <WorkStack.Screen name="WorkMenu"   component={WorkMenuScreen} />
      <WorkStack.Screen name="Production" component={ProductionScreen} />
      <WorkStack.Screen name="Attendance" component={AttendanceScreen} />
      <WorkStack.Screen name="Payroll"    component={PayrollScreen} />
      <WorkStack.Screen name="Reports"    component={ReportsScreen} />
    </WorkStack.Navigator>
  );
}

// ─── Stack: AI tab ────────────────────────────────────────────────────────────
const AIStack = createNativeStackNavigator<WorkerAIStackParamList>();
function AINavigator() {
  return (
    <AIStack.Navigator screenOptions={{ headerShown: false }}>
      <AIStack.Screen name="AIHub"          component={AIHubScreen} />
      <AIStack.Screen name="Assistant"      component={AssistantScreen} />
      <AIStack.Screen name="ShiftHandover"  component={ShiftHandoverScreen} />
      <AIStack.Screen name="WorkerCoaching" component={WorkerCoachingScreen} />
    </AIStack.Navigator>
  );
}

// ─── Bottom Tabs ──────────────────────────────────────────────────────────────
const Tab = createBottomTabNavigator<WorkerTabParamList>();

export function WorkerTabs() {
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
            Home:          ['grid',               'grid-outline'],
            Work:          ['briefcase',          'briefcase-outline'],
            AI:            ['hardware-chip',      'hardware-chip-outline'],
            Notifications: ['notifications',      'notifications-outline'],
            Profile:       ['person',             'person-outline'],
          };
          const [active, inactive] = icons[route.name] ?? ['ellipse', 'ellipse-outline'];
          return <Ionicons name={(focused ? active : inactive) as any} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home"          component={HomeNavigator}        options={{ tabBarLabel: 'Home' }}          />
      <Tab.Screen name="Work"          component={WorkNavigator}        options={{ tabBarLabel: 'My Work' }}       />
      <Tab.Screen name="AI"            component={AINavigator}          options={{ tabBarLabel: 'AI Hub' }}        />
      <Tab.Screen name="Notifications" component={NotificationsScreen}  options={{ tabBarLabel: 'Alerts' }}        />
      <Tab.Screen name="Profile"       component={ProfileScreen}        options={{ tabBarLabel: 'Profile' }}       />
    </Tab.Navigator>
  );
}
