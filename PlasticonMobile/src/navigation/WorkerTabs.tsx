import React from 'react';
import { createBottomTabNavigator }   from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons }                   from '@expo/vector-icons';
import { useAppTheme }                from '../context/ThemeContext';
import { useLocale }                  from '../context/LocaleContext';

import {
  WorkerTabParamList,
  WorkerOverviewStackParamList,
  WorkerWorkStackParamList,
  WorkerAIStackParamList,
  WorkerPersonalStackParamList,
} from './types';

// ─── Overview tab ─────────────────────────────────────────────────────────────
import { WorkerHubScreen }         from '../screens/worker/WorkerHubScreen';

// ─── Work tab ─────────────────────────────────────────────────────────────────
import { WorkMenuScreen }           from '../screens/worker/WorkMenuScreen';
import { ProductionScreen }         from '../screens/worker/ProductionScreen';
import { ConsumptionWorkerScreen }  from '../screens/worker/ConsumptionWorkerScreen';
import { ReadingsScreen }           from '../screens/worker/ReadingsScreen';
import { MachineStopsScreen }       from '../screens/worker/MachineStopsScreen';
import { DailyChecklistScreen }     from '../screens/worker/DailyChecklistScreen';
import { MaterialWasteScreen }      from '../screens/worker/MaterialWasteScreen';
import { DailyTargetsScreen }       from '../screens/worker/DailyTargetsScreen';
import { KaizenIdeasScreen }        from '../screens/worker/KaizenIdeasScreen';
import { QualityIssuesScreen }      from '../screens/worker/QualityIssuesScreen';
import { MicroStopsScreen }         from '../screens/worker/MicroStopsScreen';
import { ElectricityAlertsScreen }  from '../screens/worker/ElectricityAlertsScreen';
import { ElectricityRecordScreen }  from '../screens/worker/ElectricityRecordScreen';
import { SnapshotsScreen }          from '../screens/worker/SnapshotsScreen';

// ─── AI tab ───────────────────────────────────────────────────────────────────
import { AIHubScreen }          from '../screens/shared/AIHubScreen';
import { AssistantScreen }      from '../screens/shared/AssistantScreen';
import { ShiftHandoverScreen }  from '../screens/worker/ShiftHandoverScreen';
import { WorkerCoachingScreen } from '../screens/worker/WorkerCoachingScreen';

// ─── Personal tab ─────────────────────────────────────────────────────────────
import { PersonalMenuScreen }   from '../screens/worker/PersonalMenuScreen';
import { AttendanceScreen }     from '../screens/shared/AttendanceScreen';
import { PayrollScreen }        from '../screens/worker/PayrollScreen';
import { NotificationsScreen }  from '../screens/shared/NotificationsScreen';
import { ChatScreen }           from '../screens/shared/ChatScreen';

// ─── Stack: Overview tab ─────────────────────────────────────────────────────
const OverviewStack = createNativeStackNavigator<WorkerOverviewStackParamList>();
function OverviewNavigator() {
  return (
    <OverviewStack.Navigator screenOptions={{ headerShown: false }}>
      <OverviewStack.Screen name="WorkerHub" component={WorkerHubScreen} />
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
      <WorkStack.Screen name="Consumption"       component={ConsumptionWorkerScreen} />
      <WorkStack.Screen name="Readings"          component={ReadingsScreen} />
      <WorkStack.Screen name="MachineStops"      component={MachineStopsScreen} />
      <WorkStack.Screen name="DailyChecklist"    component={DailyChecklistScreen} />
      <WorkStack.Screen name="MaterialWaste"     component={MaterialWasteScreen} />
      <WorkStack.Screen name="DailyTargets"      component={DailyTargetsScreen} />
      <WorkStack.Screen name="KaizenIdeas"       component={KaizenIdeasScreen} />
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
      <AIStack.Screen name="AIHub"          component={AIHubScreen} />
      <AIStack.Screen name="Assistant"      component={AssistantScreen} />
      <AIStack.Screen name="ShiftHandover"  component={ShiftHandoverScreen} />
      <AIStack.Screen name="WorkerCoaching" component={WorkerCoachingScreen} />
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
    </PersonalStack.Navigator>
  );
}

// ─── Bottom Tabs ──────────────────────────────────────────────────────────────
const Tab = createBottomTabNavigator<WorkerTabParamList>();

export function WorkerTabs() {
  const { colors } = useAppTheme();
  const { isAr }   = useLocale();
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
      <Tab.Screen name="Overview" component={OverviewNavigator} options={{ tabBarLabel: isAr ? 'نظرة عامة' : 'Overview' }} />
      <Tab.Screen name="Work"     component={WorkNavigator}     options={{ tabBarLabel: isAr ? 'عملي'      : 'My Work'  }} />
      <Tab.Screen name="AI"       component={AINavigator}       options={{ tabBarLabel: isAr ? 'الذكاء'    : 'AI Tools' }} />
      <Tab.Screen name="Personal" component={PersonalNavigator} options={{ tabBarLabel: isAr ? 'شخصي'      : 'Personal' }} />
    </Tab.Navigator>
  );
}
