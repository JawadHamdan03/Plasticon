import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { colors, radius, shadow, spacing, typography } from '../../theme';

interface TaxFiling {
  id: number;
  taxType?: string;
  period?: string;
  amount?: number;
  status?: string;
  dueDate?: string;
  filedDate?: string;
  filedBy?: { fullName: string };
  createdAt: string;
}

function fmt(n: number) { return n.toLocaleString('en-US', { minimumFractionDigits: 2 }); }

const STATUS_META: Record<string, { color: string; icon: string }> = {
  FILED:   { color: colors.success, icon: 'checkmark-circle' },
  PENDING: { color: colors.warning, icon: 'time' },
  OVERDUE: { color: colors.danger,  icon: 'alert-circle' },
  DRAFT:   { color: colors.textMuted, icon: 'document' },
};

function TaxCard({ item }: { item: TaxFiling }) {
  const status = item.status ?? 'PENDING';
  const meta   = STATUS_META[status] ?? STATUS_META.PENDING;
  const due    = item.dueDate ? new Date(item.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : null;

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={[styles.iconWrap, { backgroundColor: `${meta.color}15` }]}>
          <Ionicons name={meta.icon as any} size={20} color={meta.color} />
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.taxType}>{item.taxType ?? `Filing #${item.id}`}</Text>
          <Text style={styles.period}>{item.period ?? new Date(item.createdAt).toLocaleDateString([], { month: 'long', year: 'numeric' })}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: `${meta.color}15` }]}>
          <Text style={[styles.badgeText, { color: meta.color }]}>{status}</Text>
        </View>
      </View>
      <View style={styles.footer}>
        {item.amount != null && <Text style={styles.detail}>Amount: <Text style={styles.detailVal}>${fmt(item.amount)}</Text></Text>}
        {due && <Text style={styles.detail}>Due: <Text style={styles.detailVal}>{due}</Text></Text>}
        {item.filedBy && <Text style={styles.detail}>Filed by: <Text style={styles.detailVal}>{item.filedBy.fullName}</Text></Text>}
      </View>
    </View>
  );
}

export function TaxComplianceScreen() {
  const [filings, setFilings]   = useState<TaxFiling[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ filings: TaxFiling[] }>('/tax-filings?limit=20');
      setFilings(res.filings ?? []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const pending = filings.filter((f) => f.status === 'PENDING' || f.status === 'OVERDUE').length;

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Tax Compliance" subtitle={pending > 0 ? `${pending} pending filings` : 'All up to date'} showBack />
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View> : (
        <FlatList
          data={filings}
          keyExtractor={(i) => String(i.id)}
          renderItem={({ item }) => <TaxCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="calculator-outline" size={44} color={colors.textMuted} /><Text style={styles.emptyText}>No tax filings</Text></View>}
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
  taxType:     { ...typography.h4 },
  period:      { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  badge:       { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  badgeText:   { fontSize: 10, fontWeight: '700' },
  footer:      { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 },
  detail:      { ...typography.caption },
  detailVal:   { fontWeight: '700', color: colors.text },
  empty:       { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText:   { ...typography.bodySmall, color: colors.textMuted },
});
