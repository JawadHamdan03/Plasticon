import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { colors, radius, shadow, spacing, typography } from '../../theme';

interface Reconciliation {
  id: number;
  accountName?: string;
  bankBalance?: number;
  bookBalance?: number;
  reconciled?: boolean;
  notes?: string;
  reconciledBy?: { fullName: string };
  createdAt: string;
}

function fmt(n: number) { return n.toLocaleString('en-US', { minimumFractionDigits: 2 }); }

function ReconCard({ item }: { item: Reconciliation }) {
  const statement = item.bankBalance ?? 0;
  const book      = item.bookBalance ?? 0;
  const diff      = statement - book;
  const isRecon   = item.reconciled ?? Math.abs(diff) < 0.01;
  const status    = isRecon ? 'RECONCILED' : (Math.abs(diff) > 0.01 ? 'DISCREPANCY' : 'RECONCILED');
  const color     = isRecon ? colors.success : colors.danger;
  const period    = new Date(item.createdAt).toLocaleDateString([], { month: 'long', year: 'numeric' });

  return (
    <View style={[styles.card, !isRecon && { borderLeftWidth: 3, borderLeftColor: colors.danger }]}>
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <Text style={styles.bank}>{item.accountName ?? 'Bank Account'}</Text>
          <Text style={styles.period}>{period}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: `${color}15` }]}>
          <Text style={[styles.badgeText, { color }]}>{status}</Text>
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Bank Balance</Text>
          <Text style={styles.metricVal}>${fmt(statement)}</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Book Balance</Text>
          <Text style={styles.metricVal}>${fmt(book)}</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Difference</Text>
          <Text style={[styles.metricVal, { color: Math.abs(diff) > 0.01 ? colors.danger : colors.success }]}>${fmt(Math.abs(diff))}</Text>
        </View>
      </View>
      {item.notes ? <Text style={styles.notes} numberOfLines={2}>{item.notes}</Text> : null}
      {item.reconciledBy && (
        <Text style={styles.reconciledBy}>By {item.reconciledBy.fullName}</Text>
      )}
    </View>
  );
}

export function BankReconciliationScreen() {
  const [records, setRecords]   = useState<Reconciliation[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<Reconciliation[]>('/bank-reconciliations?limit=30');
      setRecords(Array.isArray(res) ? res : []);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to load reconciliations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const discrepancies = records.filter((r) => {
    const diff = (r.bankBalance ?? 0) - (r.bookBalance ?? 0);
    return !r.reconciled && Math.abs(diff) > 0.01;
  }).length;

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title="Bank Reconciliation"
        subtitle={discrepancies > 0 ? `${discrepancies} discrepanc${discrepancies !== 1 ? 'ies' : 'y'}` : `${records.length} records`}
        showBack
      />
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View> : (
        <FlatList
          data={records}
          keyExtractor={(i, idx) => `${String(i.id)}-${idx}`}
          renderItem={({ item }) => <ReconCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="swap-horizontal-outline" size={44} color={colors.textMuted} />
              <Text style={styles.emptyText}>No reconciliation records</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: colors.background },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:         { padding: spacing.md, paddingBottom: 40 },
  card:         { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardTop:      { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm },
  cardLeft:     { flex: 1, marginRight: spacing.sm },
  bank:         { ...typography.h4 },
  period:       { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  badge:        { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  badgeText:    { fontSize: 10, fontWeight: '700' },
  row:          { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  metric:       { flex: 1, alignItems: 'center' },
  metricLabel:  { ...typography.caption, marginBottom: 2 },
  metricVal:    { fontSize: 13, fontWeight: '700', color: colors.text },
  notes:        { ...typography.caption, color: colors.textMuted, marginTop: spacing.sm, fontStyle: 'italic' },
  reconciledBy: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  empty:        { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText:    { ...typography.bodySmall, color: colors.textMuted },
});
