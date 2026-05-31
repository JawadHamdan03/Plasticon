import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

export function AdminFinMenuScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const navigation = useNavigation<any>();

  const SECTIONS = [
    {
      title: isAr ? 'نظرة عامة' : 'Overview',
      items: [
        { icon: 'analytics',       label: isAr ? 'لوحة المالية' : 'Finance Dashboard',   desc: isAr ? 'نظرة عامة على الإيرادات والمصاريف والأرباح' : 'Revenue, expenses and profit overview',   screen: 'FinanceDash',         color: colors.primary },
        { icon: 'document-text',   label: isAr ? 'التقارير المالية' : 'Financial Reports', desc: isAr ? 'قوائم الأرباح والخسائر والميزانية' : "P&L, balance sheet and statements",             screen: 'FinancialReports',    color: colors.info },
        { icon: 'pie-chart',       label: isAr ? 'تحليل التكاليف' : 'Cost Analysis',      desc: isAr ? 'تفصيل التكاليف حسب الفئة والفترة' : 'Cost breakdown by category and period',         screen: 'CostAnalysis',        color: colors.warning },
        { icon: 'wallet',          label: isAr ? 'التخطيط الميزانياتي' : 'Budget Planning', desc: isAr ? 'ميزانيات الأقسام وتتبع الفروق' : 'Department budgets and variance tracking',       screen: 'BudgetPlanning',      color: colors.success },
        { icon: 'bar-chart',       label: isAr ? 'التقارير' : 'Reports',                   desc: isAr ? 'تقارير مخصصة للمصنع والمالية' : 'Custom factory and financial reports',             screen: 'Reports',             color: colors.textMuted },
      ],
    },
    {
      title: isAr ? 'الفواتير والمدفوعات' : 'Invoices & Payments',
      items: [
        { icon: 'receipt',           label: isAr ? 'الفواتير' : 'Invoices',                        desc: isAr ? 'إدارة الفواتير وتتبعها' : 'Invoice management and tracking',                   screen: 'Invoices',            color: colors.primary },
        { icon: 'arrow-down-circle', label: isAr ? 'ذمم العملاء' : 'Customer Receivables',         desc: isAr ? 'المبالغ المستحقة من العملاء' : 'Outstanding amounts from customers',           screen: 'CustomerReceivables', color: colors.success },
        { icon: 'arrow-up-circle',   label: isAr ? 'ذمم الموردين' : 'Supplier Payables',          desc: isAr ? 'المبالغ المستحقة للموردين' : 'Outstanding amounts to suppliers',               screen: 'SupplierPayables',    color: colors.danger },
        { icon: 'card',              label: isAr ? 'المصاريف' : 'Expenses',                        desc: isAr ? 'تتبع المصاريف والموافقة عليها' : 'Expense tracking and approval',              screen: 'Expenses',            color: colors.warning },
        { icon: 'git-compare',       label: isAr ? 'تسوية البنك' : 'Bank Reconciliation',         desc: isAr ? 'مطابقة معاملات البنك بالسجلات' : 'Match bank transactions to records',         screen: 'BankReconciliation',  color: colors.info },
        { icon: 'document-attach',   label: isAr ? 'الامتثال الضريبي' : 'Tax Compliance',         desc: isAr ? 'تقديمات الضرائب وإدارة الامتثال' : 'Tax filings and compliance management',    screen: 'TaxCompliance',       color: colors.accent },
        { icon: 'checkmark-circle',  label: isAr ? 'سير عمل الموافقات' : 'Approval Workflows',    desc: isAr ? 'موافقات مالية متعددة المراحل' : 'Multi-step financial approvals',              screen: 'ApprovalWorkflows',   color: colors.success },
      ],
    },
    {
      title: isAr ? 'سلسلة التوريد' : 'Supply Chain',
      items: [
        { icon: 'people',          label: isAr ? 'الموردون' : 'Suppliers',                desc: isAr ? 'دليل الموردين وأدائهم' : 'Supplier directory and performance',               screen: 'Suppliers',           color: colors.info },
        { icon: 'pricetag',        label: isAr ? 'تسعير القطع' : 'Parts Pricing',         desc: isAr ? 'تسعير قطع الغيار وبحث التكاليف' : 'Spare parts pricing and cost lookup',      screen: 'PartsPricing',        color: colors.warning },
        { icon: 'cart',            label: isAr ? 'المشتريات' : 'Purchases',               desc: isAr ? 'أوامر الشراء والمشتريات' : 'Purchase orders and procurement',                 screen: 'Purchases',           color: colors.primary },
        { icon: 'trending-up',     label: isAr ? 'المبيعات' : 'Sales',                    desc: isAr ? 'طلبات البيع وتتبع الإيرادات' : 'Sales orders and revenue tracking',           screen: 'Sales',               color: colors.success },
        { icon: 'cube',            label: isAr ? 'المخزون' : 'Inventory',                 desc: isAr ? 'مستويات المخزون وإدارته' : 'Stock levels and inventory management',          screen: 'Inventory',           color: colors.accent },
        { icon: 'business',        label: isAr ? 'المستودع' : 'Warehouse',                desc: isAr ? 'تخطيط المستودع ومواقع التخزين' : 'Warehouse layout and storage locations',   screen: 'Warehouse',           color: colors.textMuted },
        { icon: 'star',            label: isAr ? 'أداء الموظفين' : 'Employee Performance', desc: isAr ? 'مراجعات الأداء والتقييمات' : 'Performance reviews and evaluations',        screen: 'EmployeePerformance', color: colors.roleEngineer },
      ],
    },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.text }]}>{isAr ? 'المالية' : 'Finance'}</Text>
        <Text style={[styles.sub, { color: colors.textMuted }]}>{isAr ? 'الإدارة المالية الكاملة وسلسلة التوريد' : 'Full financial and supply chain management'}</Text>
        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{section.title.toUpperCase()}</Text>
            {section.items.map((item) => (
              <TouchableOpacity
                key={item.screen}
                style={[styles.item, { backgroundColor: colors.surface }]}
                onPress={() => navigation.navigate(item.screen)}
                activeOpacity={0.75}
              >
                <View style={[styles.icon, { backgroundColor: `${item.color}15` }]}>
                  <Ionicons name={item.icon as any} size={22} color={item.color} />
                </View>
                <View style={styles.itemText}>
                  <Text style={[styles.itemLabel, { color: colors.text }]}>{item.label}</Text>
                  <Text style={[styles.itemDesc, { color: colors.textMuted }]}>{item.desc}</Text>
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
  safe:         { flex: 1 },
  content:      { padding: spacing.md, paddingBottom: spacing.xxl },
  title:        { ...typography.h1, marginTop: spacing.sm },
  sub:          { ...typography.bodySmall, marginBottom: spacing.lg, marginTop: 2 },
  section:      { marginBottom: spacing.lg },
  sectionTitle: { ...typography.sectionLabel, marginBottom: spacing.sm },
  item:         { flexDirection: 'row', alignItems: 'center', borderRadius: radius.lg, padding: spacing.md, gap: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  icon:         { width: 46, height: 46, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  itemText:     { flex: 1 },
  itemLabel:    { ...typography.h4 },
  itemDesc:     { ...typography.bodySmall, marginTop: 2 },
});
