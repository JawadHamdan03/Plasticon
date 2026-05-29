import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader, StatCard } from '../../components';
import { colors, radius, shadow, spacing, typography } from '../../theme';

interface TrendData {
  totalChecks: number;
  passCount:   number;
  failCount:   number;
  partialCount: number;
  passRate:    number;
  byMachine:   { machineName: string; pass: number; fail: number; total: number }[];
  byType:      { checkType: string; pass: number; fail: number; total: number }[];
}

function BarRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel} numberOfLines={1}>{label}</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.barPct, { color }]}>{pct}%</Text>
    </View>
  );
}

export function QualityTrendsScreen() {
  const [data, setData]         = useState<TrendData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<TrendData>('/quality-checks/trends');
      setData(res);
    } catch {
      setData({ totalChecks: 0, passCount: 0, failCount: 0, partialCount: 0, passRate: 0, byMachine: [], byType: [] });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Quality Trends" showBack />
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View> : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
        >
          <View style={styles.statRow}>
            <StatCard label="Pass Rate"     value={`${data?.passRate ?? 0}%`}        icon="trending-up"       color={colors.success} style={styles.stat} />
            <StatCard label="Total Checks"  value={String(data?.totalChecks ?? 0)}   icon="shield-checkmark"  color={colors.primary} style={styles.stat} />
          </View>
          <View style={styles.statRow}>
            <StatCard label="Failed"        value={String(data?.failCount ?? 0)}     icon="close-circle"      color={colors.danger}  style={styles.stat} />
            <StatCard label="Partial"       value={String(data?.partialCount ?? 0)}  icon="alert-circle"      color={colors.warning} style={styles.stat} />
          </View>

          {data?.byMachine && data.byMachine.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pass Rate by Machine</Text>
              {data.byMachine.map((m) => (
                <BarRow key={m.machineName} label={m.machineName} value={m.pass} total={m.total} color={colors.success} />
              ))}
            </View>
          )}

          {data?.byType && data.byType.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pass Rate by Check Type</Text>
              {data.byType.map((t) => (
                <BarRow key={t.checkType} label={t.checkType} value={t.pass} total={t.total} color={colors.primary} />
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
  statRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  stat:    { flex: 1 },
  section: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginTop: spacing.md, ...shadow.sm },
  sectionTitle: { ...typography.h4, marginBottom: spacing.md },
  barRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 10 },
  barLabel: { ...typography.caption, width: 90 },
  barTrack: { flex: 1, height: 7, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' },
  barFill:  { height: '100%', borderRadius: 4 },
  barPct:   { ...typography.caption, fontWeight: '700', width: 36, textAlign: 'right' },
});
