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
import { colors, radius, shadow, spacing, typography } from '../../theme';

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function DailyRow({ item }: { item: DailyPayrollRecord }) {
  return (
    <View style={[styles.row, !item.isConfirmed && styles.rowPending]}>
      <View style={styles.rowLeft}>
        <Text style={styles.rowDate}>{fmtDate(item.date)}</Text>
        <Text style={styles.rowHours}>{item.hoursWorked.toFixed(1)} hrs</Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.rowPay}>${fmt(item.totalDailyPay)}</Text>
        <View style={[
          styles.badge,
          item.isConfirmed ? styles.badgeConfirmed : styles.badgePending,
        ]}>
          <Text style={[
            styles.badgeText,
            { color: item.isConfirmed ? colors.success : colors.warning },
          ]}>
            {item.isConfirmed ? 'Confirmed' : 'Pending'}
          </Text>
        </View>
      </View>
    </View>
  );
}

export function PayrollScreen() {
  const [monthly, setMonthly]     = useState<MonthlyPayroll | null>(null);
  const [daily, setDaily]         = useState<DailyPayrollRecord[]>([]);
  const [loading, setLoading]     = useState(true);
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
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="My Payroll" showBack />

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
                <Text style={styles.monthLabel}>{monthly.month}</Text>
                <View style={styles.statRow}>
                  <StatCard
                    label="Total Salary"
                    value={`$${fmt(monthly.totalSalary)}`}
                    icon="cash"
                    color={colors.success}
                    style={styles.stat}
                  />
                  <StatCard
                    label="Total Hours"
                    value={`${monthly.totalHours ?? 0}h`}
                    icon="time"
                    color={colors.primary}
                    style={styles.stat}
                  />
                </View>
                {monthly.overtimeSalary ? (
                  <View style={styles.overtimeRow}>
                    <Ionicons name="trending-up" size={14} color={colors.accent} />
                    <Text style={styles.overtimeText}>
                      Overtime bonus: ${fmt(monthly.overtimeSalary)}
                    </Text>
                  </View>
                ) : null}
                <Text style={[typography.sectionLabel, { marginBottom: spacing.sm, marginTop: spacing.md }]}>
                  DAILY RECORDS
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="cash-outline" size={44} color={colors.textMuted} />
              <Text style={styles.emptyText}>No payroll records yet</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:   { padding: spacing.md, paddingBottom: 40 },

  header:    {},
  monthLabel: { ...typography.h2, marginBottom: spacing.md },
  statRow:   { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  stat:      { flex: 1 },
  overtimeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  overtimeText: { ...typography.bodySmall, color: colors.accent, fontWeight: '600' },

  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm,
  },
  rowPending: { borderLeftWidth: 3, borderLeftColor: colors.warning },
  rowLeft:  {},
  rowDate:  { ...typography.h4 },
  rowHours: { ...typography.caption, marginTop: 2 },
  rowRight: { alignItems: 'flex-end' },
  rowPay:   { fontSize: 17, fontWeight: '700', color: colors.text },
  badge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: radius.full, marginTop: 4,
  },
  badgeConfirmed: { backgroundColor: colors.successLight },
  badgePending:   { backgroundColor: colors.warningLight },
  badgeText: { fontSize: 11, fontWeight: '700' },

  empty:     { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText: { ...typography.bodySmall, color: colors.textMuted },
});
