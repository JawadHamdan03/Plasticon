import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { colors, radius, shadow, spacing, typography } from '../../theme';

interface HealthRecord {
  id: number;
  machine?: { id: number; name: string };
  operationalStatus: string;
  efficiencyRating: number;
  maintenanceHours: number;
  notes?: string | null;
  recordedAt: string;
}

function calStatus(eff: number) {
  if (eff >= 90) return { label: 'Valid',    color: colors.success, icon: 'checkmark-circle' as const };
  if (eff >= 75) return { label: 'Due Soon', color: colors.warning, icon: 'time' as const };
  return                 { label: 'Expired', color: colors.danger,  icon: 'alert-circle' as const };
}

function nextDue(dateStr: string) {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + 6);
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function CalCard({ item }: { item: HealthRecord }) {
  const { label, color, icon } = calStatus(item.efficiencyRating);
  return (
    <View style={[styles.card, { borderLeftColor: color, borderLeftWidth: 3 }]}>
      <View style={styles.cardTop}>
        <Text style={styles.machineName} numberOfLines={1}>{item.machine?.name ?? `Record #${item.id}`}</Text>
        <View style={[styles.badge, { backgroundColor: `${color}18` }]}>
          <Ionicons name={icon} size={12} color={color} />
          <Text style={[styles.badgeText, { color }]}>{label}</Text>
        </View>
      </View>
      <View style={styles.details}>
        <View style={styles.detailBlock}>
          <Text style={styles.detailLabel}>Efficiency</Text>
          <Text style={[styles.detailValue, { color }]}>{item.efficiencyRating}%</Text>
        </View>
        <View style={styles.detailBlock}>
          <Text style={styles.detailLabel}>Last Calibrated</Text>
          <Text style={styles.detailValue}>{new Date(item.recordedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</Text>
        </View>
        <View style={styles.detailBlock}>
          <Text style={styles.detailLabel}>Next Due</Text>
          <Text style={[styles.detailValue, { color: label === 'Expired' ? colors.danger : colors.text }]}>{nextDue(item.recordedAt)}</Text>
        </View>
      </View>
      {item.notes ? <Text style={styles.notes} numberOfLines={1}>{item.notes}</Text> : null}
    </View>
  );
}

export function CalibrationScreen() {
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
      <ScreenHeader title="Calibration" subtitle="Equipment calibration status" showBack />
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(i) => String(i.id)}
          renderItem={({ item }) => <CalCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="checkmark-circle-outline" size={44} color={colors.textMuted} /><Text style={styles.emptyText}>No calibration records</Text></View>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: colors.background },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:    { padding: spacing.md, paddingBottom: 40 },
  card:    { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  machineName: { ...typography.h4, flex: 1, marginRight: spacing.sm },
  badge:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  badgeText: { fontSize: 11, fontWeight: '700' },
  details: { flexDirection: 'row', justifyContent: 'space-between' },
  detailBlock: { alignItems: 'center' },
  detailLabel: { ...typography.caption, marginBottom: 2 },
  detailValue: { ...typography.h4 },
  notes:   { ...typography.caption, color: colors.textMuted, marginTop: spacing.sm, fontStyle: 'italic' },
  empty:   { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText: { ...typography.bodySmall, color: colors.textMuted },
});
