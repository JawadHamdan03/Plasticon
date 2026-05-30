import React from 'react';
import { createBottomTabNavigator }   from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons }                   from '@expo/vector-icons';
import { useAppTheme }                from '../context/ThemeContext';
import { useLocale }                  from '../context/LocaleContext';

import {
  AccountantTabParamList,
  AccountantOverviewStackParamList,
  AccountantFinanceStackParamList,
  AccountantHRStackParamList,
  AccountantAIStackParamList,
  AccountantPersonalStackParamList,
} from './types';

// ─── Overview screens ─────────────────────────────────────────────────────────
import { AccountantDashScreen }  from '../screens/accountant/AccountantDashScreen';
import { ReportsScreen }         from '../screens/shared/ReportsScreen';

// ─── Finance screens ──────────────────────────────────────────────────────────
import { AccountantFinMenuScreen }   from '../screens/accountant/AccountantFinMenuScreen';
import { FinanceDashScreen }         from '../screens/accountant/FinanceDashScreen';
import { InvoicesScreen }            from '../screens/accountant/InvoicesScreen';
import { ExpensesScreen }            from '../screens/accountant/ExpensesScreen';
import { FinancialReportsScreen }    from '../screens/accountant/FinancialReportsScreen';
import { SupplierPayablesScreen }    from '../screens/accountant/SupplierPayablesScreen';
import { CustomerReceivablesScreen } from '../screens/accountant/CustomerReceivablesScreen';
import { BudgetPlanningScreen }      from '../screens/accountant/BudgetPlanningScreen';
import { TaxComplianceScreen }       from '../screens/accountant/TaxComplianceScreen';
import { BankReconciliationScreen }  from '../screens/accountant/BankReconciliationScreen';
import { CostAnalysisScreen }        from '../screens/accountant/CostAnalysisScreen';
import { ApprovalWorkflowsScreen }   from '../screens/accountant/ApprovalWorkflowsScreen';
import { WarehouseScreen }           from '../screens/admin/WarehouseScreen';
import { InventoryAdminScreen }      from '../screens/admin/InventoryAdminScreen';
import { PurchasesScreen }           from '../screens/admin/PurchasesScreen';
import { SalesAdminScreen }          from '../screens/admin/SalesAdminScreen';
import { PartsPricingScreen }        from '../screens/accountant/PartsPricingScreen';
import { SuppliersScreen }           from '../screens/accountant/SuppliersScreen';
import { EmployeePerformanceScreen } from '../screens/accountant/EmployeePerformanceScreen';
import { MaintCostsScreen }          from '../screens/engineer/MaintCostsScreen';

// ─── HR screens ───────────────────────────────────────────────────────────────
import { AccountantHRMenuScreen } from '../screens/accountant/AccountantHRMenuScreen';
import { AttendanceAdminScreen }  from '../screens/admin/AttendanceAdminScreen';
import { PayrollAdminScreen }     from '../screens/admin/PayrollAdminScreen';

// ─── AI screens ───────────────────────────────────────────────────────────────
import { AIHubScreen }             from '../screens/shared/AIHubScreen';
import { AssistantScreen }         from '../screens/shared/AssistantScreen';
import { InvoiceExtractionScreen } from '../screens/shared/InvoiceExtractionScreen';

// ─── Personal screens ─────────────────────────────────────────────────────────
import { PersonalMenuScreen }  from '../screens/worker/PersonalMenuScreen';
import { AttendanceScreen }    from '../screens/shared/AttendanceScreen';
import { PayrollScreen }       from '../screens/worker/PayrollScreen';
import { NotificationsScreen } from '../screens/shared/NotificationsScreen';
import { ChatScreen }          from '../screens/shared/ChatScreen';

// ─── Stack: Overview tab ─────────────────────────────────────────────────────
const OverviewStack = createNativeStackNavigator<AccountantOverviewStackParamList>();
function OverviewNavigator() {
  return (
    <OverviewStack.Navigator screenOptions={{ headerShown: false }}>
      <OverviewStack.Screen name="AcctDash" component={AccountantDashScreen} />
      <OverviewStack.Screen name="Reports"  component={ReportsScreen} />
    </OverviewStack.Navigator>
  );
}

