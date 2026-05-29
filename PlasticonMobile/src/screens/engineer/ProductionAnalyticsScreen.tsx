import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../api/client';
import { ScreenHeader, StatCard } from '../../components';
import { colors, radius, shadow, spacing, typography } from '../../theme';

interface AnalyticsData {
  totalPieces:    number;
  totalLogs:      number;
  avgPerDay:      number;
  topMachine:     string;
  byMachine:      { machineName: string; total: number; logs: number }[];
  recentTrend:    { date: string; total: number }[];
}

function MachineRow({ item, max }: { item: AnalyticsData['byMachine'][0]; max: number }) {
  const pct = max > 0 ? (item.total / max) * 100 : 0;
  return (
    <View style={styles.machRow}>
      <Text style={styles.machName} numberOfLines={1}>{item.machineName}</Text>
      <View style={styles.machBar}>
        <View style={[styles.machFill, { width: `${pct}%` }]} />
      </View>
      <Text style={styles.machVal}>{item.total.toLocaleString()}</Text>
    </View>
  );
}

export function ProductionAnalyticsScreen() {
  const [data, setData]         = useState<AnalyticsData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<AnalyticsData>('/reports/production-summary');
      setData(res);
    } catch {
      setData({ totalPieces: 0, totalLogs: 0, avgPerDay: 0, topMachine: '—', byMachine: [], recentTrend: [] });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const maxMachProd = Math.max(...(data?.byMachine.map((m) => m.total) ?? [0]));

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Production Analytics" showBack />
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View> : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
        >
          <View style={styles.kpiRow}>
            <StatCard label="Total Pieces"   value={(data?.totalPieces ?? 0).toLocaleString()} icon="cube"       color={colors.primary} style={styles.kpi} />
            <StatCard label="Avg / Day"       value={String(Math.round(data?.avgPerDay ?? 0))} icon="analytics"  color={colors.info}    style={styles.kpi} />
          </View>
          <View style={styles.kpiRow}>
            <StatCard label="Total Logs"     value={String(data?.totalLogs ?? 0)}              icon="list"       color={colors.accent}  style={styles.kpi} />
            <StatCard label="Top Machine"    value={data?.topMachine ?? '—'}                   icon="hardware-chip" color={colors.success} style={styles.kpi} />
          </View>

          {data?.byMachine && data.byMachine.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Output by Machine</Text>
              {data.byMachine.map((m) => (
                <MachineRow key={m.machineName} item={m} max={maxMachProd} />
              ))}
            </View>
          )}

          {data?.recentTrend && data.recentTrend.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Daily Output</Text>
              {data.recentTrend.slice(0, 7).map((t) => (
                <View key={t.date} style={styles.trendRow}>
                  <Text style={styles.trendDate}>{new Date(t.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
                  <Text style={styles.trendVal}>{t.total.toLocaleString()} units</Text>
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
  safe:    { flex: 1, backgroundColor: colors.background },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.md, paddingBottom: 40 },
  kpiRow:  { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  kpi:     { flex: 1 },
  section: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginTop: spacing.md, ...shadow.sm },
  sectionTitle: { ...typography.h4, marginBottom: spacing.md },
  machRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 10 },
  machName: { ...typography.caption, width: 90 },
  machBar:  { flex: 1, height: 7, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' },
  machFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 4 },
  machVal:  { ...typography.caption, fontWeight: '700', width: 55, textAlign: 'right' },
  trendRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  trendDate: { ...typography.bodySmall, color: colors.textSecondary },
  trendVal:  { ...typography.bodySmall, fontWeight: '700', color: colors.primary },
});
