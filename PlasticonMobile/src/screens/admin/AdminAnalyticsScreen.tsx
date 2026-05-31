import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

interface Analytics {
  totalUsers?: number;
  activeUsers?: number;
  totalMachines?: number;
  operationalMachines?: number;
  totalShifts?: number;
  todayTotalHours?: number;
  thisMonthPayroll?: number;
  productionToday?: number;
  inventoryItems?: number;
  lowStockItems?: number;
}

const RANGES = ['Today', '7 Days', '30 Days', '90 Days'] as const;
type Range = typeof RANGES[number];

function rangeParams(range: Range) {
  const now  = new Date();
  const to   = now.toISOString().split('T')[0];
  const days = range === 'Today' ? 1 : range === '7 Days' ? 7 : range === '30 Days' ? 30 : 90;
  const from = new Date(now.getTime() - days * 86400_000).toISOString().split('T')[0];
  return `?from=${from}&to=${to}`;
}

function StatRow({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.statRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View style={styles.statRight}>
        <Text style={[styles.statValue, { color: color ?? colors.text }]}>{value}</Text>
        {sub ? <Text style={[styles.statSub, { color: colors.textMuted }]}>{sub}</Text> : null}
      </View>
    </View>
  );
}

export function AdminAnalyticsScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const [data, setData]         = useState<Analytics | null>(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [range, setRange]       = useState<Range>('Today');

  const load = useCallback(async (r: Range = range) => {
    try {
      const res = await api.get<Analytics>(`/dashboard/analytics${rangeParams(r)}`);
      setData(res && typeof res === 'object' ? res : {});
    } catch {
      setData({});
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [range]);

  useEffect(() => { void load(); }, [load]);

  const changeRange = (r: Range) => {
    setRange(r);
    setLoading(true);
    void load(r);
  };

  const fmt = (n?: number) => {
    if (!n) return '$0';
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
    return `$${n.toLocaleString()}`;
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={isAr ? 'التحليلات' : 'Analytics'} showBack />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
      >
        {/* Date range filter */}
        <View style={styles.rangeRow}>
          {RANGES.map((r) => (
            <TouchableOpacity
              key={r}
              style={[
                styles.rangeBtn,
                { borderColor: colors.border, backgroundColor: colors.surface },
                range === r && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              onPress={() => changeRange(r)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.rangeTxt,
                { color: colors.textMuted },
                range === r && { color: '#fff' },
              ]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
        ) : (
          <>
            {/* People */}
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
                <Ionicons name="people" size={16} color={colors.primary} />
                <Text style={[styles.cardTitle, { color: colors.text }]}>{isAr ? 'الموظفون' : 'People'}</Text>
              </View>
              <StatRow label={isAr ? 'إجمالي المستخدمين' : 'Total Users'}        value={String(data?.totalUsers ?? 0)} />
              <StatRow label={isAr ? 'المستخدمون النشطون' : 'Active Users'}      value={String(data?.activeUsers ?? 0)}     color={colors.success} />
              <StatRow label={isAr ? 'إجمالي الورديات' : 'Total Shifts'}         value={String(data?.totalShifts ?? 0)} />
              <StatRow label={isAr ? 'ساعات اليوم' : 'Hours Logged Today'}       value={`${data?.todayTotalHours ?? 0}h`} color={colors.info} />
            </View>

            {/* Production */}
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
                <Ionicons name="cube" size={16} color={colors.info} />
                <Text style={[styles.cardTitle, { color: colors.text }]}>{isAr ? 'الإنتاج' : 'Production'}</Text>
              </View>
              <StatRow label={isAr ? 'إنتاج اليوم' : 'Output Today'} value={(data?.productionToday ?? 0).toLocaleString()} color={colors.primary} sub={isAr ? 'وحدة' : 'units'} />
            </View>

            {/* Machines */}
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
                <Ionicons name="hardware-chip" size={16} color={colors.warning} />
                <Text style={[styles.cardTitle, { color: colors.text }]}>{isAr ? 'الآلات' : 'Machines'}</Text>
              </View>
              <StatRow label={isAr ? 'إجمالي الآلات' : 'Total Machines'}     value={String(data?.totalMachines ?? 0)} />
              <StatRow label={isAr ? 'تعمل' : 'Operational'}                 value={String(data?.operationalMachines ?? 0)} color={colors.success} />
              <StatRow
                label={isAr ? 'نسبة التشغيل' : 'Uptime Rate'}
                value={data?.totalMachines ? `${Math.round(((data?.operationalMachines ?? 0) / data.totalMachines) * 100)}%` : '—'}
                color={colors.info}
              />
            </View>

            {/* Finance */}
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
                <Ionicons name="cash" size={16} color={colors.success} />
                <Text style={[styles.cardTitle, { color: colors.text }]}>{isAr ? 'المالية' : 'Finance'}</Text>
              </View>
              <StatRow label={isAr ? 'الرواتب (الشهر)' : 'Payroll (month)'} value={fmt(data?.thisMonthPayroll)} color={colors.warning} />
            </View>

            {/* Inventory */}
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
                <Ionicons name="archive" size={16} color={colors.accent} />
                <Text style={[styles.cardTitle, { color: colors.text }]}>{isAr ? 'المخزون' : 'Inventory'}</Text>
              </View>
              <StatRow label={isAr ? 'إجمالي العناصر' : 'Total Items'}  value={String(data?.inventoryItems ?? 0)} />
              <StatRow label={isAr ? 'مخزون منخفض' : 'Low Stock'}       value={String(data?.lowStockItems ?? 0)}  color={data?.lowStockItems ? colors.danger : colors.success} />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:       { flex: 1 },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  content:    { padding: spacing.md, paddingBottom: 40 },
  rangeRow:   { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md },
  rangeBtn:   { flex: 1, paddingVertical: 8, borderRadius: radius.sm, borderWidth: 1, alignItems: 'center' },
  rangeTxt:   { ...typography.caption, fontWeight: '600' },
  card:       { borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm, paddingBottom: 8, borderBottomWidth: 1 },
  cardTitle:  { ...typography.h4 },
  statRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 1 },
  statLabel:  { ...typography.bodySmall },
  statRight:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statValue:  { ...typography.bodySmall, fontWeight: '700' },
  statSub:    { ...typography.caption },
});
