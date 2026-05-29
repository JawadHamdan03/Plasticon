import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader, StatCard } from '../../components';
import { colors, radius, shadow, spacing, typography } from '../../theme';

interface Expense {
  id: number;
  title?: string;
  category?: string;
  amount: number;
  description?: string;
  date?: string;
  submittedBy?: { fullName: string };
  status?: string;
  createdAt: string;
}

function fmt(n: number) { return n.toLocaleString('en-US', { minimumFractionDigits: 2 }); }

const CAT_COLOR: Record<string, string> = {
  TRAVEL:     colors.info,
  UTILITIES:  colors.warning,
  SUPPLIES:   colors.success,
  EQUIPMENT:  colors.primary,
  OTHER:      colors.textMuted,
};

function ExpenseCard({ item }: { item: Expense }) {
  const color = CAT_COLOR[item.category ?? 'OTHER'] ?? colors.textMuted;
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={[styles.iconWrap, { backgroundColor: `${color}15` }]}>
          <Ionicons name="receipt" size={18} color={color} />
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.title} numberOfLines={1}>{item.title ?? item.category ?? `Expense #${item.id}`}</Text>
          <Text style={styles.meta}>{item.submittedBy?.fullName ?? ''} · {new Date(item.date ?? item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</Text>
        </View>
        <Text style={styles.amount}>${fmt(item.amount)}</Text>
      </View>
      {item.description ? <Text style={styles.desc} numberOfLines={1}>{item.description}</Text> : null}
    </View>
  );
}

export function ExpensesScreen() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ expenses: Expense[] }>('/expenses?limit=40');
      setExpenses(res.expenses ?? []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const total = expenses.reduce((s, e) => s + (e.amount ?? 0), 0);

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Expense Tracking" showBack />
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View> : (
        <FlatList
          data={expenses}
          keyExtractor={(i) => String(i.id)}
          renderItem={({ item }) => <ExpenseCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListHeaderComponent={<StatCard label="Total Expenses" value={`$${fmt(total)}`} icon="receipt" color={colors.danger} style={styles.header} />}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="receipt-outline" size={44} color={colors.textMuted} /><Text style={styles.emptyText}>No expenses recorded</Text></View>}
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
  cardTop:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4 },
  iconWrap:    { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardContent: { flex: 1 },
  title:       { ...typography.h4 },
  meta:        { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  amount:      { fontSize: 16, fontWeight: '800', color: colors.danger, flexShrink: 0 },
  desc:        { ...typography.bodySmall, color: colors.textSecondary },
  empty:       { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText:   { ...typography.bodySmall, color: colors.textMuted },
});
