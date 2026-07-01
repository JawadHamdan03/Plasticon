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
      title: 'نظرة عامة',
      items: [
        { icon: 'analytics',       label: 'لوحة المالية',   desc: 'نظرة عامة على الإيرادات والمصاريف والأرباح',   screen: 'FinanceDash',         color: colors.primary },
        { icon: 'document-text',   label: 'التقارير المالية', desc: isAr ? 'قوائم الأرباح والخسائر والميزانية' : "P&L, balance sheet and statements",             screen: 'FinancialReports',    color: colors.info },
        { icon: 'pie-chart',       label: 'تحليل التكاليف',      desc: 'تفصيل التكاليف حسب الفئة والفترة',         screen: 'CostAnalysis',        color: colors.warning },
        { icon: 'wallet',          label: 'التخطيط الميزانياتي', desc: 'ميزانيات الأقسام وتتبع الفروق',       screen: 'BudgetPlanning',      color: colors.success },
        { icon: 'bar-chart',       label: 'التقارير',                   desc: 'تقارير مخصصة للمصنع والمالية',             screen: 'Reports',             color: colors.textMuted },
      ],
    },
    {
      title: 'الفواتير والمدفوعات',
      items: [
        { icon: 'receipt',           label: 'الفواتير',                        desc: 'إدارة الفواتير وتتبعها',                   screen: 'Invoices',            color: colors.primary },
        { icon: 'arrow-down-circle', label: 'ذمم العملاء',         desc: 'المبالغ المستحقة من العملاء',           screen: 'CustomerReceivables', color: colors.success },
        { icon: 'arrow-up-circle',   label: 'ذمم الموردين',          desc: 'المبالغ المستحقة للموردين',               screen: 'SupplierPayables',    color: colors.danger },
        { icon: 'card',              label: 'المصاريف',                        desc: 'تتبع المصاريف والموافقة عليها',              screen: 'Expenses',            color: colors.warning },
        { icon: 'git-compare',       label: 'تسوية البنك',         desc: 'مطابقة معاملات البنك بالسجلات',         screen: 'BankReconciliation',  color: colors.info },
        { icon: 'document-attach',   label: 'الامتثال الضريبي',         desc: 'تقديمات الضرائب وإدارة الامتثال',    screen: 'TaxCompliance',       color: colors.accent },
        { icon: 'checkmark-circle',  label: 'سير عمل الموافقات',    desc: 'موافقات مالية متعددة المراحل',              screen: 'ApprovalWorkflows',   color: colors.success },
      ],
    },
    {
      title: 'سلسلة التوريد',
      items: [
        { icon: 'people',          label: 'الموردون',                desc: 'دليل الموردين وأدائهم',               screen: 'Suppliers',           color: colors.info },
        { icon: 'pricetag',        label: 'تسعير القطع',         desc: 'تسعير قطع الغيار وبحث التكاليف',      screen: 'PartsPricing',        color: colors.warning },
        { icon: 'cart',            label: 'المشتريات',               desc: 'أوامر الشراء والمشتريات',                 screen: 'Purchases',           color: colors.primary },
        { icon: 'trending-up',     label: 'المبيعات',                    desc: 'طلبات البيع وتتبع الإيرادات',           screen: 'Sales',               color: colors.success },
        { icon: 'cube',            label: 'المخزون',                 desc: 'مستويات المخزون وإدارته',          screen: 'Inventory',           color: colors.accent },
      ],
    },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.text }]}>{'المالية'}</Text>
        <Text style={[styles.sub, { color: colors.textMuted }]}>{'الإدارة المالية الكاملة وسلسلة التوريد'}</Text>
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
