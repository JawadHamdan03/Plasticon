import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader, StatCard } from '../../components';
import { colors, radius, shadow, spacing, typography } from '../../theme';

interface PayrollRecord {
  id: number;
  user?: { fullName: string; role?: string };
  date?: string;
  baseSalary?: number;
  overtimePay?: number;
  deductions?: number;
  totalEarnings?: number;
  netPay?: number;
  hoursWorked?: number;
  confirmed?: boolean;
  status?: string;
  createdAt: string;
}

function fmt(n: number) { return n.toLocaleString('en-US', { minimumFractionDigits: 0 }); }

function PayCard({
  item,
  onConfirm,
  confirming,
}: {
  item: PayrollRecord;
  onConfirm: () => void;
  confirming: boolean;
}) {
  const confirmed = item.confirmed ?? item.status === 'PAID';
  const name      = item.user?.fullName ?? `Record #${item.id}`;
  const dateStr   = item.date
    ? new Date(item.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
    : new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.period}>{dateStr}</Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.amount}>${fmt(item.netPay ?? item.totalEarnings ?? 0)}</Text>
          <View style={[styles.badge, { backgroundColor: confirmed ? `${colors.success}15` : `${colors.warning}15` }]}>
            <Text style={[styles.badgeText, { color: confirmed ? colors.success : colors.warning }]}>
              {confirmed ? 'CONFIRMED' : 'PENDING'}
            </Text>
          </View>
        </View>
      </View>

      {(item.deductions != null || item.hoursWorked != null) && (
        <View style={styles.footer}>
          {item.hoursWorked != null && (
            <Text style={styles.detail}>Hours: <Text style={styles.detailVal}>{item.hoursWorked}h</Text></Text>
          )}
          {item.totalEarnings != null && (
            <Text style={styles.detail}>Gross: <Text style={styles.detailVal}>${fmt(item.totalEarnings)}</Text></Text>
          )}
          {item.deductions != null && (
            <Text style={styles.detail}>Deductions: <Text style={[styles.detailVal, { color: colors.danger }]}>${fmt(item.deductions)}</Text></Text>
          )}
        </View>
      )}

      {!confirmed && (
        <TouchableOpacity
          style={[styles.confirmBtn, confirming && { opacity: 0.6 }]}
          onPress={onConfirm}
          disabled={confirming}
          activeOpacity={0.8}
        >
          {confirming
            ? <ActivityIndicator size="small" color={colors.textInverse} />
            : <>
                <Ionicons name="checkmark-circle" size={14} color={colors.textInverse} />
                <Text style={styles.confirmText}>Confirm Payment</Text>
              </>
          }
        </TouchableOpacity>
      )}
    </View>
  );
}

export function PayrollAdminScreen() {
  const [records, setRecords]       = useState<PayrollRecord[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ payrolls?: PayrollRecord[]; records?: PayrollRecord[] }>('/payroll/daily?limit=40');
      setRecords(res.payrolls ?? res.records ?? []);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to load payroll');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleCalculateToday = () => {
    const today = new Date().toISOString().split('T')[0];
    Alert.alert('Calculate Today', `Run payroll calculation for ${today}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Calculate',
        onPress: async () => {
          setCalculating(true);
          try {
            await api.post('/payroll/daily/calculate-date', { date: today });
            setRefreshing(true);
            await load();
            Alert.alert('Done', 'Payroll calculated successfully.');
          } catch (e: any) {
            Alert.alert('Error', e?.message ?? 'Calculation failed');
          } finally {
            setCalculating(false);
          }
        },
      },
    ]);
  };

  const handleConfirm = async (id: number) => {
    setConfirmingId(id);
    try {
      await api.post(`/payroll/daily/${id}/confirm`, {});
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to confirm');
    } finally {
      setConfirmingId(null);
    }
  };

  const totalNet      = records.reduce((s, r) => s + (r.netPay ?? r.totalEarnings ?? 0), 0);
  const pendingCount  = records.filter((r) => !r.confirmed && r.status !== 'PAID').length;

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title="Payroll Admin"
        showBack
        rightIcon="calculator-outline"
        onRightPress={calculating ? undefined : handleCalculateToday}
      />
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(i) => String(i.id)}
          renderItem={({ item }) => (
            <PayCard
              item={item}
              onConfirm={() => void handleConfirm(item.id)}
              confirming={confirmingId === item.id}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListHeaderComponent={
            <View style={styles.statsRow}>
              <StatCard label="Total Payroll" value={`$${fmt(totalNet)}`} icon="cash" color={colors.success} style={styles.stat} />
              <StatCard label="Pending" value={String(pendingCount)} icon="time" color={colors.warning} style={styles.stat} />
            </View>
          }
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="cash-outline" size={44} color={colors.textMuted} /><Text style={styles.emptyText}>No payroll records</Text></View>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: colors.background },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:       { padding: spacing.md, paddingBottom: 40 },
  statsRow:   { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  stat:       { flex: 1 },
  card:       { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  cardLeft:   { flex: 1, marginRight: spacing.sm },
  name:       { ...typography.h4 },
  period:     { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  right:      { alignItems: 'flex-end', gap: 4 },
  amount:     { fontSize: 16, fontWeight: '800', color: colors.success },
  badge:      { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  badgeText:  { fontSize: 10, fontWeight: '700' },
  footer:     { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 6, marginBottom: 8 },
  detail:     { ...typography.caption },
  detailVal:  { fontWeight: '700', color: colors.text },

  confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.success, borderRadius: radius.md, paddingVertical: 8 },
  confirmText:{ fontSize: 13, fontWeight: '700', color: colors.textInverse },

  empty:      { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText:  { ...typography.bodySmall, color: colors.textMuted },
});
