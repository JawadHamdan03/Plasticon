import React from 'react';
import { createBottomTabNavigator }   from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons }                   from '@expo/vector-icons';
import { colors }                     from '../theme';

import {
  EngineerTabParamList,
  EngineerDashStackParamList,
  EngineerMaintStackParamList,
  EngineerMachStackParamList,
  EngineerQualStackParamList,
  EngineerProfileStackParamList,
} from './types';

// ─── Dashboard screens ────────────────────────────────────────────────────────
import { EngineerDashScreen }       from '../screens/engineer/EngineerDashScreen';
import { ProductionAnalyticsScreen } from '../screens/engineer/ProductionAnalyticsScreen';

// ─── Maintenance screens ──────────────────────────────────────────────────────
import { MaintMenuScreen }     from '../screens/engineer/MaintMenuScreen';
import { MaintenancePage }     from '../screens/engineer/MaintenancePage';
import { MaintScheduleScreen } from '../screens/engineer/MaintScheduleScreen';
import { WorkOrdersScreen }    from '../screens/engineer/WorkOrdersScreen';
import { MaintCostsScreen }    from '../screens/engineer/MaintCostsScreen';

// ─── Machines screens ─────────────────────────────────────────────────────────
import { MachMenuScreen }     from '../screens/engineer/MachMenuScreen';
import { MachineHealthScreen } from '../screens/engineer/MachineHealthScreen';
import { SparePartsScreen }    from '../screens/engineer/SparePartsScreen';
import { EngInventoryScreen }  from '../screens/engineer/EngInventoryScreen';
import { CalibrationScreen }   from '../screens/engineer/CalibrationScreen';
import { LifecycleScreen }     from '../screens/engineer/LifecycleScreen';
import { TransferLogScreen }   from '../screens/engineer/TransferLogScreen';

// ─── Quality screens ──────────────────────────────────────────────────────────
import { QualMenuScreen }      from '../screens/engineer/QualMenuScreen';
import { QualityChecksScreen } from '../screens/engineer/QualityChecksScreen';
import { QualityTrendsScreen } from '../screens/engineer/QualityTrendsScreen';
import { RawAlertsScreen }     from '../screens/engineer/RawAlertsScreen';
import { TechDocsScreen }      from '../screens/engineer/TechDocsScreen';

// ─── Profile / More screens ───────────────────────────────────────────────────
import { EngineerMoreScreen }  from '../screens/engineer/EngineerMoreScreen';
import { ProfileScreen }       from '../screens/shared/ProfileScreen';
import { AIHubScreen }         from '../screens/shared/AIHubScreen';
import { AssistantScreen }     from '../screens/shared/AssistantScreen';
import { NotificationsScreen } from '../screens/shared/NotificationsScreen';

// ─── Stack: Dashboard tab ─────────────────────────────────────────────────────
const DashStack = createNativeStackNavigator<EngineerDashStackParamList>();
function DashNavigator() {
  return (
    <DashStack.Navigator screenOptions={{ headerShown: false }}>
      <DashStack.Screen name="EngineerDash"       component={EngineerDashScreen} />
      <DashStack.Screen name="ProductionAnalytics" component={ProductionAnalyticsScreen} />
    </DashStack.Navigator>
  );
}

// ─── Stack: Maintenance tab ───────────────────────────────────────────────────
const MaintStack = createNativeStackNavigator<EngineerMaintStackParamList>();
function MaintNavigator() {
  return (
    <MaintStack.Navigator screenOptions={{ headerShown: false }}>
      <MaintStack.Screen name="MaintMenu"       component={MaintMenuScreen} />
      <MaintStack.Screen name="MaintenancePage" component={MaintenancePage} />
      <MaintStack.Screen name="MaintSchedule"   component={MaintScheduleScreen} />
      <MaintStack.Screen name="WorkOrders"      component={WorkOrdersScreen} />
      <MaintStack.Screen name="MaintCosts"      component={MaintCostsScreen} />
    </MaintStack.Navigator>
  );
}

// ─── Stack: Machines tab ──────────────────────────────────────────────────────
const MachStack = createNativeStackNavigator<EngineerMachStackParamList>();
function MachNavigator() {
  return (
    <MachStack.Navigator screenOptions={{ headerShown: false }}>
      <MachStack.Screen name="MachMenu"      component={MachMenuScreen} />
      <MachStack.Screen name="MachineHealth" component={MachineHealthScreen} />
      <MachStack.Screen name="SpareParts"    component={SparePartsScreen} />
      <MachStack.Screen name="EngInventory"  component={EngInventoryScreen} />
      <MachStack.Screen name="Calibration"   component={CalibrationScreen} />
      <MachStack.Screen name="Lifecycle"     component={LifecycleScreen} />
      <MachStack.Screen name="TransferLog"   component={TransferLogScreen} />
    </MachStack.Navigator>
  );
}

// ─── Stack: Quality tab ───────────────────────────────────────────────────────
const QualStack = createNativeStackNavigator<EngineerQualStackParamList>();
function QualNavigator() {
  return (
    <QualStack.Navigator screenOptions={{ headerShown: false }}>
      <QualStack.Screen name="QualMenu"      component={QualMenuScreen} />
      <QualStack.Screen name="QualityChecks" component={QualityChecksScreen} />
      <QualStack.Screen name="QualityTrends" component={QualityTrendsScreen} />
      <QualStack.Screen name="RawAlerts"     component={RawAlertsScreen} />
      <QualStack.Screen name="TechDocs"      component={TechDocsScreen} />
    </QualStack.Navigator>
  );
}

// ─── Stack: Profile tab (More menu + sub-screens) ─────────────────────────────
const ProfileStack = createNativeStackNavigator<EngineerProfileStackParamList>();
function ProfileNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="EngineerMore"  component={EngineerMoreScreen} />
      <ProfileStack.Screen name="Profile"       component={ProfileScreen} />
      <ProfileStack.Screen name="AIHub"         component={AIHubScreen} />
      <ProfileStack.Screen name="Assistant"     component={AssistantScreen} />
      <ProfileStack.Screen name="Notifications" component={NotificationsScreen} />
    </ProfileStack.Navigator>
  );
}

// ─── Bottom Tabs ──────────────────────────────────────────────────────────────
const Tab = createBottomTabNavigator<EngineerTabParamList>();

export function EngineerTabs() {
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
            Dashboard:   ['speedometer',      'speedometer-outline'],
            Maintenance: ['construct',        'construct-outline'],
            Machines:    ['hardware-chip',    'hardware-chip-outline'],
            Quality:     ['shield-checkmark', 'shield-checkmark-outline'],
            Profile:     ['ellipsis-horizontal', 'ellipsis-horizontal-outline'],
          };
          const [active, inactive] = icons[route.name] ?? ['ellipse', 'ellipse-outline'];
          return <Ionicons name={(focused ? active : inactive) as any} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard"   component={DashNavigator}    options={{ tabBarLabel: 'Dashboard' }}   />
      <Tab.Screen name="Maintenance" component={MaintNavigator}   options={{ tabBarLabel: 'Maintenance' }} />
      <Tab.Screen name="Machines"    component={MachNavigator}    options={{ tabBarLabel: 'Machines' }}    />
      <Tab.Screen name="Quality"     component={QualNavigator}    options={{ tabBarLabel: 'Quality' }}     />
      <Tab.Screen name="Profile"     component={ProfileNavigator} options={{ tabBarLabel: 'More' }}        />
    </Tab.Navigator>
  );
}
