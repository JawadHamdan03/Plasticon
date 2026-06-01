import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

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

function InvoiceCard({ item }: { item: Invoice }) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();

  const STATUS_COLOR: Record<string, string> = {
    PAID:      colors.success,
    UNPAID:    colors.danger,
    PENDING:   colors.warning,
    OVERDUE:   '#7C3AED',
    DRAFT:     colors.textMuted,
    CANCELLED: colors.textMuted,
  };

  const status = item.paymentStatus ?? item.status ?? 'PENDING';
  const color  = STATUS_COLOR[status] ?? colors.textMuted;
  const client = item.clientName ?? item.customer?.name ?? `${isAr ? 'فاتورة #' : 'Invoice #'}${item.id}`;
  const due    = item.dueDate ? new Date(item.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : null;
  const amt    = item.totalAmount ?? item.amount ?? 0;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <Text style={[styles.number, { color: colors.text }]}>{item.invoiceNumber ?? `INV-${item.id}`}</Text>
          <Text style={[styles.client, { color: colors.textMuted }]} numberOfLines={1}>{client}</Text>
        </View>
        <View style={styles.right}>
          <Text style={[styles.amount, { color: colors.text }]}>${fmt(amt)}</Text>
          <View style={[styles.badge, { backgroundColor: `${color}15` }]}>
            <Text style={[styles.badgeText, { color }]}>{status}</Text>
          </View>
        </View>
      </View>
      {due && <Text style={[styles.due, { color: colors.textMuted }]}>{isAr ? 'الاستحقاق:' : 'Due:'} {due}</Text>}
    </View>
  );
}

export function InvoicesScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<Invoice[]>('/invoices?limit=30');
      setInvoices(Array.isArray(res) ? res : []);
    } catch (e: any) {
      Alert.alert(isAr ? 'خطأ' : 'Error', e?.message ?? (isAr ? 'فشل تحميل الفواتير' : 'Failed to load invoices'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAr]);

  useEffect(() => { void load(); }, [load]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={isAr ? 'الفواتير' : 'Invoices'} subtitle={`${invoices.length} ${isAr ? 'فاتورة' : 'invoices'}`} showBack />
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View> : (
        <FlatList
          data={invoices}
          keyExtractor={(i, idx) => `${String(i.id)}-${idx}`}
          renderItem={({ item }) => <InvoiceCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {isAr ? 'لا توجد فواتير' : 'No invoices'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1 },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:      { padding: spacing.md, paddingBottom: 40 },
  card:      { borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  cardLeft:  { flex: 1, marginRight: spacing.sm },
  number:    { ...typography.h4 },
  client:    { ...typography.caption, marginTop: 2 },
  right:     { alignItems: 'flex-end', gap: 4 },
  amount:    { fontSize: 16, fontWeight: '800' },
  badge:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  badgeText: { fontSize: 10, fontWeight: '700' },
  due:       { ...typography.caption },
  empty:     { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText: { ...typography.bodySmall },
});
