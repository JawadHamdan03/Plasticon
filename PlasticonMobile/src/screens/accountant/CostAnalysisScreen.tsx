import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader, StatCard } from '../../components';
import { colors, radius, shadow, spacing, typography } from '../../theme';

interface CostRecord {
  id: number;
  category?: string;
  department?: string;
  amount: number;
  description?: string;
  date?: string;
  createdAt: string;
}

function fmt(n: number) { return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function CostCard({ item }: { item: CostRecord }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <Text style={styles.category}>{item.category ?? 'General'}</Text>
          {item.department ? <Text style={styles.dept}>{item.department}</Text> : null}
        </View>
        <Text style={styles.amount}>${fmt(item.amount)}</Text>
      </View>
      {item.description ? <Text style={styles.desc} numberOfLines={2}>{item.description}</Text> : null}
      <Text style={styles.date}>{new Date(item.date ?? item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
    </View>
  );
}

export function CostAnalysisScreen() {
  const [costs, setCosts]       = useState<CostRecord[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ costs?: CostRecord[]; analyses?: CostRecord[]; total?: number }>('/cost-analysis?limit=30');
      const records = res.costs ?? res.analyses ?? [];
      setCosts(records);
      setTotal(res.total ?? records.reduce((s, r) => s + (r.amount ?? 0), 0));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Cost Analysis" showBack />
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View> : (
        <FlatList
          data={costs}
          keyExtractor={(i) => String(i.id)}
          renderItem={({ item }) => <CostCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListHeaderComponent={<StatCard label="Total Costs" value={`$${fmt(total)}`} icon="analytics" color={colors.danger} style={styles.header} />}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="analytics-outline" size={44} color={colors.textMuted} /><Text style={styles.emptyText}>No cost data</Text></View>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:     { flex: 1, backgroundColor: colors.background },
  center:   { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:     { padding: spacing.md, paddingBottom: 40 },
  header:   { marginBottom: spacing.md },
  card:     { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardTop:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  cardLeft: { flex: 1, marginRight: spacing.sm },
  category: { ...typography.h4 },
  dept:     { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  amount:   { fontSize: 18, fontWeight: '800', color: colors.danger },
  desc:     { ...typography.bodySmall, color: colors.textSecondary, marginBottom: 4 },
  date:     { ...typography.caption },
  empty:    { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText: { ...typography.bodySmall, color: colors.textMuted },
});
