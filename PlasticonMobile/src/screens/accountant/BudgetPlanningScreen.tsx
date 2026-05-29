import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { colors, radius, shadow, spacing, typography } from '../../theme';

interface BudgetPlan {
  id: number;
  title?: string;
  period?: string;
  totalBudget: number;
  totalSpent?: number;
  status?: string;
  department?: string;
  createdAt: string;
}

function fmt(n: number) { return n.toLocaleString('en-US', { minimumFractionDigits: 0 }); }

const STATUS_COLOR: Record<string, string> = {
  ACTIVE:    colors.success,
  DRAFT:     colors.textMuted,
  CLOSED:    colors.primary,
  EXCEEDED:  colors.danger,
};

function BudgetCard({ item }: { item: BudgetPlan }) {
  const spent = item.totalSpent ?? 0;
  const pct   = item.totalBudget > 0 ? Math.min((spent / item.totalBudget) * 100, 100) : 0;
  const barColor = pct >= 90 ? colors.danger : pct >= 70 ? colors.warning : colors.success;
  const status = item.status ?? 'ACTIVE';
  const statusColor = STATUS_COLOR[status] ?? colors.textMuted;

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <Text style={styles.title} numberOfLines={1}>{item.title ?? `Budget #${item.id}`}</Text>
          <Text style={styles.sub}>{item.department ?? item.period ?? '—'}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: `${statusColor}15` }]}>
          <Text style={[styles.badgeText, { color: statusColor }]}>{status}</Text>
        </View>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: barColor }]} />
      </View>
      <View style={styles.nums}>
        <Text style={styles.numLabel}>Spent: <Text style={styles.numVal}>${fmt(spent)}</Text></Text>
        <Text style={styles.numLabel}>Budget: <Text style={styles.numVal}>${fmt(item.totalBudget)}</Text></Text>
        <Text style={[styles.numLabel, { color: barColor }]}>{Math.round(pct)}%</Text>
      </View>
    </View>
  );
}

export function BudgetPlanningScreen() {
  const [plans, setPlans]       = useState<BudgetPlan[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ budgets?: BudgetPlan[]; plans?: BudgetPlan[] }>('/budget-plans?limit=20');
      setPlans(res.budgets ?? res.plans ?? []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Budget Planning" subtitle={`${plans.length} plans`} showBack />
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View> : (
        <FlatList
          data={plans}
          keyExtractor={(i) => String(i.id)}
          renderItem={({ item }) => <BudgetCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="wallet-outline" size={44} color={colors.textMuted} /><Text style={styles.emptyText}>No budget plans</Text></View>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: colors.background },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:      { padding: spacing.md, paddingBottom: 40 },
  card:      { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardTop:   { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm },
  cardLeft:  { flex: 1, marginRight: spacing.sm },
  title:     { ...typography.h4 },
  sub:       { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  badge:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  badgeText: { fontSize: 10, fontWeight: '700' },
  track:     { height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden', marginBottom: spacing.sm },
  fill:      { height: '100%', borderRadius: 4 },
  nums:      { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  numLabel:  { ...typography.caption, flex: 1 },
  numVal:    { fontWeight: '700', color: colors.text },
  empty:     { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText: { ...typography.bodySmall, color: colors.textMuted },
});
