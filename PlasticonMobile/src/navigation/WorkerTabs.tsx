import React from 'react';
import { createBottomTabNavigator }   from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons }                   from '@expo/vector-icons';
import { useAppTheme }    from '../context/ThemeContext';
import { useUnreadCount } from '../hooks/useUnreadCount';

import {
  WorkerTabParamList,
  WorkerOverviewStackParamList,
  WorkerWorkStackParamList,
  WorkerAIStackParamList,
  WorkerPersonalStackParamList,
} from './types';

// ─── Overview tab ─────────────────────────────────────────────────────────────
import { WorkerHubScreen }         from '../screens/worker/WorkerHubScreen';
import { KaizenIdeasScreen }       from '../screens/worker/KaizenIdeasScreen';
import { ElectricityRecordScreen } from '../screens/worker/ElectricityRecordScreen';

// ─── Work tab ─────────────────────────────────────────────────────────────────
import { WorkMenuScreen }           from '../screens/worker/WorkMenuScreen';
import { ProductionScreen }         from '../screens/worker/ProductionScreen';
import { ReadingsScreen }           from '../screens/worker/ReadingsScreen';
import { MachineStopsScreen }       from '../screens/worker/MachineStopsScreen';
import { DailyChecklistScreen }     from '../screens/worker/DailyChecklistScreen';
import { MaterialWasteScreen }      from '../screens/worker/MaterialWasteScreen';
import { DailyTargetsScreen }       from '../screens/worker/DailyTargetsScreen';
import { QualityIssuesScreen }      from '../screens/worker/QualityIssuesScreen';
import { MicroStopsScreen }         from '../screens/worker/MicroStopsScreen';
import { ElectricityAlertsScreen }  from '../screens/worker/ElectricityAlertsScreen';
import { SnapshotsScreen }          from '../screens/worker/SnapshotsScreen';

// ─── AI tab ───────────────────────────────────────────────────────────────────
import { AssistantScreen } from '../screens/shared/AssistantScreen';

// ─── Personal tab ─────────────────────────────────────────────────────────────
import { PersonalMenuScreen }   from '../screens/worker/PersonalMenuScreen';
import { AttendanceScreen }     from '../screens/shared/AttendanceScreen';
import { PayrollScreen }        from '../screens/worker/PayrollScreen';
import { NotificationsScreen }  from '../screens/shared/NotificationsScreen';
import { ChatScreen }           from '../screens/shared/ChatScreen';
import { ProfileScreen }        from '../screens/shared/ProfileScreen';

// ─── Stack: Overview tab ─────────────────────────────────────────────────────
const OverviewStack = createNativeStackNavigator<WorkerOverviewStackParamList>();
function OverviewNavigator() {
  return (
    <OverviewStack.Navigator screenOptions={{ headerShown: false }}>
      <OverviewStack.Screen name="WorkerHub"    component={WorkerHubScreen} />
      <OverviewStack.Screen name="Production"   component={ProductionScreen} />
      <OverviewStack.Screen name="Snapshots"    component={SnapshotsScreen} />
      <OverviewStack.Screen name="MachineStops" component={MachineStopsScreen} />
      <OverviewStack.Screen name="Attendance"   component={AttendanceScreen} />
      <OverviewStack.Screen name="Payroll"      component={PayrollScreen} />
      <OverviewStack.Screen name="KaizenIdeas"       component={KaizenIdeasScreen} />
      <OverviewStack.Screen name="ElectricityRecord" component={ElectricityRecordScreen} />
    </OverviewStack.Navigator>
  );
}

// ─── Stack: Work tab ─────────────────────────────────────────────────────────
const WorkStack = createNativeStackNavigator<WorkerWorkStackParamList>();
function WorkNavigator() {
  return (
    <WorkStack.Navigator screenOptions={{ headerShown: false }}>
      <WorkStack.Screen name="WorkMenu"          component={WorkMenuScreen} />
      <WorkStack.Screen name="Production"        component={ProductionScreen} />
      <WorkStack.Screen name="Readings"          component={ReadingsScreen} />
      <WorkStack.Screen name="MachineStops"      component={MachineStopsScreen} />
      <WorkStack.Screen name="DailyChecklist"    component={DailyChecklistScreen} />
      <WorkStack.Screen name="MaterialWaste"     component={MaterialWasteScreen} />
      <WorkStack.Screen name="DailyTargets"      component={DailyTargetsScreen} />
      <WorkStack.Screen name="QualityIssues"     component={QualityIssuesScreen} />
      <WorkStack.Screen name="MicroStops"        component={MicroStopsScreen} />
      <WorkStack.Screen name="ElectricityAlerts" component={ElectricityAlertsScreen} />
      <WorkStack.Screen name="ElectricityRecord" component={ElectricityRecordScreen} />
      <WorkStack.Screen name="Snapshots"         component={SnapshotsScreen} />
    </WorkStack.Navigator>
  );
}

// ─── Stack: AI tab ────────────────────────────────────────────────────────────
const AIStack = createNativeStackNavigator<WorkerAIStackParamList>();
function AINavigator() {
  return (
    <AIStack.Navigator screenOptions={{ headerShown: false }}>
      <AIStack.Screen name="Assistant" component={AssistantScreen} />
    </AIStack.Navigator>
  );
}

// ─── Stack: Personal tab ─────────────────────────────────────────────────────
const PersonalStack = createNativeStackNavigator<WorkerPersonalStackParamList>();
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
const Tab = createBottomTabNavigator<WorkerTabParamList>();

export function WorkerTabs() {
  const { colors }  = useAppTheme();
  const unreadCount = useUnreadCount();
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
            Work:     ['briefcase',    'briefcase-outline'],
            AI:       ['hardware-chip','hardware-chip-outline'],
            Personal: ['person',       'person-outline'],
          };
          const [active, inactive] = icons[route.name] ?? ['ellipse', 'ellipse-outline'];
          return <Ionicons name={(focused ? active : inactive) as any} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Overview" component={OverviewNavigator} options={{ tabBarLabel: 'نظرة عامة' }} />
      <Tab.Screen name="Work"     component={WorkNavigator}     options={{ tabBarLabel: 'عملي'      }} />
      <Tab.Screen name="AI"       component={AINavigator}       options={{ tabBarLabel: 'الذكاء'    }} />
      <Tab.Screen name="Personal" component={PersonalNavigator} options={{ tabBarLabel: 'شخصي', tabBarBadge: unreadCount > 0 ? unreadCount : undefined }} />
    </Tab.Navigator>
  );
}
