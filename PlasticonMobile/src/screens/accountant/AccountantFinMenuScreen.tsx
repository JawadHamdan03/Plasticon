import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, radius, shadow, spacing, typography } from '../../theme';

interface MenuItem {
  icon:   string;
  label:  string;
  desc:   string;
  color:  string;
  screen: string;
}

const CORE_ITEMS: MenuItem[] = [
  { icon: 'speedometer',      label: 'Fin. Dashboard',  desc: 'Revenue, expenses and profit KPIs',   color: colors.accent,   screen: 'FinanceDash'         },
  { icon: 'document-text',    label: 'Invoices',         desc: 'Customer invoices and billing',       color: colors.primary,  screen: 'Invoices'            },
  { icon: 'receipt',          label: 'Expenses',         desc: 'Track and categorize expenses',       color: colors.danger,   screen: 'Expenses'            },
  { icon: 'bar-chart',        label: 'Fin. Reports',     desc: 'P&L, balance sheet and statements',   color: colors.info,     screen: 'FinancialReports'    },
  { icon: 'arrow-up-circle',  label: 'Payables',         desc: 'Supplier payment obligations',        color: colors.warning,  screen: 'SupplierPayables'    },
  { icon: 'arrow-down-circle',label: 'Receivables',      desc: 'Customer outstanding amounts',        color: colors.success,  screen: 'CustomerReceivables' },
  { icon: 'wallet',           label: 'Budgets',          desc: 'Budget planning and allocations',     color: '#6366F1',       screen: 'BudgetPlanning'      },
  { icon: 'document',         label: 'Tax Compliance',   desc: 'Tax filings and obligations',         color: '#EF4444',       screen: 'TaxCompliance'       },
  { icon: 'sync',             label: 'Reconciliation',   desc: 'Bank and account reconciliation',     color: '#0EA5E9',       screen: 'BankReconciliation'  },
  { icon: 'analytics',        label: 'Cost Analysis',    desc: 'Production and operational costs',    color: '#8B5CF6',       screen: 'CostAnalysis'        },
  { icon: 'checkmark-done',   label: 'Approvals',        desc: 'Purchase and expense approvals',      color: colors.success,  screen: 'ApprovalWorkflows'   },
];

const OPS_ITEMS: MenuItem[] = [
  { icon: 'cube',             label: 'Warehouse',        desc: 'Warehouse stock and locations',       color: '#D97706',       screen: 'Warehouse'           },
  { icon: 'layers',           label: 'Inventory',        desc: 'Full inventory records',              color: colors.primary,  screen: 'Inventory'           },
  { icon: 'cart',             label: 'Purchases',        desc: 'Purchase orders and history',         color: colors.info,     screen: 'Purchases'           },
  { icon: 'trending-up',      label: 'Sales',            desc: 'Sales orders and revenue',            color: colors.success,  screen: 'Sales'               },
];

const MORE_ITEMS: MenuItem[] = [
  { icon: 'pricetag',         label: 'Parts Pricing',    desc: 'Spare part costs and pricing',        color: '#F59E0B',       screen: 'PartsPricing'        },
  { icon: 'business',         label: 'Suppliers',        desc: 'Supplier list and management',        color: '#0284C7',       screen: 'Suppliers'           },
  { icon: 'people',           label: 'Performance',      desc: 'Employee productivity metrics',       color: '#7C3AED',       screen: 'EmployeePerformance' },
  { icon: 'construct',        label: 'Maint. Costs',     desc: 'Maintenance expense tracking',        color: '#DC2626',       screen: 'MaintCosts'          },
];

function Section({ title, items }: { title: string; items: MenuItem[] }) {
  const navigation = useNavigation<any>();
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.map((item) => (
        <TouchableOpacity key={item.screen} style={styles.item} onPress={() => navigation.navigate(item.screen)} activeOpacity={0.75}>
          <View style={[styles.iconWrap, { backgroundColor: `${item.color}15` }]}>
            <Ionicons name={item.icon as any} size={22} color={item.color} />
          </View>
          <View style={styles.itemText}>
            <Text style={styles.itemLabel}>{item.label}</Text>
            <Text style={styles.itemDesc}>{item.desc}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function AccountantFinMenuScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Finance</Text>
          <Text style={styles.pageSub}>19 tools and reports</Text>
        </View>
        <Section title="Core Finance"    items={CORE_ITEMS} />
        <Section title="Operations"      items={OPS_ITEMS}  />
        <Section title="More"            items={MORE_ITEMS} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: colors.background },
  content:      { padding: spacing.md, paddingBottom: spacing.xxl },
  pageHeader:   { marginBottom: spacing.lg, paddingTop: spacing.sm },
  pageTitle:    { ...typography.h1 },
  pageSub:      { ...typography.bodySmall, color: colors.textMuted, marginTop: 2 },
  section:      { marginBottom: spacing.lg },
  sectionTitle: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.8 },
  item:         { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm, marginBottom: spacing.xs, ...shadow.sm },
  iconWrap:     { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  itemText:     { flex: 1 },
  itemLabel:    { ...typography.h4 },
  itemDesc:     { ...typography.bodySmall, color: colors.textMuted, marginTop: 1 },
});
