import React from 'react';
import { createBottomTabNavigator }   from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons }                   from '@expo/vector-icons';
import { useAppTheme }                from '../context/ThemeContext';
import { useLocale }                  from '../context/LocaleContext';

import {
  AdminTabParamList,
  AdminDashStackParamList,
  AdminOpsStackParamList,
  AdminFinStackParamList,
  AdminEngStackParamList,
  AdminMoreStackParamList,
} from './types';

// ─── Dashboard ────────────────────────────────────────────────────────────────
import { AdminDashScreen }      from '../screens/admin/AdminDashScreen';
import { AdminAnalyticsScreen } from '../screens/admin/AdminAnalyticsScreen';

// ─── Operations ───────────────────────────────────────────────────────────────
import { AdminOpsMenuScreen }    from '../screens/admin/AdminOpsMenuScreen';
import { ProductionScreen }      from '../screens/worker/ProductionScreen';
import { ConsumptionScreen }     from '../screens/admin/ConsumptionScreen';
import { AttendanceAdminScreen } from '../screens/admin/AttendanceAdminScreen';
import { PayrollAdminScreen }    from '../screens/admin/PayrollAdminScreen';
import { WorkerRecordsScreen }   from '../screens/admin/WorkerRecordsScreen';
import { AdminSnapsScreen }      from '../screens/admin/AdminSnapsScreen';
import { ElectricityScreen }     from '../screens/admin/ElectricityScreen';
import { MachinesAdminScreen }        from '../screens/admin/MachinesAdminScreen';
import { ShiftsAdminScreen }          from '../screens/admin/ShiftsAdminScreen';
import { AdminMachineStopsScreen }    from '../screens/admin/AdminMachineStopsScreen';

// ─── Finance ──────────────────────────────────────────────────────────────────
import { AdminFinMenuScreen }        from '../screens/admin/AdminFinMenuScreen';
import { FinanceDashScreen }         from '../screens/accountant/FinanceDashScreen';
import { FinancialReportsScreen }    from '../screens/accountant/FinancialReportsScreen';
import { CostAnalysisScreen }        from '../screens/accountant/CostAnalysisScreen';
import { BudgetPlanningScreen }      from '../screens/accountant/BudgetPlanningScreen';
import { InvoicesScreen }            from '../screens/accountant/InvoicesScreen';
import { CustomerReceivablesScreen } from '../screens/accountant/CustomerReceivablesScreen';
import { SupplierPayablesScreen }    from '../screens/accountant/SupplierPayablesScreen';
import { ExpensesScreen }            from '../screens/accountant/ExpensesScreen';
import { BankReconciliationScreen }  from '../screens/accountant/BankReconciliationScreen';
import { TaxComplianceScreen }       from '../screens/accountant/TaxComplianceScreen';
import { SuppliersScreen }           from '../screens/accountant/SuppliersScreen';
import { PartsPricingScreen }        from '../screens/accountant/PartsPricingScreen';
import { ApprovalWorkflowsScreen }   from '../screens/accountant/ApprovalWorkflowsScreen';
import { EmployeePerformanceScreen } from '../screens/accountant/EmployeePerformanceScreen';
import { WarehouseScreen }           from '../screens/admin/WarehouseScreen';
import { InventoryAdminScreen }      from '../screens/admin/InventoryAdminScreen';
import { PurchasesScreen }           from '../screens/admin/PurchasesScreen';
import { SalesAdminScreen }          from '../screens/admin/SalesAdminScreen';
import { ReportsScreen }             from '../screens/shared/ReportsScreen';

// ─── Engineering ──────────────────────────────────────────────────────────────
import { AdminEngMenuScreen }        from '../screens/admin/AdminEngMenuScreen';
import { MaintenancePage }           from '../screens/engineer/MaintenancePage';
import { MaintScheduleScreen }       from '../screens/engineer/MaintScheduleScreen';
import { WorkOrdersScreen }          from '../screens/engineer/WorkOrdersScreen';
import { MaintCostsScreen }          from '../screens/engineer/MaintCostsScreen';
import { MachineHealthScreen }       from '../screens/engineer/MachineHealthScreen';
import { SparePartsScreen }          from '../screens/engineer/SparePartsScreen';
import { EngInventoryScreen }        from '../screens/engineer/EngInventoryScreen';
import { CalibrationScreen }         from '../screens/engineer/CalibrationScreen';
import { LifecycleScreen }           from '../screens/engineer/LifecycleScreen';
import { TransferLogScreen }         from '../screens/engineer/TransferLogScreen';
import { QualityChecksScreen }       from '../screens/engineer/QualityChecksScreen';
import { QualityTrendsScreen }       from '../screens/engineer/QualityTrendsScreen';
import { RawAlertsScreen }           from '../screens/engineer/RawAlertsScreen';
import { TechDocsScreen }            from '../screens/engineer/TechDocsScreen';
import { ProductionAnalyticsScreen } from '../screens/engineer/ProductionAnalyticsScreen';

