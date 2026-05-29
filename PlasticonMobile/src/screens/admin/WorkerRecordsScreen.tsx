import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { colors, radius, shadow, spacing, typography } from '../../theme';

interface Snapshot {
  id: number;
  worker?: { fullName: string };
  submittedBy?: { fullName: string };
  machineLabel?: string;
  machineCounter?: number;
  electricityKwh?: number;
  notes?: string;
  createdAt: string;
}

function SnapCard({ item }: { item: Snapshot }) {
  const name = item.worker?.fullName ?? item.submittedBy?.fullName ?? `Record #${item.id}`;
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <Text style={styles.worker}>{name}</Text>
          <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
        </View>
      </View>
      <View style={styles.metrics}>
        {item.machineLabel && (
          <View style={styles.metric}>
            <Ionicons name="hardware-chip-outline" size={13} color={colors.textMuted} />
            <Text style={styles.metricText} numberOfLines={1}>{item.machineLabel}</Text>
          </View>
        )}
        {item.machineCounter != null && (
          <View style={styles.metric}>
            <Ionicons name="speedometer-outline" size={13} color={colors.primary} />
            <Text style={styles.metricText}>{item.machineCounter.toLocaleString()} units</Text>
          </View>
        )}
        {item.electricityKwh != null && (
          <View style={styles.metric}>
            <Ionicons name="flash-outline" size={13} color={colors.warning} />
            <Text style={styles.metricText}>{item.electricityKwh} kWh</Text>
          </View>
        )}
      </View>
      {item.notes ? <Text style={styles.notes} numberOfLines={2}>{item.notes}</Text> : null}
    </View>
  );
}

export function WorkerRecordsScreen() {
  const [snaps, setSnaps]       = useState<Snapshot[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ snapshots: Snapshot[] }>('/worker-tools/snapshots?limit=40');
      setSnaps(res.snapshots ?? []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Worker Records" subtitle={`${snaps.length} snapshots`} showBack />
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View> : (
        <FlatList
          data={snaps}
          keyExtractor={(i) => String(i.id)}
          renderItem={({ item }) => <SnapCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="document-outline" size={44} color={colors.textMuted} /><Text style={styles.emptyText}>No worker records</Text></View>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: colors.background },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:      { padding: spacing.md, paddingBottom: 40 },
  card:      { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardTop:   { marginBottom: 8 },
  cardLeft:  {},
  worker:    { ...typography.h4 },
  date:      { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  metrics:   { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: 4 },
  metric:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metricText: { ...typography.caption, fontWeight: '600' },
  notes:     { ...typography.bodySmall, color: colors.textSecondary, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 6, marginTop: 2 },
  empty:     { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText: { ...typography.bodySmall, color: colors.textMuted },
});
