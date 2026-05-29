import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader, StatCard } from '../../components';
import { colors, radius, shadow, spacing, typography } from '../../theme';

interface Payable {
  id: number;
  supplierName?: string;
  supplier?: { name: string };
  invoiceRef?: string;
  amount: number;
  amountPaid?: number;
  balance?: number;
  dueDate?: string;
  status?: string;
  createdAt: string;
}

function fmt(n: number) { return n.toLocaleString('en-US', { minimumFractionDigits: 2 }); }

function PayCard({ item }: { item: Payable }) {
  const balance = item.balance ?? (item.amount - (item.amountPaid ?? 0));
  const overdue = item.dueDate ? new Date(item.dueDate) < new Date() && balance > 0 : false;
  const color   = balance <= 0 ? colors.success : overdue ? colors.danger : colors.warning;
  const name    = item.supplierName ?? item.supplier?.name ?? `Payable #${item.id}`;

  return (
    <View style={[styles.card, overdue && { borderLeftWidth: 3, borderLeftColor: colors.danger }]}>
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <Text style={styles.supplier} numberOfLines={1}>{name}</Text>
          {item.invoiceRef && <Text style={styles.ref}>{item.invoiceRef}</Text>}
        </View>
        <View style={styles.cardRight}>
          <Text style={[styles.balance, { color }]}>${fmt(balance)}</Text>
          <Text style={styles.balLabel}>{overdue ? 'OVERDUE' : 'owed'}</Text>
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

export function SupplierPayablesScreen() {
  const [records, setRecords]   = useState<Payable[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ payables: Payable[] }>('/supplier-payables?limit=30');
      setRecords(res.payables ?? []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const totalOwed = records.reduce((s, r) => s + (r.balance ?? (r.amount - (r.amountPaid ?? 0))), 0);

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Supplier Payables" showBack />
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View> : (
        <FlatList
          data={records}
          keyExtractor={(i) => String(i.id)}
          renderItem={({ item }) => <PayCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListHeaderComponent={<StatCard label="Total Owed to Suppliers" value={`$${fmt(totalOwed)}`} icon="business" color={colors.danger} style={styles.header} />}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="business-outline" size={44} color={colors.textMuted} /><Text style={styles.emptyText}>No payables</Text></View>}
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
  supplier:   { ...typography.h4 },
  ref:        { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  cardRight:  { alignItems: 'flex-end' },
  balance:    { fontSize: 18, fontWeight: '800' },
  balLabel:   { ...typography.caption, color: colors.textMuted },
  row:        { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
  detail:     { ...typography.caption },
  detailVal:  { fontWeight: '700', color: colors.text },
  empty:      { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText:  { ...typography.bodySmall, color: colors.textMuted },
});
