import React from 'react';
import { createBottomTabNavigator }   from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons }                   from '@expo/vector-icons';
import { useAppTheme }                from '../context/ThemeContext';
import { useLocale }                  from '../context/LocaleContext';
import { useUnreadCount }             from '../hooks/useUnreadCount';

import {
  EngineerTabParamList,
  EngineerOverviewStackParamList,
  EngineerEngStackParamList,
  EngineerAIStackParamList,
  EngineerPersonalStackParamList,
} from './types';

// ─── Overview screens ─────────────────────────────────────────────────────────
import { EngineerDashScreen }       from '../screens/engineer/EngineerDashScreen';

// ─── Engineering screens ──────────────────────────────────────────────────────
import { EngineerEngMenuScreen }    from '../screens/engineer/EngineerEngMenuScreen';
import { ProductionMonitorScreen }  from '../screens/engineer/ProductionMonitorScreen';
import { ConsumptionScreen }        from '../screens/admin/ConsumptionScreen';
import { WarehouseScreen }          from '../screens/admin/WarehouseScreen';
import { QualityChecksScreen }      from '../screens/engineer/QualityChecksScreen';
import { MaintenancePage }          from '../screens/engineer/MaintenancePage';
import { MaintScheduleScreen }      from '../screens/engineer/MaintScheduleScreen';
import { EngInventoryScreen }       from '../screens/engineer/EngInventoryScreen';
import { MachineHealthScreen }      from '../screens/engineer/MachineHealthScreen';
import { WorkOrdersScreen }         from '../screens/engineer/WorkOrdersScreen';
import { SparePartsScreen }         from '../screens/engineer/SparePartsScreen';
import { LifecycleScreen }          from '../screens/engineer/LifecycleScreen';
import { ProductionAnalyticsScreen }from '../screens/engineer/ProductionAnalyticsScreen';
import { TechDocsScreen }           from '../screens/engineer/TechDocsScreen';
import { TransferLogScreen }        from '../screens/engineer/TransferLogScreen';
import { RawAlertsScreen }          from '../screens/engineer/RawAlertsScreen';
import { MaintCostsScreen }         from '../screens/engineer/MaintCostsScreen';
import { ElectricityScreen }        from '../screens/admin/ElectricityScreen';

// ─── AI screens ───────────────────────────────────────────────────────────────
import { AIHubScreen }              from '../screens/shared/AIHubScreen';
import { AssistantScreen }          from '../screens/shared/AssistantScreen';
import { AnomalyDetectionScreen }   from '../screens/shared/AnomalyDetectionScreen';
import { MaintenanceReportScreen }  from '../screens/shared/MaintenanceReportScreen';
import { ShiftHandoverScreen }      from '../screens/worker/ShiftHandoverScreen';

// ─── Personal screens ─────────────────────────────────────────────────────────
import { PersonalMenuScreen }   from '../screens/worker/PersonalMenuScreen';
import { AttendanceScreen }     from '../screens/shared/AttendanceScreen';
import { PayrollScreen }        from '../screens/worker/PayrollScreen';
import { NotificationsScreen }  from '../screens/shared/NotificationsScreen';
import { ChatScreen }           from '../screens/shared/ChatScreen';
import { ProfileScreen }        from '../screens/shared/ProfileScreen';

// ─── Stack: Overview tab ─────────────────────────────────────────────────────
const OverviewStack = createNativeStackNavigator<EngineerOverviewStackParamList>();
function OverviewNavigator() {
  return (
    <OverviewStack.Navigator screenOptions={{ headerShown: false }}>
      <OverviewStack.Screen name="EngineerDash" component={EngineerDashScreen} />
    </OverviewStack.Navigator>
  );
}

