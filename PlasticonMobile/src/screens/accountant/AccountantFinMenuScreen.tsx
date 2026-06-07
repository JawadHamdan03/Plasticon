import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

interface MenuItem {
  icon:    string;
  label:   string;
  labelAr: string;
  desc:    string;
  color:   string;
  screen:  string;
}

function Section({ title, items, colors, isAr }: { title: string; items: MenuItem[]; colors: any; isAr: boolean }) {
  const navigation = useNavigation<any>();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{title}</Text>
      {items.map((item) => (
        <TouchableOpacity key={item.screen} style={[styles.item, { backgroundColor: colors.surface }]} onPress={() => navigation.navigate(item.screen)} activeOpacity={0.75}>
          <View style={[styles.iconWrap, { backgroundColor: `${item.color}15` }]}>
            <Ionicons name={item.icon as any} size={22} color={item.color} />
          </View>
          <View style={styles.itemText}>
            <Text style={[styles.itemLabel, { color: colors.text }]}>{isAr ? item.labelAr : item.label}</Text>
            <Text style={[styles.itemDesc, { color: colors.textMuted }]}>{item.desc}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function AccountantFinMenuScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();

  const CORE_ITEMS: MenuItem[] = [
    { icon: 'speedometer',       label: 'Financial Dashboard', labelAr: 'لوحة المالية',        desc: 'Revenue, expenses and profit KPIs',  color: colors.accent,   screen: 'FinanceDash'         },
    { icon: 'document-text',     label: 'Invoices',            labelAr: 'الفواتير',             desc: 'Customer invoices and billing',       color: colors.primary,  screen: 'Invoices'            },
    { icon: 'receipt',           label: 'Expenses',            labelAr: 'المصروفات',            desc: 'Track and categorize expenses',       color: colors.danger,   screen: 'Expenses'            },
    { icon: 'bar-chart',         label: 'Financial Reports',   labelAr: 'تقارير مالية',         desc: 'P&L, balance sheet and statements',   color: colors.info,     screen: 'FinancialReports'    },
    { icon: 'arrow-up-circle',   label: 'Supplier Payables',   labelAr: 'مستحقات الموردين',     desc: 'Supplier payment obligations',        color: colors.warning,  screen: 'SupplierPayables'    },
    { icon: 'arrow-down-circle', label: 'Customer Receivables',labelAr: 'مستقبلات العملاء',    desc: 'Customer outstanding amounts',        color: colors.success,  screen: 'CustomerReceivables' },
    { icon: 'wallet',            label: 'Budget Planning',     labelAr: 'التخطيط الميزاني',     desc: 'Budget planning and allocations',     color: '#6366F1',       screen: 'BudgetPlanning'      },
    { icon: 'sync',              label: 'Reconciliation',      labelAr: 'التسوية',              desc: 'Bank and account reconciliation',     color: '#0EA5E9',       screen: 'BankReconciliation'  },
    { icon: 'analytics',         label: 'Cost Analysis',       labelAr: 'تحليل التكاليف',       desc: 'Production and operational costs',    color: '#8B5CF6',       screen: 'CostAnalysis'        },
    { icon: 'checkmark-done',    label: 'Approval Workflows',  labelAr: 'سير الموافقات',        desc: 'Purchase and expense approvals',      color: colors.success,  screen: 'ApprovalWorkflows'   },
  ];

  const OPS_ITEMS: MenuItem[] = [
    { icon: 'layers',       label: 'Inventory',  labelAr: 'المخزون',    desc: 'Full inventory records',        color: colors.primary, screen: 'Inventory'  },
    { icon: 'cart',         label: 'Purchases',  labelAr: 'المشتريات',  desc: 'Purchase orders and history',   color: colors.info,    screen: 'Purchases'  },
    { icon: 'trending-up',  label: 'Sales',      labelAr: 'المبيعات',   desc: 'Sales orders and revenue',      color: colors.success, screen: 'Sales'      },
  ];

  const MORE_ITEMS: MenuItem[] = [
    { icon: 'pricetag',  label: 'Parts Pricing',         labelAr: 'تسعير القطع',       desc: 'Spare part costs and pricing',       color: '#F59E0B', screen: 'PartsPricing'        },
    { icon: 'business',  label: 'Suppliers',              labelAr: 'الموردون',          desc: 'Supplier list and management',       color: '#0284C7', screen: 'Suppliers'           },
    { icon: 'people',    label: 'Employee Performance',   labelAr: 'أداء الموظفين',     desc: 'Employee productivity metrics',      color: '#7C3AED', screen: 'EmployeePerformance' },
    { icon: 'construct', label: 'Maintenance Costs',      labelAr: 'تكاليف الصيانة',   desc: 'Maintenance expense tracking',       color: '#DC2626', screen: 'MaintCosts'          },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.pageHeader}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>{isAr ? 'المالية' : 'Finance'}</Text>
          <Text style={[styles.pageSub, { color: colors.textMuted }]}>{isAr ? '١٧ أداة وتقرير' : '17 tools and reports'}</Text>
        </View>
        <Section title={isAr ? 'المالية الأساسية' : 'Core Finance'} items={CORE_ITEMS} colors={colors} isAr={isAr} />
        <Section title={isAr ? 'العمليات' : 'Operations'}           items={OPS_ITEMS}  colors={colors} isAr={isAr} />
        <Section title={isAr ? 'المزيد' : 'More'}                   items={MORE_ITEMS} colors={colors} isAr={isAr} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1 },
  content:      { padding: spacing.md, paddingBottom: spacing.xxl },
  pageHeader:   { marginBottom: spacing.lg, paddingTop: spacing.sm },
  pageTitle:    { ...typography.h1 },
  pageSub:      { ...typography.bodySmall, marginTop: 2 },
  section:      { marginBottom: spacing.lg },
  sectionTitle: { ...typography.caption, marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.8 },
  item:         { flexDirection: 'row', alignItems: 'center', borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm, marginBottom: spacing.xs, ...shadow.sm },
  iconWrap:     { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  itemText:     { flex: 1 },
  itemLabel:    { ...typography.h4 },
  itemDesc:     { ...typography.bodySmall, marginTop: 1 },
});
