import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader, StatCard } from '../../components';
import { colors, radius, shadow, spacing, typography } from '../../theme';

interface Machine {
  id: number;
  name: string;
  type?: string;
  status?: string;
  location?: string;
  serialNumber?: string;
  purchaseDate?: string;
  lastMaintenance?: string;
}

const STATUS_META: Record<string, { color: string; icon: string }> = {
  ACTIVE:       { color: colors.success, icon: 'checkmark-circle' },
  MAINTENANCE:  { color: colors.warning, icon: 'construct' },
  INACTIVE:     { color: colors.danger,  icon: 'close-circle' },
  IDLE:         { color: colors.info,    icon: 'pause-circle' },
};

function MachineCard({ item }: { item: Machine }) {
  const status = item.status ?? 'ACTIVE';
  const meta   = STATUS_META[status] ?? STATUS_META.ACTIVE;

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={[styles.iconWrap, { backgroundColor: `${meta.color}15` }]}>
          <Ionicons name={meta.icon as any} size={20} color={meta.color} />
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.type}>{item.type ?? 'Machine'}{item.location ? ` · ${item.location}` : ''}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: `${meta.color}15` }]}>
          <Text style={[styles.badgeText, { color: meta.color }]}>{status}</Text>
        </View>
      </View>
      {(item.serialNumber || item.lastMaintenance) && (
        <View style={styles.footer}>
          {item.serialNumber && <Text style={styles.detail}>SN: <Text style={styles.detailVal}>{item.serialNumber}</Text></Text>}
          {item.lastMaintenance && <Text style={styles.detail}>Last maint: <Text style={styles.detailVal}>{new Date(item.lastMaintenance).toLocaleDateString([], { month: 'short', day: 'numeric' })}</Text></Text>}
        </View>
      )}
    </View>
  );
}

export function MachinesAdminScreen() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ machines: Machine[] }>('/machines?limit=40');
      setMachines(res.machines ?? []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const active = machines.filter((m) => m.status === 'ACTIVE' || !m.status).length;

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Machines" subtitle={`${machines.length} total`} showBack />
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View> : (
        <FlatList
          data={machines}
          keyExtractor={(i) => String(i.id)}
          renderItem={({ item }) => <MachineCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListHeaderComponent={
            <View style={styles.header}>
              <StatCard label="Active"      value={String(active)}                     icon="checkmark-circle" color={colors.success} style={styles.stat} />
              <StatCard label="Maintenance" value={String(machines.length - active)}   icon="construct"        color={colors.warning} style={styles.stat} />
            </View>
          }
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="hardware-chip-outline" size={44} color={colors.textMuted} /><Text style={styles.emptyText}>No machines</Text></View>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: colors.background },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:        { padding: spacing.md, paddingBottom: 40 },
  header:      { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  stat:        { flex: 1 },
  card:        { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardTop:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4 },
  iconWrap:    { width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardContent: { flex: 1 },
  name:        { ...typography.h4 },
  type:        { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  badge:       { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  badgeText:   { fontSize: 10, fontWeight: '700' },
  footer:      { flexDirection: 'row', gap: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 6 },
  detail:      { ...typography.caption },
  detailVal:   { fontWeight: '700', color: colors.text },
  empty:       { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText:   { ...typography.bodySmall, color: colors.textMuted },
});
