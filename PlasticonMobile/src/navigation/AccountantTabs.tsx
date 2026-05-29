import React from 'react';
import { createBottomTabNavigator }   from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons }                   from '@expo/vector-icons';
import { colors }                     from '../theme';

import {
  AccountantTabParamList,
  AccountantFinanceStackParamList,
  AccountantInvoicesStackParamList,
  AccountantExpensesStackParamList,
  AccountantMoreStackParamList,
} from './types';

// ─── Finance screens ──────────────────────────────────────────────────────────
import { FinanceDashScreen }       from '../screens/accountant/FinanceDashScreen';
import { FinancialReportsScreen }  from '../screens/accountant/FinancialReportsScreen';
import { CostAnalysisScreen }      from '../screens/accountant/CostAnalysisScreen';
import { BudgetPlanningScreen }    from '../screens/accountant/BudgetPlanningScreen';

// ─── Invoices screens ─────────────────────────────────────────────────────────
import { InvoiceMenuScreen }           from '../screens/accountant/InvoiceMenuScreen';
import { InvoicesScreen }              from '../screens/accountant/InvoicesScreen';
import { CustomerReceivablesScreen }   from '../screens/accountant/CustomerReceivablesScreen';
import { SupplierPayablesScreen }      from '../screens/accountant/SupplierPayablesScreen';

// ─── Expenses screens ─────────────────────────────────────────────────────────
import { ExpenseMenuScreen }         from '../screens/accountant/ExpenseMenuScreen';
import { ExpensesScreen }            from '../screens/accountant/ExpensesScreen';
import { BankReconciliationScreen }  from '../screens/accountant/BankReconciliationScreen';
import { TaxComplianceScreen }       from '../screens/accountant/TaxComplianceScreen';

// ─── More screens ─────────────────────────────────────────────────────────────
import { AcctMoreScreen }             from '../screens/accountant/AcctMoreScreen';
import { SuppliersScreen }            from '../screens/accountant/SuppliersScreen';
import { PartsPricingScreen }         from '../screens/accountant/PartsPricingScreen';
import { ApprovalWorkflowsScreen }    from '../screens/accountant/ApprovalWorkflowsScreen';
import { EmployeePerformanceScreen }  from '../screens/accountant/EmployeePerformanceScreen';
import { AIHubScreen }                from '../screens/shared/AIHubScreen';
import { AssistantScreen }            from '../screens/shared/AssistantScreen';
import { NotificationsScreen }        from '../screens/shared/NotificationsScreen';

// ─── Profile ─────────────────────────────────────────────────────────────────
import { ProfileScreen } from '../screens/shared/ProfileScreen';

// ─── Stack: Finance tab ───────────────────────────────────────────────────────
const FinanceStack = createNativeStackNavigator<AccountantFinanceStackParamList>();
function FinanceNavigator() {
  return (
    <FinanceStack.Navigator screenOptions={{ headerShown: false }}>
      <FinanceStack.Screen name="FinanceDash"      component={FinanceDashScreen} />
      <FinanceStack.Screen name="FinancialReports" component={FinancialReportsScreen} />
      <FinanceStack.Screen name="CostAnalysis"     component={CostAnalysisScreen} />
      <FinanceStack.Screen name="BudgetPlanning"   component={BudgetPlanningScreen} />
    </FinanceStack.Navigator>
  );
}

// ─── Stack: Invoices tab ──────────────────────────────────────────────────────
const InvoicesStack = createNativeStackNavigator<AccountantInvoicesStackParamList>();
function InvoicesNavigator() {
  return (
    <InvoicesStack.Navigator screenOptions={{ headerShown: false }}>
      <InvoicesStack.Screen name="InvoiceMenu"          component={InvoiceMenuScreen} />
      <InvoicesStack.Screen name="Invoices"             component={InvoicesScreen} />
      <InvoicesStack.Screen name="CustomerReceivables"  component={CustomerReceivablesScreen} />
      <InvoicesStack.Screen name="SupplierPayables"     component={SupplierPayablesScreen} />
    </InvoicesStack.Navigator>
  );
}

// ─── Stack: Expenses tab ──────────────────────────────────────────────────────
const ExpensesStack = createNativeStackNavigator<AccountantExpensesStackParamList>();
function ExpensesNavigator() {
  return (
    <ExpensesStack.Navigator screenOptions={{ headerShown: false }}>
      <ExpensesStack.Screen name="ExpenseMenu"         component={ExpenseMenuScreen} />
      <ExpensesStack.Screen name="Expenses"            component={ExpensesScreen} />
      <ExpensesStack.Screen name="BankReconciliation"  component={BankReconciliationScreen} />
      <ExpensesStack.Screen name="TaxCompliance"       component={TaxComplianceScreen} />
    </ExpensesStack.Navigator>
  );
}

// ─── Stack: More tab ──────────────────────────────────────────────────────────
const MoreStack = createNativeStackNavigator<AccountantMoreStackParamList>();
function MoreNavigator() {
  return (
    <MoreStack.Navigator screenOptions={{ headerShown: false }}>
      <MoreStack.Screen name="AcctMore"            component={AcctMoreScreen} />
      <MoreStack.Screen name="Suppliers"           component={SuppliersScreen} />
      <MoreStack.Screen name="PartsPricing"        component={PartsPricingScreen} />
      <MoreStack.Screen name="ApprovalWorkflows"   component={ApprovalWorkflowsScreen} />
      <MoreStack.Screen name="EmployeePerformance" component={EmployeePerformanceScreen} />
      <MoreStack.Screen name="AIHub"               component={AIHubScreen} />
      <MoreStack.Screen name="Assistant"           component={AssistantScreen} />
      <MoreStack.Screen name="Notifications"       component={NotificationsScreen} />
    </MoreStack.Navigator>
  );
}

// ─── Bottom Tabs ──────────────────────────────────────────────────────────────
const Tab = createBottomTabNavigator<AccountantTabParamList>();

export function AccountantTabs() {
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
            Finance:  ['wallet',        'wallet-outline'],
            Invoices: ['document-text', 'document-text-outline'],
            Expenses: ['receipt',       'receipt-outline'],
            More:     ['grid',          'grid-outline'],
            Profile:  ['person',        'person-outline'],
          };
          const [active, inactive] = icons[route.name] ?? ['ellipse', 'ellipse-outline'];
          return <Ionicons name={(focused ? active : inactive) as any} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Finance"  component={FinanceNavigator}  options={{ tabBarLabel: 'Finance' }}  />
      <Tab.Screen name="Invoices" component={InvoicesNavigator} options={{ tabBarLabel: 'Invoices' }} />
      <Tab.Screen name="Expenses" component={ExpensesNavigator} options={{ tabBarLabel: 'Expenses' }} />
      <Tab.Screen name="More"     component={MoreNavigator}     options={{ tabBarLabel: 'More' }}     />
      <Tab.Screen name="Profile"  component={ProfileScreen}     options={{ tabBarLabel: 'Profile' }}  />
    </Tab.Navigator>
  );
}
