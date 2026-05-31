import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../api/client';
import { ScreenHeader, StatCard } from '../../components';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

interface WeeklyReport {
  weekStart: string;
  weekEnd:   string;
  totals: {
    recordsCount:         number;
    totalCartons:         number;
    totalPieces:          number;
    totalDowntimeMinutes: number;
  };
  byDay:     { date: string; totalCartons: number; totalPieces: number; recordsCount: number }[];
  byShift:   unknown[];
  byMachine: { machineName: string; totalPieces: number; recordsCount: number }[];
}

function MachineRow({ item, max }: { item: WeeklyReport['byMachine'][0]; max: number }) {
  const { colors } = useAppTheme();
  const pct = max > 0 ? ((item.totalPieces ?? 0) / max) * 100 : 0;
  return (
    <View style={styles.machRow}>
      <Text style={[styles.machName, { color: colors.textSecondary }]} numberOfLines={1}>{item.machineName}</Text>
      <View style={[styles.machBar, { backgroundColor: colors.border }]}>
        <View style={[styles.machFill, { width: `${pct}%`, backgroundColor: colors.primary }]} />
      </View>
      <Text style={[styles.machVal, { color: colors.text }]}>{(item.totalPieces ?? 0).toLocaleString()}</Text>
    </View>
  );
}

export function ProductionAnalyticsScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const [data, setData]         = useState<WeeklyReport | null>(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<WeeklyReport>('/reports/production/weekly');
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const byMachine    = data?.byMachine ?? [];
  const byDay        = data?.byDay ?? [];
  const maxMachProd  = Math.max(...byMachine.map((m) => m.totalPieces ?? 0), 0);
  const topMachine   = [...byMachine].sort((a, b) => (b.totalPieces ?? 0) - (a.totalPieces ?? 0))[0]?.machineName ?? '—';
  const avgPerDay    = byDay.length > 0 ? Math.round((data?.totals.totalPieces ?? 0) / byDay.length) : 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={isAr ? 'تحليلات الإنتاج' : 'Production Analytics'} showBack />
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
        >
          <View style={styles.kpiRow}>
            <StatCard label={isAr ? 'إجمالي القطع'    : 'Total Pieces'} value={(data?.totals.totalPieces ?? 0).toLocaleString()} icon="cube"          color={colors.primary} style={styles.kpi} />
            <StatCard label={isAr ? 'متوسط / يوم'     : 'Avg / Day'}    value={avgPerDay.toLocaleString()}                       icon="analytics"     color={colors.info}    style={styles.kpi} />
          </View>
          <View style={styles.kpiRow}>
            <StatCard label={isAr ? 'إجمالي السجلات'  : 'Total Logs'}   value={String(data?.totals.recordsCount ?? 0)}           icon="list"          color={colors.accent}  style={styles.kpi} />
            <StatCard label={isAr ? 'أعلى آلة'        : 'Top Machine'}  value={topMachine}                                       icon="hardware-chip" color={colors.success} style={styles.kpi} />
          </View>

          {byMachine.length > 0 && (
            <View style={[styles.section, { backgroundColor: colors.surface }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {isAr ? 'الإنتاج حسب الآلة' : 'Output by Machine'}
              </Text>
              {byMachine.map((m) => (
                <MachineRow key={m.machineName} item={m} max={maxMachProd} />
              ))}
            </View>
          )}

          {byDay.length > 0 && (
            <View style={[styles.section, { backgroundColor: colors.surface }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {isAr ? 'الإنتاج اليومي (هذا الأسبوع)' : 'Daily Output (This Week)'}
              </Text>
              {byDay.map((t) => (
                <View key={t.date} style={[styles.trendRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.trendDate, { color: colors.textSecondary }]}>
                    {new Date(t.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                  </Text>
                  <Text style={[styles.trendVal, { color: colors.primary }]}>
                    {(t.totalPieces ?? 0).toLocaleString()} {isAr ? 'وحدات' : 'units'}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1 },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content:      { padding: spacing.md, paddingBottom: 40 },
  kpiRow:       { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  kpi:          { flex: 1 },
  section:      { borderRadius: radius.lg, padding: spacing.md, marginTop: spacing.md, ...shadow.sm },
  sectionTitle: { ...typography.h4, marginBottom: spacing.md },
  machRow:      { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 10 },
  machName:     { ...typography.caption, width: 90 },
  machBar:      { flex: 1, height: 7, borderRadius: 4, overflow: 'hidden' },
  machFill:     { height: '100%', borderRadius: 4 },
  machVal:      { ...typography.caption, fontWeight: '700', width: 55, textAlign: 'right' },
  trendRow:     { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1 },
  trendDate:    { ...typography.bodySmall },
  trendVal:     { ...typography.bodySmall, fontWeight: '700' },
});
