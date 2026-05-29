import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader, StatCard } from '../../components';
import { colors, radius, shadow, spacing, typography } from '../../theme';

interface PayrollRecord {
  id: number;
  user?: { fullName: string; role?: string };
  month?: number;
  year?: number;
  baseSalary?: number;
  totalEarnings?: number;
  deductions?: number;
  netPay?: number;
  status?: string;
  createdAt: string;
}

function fmt(n: number) { return n.toLocaleString('en-US', { minimumFractionDigits: 0 }); }

const STATUS_COLOR: Record<string, string> = {
  PAID:    colors.success,
  PENDING: colors.warning,
  DRAFT:   colors.textMuted,
};

function PayCard({ item }: { item: PayrollRecord }) {
  const status = item.status ?? 'PENDING';
  const color  = STATUS_COLOR[status] ?? colors.textMuted;
  const name   = item.user?.fullName ?? `Record #${item.id}`;
  const period = item.month && item.year ? `${new Date(item.year, item.month - 1).toLocaleString('default', { month: 'long' })} ${item.year}` : new Date(item.createdAt).toLocaleDateString([], { month: 'long', year: 'numeric' });

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.period}>{period}</Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.amount}>${fmt(item.netPay ?? item.totalEarnings ?? 0)}</Text>
          <View style={[styles.badge, { backgroundColor: `${color}15` }]}>
            <Text style={[styles.badgeText, { color }]}>{status}</Text>
          </View>
        </View>
      </View>
      {(item.deductions != null) && (
        <View style={styles.footer}>
          <Text style={styles.detail}>Gross: <Text style={styles.detailVal}>${fmt(item.totalEarnings ?? item.baseSalary ?? 0)}</Text></Text>
          <Text style={styles.detail}>Deductions: <Text style={[styles.detailVal, { color: colors.danger }]}>${fmt(item.deductions)}</Text></Text>
        </View>
      )}
    </View>
  );
}

export function PayrollAdminScreen() {
  const [records, setRecords]   = useState<PayrollRecord[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ payrolls: PayrollRecord[] }>('/payroll?limit=40');
      setRecords(res.payrolls ?? []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const totalNet = records.reduce((s, r) => s + (r.netPay ?? r.totalEarnings ?? 0), 0);

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Payroll Admin" showBack />
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View> : (
        <FlatList
          data={records}
          keyExtractor={(i) => String(i.id)}
          renderItem={({ item }) => <PayCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListHeaderComponent={<StatCard label="Total Payroll" value={`$${fmt(totalNet)}`} icon="cash" color={colors.success} style={styles.header} />}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="cash-outline" size={44} color={colors.textMuted} /><Text style={styles.emptyText}>No payroll records</Text></View>}
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
  cardTop:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  cardLeft: { flex: 1, marginRight: spacing.sm },
  name:     { ...typography.h4 },
  period:   { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  right:    { alignItems: 'flex-end', gap: 4 },
  amount:   { fontSize: 16, fontWeight: '800', color: colors.success },
  badge:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  badgeText: { fontSize: 10, fontWeight: '700' },
  footer:   { flexDirection: 'row', gap: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 6 },
  detail:   { ...typography.caption },
  detailVal: { fontWeight: '700', color: colors.text },
  empty:    { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText: { ...typography.bodySmall, color: colors.textMuted },
});