// ─── Stack: Engineering tab ───────────────────────────────────────────────────
const EngStack = createNativeStackNavigator<EngineerEngStackParamList>();
function EngNavigator() {
  return (
    <EngStack.Navigator screenOptions={{ headerShown: false }}>
      <EngStack.Screen name="EngMenu"              component={EngineerEngMenuScreen} />
      <EngStack.Screen name="Production"           component={ProductionMonitorScreen} />
      <EngStack.Screen name="Consumption"          component={ConsumptionScreen} />
      <EngStack.Screen name="Warehouse"            component={WarehouseScreen} />
      <EngStack.Screen name="QualityChecks"        component={QualityChecksScreen} />
      <EngStack.Screen name="MaintenancePage"      component={MaintenancePage} />
      <EngStack.Screen name="MaintSchedule"        component={MaintScheduleScreen} />
      <EngStack.Screen name="EngInventory"         component={EngInventoryScreen} />
      <EngStack.Screen name="MachineHealth"        component={MachineHealthScreen} />
      <EngStack.Screen name="WorkOrders"           component={WorkOrdersScreen} />
      <EngStack.Screen name="SpareParts"           component={SparePartsScreen} />
      <EngStack.Screen name="Lifecycle"            component={LifecycleScreen} />
      <EngStack.Screen name="ProductionAnalytics"  component={ProductionAnalyticsScreen} />
      <EngStack.Screen name="TechDocs"             component={TechDocsScreen} />
      <EngStack.Screen name="TransferLog"          component={TransferLogScreen} />
      <EngStack.Screen name="RawAlerts"            component={RawAlertsScreen} />
      <EngStack.Screen name="MaintCosts"           component={MaintCostsScreen} />
      <EngStack.Screen name="Electricity"          component={ElectricityScreen} />
    </EngStack.Navigator>
  );
}

// ─── Stack: AI Tools tab ──────────────────────────────────────────────────────
const AIStack = createNativeStackNavigator<EngineerAIStackParamList>();
function AINavigator() {
  return (
    <AIStack.Navigator screenOptions={{ headerShown: false }}>
      <AIStack.Screen name="AIHub"             component={AIHubScreen} />
      <AIStack.Screen name="Assistant"         component={AssistantScreen} />
      <AIStack.Screen name="AnomalyDetection"  component={AnomalyDetectionScreen} />
      <AIStack.Screen name="MaintenanceReport" component={MaintenanceReportScreen} />
      <AIStack.Screen name="ShiftHandover"     component={ShiftHandoverScreen} />
    </AIStack.Navigator>
  );
}

// ─── Stack: Personal tab ─────────────────────────────────────────────────────
const PersonalStack = createNativeStackNavigator<EngineerPersonalStackParamList>();
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
const Tab = createBottomTabNavigator<EngineerTabParamList>();

export function EngineerTabs() {
  const { colors }  = useAppTheme();
  const { isAr }    = useLocale();
  const unreadCount = useUnreadCount();
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
            Overview:    ['grid',         'grid-outline'],
            Engineering: ['construct',    'construct-outline'],
            AITools:     ['hardware-chip','hardware-chip-outline'],
            Personal:    ['person',       'person-outline'],
          };
          const [active, inactive] = icons[route.name] ?? ['ellipse', 'ellipse-outline'];
          return <Ionicons name={(focused ? active : inactive) as any} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Overview"    component={OverviewNavigator} options={{ tabBarLabel: isAr ? 'نظرة عامة' : 'Overview'    }} />
      <Tab.Screen name="Engineering" component={EngNavigator}      options={{ tabBarLabel: isAr ? 'الهندسة'   : 'Engineering' }} />
      <Tab.Screen name="AITools"     component={AINavigator}       options={{ tabBarLabel: isAr ? 'الذكاء'    : 'AI Tools'    }} />
      <Tab.Screen name="Personal"    component={PersonalNavigator} options={{ tabBarLabel: isAr ? 'شخصي' : 'Personal', tabBarBadge: unreadCount > 0 ? unreadCount : undefined }} />
    </Tab.Navigator>
  );
}
