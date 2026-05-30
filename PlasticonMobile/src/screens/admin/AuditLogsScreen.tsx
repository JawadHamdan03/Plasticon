import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { colors, radius, shadow, spacing, typography } from '../../theme';

interface AuditLog {
  id: number;
  action?: string;
  entity?: string;
  entityId?: number;
  user?: { fullName: string };
  performedBy?: { fullName: string };
  details?: string;
  ipAddress?: string;
  createdAt: string;
}

const ACTION_COLOR: Record<string, string> = {
  CREATE: colors.success,
  UPDATE: colors.info,
  DELETE: colors.danger,
  LOGIN:  colors.primary,
  LOGOUT: colors.textMuted,
  APPROVE: colors.success,
  REJECT:  colors.danger,
};

function LogCard({ item }: { item: AuditLog }) {
  const action = item.action ?? 'ACTION';
  const color  = ACTION_COLOR[action] ?? colors.textMuted;
  const actor  = item.user?.fullName ?? item.performedBy?.fullName ?? 'System';
  const time   = new Date(item.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <View style={styles.log}>
      <View style={[styles.actionDot, { backgroundColor: color }]} />
      <View style={styles.logContent}>
        <View style={styles.logTop}>
          <View style={[styles.actionBadge, { backgroundColor: `${color}15` }]}>
            <Text style={[styles.actionText, { color }]}>{action}</Text>
          </View>
          {item.entity && <Text style={styles.entity}>{item.entity}{item.entityId ? ` #${item.entityId}` : ''}</Text>}
        </View>
        <Text style={styles.actor}>{actor}</Text>
        {item.details && <Text style={styles.details} numberOfLines={2}>{item.details}</Text>}
        <Text style={styles.time}>{time}</Text>
      </View>
    </View>
  );
}

export function AuditLogsScreen() {
  const [logs, setLogs]         = useState<AuditLog[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ logs: AuditLog[] }>('/audit/logs?limit=40');
      setLogs(Array.isArray(res) ? res : (res.logs ?? []));
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Audit Logs" subtitle={`${logs.length} entries`} showBack />
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View> : (
        <FlatList
          data={logs}
          keyExtractor={(i) => String(i.id)}
          renderItem={({ item }) => <LogCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="shield-outline" size={44} color={colors.textMuted} /><Text style={styles.emptyText}>No audit logs</Text></View>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: colors.background },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:         { padding: spacing.md, paddingBottom: 40 },
  log:          { flexDirection: 'row', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  actionDot:    { width: 8, height: 8, borderRadius: 4, marginTop: 6, flexShrink: 0 },
  logContent:   { flex: 1, gap: 3 },
  logTop:       { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  actionBadge:  { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full },
  actionText:   { fontSize: 10, fontWeight: '800' },
  entity:       { ...typography.caption, fontWeight: '600' },
  actor:        { ...typography.caption, color: colors.textMuted },
  details:      { ...typography.bodySmall, color: colors.textSecondary },
  time:         { ...typography.caption, color: colors.textMuted },
  empty:        { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText:    { ...typography.bodySmall, color: colors.textMuted },
});
