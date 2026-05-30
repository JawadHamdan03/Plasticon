import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { colors, radius, shadow, spacing, typography } from '../../theme';

interface HealthRecord {
  id: number;
  machine?: { id: number; name: string; type?: string };
  operationalStatus: string;
  efficiencyRating: number;
  maintenanceHours: number;
  downtimePercentage: number;
  notes?: string | null;
  recordedAt: string;
}

const STATUS_META: Record<string, { color: string; label: string }> = {
  OPERATIONAL:       { color: colors.success, label: 'Operational' },
  MAINTENANCE:       { color: colors.warning, label: 'Maintenance' },
  UNDER_MAINTENANCE: { color: colors.warning, label: 'Under Maintenance' },
  BROKEN:            { color: colors.danger,  label: 'Broken' },
  OFFLINE:           { color: colors.textMuted, label: 'Offline' },
};

function healthScore(rec: HealthRecord): number {
  return Math.round(rec.efficiencyRating * 0.6 + (100 - rec.downtimePercentage) * 0.4);
}

function LifecycleCard({ item }: { item: HealthRecord }) {
  const meta  = STATUS_META[item.operationalStatus] ?? STATUS_META.OFFLINE;
  const score = healthScore(item);
  const scoreColor = score >= 80 ? colors.success : score >= 60 ? colors.warning : colors.danger;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.machineName} numberOfLines={1}>{item.machine?.name ?? `Machine #${item.id}`}</Text>
          {item.machine?.type ? <Text style={styles.machineType}>{item.machine.type}</Text> : null}
        </View>
        <View style={[styles.scoreBadge, { backgroundColor: `${scoreColor}18`, borderColor: `${scoreColor}40` }]}>
          <Text style={[styles.scoreText, { color: scoreColor }]}>{score}</Text>
          <Text style={styles.scoreLabel}>score</Text>
        </View>
      </View>

      <View style={styles.barRow}>
        <Text style={styles.barLabel}>Health</Text>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${score}%`, backgroundColor: scoreColor }]} />
        </View>
        <Text style={[styles.barValue, { color: scoreColor }]}>{score}%</Text>
      </View>

      <View style={styles.metrics}>
        <View style={styles.metric}><Text style={styles.metricVal}>{item.efficiencyRating}%</Text><Text style={styles.metricLabel}>Efficiency</Text></View>
        <View style={styles.metric}><Text style={styles.metricVal}>{item.maintenanceHours}h</Text><Text style={styles.metricLabel}>Maint. Hrs</Text></View>
        <View style={styles.metric}>
          <View style={[styles.statusDot, { backgroundColor: meta.color }]} />
          <Text style={[styles.metricLabel, { color: meta.color, fontWeight: '600' }]}>{meta.label}</Text>
        </View>
      </View>
    </View>
  );
}

export function LifecycleScreen() {
  const [records, setRecords]   = useState<HealthRecord[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ records: HealthRecord[] }>('/machine-health?limit=40');
      setRecords(res.records ?? []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Lifecycle Tracking" subtitle="Equipment health scores" showBack />
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(i, idx) => `${String(i.id)}-${idx}`}
          renderItem={({ item }) => <LifecycleCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="refresh-circle-outline" size={44} color={colors.textMuted} /><Text style={styles.emptyText}>No lifecycle data</Text></View>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: colors.background },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:    { padding: spacing.md, paddingBottom: 40 },
  card:    { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  header:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  headerLeft: { flex: 1, marginRight: spacing.sm },
  machineName: { ...typography.h3 },
  machineType: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  scoreBadge: { alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.md, borderWidth: 1 },
  scoreText:  { fontSize: 22, fontWeight: '800' },
  scoreLabel: { ...typography.caption, marginTop: 1 },
  barRow:    { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  barLabel:  { ...typography.caption, width: 40 },
  barTrack:  { flex: 1, height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' },
  barFill:   { height: '100%', borderRadius: 3 },
  barValue:  { ...typography.caption, fontWeight: '700', width: 32, textAlign: 'right' },
  metrics:   { flexDirection: 'row', justifyContent: 'space-around', paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  metric:    { alignItems: 'center', gap: 2 },
  metricVal: { ...typography.h4 },
  metricLabel: { ...typography.caption },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  empty:     { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText: { ...typography.bodySmall, color: colors.textMuted },
});
