import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, radius, shadow, spacing, typography } from '../../theme';

const SECTIONS = [
  {
    title: 'Overview',
    items: [
      { icon: 'analytics',       label: 'Finance Dashboard',   desc: 'Revenue, expenses and profit overview',       screen: 'FinanceDash',         color: colors.primary },
      { icon: 'document-text',   label: 'Financial Reports',   desc: 'P&L, balance sheet and statements',           screen: 'FinancialReports',    color: colors.info },
      { icon: 'pie-chart',       label: 'Cost Analysis',       desc: 'Cost breakdown by category and period',       screen: 'CostAnalysis',        color: colors.warning },
      { icon: 'wallet',          label: 'Budget Planning',     desc: 'Department budgets and variance tracking',    screen: 'BudgetPlanning',      color: colors.success },
      { icon: 'bar-chart',       label: 'Reports',             desc: 'Custom factory and financial reports',        screen: 'Reports',             color: colors.textMuted },
    ],
  },
  {
    title: 'Invoices & Payments',
    items: [
      { icon: 'receipt',         label: 'Invoices',             desc: 'Invoice management and tracking',             screen: 'Invoices',            color: colors.primary },
      { icon: 'arrow-down-circle', label: 'Customer Receivables', desc: 'Outstanding amounts from customers',        screen: 'CustomerReceivables', color: colors.success },
      { icon: 'arrow-up-circle', label: 'Supplier Payables',    desc: 'Outstanding amounts to suppliers',            screen: 'SupplierPayables',    color: colors.danger },
      { icon: 'card',            label: 'Expenses',             desc: 'Expense tracking and approval',               screen: 'Expenses',            color: colors.warning },
      { icon: 'git-compare',     label: 'Bank Reconciliation',  desc: 'Match bank transactions to records',          screen: 'BankReconciliation',  color: colors.info },
      { icon: 'document-attach', label: 'Tax Compliance',       desc: 'Tax filings and compliance management',       screen: 'TaxCompliance',       color: colors.accent },
      { icon: 'checkmark-circle', label: 'Approval Workflows',  desc: 'Multi-step financial approvals',              screen: 'ApprovalWorkflows',   color: colors.success },
    ],
  },
  {
    title: 'Supply Chain',
    items: [
      { icon: 'people',          label: 'Suppliers',            desc: 'Supplier directory and performance',          screen: 'Suppliers',           color: colors.info },
      { icon: 'pricetag',        label: 'Parts Pricing',        desc: 'Spare parts pricing and cost lookup',         screen: 'PartsPricing',        color: colors.warning },
      { icon: 'cart',            label: 'Purchases',            desc: 'Purchase orders and procurement',             screen: 'Purchases',           color: colors.primary },
      { icon: 'trending-up',     label: 'Sales',                desc: 'Sales orders and revenue tracking',           screen: 'Sales',               color: colors.success },
      { icon: 'cube',            label: 'Inventory',            desc: 'Stock levels and inventory management',       screen: 'Inventory',           color: colors.accent },
      { icon: 'business',        label: 'Warehouse',            desc: 'Warehouse layout and storage locations',      screen: 'Warehouse',           color: colors.textMuted },
      { icon: 'star',            label: 'Employee Performance', desc: 'Performance reviews and evaluations',         screen: 'EmployeePerformance', color: colors.roleEngineer },
    ],
  },
];

export function AdminFinMenuScreen() {
  const navigation = useNavigation<any>();
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Finance</Text>
        <Text style={styles.sub}>Full financial and supply chain management</Text>
        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title.toUpperCase()}</Text>
            {section.items.map((item) => (
              <TouchableOpacity
                key={item.screen}
                style={styles.item}
                onPress={() => navigation.navigate(item.screen)}
                activeOpacity={0.75}
              >
                <View style={[styles.icon, { backgroundColor: `${item.color}15` }]}>
                  <Ionicons name={item.icon as any} size={22} color={item.color} />
                </View>
                <View style={styles.itemText}>
                  <Text style={styles.itemLabel}>{item.label}</Text>
                  <Text style={styles.itemDesc}>{item.desc}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: colors.background },
  content:      { padding: spacing.md, paddingBottom: spacing.xxl },
  title:        { ...typography.h1, marginTop: spacing.sm },
  sub:          { ...typography.bodySmall, color: colors.textMuted, marginBottom: spacing.lg, marginTop: 2 },
  section:      { marginBottom: spacing.lg },
  sectionTitle: { ...typography.sectionLabel, marginBottom: spacing.sm },
  item:         { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, gap: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  icon:         { width: 46, height: 46, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  itemText:     { flex: 1 },
  itemLabel:    { ...typography.h4 },
  itemDesc:     { ...typography.bodySmall, color: colors.textMuted, marginTop: 2 },
});
