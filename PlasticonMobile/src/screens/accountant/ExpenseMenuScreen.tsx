import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

export function ExpenseMenuScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const navigation = useNavigation<any>();

  const ITEMS = [
    { icon: 'receipt',          label: isAr ? 'تتبع المصاريف' : 'Expense Tracking',     desc: isAr ? 'تسجيل وتصنيف جميع نفقات الأعمال' : 'Log and categorise all business expenses',          screen: 'Expenses',            color: colors.danger },
    { icon: 'swap-horizontal',  label: isAr ? 'تسوية البنك' : 'Bank Reconciliation',     desc: isAr ? 'مطابقة كشوف البنك مع المعاملات المسجلة' : 'Match bank statements with recorded transactions', screen: 'BankReconciliation',  color: colors.success },
    { icon: 'calculator',       label: isAr ? 'الامتثال الضريبي' : 'Tax Compliance',     desc: isAr ? 'إدارة تقديمات الضرائب وتقارير الامتثال' : 'Manage tax filings and compliance reports',       screen: 'TaxCompliance',       color: colors.warning },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.text }]}>{isAr ? 'المصاريف' : 'Expenses'}</Text>
        <Text style={[styles.sub, { color: colors.textMuted }]}>{isAr ? 'إدارة المصاريف والامتثال' : 'Expense management and compliance'}</Text>
        <View style={styles.list}>
          {ITEMS.map((item) => (
            <TouchableOpacity key={item.screen} style={[styles.item, { backgroundColor: colors.surface }]} onPress={() => navigation.navigate(item.screen)} activeOpacity={0.75}>
              <View style={[styles.icon, { backgroundColor: `${item.color}15` }]}>
                <Ionicons name={item.icon as any} size={24} color={item.color} />
              </View>
              <View style={styles.itemText}>
                <Text style={[styles.itemLabel, { color: colors.text }]}>{item.label}</Text>
                <Text style={[styles.itemDesc, { color: colors.textMuted }]}>{item.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1 },
  content:   { padding: spacing.md, paddingBottom: spacing.xxl },
  title:     { ...typography.h1, marginTop: spacing.sm },
  sub:       { ...typography.bodySmall, marginBottom: spacing.lg, marginTop: 2 },
  list:      { gap: spacing.sm },
  item:      { flexDirection: 'row', alignItems: 'center', borderRadius: radius.lg, padding: spacing.md, gap: spacing.md, ...shadow.sm },
  icon:      { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  itemText:  { flex: 1 },
  itemLabel: { ...typography.h4 },
  itemDesc:  { ...typography.bodySmall, marginTop: 2 },
});
