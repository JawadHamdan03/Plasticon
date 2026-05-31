import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

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
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const statement = item.bankBalance ?? 0;
  const book      = item.bookBalance ?? 0;
  const diff      = statement - book;
  const isRecon   = item.reconciled ?? Math.abs(diff) < 0.01;
  const status    = isRecon ? (isAr ? 'تمت التسوية' : 'RECONCILED') : (isAr ? 'فرق' : 'DISCREPANCY');
  const color     = isRecon ? colors.success : colors.danger;
  const period    = new Date(item.createdAt).toLocaleDateString([], { month: 'long', year: 'numeric' });

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }, !isRecon && { borderLeftWidth: 3, borderLeftColor: colors.danger }]}>
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <Text style={[styles.bank, { color: colors.text }]}>{item.accountName ?? (isAr ? 'الحساب البنكي' : 'Bank Account')}</Text>
          <Text style={[styles.period, { color: colors.textMuted }]}>{period}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: `${color}15` }]}>
          <Text style={[styles.badgeText, { color }]}>{status}</Text>
        </View>
      </View>
      <View style={[styles.row, { borderTopColor: colors.border }]}>
        <View style={styles.metric}>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>{isAr ? 'رصيد البنك' : 'Bank Balance'}</Text>
          <Text style={[styles.metricVal, { color: colors.text }]}>${fmt(statement)}</Text>
        </View>
        <View style={styles.metric}>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>{isAr ? 'رصيد الدفاتر' : 'Book Balance'}</Text>
          <Text style={[styles.metricVal, { color: colors.text }]}>${fmt(book)}</Text>
        </View>
        <View style={styles.metric}>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>{isAr ? 'الفرق' : 'Difference'}</Text>
          <Text style={[styles.metricVal, { color: Math.abs(diff) > 0.01 ? colors.danger : colors.success }]}>${fmt(Math.abs(diff))}</Text>
        </View>
      </View>
      {item.notes ? <Text style={[styles.notes, { color: colors.textMuted }]} numberOfLines={2}>{item.notes}</Text> : null}
      {item.reconciledBy && (
        <Text style={[styles.reconciledBy, { color: colors.textMuted }]}>{isAr ? 'بواسطة' : 'By'} {item.reconciledBy.fullName}</Text>
      )}
    </View>
  );
}

export function BankReconciliationScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();

  const [records, setRecords]   = useState<Reconciliation[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<Reconciliation[]>('/bank-reconciliations?limit=30');
      setRecords(Array.isArray(res) ? res : []);
    } catch (e: any) {
      Alert.alert(isAr ? 'خطأ' : 'Error', e?.message ?? (isAr ? 'فشل تحميل التسويات' : 'Failed to load reconciliations'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAr]);

  useEffect(() => { void load(); }, [load]);

  const discrepancies = records.filter((r) => {
    const diff = (r.bankBalance ?? 0) - (r.bookBalance ?? 0);
    return !r.reconciled && Math.abs(diff) > 0.01;
  }).length;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title={isAr ? 'تسوية البنك' : 'Bank Reconciliation'}
        subtitle={
          discrepancies > 0
            ? `${discrepancies} ${isAr ? 'فروق' : `discrepanc${discrepancies !== 1 ? 'ies' : 'y'}`}`
            : `${records.length} ${isAr ? 'سجلات' : 'records'}`
        }
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
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>{isAr ? 'لا توجد سجلات تسوية' : 'No reconciliation records'}</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1 },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:         { padding: spacing.md, paddingBottom: 40 },
  card:         { borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardTop:      { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm },
  cardLeft:     { flex: 1, marginRight: spacing.sm },
  bank:         { ...typography.h4 },
  period:       { ...typography.caption, marginTop: 2 },
  badge:        { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  badgeText:    { fontSize: 10, fontWeight: '700' },
  row:          { flexDirection: 'row', borderTopWidth: 1, paddingTop: spacing.sm },
  metric:       { flex: 1, alignItems: 'center' },
  metricLabel:  { ...typography.caption, marginBottom: 2 },
  metricVal:    { fontSize: 13, fontWeight: '700' },
  notes:        { ...typography.caption, marginTop: spacing.sm, fontStyle: 'italic' },
  reconciledBy: { ...typography.caption, marginTop: 4 },
  empty:        { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText:    { ...typography.bodySmall },
});
