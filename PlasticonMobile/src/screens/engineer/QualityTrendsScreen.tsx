import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../api/client';
import { ScreenHeader, StatCard } from '../../components';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';

interface TrendData {
  totalChecks:  number;
  passCount:    number;
  failCount:    number;
  partialCount: number;
  passRate:     number;
  byMachine:    { machineName: string; pass: number; fail: number; total: number }[];
  byType:       { checkType: string; pass: number; fail: number; total: number }[];
}

function BarRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const { colors } = useAppTheme();
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <View style={styles.barRow}>
      <Text style={[styles.barLabel, { color: colors.textMuted }]} numberOfLines={1}>{label}</Text>
      <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.barPct, { color }]}>{pct}%</Text>
    </View>
  );
}

export function QualityTrendsScreen() {
  const { colors } = useAppTheme();
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
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={'اتجاهات الجودة'} showBack />
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
        >
          <View style={styles.statRow}>
            <StatCard label={'معدل النجاح'}     value={`${data?.passRate ?? 0}%`}       icon="trending-up"      color={colors.success} style={styles.stat} />
            <StatCard label={'إجمالي الفحوصات'}  value={String(data?.totalChecks ?? 0)}  icon="shield-checkmark" color={colors.primary} style={styles.stat} />
          </View>
          <View style={styles.statRow}>
            <StatCard label={'فشل'}        value={String(data?.failCount ?? 0)}    icon="close-circle"     color={colors.danger}  style={styles.stat} />
            <StatCard label={'جزئي'}       value={String(data?.partialCount ?? 0)} icon="alert-circle"     color={colors.warning} style={styles.stat} />
          </View>

          {data?.byMachine && data.byMachine.length > 0 && (
            <View style={[styles.section, { backgroundColor: colors.surface }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {'معدل النجاح حسب الآلة'}
              </Text>
              {data.byMachine.map((m) => (
                <BarRow key={m.machineName} label={m.machineName} value={m.pass} total={m.total} color={colors.success} />
              ))}
            </View>
          )}

          {data?.byType && data.byType.length > 0 && (
            <View style={[styles.section, { backgroundColor: colors.surface }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {'معدل النجاح حسب نوع الفحص'}
              </Text>
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
  safe:         { flex: 1 },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content:      { padding: spacing.md, paddingBottom: 40 },
  statRow:      { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  stat:         { flex: 1 },
  section:      { borderRadius: radius.lg, padding: spacing.md, marginTop: spacing.md, ...shadow.sm },
  sectionTitle: { ...typography.h4, marginBottom: spacing.md },
  barRow:       { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 10 },
  barLabel:     { ...typography.caption, width: 90 },
  barTrack:     { flex: 1, height: 7, borderRadius: 4, overflow: 'hidden' },
  barFill:      { height: '100%', borderRadius: 4 },
  barPct:       { ...typography.caption, fontWeight: '700', width: 36, textAlign: 'right' },
});
