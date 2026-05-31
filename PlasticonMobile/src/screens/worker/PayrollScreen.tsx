import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, RefreshControl,
  StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader, StatCard } from '../../components';
import { DailyPayrollRecord, MonthlyPayroll } from '../../api/types';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function DailyRow({ item }: { item: DailyPayrollRecord }) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  return (
    <View style={[
      styles.row,
      { backgroundColor: colors.surface },
      !item.isConfirmed && { borderLeftWidth: 3, borderLeftColor: colors.warning },
    ]}>
      <View style={styles.rowLeft}>
        <Text style={[styles.rowDate, { color: colors.text }]}>{fmtDate(item.date)}</Text>
        <Text style={[styles.rowHours, { color: colors.textMuted }]}>{item.hoursWorked.toFixed(1)} {isAr ? 'ساعة' : 'hrs'}</Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={[styles.rowPay, { color: colors.text }]}>${fmt(item.totalDailyPay)}</Text>
        <View style={[styles.badge, { backgroundColor: item.isConfirmed ? colors.successLight : colors.warningLight }]}>
          <Text style={[styles.badgeText, { color: item.isConfirmed ? colors.success : colors.warning }]}>
            {item.isConfirmed ? (isAr ? 'مؤكد' : 'Confirmed') : (isAr ? 'معلق' : 'Pending')}
          </Text>
        </View>
      </View>
    </View>
  );
}

export function PayrollScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const [monthly, setMonthly]       = useState<MonthlyPayroll | null>(null);
  const [daily, setDaily]           = useState<DailyPayrollRecord[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [mo, da] = await Promise.allSettled([
        api.get<{ payroll: MonthlyPayroll[] }>('/payroll/me?limit=1'),
        api.get<{ records: DailyPayrollRecord[] }>('/payroll/daily/me?limit=31'),
      ]);
      if (mo.status === 'fulfilled') setMonthly(mo.value.payroll?.[0] ?? null);
      if (da.status === 'fulfilled') setDaily(da.value.records ?? []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); void load(); };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={isAr ? 'راتبي' : 'My Payroll'} showBack />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={daily}
          keyExtractor={(i, idx) => `${String(i.id)}-${idx}`}
          renderItem={({ item }) => <DailyRow item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListHeaderComponent={
            monthly ? (
              <View style={styles.header}>
                <Text style={[styles.monthLabel, { color: colors.text }]}>{monthly.month}</Text>
                <View style={styles.statRow}>
                  <StatCard
                    label={isAr ? 'الراتب الكلي' : 'Total Salary'}
                    value={`$${fmt(monthly.totalSalary)}`}
                    icon="cash"
                    color={colors.success}
                    style={styles.stat}
                  />
                  <StatCard
                    label={isAr ? 'إجمالي الساعات' : 'Total Hours'}
                    value={`${monthly.totalHours ?? 0}h`}
                    icon="time"
                    color={colors.primary}
                    style={styles.stat}
                  />
                </View>
                {monthly.overtimeSalary ? (
                  <View style={styles.overtimeRow}>
                    <Ionicons name="trending-up" size={14} color={colors.accent} />
                    <Text style={[styles.overtimeText, { color: colors.accent }]}>
                      {isAr ? `مكافأة إضافية: $${fmt(monthly.overtimeSalary)}` : `Overtime bonus: $${fmt(monthly.overtimeSalary)}`}
                    </Text>
                  </View>
                ) : null}
                <Text style={[typography.sectionLabel, { color: colors.textMuted, marginBottom: spacing.sm, marginTop: spacing.md }]}>
                  {isAr ? 'السجلات اليومية' : 'DAILY RECORDS'}
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="cash-outline" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>{isAr ? 'لا توجد سجلات رواتب بعد' : 'No payroll records yet'}</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:   { padding: spacing.md, paddingBottom: 40 },

  header:       {},
  monthLabel:   { ...typography.h2, marginBottom: spacing.md },
  statRow:      { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  stat:         { flex: 1 },
  overtimeRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  overtimeText: { ...typography.bodySmall, fontWeight: '600' },

  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm,
  },
  rowLeft:  {},
  rowDate:  { ...typography.h4 },
  rowHours: { ...typography.caption, marginTop: 2 },
  rowRight: { alignItems: 'flex-end' },
  rowPay:   { fontSize: 17, fontWeight: '700' },
  badge:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full, marginTop: 4 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  empty:     { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText: { ...typography.bodySmall },
});
