import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader, StatCard } from '../../components';
import { colors, radius, shadow, spacing, typography } from '../../theme';

interface HealthRecord {
  id: number;
  machine?: { name: string };
  machineName?: string;
  efficiencyRating?: number;
  downtimePercentage?: number;
  maintenanceHours?: number;
  recordedAt?: string;
  createdAt: string;
}

function HealthCard({ item }: { item: HealthRecord }) {
  const eff   = item.efficiencyRating ?? 0;
  const color = eff >= 90 ? colors.success : eff >= 70 ? colors.warning : colors.danger;
  const name  = item.machine?.name ?? item.machineName ?? `Machine #${item.id}`;

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardContent}>
          <Text style={styles.machine}>{name}</Text>
          <Text style={styles.date}>{new Date(item.recordedAt ?? item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</Text>
        </View>
        <View style={[styles.effBadge, { backgroundColor: `${color}15` }]}>
          <Text style={[styles.effText, { color }]}>{eff}%</Text>
        </View>
      </View>
      <View style={styles.metrics}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Efficiency</Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${eff}%`, backgroundColor: color }]} />
          </View>
        </View>
        {item.downtimePercentage != null && (
          <Text style={styles.detail}>Downtime: <Text style={styles.detailVal}>{item.downtimePercentage}%</Text></Text>
        )}
        {item.maintenanceHours != null && (
          <Text style={styles.detail}>Maint Hours: <Text style={styles.detailVal}>{item.maintenanceHours}h</Text></Text>
        )}
      </View>
    </View>
  );
}

export function EngineerOverviewScreen() {
  const [records, setRecords]   = useState<HealthRecord[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ records: HealthRecord[] }>('/machine-health?limit=30');
      setRecords(res.records ?? []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const avgEff = records.length > 0 ? Math.round(records.reduce((s, r) => s + (r.efficiencyRating ?? 0), 0) / records.length) : 0;

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Engineer Overview" showBack />
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View> : (
        <FlatList
          data={records}
          keyExtractor={(i) => String(i.id)}
          renderItem={({ item }) => <HealthCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListHeaderComponent={<StatCard label="Avg Machine Efficiency" value={`${avgEff}%`} icon="speedometer" color={avgEff >= 80 ? colors.success : colors.warning} style={styles.header} />}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="hardware-chip-outline" size={44} color={colors.textMuted} /><Text style={styles.emptyText}>No health records</Text></View>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: colors.background },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:        { padding: spacing.md, paddingBottom: 40 },
  header:      { marginBottom: spacing.md },
  card:        { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardTop:     { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  cardContent: { flex: 1 },
  machine:     { ...typography.h4 },
  date:        { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  effBadge:    { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.md },
  effText:     { fontSize: 15, fontWeight: '800' },
  metrics:     { gap: 4 },
  metric:      { gap: 4 },
  metricLabel: { ...typography.caption },
  barTrack:    { height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' },
  barFill:     { height: '100%', borderRadius: 3 },
  detail:      { ...typography.caption },
  detailVal:   { fontWeight: '700', color: colors.text },
  empty:       { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText:   { ...typography.bodySmall, color: colors.textMuted },
});