// ─── More ─────────────────────────────────────────────────────────────────────
import { AdminMoreMenuScreen }       from '../screens/admin/AdminMoreMenuScreen';
import { UsersAdminScreen }          from '../screens/admin/UsersAdminScreen';
import { RegistrationsScreen }       from '../screens/admin/RegistrationsScreen';
import { EngineerOverviewScreen }    from '../screens/admin/EngineerOverviewScreen';
import { AuditLogsScreen }           from '../screens/admin/AuditLogsScreen';
import { SettingsAdminScreen }       from '../screens/admin/SettingsAdminScreen';
import { NotificationsScreen }       from '../screens/shared/NotificationsScreen';
import { ChatScreen }                from '../screens/shared/ChatScreen';
import { AIHubScreen }               from '../screens/shared/AIHubScreen';
import { AssistantScreen }           from '../screens/shared/AssistantScreen';
import { InvoiceExtractionScreen }   from '../screens/shared/InvoiceExtractionScreen';
import { AnomalyDetectionScreen }    from '../screens/shared/AnomalyDetectionScreen';
import { MaintenanceReportScreen }   from '../screens/shared/MaintenanceReportScreen';
import { ShiftHandoverScreen }       from '../screens/worker/ShiftHandoverScreen';
import { WorkerCoachingScreen }      from '../screens/worker/WorkerCoachingScreen';
import { ProfileScreen }             from '../screens/shared/ProfileScreen';
import { CustomersScreen }           from '../screens/shared/CustomersScreen';

// ─── Stack: Dashboard ─────────────────────────────────────────────────────────
const DashStack = createNativeStackNavigator<AdminDashStackParamList>();
function DashNavigator() {
  return (
    <DashStack.Navigator screenOptions={{ headerShown: false }}>
      <DashStack.Screen name="AdminDash"  component={AdminDashScreen} />
      <DashStack.Screen name="Analytics"  component={AdminAnalyticsScreen} />
    </DashStack.Navigator>
  );
}

// ─── Stack: Operations ────────────────────────────────────────────────────────
const OpsStack = createNativeStackNavigator<AdminOpsStackParamList>();
function OpsNavigator() {
  return (
    <OpsStack.Navigator screenOptions={{ headerShown: false }}>
      <OpsStack.Screen name="AdminOpsMenu"    component={AdminOpsMenuScreen} />
      <OpsStack.Screen name="Production"      component={ProductionScreen} />
      <OpsStack.Screen name="Consumption"     component={ConsumptionScreen} />
      <OpsStack.Screen name="AttendanceAdmin" component={AttendanceAdminScreen} />
      <OpsStack.Screen name="PayrollAdmin"    component={PayrollAdminScreen} />
      <OpsStack.Screen name="WorkerRecords"   component={WorkerRecordsScreen} />
      <OpsStack.Screen name="Snapshots"       component={AdminSnapsScreen} />
      <OpsStack.Screen name="Electricity"     component={ElectricityScreen} />
      <OpsStack.Screen name="Machines"        component={MachinesAdminScreen} />
      <OpsStack.Screen name="Shifts"          component={ShiftsAdminScreen} />
      <OpsStack.Screen name="MachineStops"    component={AdminMachineStopsScreen} />
    </OpsStack.Navigator>
  );
}

// ─── Stack: Finance ───────────────────────────────────────────────────────────
const FinStack = createNativeStackNavigator<AdminFinStackParamList>();
function FinNavigator() {
  return (
    <FinStack.Navigator screenOptions={{ headerShown: false }}>
      <FinStack.Screen name="AdminFinMenu"        component={AdminFinMenuScreen} />
      <FinStack.Screen name="FinanceDash"         component={FinanceDashScreen} />
      <FinStack.Screen name="FinancialReports"    component={FinancialReportsScreen} />
      <FinStack.Screen name="CostAnalysis"        component={CostAnalysisScreen} />
      <FinStack.Screen name="BudgetPlanning"      component={BudgetPlanningScreen} />
      <FinStack.Screen name="Invoices"            component={InvoicesScreen} />
      <FinStack.Screen name="CustomerReceivables" component={CustomerReceivablesScreen} />
      <FinStack.Screen name="SupplierPayables"    component={SupplierPayablesScreen} />
      <FinStack.Screen name="Expenses"            component={ExpensesScreen} />
      <FinStack.Screen name="BankReconciliation"  component={BankReconciliationScreen} />
      <FinStack.Screen name="TaxCompliance"       component={TaxComplianceScreen} />
      <FinStack.Screen name="Suppliers"           component={SuppliersScreen} />
      <FinStack.Screen name="PartsPricing"        component={PartsPricingScreen} />
      <FinStack.Screen name="ApprovalWorkflows"   component={ApprovalWorkflowsScreen} />
      <FinStack.Screen name="EmployeePerformance" component={EmployeePerformanceScreen} />
      <FinStack.Screen name="Warehouse"           component={WarehouseScreen} />
      <FinStack.Screen name="Inventory"           component={InventoryAdminScreen} />
      <FinStack.Screen name="Purchases"           component={PurchasesScreen} />
      <FinStack.Screen name="Sales"               component={SalesAdminScreen} />
      <FinStack.Screen name="Reports"             component={ReportsScreen} />
    </FinStack.Navigator>
  );
}