// ─── Stack: Finance tab ───────────────────────────────────────────────────────
const FinanceStack = createNativeStackNavigator<AccountantFinanceStackParamList>();
function FinanceNavigator() {
  return (
    <FinanceStack.Navigator screenOptions={{ headerShown: false }}>
      <FinanceStack.Screen name="AcctFinMenu"          component={AccountantFinMenuScreen} />
      <FinanceStack.Screen name="FinanceDash"          component={FinanceDashScreen} />
      <FinanceStack.Screen name="Invoices"             component={InvoicesScreen} />
      <FinanceStack.Screen name="Expenses"             component={ExpensesScreen} />
      <FinanceStack.Screen name="FinancialReports"     component={FinancialReportsScreen} />
      <FinanceStack.Screen name="SupplierPayables"     component={SupplierPayablesScreen} />
      <FinanceStack.Screen name="CustomerReceivables"  component={CustomerReceivablesScreen} />
      <FinanceStack.Screen name="BudgetPlanning"       component={BudgetPlanningScreen} />
      <FinanceStack.Screen name="TaxCompliance"        component={TaxComplianceScreen} />
      <FinanceStack.Screen name="BankReconciliation"   component={BankReconciliationScreen} />
      <FinanceStack.Screen name="CostAnalysis"         component={CostAnalysisScreen} />
      <FinanceStack.Screen name="ApprovalWorkflows"    component={ApprovalWorkflowsScreen} />
      <FinanceStack.Screen name="Warehouse"            component={WarehouseScreen} />
      <FinanceStack.Screen name="Inventory"            component={InventoryAdminScreen} />
      <FinanceStack.Screen name="Purchases"            component={PurchasesScreen} />
      <FinanceStack.Screen name="Sales"                component={SalesAdminScreen} />
      <FinanceStack.Screen name="PartsPricing"         component={PartsPricingScreen} />
      <FinanceStack.Screen name="Suppliers"            component={SuppliersScreen} />
      <FinanceStack.Screen name="EmployeePerformance"  component={EmployeePerformanceScreen} />
      <FinanceStack.Screen name="MaintCosts"           component={MaintCostsScreen} />
    </FinanceStack.Navigator>
  );
}

// ─── Stack: HR tab ────────────────────────────────────────────────────────────
const HRStack = createNativeStackNavigator<AccountantHRStackParamList>();
function HRNavigator() {
  return (
    <HRStack.Navigator screenOptions={{ headerShown: false }}>
      <HRStack.Screen name="HRMenu"     component={AccountantHRMenuScreen} />
      <HRStack.Screen name="Attendance" component={AttendanceAdminScreen} />
      <HRStack.Screen name="Payroll"    component={PayrollAdminScreen} />
    </HRStack.Navigator>
  );
}

// ─── Stack: AI Tools tab ──────────────────────────────────────────────────────
const AIStack = createNativeStackNavigator<AccountantAIStackParamList>();
function AINavigator() {
  return (
    <AIStack.Navigator screenOptions={{ headerShown: false }}>
      <AIStack.Screen name="AIHub"             component={AIHubScreen} />
      <AIStack.Screen name="Assistant"         component={AssistantScreen} />
      <AIStack.Screen name="InvoiceExtraction" component={InvoiceExtractionScreen} />
    </AIStack.Navigator>
  );
}

// ─── Stack: Personal tab ─────────────────────────────────────────────────────
const PersonalStack = createNativeStackNavigator<AccountantPersonalStackParamList>();
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
const Tab = createBottomTabNavigator<AccountantTabParamList>();

export function AccountantTabs() {
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
            Finance:  ['wallet',       'wallet-outline'],
            HR:       ['people',       'people-outline'],
            AITools:  ['hardware-chip','hardware-chip-outline'],
            Personal: ['person',       'person-outline'],
          };
          const [active, inactive] = icons[route.name] ?? ['ellipse', 'ellipse-outline'];
          return <Ionicons name={(focused ? active : inactive) as any} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Overview" component={OverviewNavigator} options={{ tabBarLabel: isAr ? 'نظرة عامة' : 'Overview' }} />
      <Tab.Screen name="Finance"  component={FinanceNavigator}  options={{ tabBarLabel: isAr ? 'المالية'   : 'Finance'  }} />
      <Tab.Screen name="HR"       component={HRNavigator}       options={{ tabBarLabel: isAr ? 'الموارد'   : 'HR'       }} />
      <Tab.Screen name="AITools"  component={AINavigator}       options={{ tabBarLabel: isAr ? 'الذكاء'    : 'AI Tools' }} />
      <Tab.Screen name="Personal" component={PersonalNavigator} options={{ tabBarLabel: isAr ? 'شخصي'      : 'Personal' }} />
    </Tab.Navigator>
  );
}
