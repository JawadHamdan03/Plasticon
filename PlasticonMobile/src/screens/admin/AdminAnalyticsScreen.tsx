import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../api/client';
import { ScreenHeader, StatCard } from '../../components';
import { colors, radius, shadow, spacing, typography } from '../../theme';

interface Analytics {
  totalProduction?:   number;
  avgDailyOutput?:    number;
  qualityPassRate?:   number;
  attendanceRate?:    number;
  totalRevenue?:      number;
  totalExpenses?:     number;
  openMaintenance?:   number;
  machineUptime?:     number;
  topMachine?:        string;
  recentTrend?:       { date: string; total: number }[];
}

function TrendRow({ date, total }: { date: string; total: number }) {
  return (
    <View style={styles.trendRow}>
      <Text style={styles.trendDate}>{new Date(date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
      <Text style={styles.trendVal}>{total.toLocaleString()} units</Text>
    </View>
  );
}

export function AdminAnalyticsScreen() {
  const [data, setData]         = useState<Analytics | null>(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<Analytics>('/dashboard/analytics');
      setData(res);
    } catch {
      try {
        const res2 = await api.get<Analytics>('/reports/production-summary');
        setData(res2);
      } catch {
        setData({});
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Analytics" showBack />
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View> : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
        >
          <View style={styles.kpiRow}>
            <StatCard label="Total Output"   value={(data?.totalProduction ?? 0).toLocaleString()} icon="cube"            color={colors.primary} style={styles.kpi} />
            <StatCard label="Avg / Day"      value={String(Math.round(data?.avgDailyOutput ?? 0))} icon="analytics"       color={colors.info}    style={styles.kpi} />
          </View>
          <View style={styles.kpiRow}>
            <StatCard label="Quality Pass"  value={`${data?.qualityPassRate ?? 0}%`}               icon="shield-checkmark" color={colors.success} style={styles.kpi} />
            <StatCard label="Attendance"    value={`${data?.attendanceRate ?? 0}%`}                icon="people"           color={colors.accent}  style={styles.kpi} />
          </View>
          <View style={styles.kpiRow}>
            <StatCard label="Machine Uptime" value={`${data?.machineUptime ?? 0}%`}               icon="hardware-chip"    color={colors.warning} style={styles.kpi} />
            <StatCard label="Open Maint."    value={String(data?.openMaintenance ?? 0)}           icon="construct"        color={data?.openMaintenance ? colors.danger : colors.success} style={styles.kpi} />
          </View>

          {data?.recentTrend && data.recentTrend.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Daily Output</Text>
              {data.recentTrend.slice(0, 7).map((t) => <TrendRow key={t.date} date={t.date} total={t.total} />)}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: colors.background },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content:      { padding: spacing.md, paddingBottom: 40 },
  kpiRow:       { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  kpi:          { flex: 1 },
  section:      { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginTop: spacing.md, ...shadow.sm },
  sectionTitle: { ...typography.h4, marginBottom: spacing.md },
  trendRow:     { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  trendDate:    { ...typography.bodySmall, color: colors.textSecondary },
  trendVal:     { ...typography.bodySmall, fontWeight: '700', color: colors.primary },
});
