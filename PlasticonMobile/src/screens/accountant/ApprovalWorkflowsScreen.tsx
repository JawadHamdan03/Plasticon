import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { colors, radius, shadow, spacing, typography } from '../../theme';

interface Workflow {
  id: number;
  title?: string;
  requestType?: string;
  requester?: { fullName: string };
  requestedBy?: string;
  amount?: number;
  status?: string;
  priority?: string;
  createdAt: string;
}

const STATUS_META: Record<string, { color: string; icon: string }> = {
  PENDING:  { color: colors.warning, icon: 'time' },
  APPROVED: { color: colors.success, icon: 'checkmark-circle' },
  REJECTED: { color: colors.danger,  icon: 'close-circle' },
  REVIEW:   { color: colors.info,    icon: 'eye' },
};

const PRIORITY_COLOR: Record<string, string> = {
  HIGH:     colors.danger,
  MEDIUM:   colors.warning,
  LOW:      colors.success,
  CRITICAL: '#7C3AED',
};

function fmt(n: number) { return n.toLocaleString('en-US', { minimumFractionDigits: 2 }); }

function WorkflowCard({ item }: { item: Workflow }) {
  const status   = item.status ?? 'PENDING';
  const meta     = STATUS_META[status] ?? STATUS_META.PENDING;
  const priority = item.priority;
  const priColor = priority ? (PRIORITY_COLOR[priority] ?? colors.textMuted) : null;

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={[styles.iconWrap, { backgroundColor: `${meta.color}15` }]}>
          <Ionicons name={meta.icon as any} size={20} color={meta.color} />
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.title} numberOfLines={1}>{item.title ?? item.requestType ?? `Request #${item.id}`}</Text>
          <Text style={styles.requester}>{item.requester?.fullName ?? item.requestedBy ?? 'Unknown'}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: `${meta.color}15` }]}>
          <Text style={[styles.badgeText, { color: meta.color }]}>{status}</Text>
        </View>
      </View>
      <View style={styles.footer}>
        {item.amount != null && <Text style={styles.detail}>Amount: <Text style={styles.detailVal}>${fmt(item.amount)}</Text></Text>}
        {priColor && <Text style={[styles.detail, { color: priColor, fontWeight: '700' }]}>{priority} priority</Text>}
        <Text style={styles.detail}>{new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</Text>
      </View>
    </View>
  );
}

export function ApprovalWorkflowsScreen() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ workflows?: Workflow[]; requests?: Workflow[] }>('/approval-workflows?limit=30');
      setWorkflows(res.workflows ?? res.requests ?? []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const pending = workflows.filter((w) => w.status === 'PENDING' || w.status === 'REVIEW').length;

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Approval Workflows" subtitle={pending > 0 ? `${pending} awaiting review` : `${workflows.length} total`} showBack />
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View> : (
        <FlatList
          data={workflows}
          keyExtractor={(i) => String(i.id)}
          renderItem={({ item }) => <WorkflowCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="git-merge-outline" size={44} color={colors.textMuted} /><Text style={styles.emptyText}>No pending approvals</Text></View>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: colors.background },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:        { padding: spacing.md, paddingBottom: 40 },
  card:        { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardTop:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 8 },
  iconWrap:    { width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardContent: { flex: 1 },
  title:       { ...typography.h4 },
  requester:   { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  badge:       { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  badgeText:   { fontSize: 10, fontWeight: '700' },
  footer:      { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 },
  detail:      { ...typography.caption },
  detailVal:   { fontWeight: '700', color: colors.text },
  empty:       { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText:   { ...typography.bodySmall, color: colors.textMuted },
});
