import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { colors, radius, shadow, spacing, typography } from '../../theme';

interface WorkOrder {
  id: number;
  machine?: { id: number; name: string; type: string };
  scheduleType?: string;
  frequency?: string;
  nextScheduledDate?: string;
  status?: string;
  description?: string | null;
  assignedEngineer?: { id: number; fullName: string } | null;
  createdAt: string;
}

const STATUS_META: Record<string, { color: string; icon: string }> = {
  PENDING:     { color: colors.warning, icon: 'time-outline' },
  IN_PROGRESS: { color: colors.info,    icon: 'play-circle-outline' },
  COMPLETED:   { color: colors.success, icon: 'checkmark-circle-outline' },
  CANCELLED:   { color: colors.textMuted, icon: 'close-circle-outline' },
};

const TASK_ICONS: Record<string, string> = {
  lubricate: '🛢️', mold: '🔩', clean_cavity: '🧹', oil_change: '🔧',
  belt_check: '⚙️', cooling: '❄️', electrical: '⚡', custom: '✏️',
};

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function WorkOrderCard({ item }: { item: WorkOrder }) {
  const status = item.status ?? 'PENDING';
  const meta   = STATUS_META[status] ?? STATUS_META.PENDING;
  const taskIcon = item.scheduleType ? (TASK_ICONS[item.scheduleType] ?? '🔧') : '🔧';

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.taskIcon}>{taskIcon}</Text>
        <View style={styles.cardMain}>
          <Text style={styles.machineName} numberOfLines={1}>{item.machine?.name ?? `WO #${item.id}`}</Text>
          <Text style={styles.scheduleType}>{item.scheduleType ?? 'Task'} · {item.frequency}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: `${meta.color}15` }]}>
          <Ionicons name={meta.icon as any} size={12} color={meta.color} />
          <Text style={[styles.badgeText, { color: meta.color }]}>{status}</Text>
        </View>
      </View>
      {item.description ? <Text style={styles.desc} numberOfLines={2}>{item.description}</Text> : null}
      <View style={styles.footer}>
        <Text style={styles.dueLabel}>Due: <Text style={styles.dueDate}>{fmtDate(item.nextScheduledDate)}</Text></Text>
        {item.assignedEngineer ? (
          <View style={styles.assignee}>
            <Ionicons name="person" size={11} color={colors.textMuted} />
            <Text style={styles.assigneeText}>{item.assignedEngineer.fullName}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

export function WorkOrdersScreen() {
  const [orders, setOrders]     = useState<WorkOrder[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ schedules: WorkOrder[] }>('/maintenance-schedule?limit=40');
      setOrders(res.schedules ?? []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const pending    = orders.filter((o) => o.status === 'PENDING' || o.status === 'IN_PROGRESS').length;
  const completed  = orders.filter((o) => o.status === 'COMPLETED').length;

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Work Orders" subtitle={`${pending} active · ${completed} done`} showBack />
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(i) => String(i.id)}
          renderItem={({ item }) => <WorkOrderCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="clipboard-outline" size={44} color={colors.textMuted} /><Text style={styles.emptyText}>No work orders</Text></View>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:   { padding: spacing.md, paddingBottom: 40 },
  card:   { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 8 },
  taskIcon: { fontSize: 22, width: 36, textAlign: 'center' },
  cardMain: { flex: 1 },
  machineName:  { ...typography.h4 },
  scheduleType: { ...typography.caption, marginTop: 1 },
  badge:     { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  badgeText: { fontSize: 10, fontWeight: '700' },
  desc:      { ...typography.bodySmall, color: colors.textSecondary, marginBottom: 8 },
  footer:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dueLabel:  { ...typography.caption },
  dueDate:   { fontWeight: '700', color: colors.text },
  assignee:  { flexDirection: 'row', alignItems: 'center', gap: 3 },
  assigneeText: { ...typography.caption },
  empty:     { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText: { ...typography.bodySmall, color: colors.textMuted },
});
