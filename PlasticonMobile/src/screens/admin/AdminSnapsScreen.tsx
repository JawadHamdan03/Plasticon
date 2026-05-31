import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader, StatCard } from '../../components';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

interface Snapshot {
  id: number;
  submittedBy?: { fullName: string };
  worker?: { fullName: string };
  machineLabel?: string;
  machineCounter?: number;
  electricityKwh?: number;
  notes?: string;
  shift?: string;
  createdAt: string;
}

function SnapCard({ item }: { item: Snapshot }) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const name = item.submittedBy?.fullName ?? item.worker?.fullName ?? `${isAr ? 'لقطة' : 'Snapshot'} #${item.id}`;
  const time = new Date(item.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.cardTop}>
        <View style={[styles.avatar, { backgroundColor: `${colors.primary}20` }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>{name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
          <Text style={[styles.time, { color: colors.textMuted }]}>{time}{item.shift ? ` · ${item.shift}` : ''}</Text>
        </View>
      </View>
      <View style={styles.metrics}>
        {item.machineLabel && (
          <View style={styles.metric}>
            <Ionicons name="hardware-chip-outline" size={14} color={colors.primary} />
            <Text style={[styles.metricLabel, { color: colors.text }]}>{item.machineLabel}</Text>
          </View>
        )}
        {item.machineCounter != null && (
          <View style={styles.metric}>
            <Ionicons name="speedometer-outline" size={14} color={colors.info} />
            <Text style={[styles.metricLabel, { color: colors.text }]}>{item.machineCounter.toLocaleString()} {isAr ? 'وحدة' : 'units'}</Text>
          </View>
        )}
        {item.electricityKwh != null && (
          <View style={styles.metric}>
            <Ionicons name="flash-outline" size={14} color={colors.warning} />
            <Text style={[styles.metricLabel, { color: colors.text }]}>{item.electricityKwh} kWh</Text>
          </View>
        )}
      </View>
      {item.notes ? <Text style={[styles.notes, { color: colors.textSecondary, borderTopColor: colors.border }]} numberOfLines={2}>{item.notes}</Text> : null}
    </View>
  );
}

export function AdminSnapsScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const [snaps, setSnaps]       = useState<Snapshot[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ items: any[]; summary?: any } | any[]>('/worker-tools/admin/overview?limit=50');
      const raw = Array.isArray(res) ? res : ((res as any).items ?? []);
      setSnaps(raw.map((r: any) => ({
        id:            r.id,
        submittedBy:   r.worker_name ? { fullName: r.worker_name } : undefined,
        machineLabel:  r.title ?? undefined,
        notes:         r.details ?? undefined,
        shift:         r.feature,
        createdAt:     r.created_at ?? new Date().toISOString(),
      })));
    } catch {
      setSnaps([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const totalKwh = snaps.reduce((s, r) => s + (r.electricityKwh ?? 0), 0);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={isAr ? 'لقطات الإدارة' : 'Admin Snapshots'} subtitle={`${snaps.length} ${isAr ? 'سجل' : 'records'}`} showBack />
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View> : (
        <FlatList
          data={snaps}
          keyExtractor={(i, idx) => `${String(i.id)}-${idx}`}
          renderItem={({ item }) => <SnapCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListHeaderComponent={
            <StatCard
              label={isAr ? 'إجمالي الكهرباء' : 'Total Electricity'}
              value={`${totalKwh.toFixed(1)} kWh`}
              icon="flash"
              color={colors.warning}
              style={styles.header}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="camera-outline" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>{isAr ? 'لا توجد لقطات مسجلة' : 'No snapshots recorded'}</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1 },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:        { padding: spacing.md, paddingBottom: 40 },
  header:      { marginBottom: spacing.md },
  card:        { borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardTop:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 8 },
  avatar:      { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText:  { fontSize: 15, fontWeight: '700' },
  cardContent: { flex: 1 },
  name:        { ...typography.h4 },
  time:        { ...typography.caption, marginTop: 2 },
  metrics:     { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: 4 },
  metric:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metricLabel: { ...typography.caption, fontWeight: '600' },
  notes:       { ...typography.bodySmall, borderTopWidth: 1, paddingTop: 6 },
  empty:       { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText:   { ...typography.bodySmall },
});
