import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader, StatCard } from '../../components';
import { colors, radius, shadow, spacing, typography } from '../../theme';

interface Receivable {
  id: number;
  customerName?: string;
  customer?: { name: string };
  invoiceNumber?: string;
  amount: number;
  amountPaid?: number;
  balance?: number;
  dueDate?: string;
  status?: string;
  createdAt: string;
}

function fmt(n: number) { return n.toLocaleString('en-US', { minimumFractionDigits: 2 }); }

function RecCard({ item }: { item: Receivable }) {
  const balance = item.balance ?? (item.amount - (item.amountPaid ?? 0));
  const status  = item.status ?? (balance <= 0 ? 'PAID' : 'OUTSTANDING');
  const color   = balance <= 0 ? colors.success : status === 'OVERDUE' ? colors.danger : colors.warning;
  const name    = item.customerName ?? item.customer?.name ?? `Record #${item.id}`;

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <Text style={styles.customer} numberOfLines={1}>{name}</Text>
          {item.invoiceNumber && <Text style={styles.inv}>{item.invoiceNumber}</Text>}
        </View>
        <View style={styles.cardRight}>
          <Text style={[styles.balance, { color }]}>${fmt(balance)}</Text>
          <Text style={styles.balLabel}>outstanding</Text>
        </View>
      </View>
      <View style={styles.row}>
        <Text style={styles.detail}>Total: <Text style={styles.detailVal}>${fmt(item.amount)}</Text></Text>
        <Text style={styles.detail}>Paid: <Text style={styles.detailVal}>${fmt(item.amountPaid ?? 0)}</Text></Text>
        {item.dueDate && <Text style={styles.detail}>Due: <Text style={styles.detailVal}>{new Date(item.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}</Text></Text>}
      </View>
    </View>
  );
}

export function CustomerReceivablesScreen() {
  const [records, setRecords]   = useState<Receivable[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ receivables: Receivable[] }>('/customer-receivables?limit=30');
      setRecords(res.receivables ?? []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const totalOutstanding = records.reduce((s, r) => s + (r.balance ?? (r.amount - (r.amountPaid ?? 0))), 0);

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Customer Receivables" showBack />
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View> : (
        <FlatList
          data={records}
          keyExtractor={(i) => String(i.id)}
          renderItem={({ item }) => <RecCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListHeaderComponent={<StatCard label="Total Outstanding" value={`$${fmt(totalOutstanding)}`} icon="people" color={colors.warning} style={styles.header} />}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="people-outline" size={44} color={colors.textMuted} /><Text style={styles.emptyText}>No receivables</Text></View>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: colors.background },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:       { padding: spacing.md, paddingBottom: 40 },
  header:     { marginBottom: spacing.md },
  card:       { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  cardLeft:   { flex: 1, marginRight: spacing.sm },
  customer:   { ...typography.h4 },
  inv:        { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  cardRight:  { alignItems: 'flex-end' },
  balance:    { fontSize: 18, fontWeight: '800' },
  balLabel:   { ...typography.caption, color: colors.textMuted },
  row:        { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
  detail:     { ...typography.caption },
  detailVal:  { fontWeight: '700', color: colors.text },
  empty:      { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText:  { ...typography.bodySmall, color: colors.textMuted },
});