// ─── Stack: Engineering ───────────────────────────────────────────────────────
const EngStack = createNativeStackNavigator<AdminEngStackParamList>();
function EngNavigator() {
  return (
    <EngStack.Navigator screenOptions={{ headerShown: false }}>
      <EngStack.Screen name="AdminEngMenu"        component={AdminEngMenuScreen} />
      <EngStack.Screen name="Maintenance"         component={MaintenancePage} />
      <EngStack.Screen name="MaintSchedule"       component={MaintScheduleScreen} />
      <EngStack.Screen name="WorkOrders"          component={WorkOrdersScreen} />
      <EngStack.Screen name="MaintCosts"          component={MaintCostsScreen} />
      <EngStack.Screen name="MachineHealth"       component={MachineHealthScreen} />
      <EngStack.Screen name="SpareParts"          component={SparePartsScreen} />
      <EngStack.Screen name="EngInventory"        component={EngInventoryScreen} />
      <EngStack.Screen name="Calibration"         component={CalibrationScreen} />
      <EngStack.Screen name="Lifecycle"           component={LifecycleScreen} />
      <EngStack.Screen name="TransferLog"         component={TransferLogScreen} />
      <EngStack.Screen name="QualityChecks"       component={QualityChecksScreen} />
      <EngStack.Screen name="QualityTrends"       component={QualityTrendsScreen} />
      <EngStack.Screen name="RawAlerts"           component={RawAlertsScreen} />
      <EngStack.Screen name="TechDocs"            component={TechDocsScreen} />
      <EngStack.Screen name="ProductionAnalytics" component={ProductionAnalyticsScreen} />
    </EngStack.Navigator>
  );
}

// ─── Stack: More ──────────────────────────────────────────────────────────────
const MoreStack = createNativeStackNavigator<AdminMoreStackParamList>();
function MoreNavigator() {
  return (
    <MoreStack.Navigator screenOptions={{ headerShown: false }}>
      <MoreStack.Screen name="AdminMoreMenu"     component={AdminMoreMenuScreen} />
      <MoreStack.Screen name="Users"             component={UsersAdminScreen} />
      <MoreStack.Screen name="Registrations"     component={RegistrationsScreen} />
      <MoreStack.Screen name="EngineerOverview"  component={EngineerOverviewScreen} />
      <MoreStack.Screen name="AuditLogs"         component={AuditLogsScreen} />
      <MoreStack.Screen name="AdminSnaps"        component={AdminSnapsScreen} />
      <MoreStack.Screen name="Settings"          component={SettingsAdminScreen} />
      <MoreStack.Screen name="Notifications"     component={NotificationsScreen} />
      <MoreStack.Screen name="Chat"              component={ChatScreen} />
      <MoreStack.Screen name="AIHub"             component={AIHubScreen} />
      <MoreStack.Screen name="Assistant"         component={AssistantScreen} />
      <MoreStack.Screen name="InvoiceExtraction" component={InvoiceExtractionScreen} />
      <MoreStack.Screen name="AnomalyDetection"  component={AnomalyDetectionScreen} />
      <MoreStack.Screen name="MaintenanceReport" component={MaintenanceReportScreen} />
      <MoreStack.Screen name="ShiftHandover"     component={ShiftHandoverScreen} />
      <MoreStack.Screen name="WorkerCoaching"    component={WorkerCoachingScreen} />
      <MoreStack.Screen name="Profile"           component={ProfileScreen} />
      <MoreStack.Screen name="Customers"         component={CustomersScreen} />
    </MoreStack.Navigator>
  );
}

// ─── Bottom Tabs ──────────────────────────────────────────────────────────────
const Tab = createBottomTabNavigator<AdminTabParamList>();

export function AdminTabs() {
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
            Dashboard:   ['home',                 'home-outline'],
            Operations:  ['construct',            'construct-outline'],
            Finance:     ['wallet',               'wallet-outline'],
            Engineering: ['build',                'build-outline'],
            More:        ['ellipsis-horizontal',  'ellipsis-horizontal-outline'],
          };
          const [active, inactive] = icons[route.name] ?? ['ellipse', 'ellipse-outline'];
          return <Ionicons name={(focused ? active : inactive) as any} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard"   component={DashNavigator}  options={{ tabBarLabel: isAr ? 'الرئيسية'  : 'Dashboard'   }} />
      <Tab.Screen name="Operations"  component={OpsNavigator}   options={{ tabBarLabel: isAr ? 'العمليات'  : 'Operations'  }} />
      <Tab.Screen name="Finance"     component={FinNavigator}   options={{ tabBarLabel: isAr ? 'المالية'   : 'Finance'     }} />
      <Tab.Screen name="Engineering" component={EngNavigator}   options={{ tabBarLabel: isAr ? 'الهندسة'   : 'Engineering' }} />
      <Tab.Screen name="More"        component={MoreNavigator}  options={{ tabBarLabel: isAr ? 'المزيد'    : 'More'        }} />
    </Tab.Navigator>
  );
}
