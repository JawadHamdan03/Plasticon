import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { colors, radius, shadow, spacing, typography } from '../../theme';

interface Reconciliation {
  id: number;
  bankName?: string;
  accountNumber?: string;
  statementBalance?: number;
  bookBalance?: number;
  difference?: number;
  status?: string;
  period?: string;
  createdAt: string;
}

function fmt(n: number) { return n.toLocaleString('en-US', { minimumFractionDigits: 2 }); }

const STATUS_COLOR: Record<string, string> = {
  RECONCILED:   colors.success,
  PENDING:      colors.warning,
  DISCREPANCY:  colors.danger,
};

function ReconCard({ item }: { item: Reconciliation }) {
  const diff   = item.difference ?? ((item.statementBalance ?? 0) - (item.bookBalance ?? 0));
  const status = item.status ?? (Math.abs(diff) < 0.01 ? 'RECONCILED' : 'DISCREPANCY');
  const color  = STATUS_COLOR[status] ?? colors.textMuted;

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <Text style={styles.bank}>{item.bankName ?? 'Bank Account'}</Text>
          <Text style={styles.period}>{item.period ?? new Date(item.createdAt).toLocaleDateString([], { month: 'long', year: 'numeric' })}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: `${color}15` }]}>
          <Text style={[styles.badgeText, { color }]}>{status}</Text>
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Statement</Text>
          <Text style={styles.metricVal}>${fmt(item.statementBalance ?? 0)}</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Book</Text>
          <Text style={styles.metricVal}>${fmt(item.bookBalance ?? 0)}</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Difference</Text>
          <Text style={[styles.metricVal, { color: Math.abs(diff) > 0.01 ? colors.danger : colors.success }]}>${fmt(Math.abs(diff))}</Text>
        </View>
      </View>
    </View>
  );
}

export function BankReconciliationScreen() {
  const [records, setRecords]   = useState<Reconciliation[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<Reconciliation[]>('/bank-reconciliations?limit=20');
      setRecords(Array.isArray(res) ? res : []);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to load reconciliations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Bank Reconciliation" subtitle={`${records.length} records`} showBack />
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View> : (
        <FlatList
          data={records}
          keyExtractor={(i) => String(i.id)}
          renderItem={({ item }) => <ReconCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="swap-horizontal-outline" size={44} color={colors.textMuted} /><Text style={styles.emptyText}>No reconciliation records</Text></View>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: colors.background },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:       { padding: spacing.md, paddingBottom: 40 },
  card:       { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardTop:    { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm },
  cardLeft:   { flex: 1, marginRight: spacing.sm },
  bank:       { ...typography.h4 },
  period:     { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  badge:      { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  badgeText:  { fontSize: 10, fontWeight: '700' },
  row:        { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  metric:     { flex: 1, alignItems: 'center' },
  metricLabel: { ...typography.caption, marginBottom: 2 },
  metricVal:  { fontSize: 13, fontWeight: '700', color: colors.text },
  empty:      { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText:  { ...typography.bodySmall, color: colors.textMuted },
});
