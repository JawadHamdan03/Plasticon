import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { colors, radius, shadow, spacing, typography } from '../../theme';

interface Invoice {
  id: number;
  invoiceNumber?: string;
  clientName?: string;
  customer?: { name: string };
  totalAmount?: number;
  amount?: number;
  paymentStatus?: string;
  status?: string;
  dueDate?: string;
  issueDate?: string;
  createdAt: string;
}

function fmt(n: number) { return n.toLocaleString('en-US', { minimumFractionDigits: 2 }); }

const STATUS_COLOR: Record<string, string> = {
  PAID:      colors.success,
  UNPAID:    colors.danger,
  PENDING:   colors.warning,
  OVERDUE:   '#7C3AED',
  DRAFT:     colors.textMuted,
  CANCELLED: colors.textMuted,
};

function InvoiceCard({ item }: { item: Invoice }) {
  const status = item.paymentStatus ?? item.status ?? 'PENDING';
  const color  = STATUS_COLOR[status] ?? colors.textMuted;
  const client = item.clientName ?? item.customer?.name ?? `Invoice #${item.id}`;
  const due    = item.dueDate ? new Date(item.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : null;
  const amt    = item.totalAmount ?? item.amount ?? 0;

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <Text style={styles.number}>{item.invoiceNumber ?? `INV-${item.id}`}</Text>
          <Text style={styles.client} numberOfLines={1}>{client}</Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.amount}>${fmt(amt)}</Text>
          <View style={[styles.badge, { backgroundColor: `${color}15` }]}>
            <Text style={[styles.badgeText, { color }]}>{status}</Text>
          </View>
        </View>
      </View>
      {due && <Text style={styles.due}>Due: {due}</Text>}
    </View>
  );
}

export function InvoicesScreen() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<Invoice[]>('/invoices?limit=30');
      setInvoices(Array.isArray(res) ? res : []);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to load invoices');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Invoices" subtitle={`${invoices.length} invoices`} showBack />
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View> : (
        <FlatList
          data={invoices}
          keyExtractor={(i) => String(i.id)}
          renderItem={({ item }) => <InvoiceCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="document-text-outline" size={44} color={colors.textMuted} /><Text style={styles.emptyText}>No invoices</Text></View>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: colors.background },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:      { padding: spacing.md, paddingBottom: 40 },
  card:      { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  cardLeft:  { flex: 1, marginRight: spacing.sm },
  number:    { ...typography.h4 },
  client:    { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  right:     { alignItems: 'flex-end', gap: 4 },
  amount:    { fontSize: 16, fontWeight: '800', color: colors.text },
  badge:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  badgeText: { fontSize: 10, fontWeight: '700' },
  due:       { ...typography.caption },
  empty:     { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText: { ...typography.bodySmall, color: colors.textMuted },
});
