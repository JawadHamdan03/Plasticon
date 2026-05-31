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
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

interface PayrollRecord {
  id: number;
  user?: { fullName: string; role?: string };
  date?: string;
  baseSalary?: number;
  overtimePay?: number;
  deductions?: number;
  deductionAmount?: number;
  totalEarnings?: number;
  netPay?: number;
  totalDailyPay?: number;
  hoursWorked?: number;
  confirmed?: boolean;
  isConfirmed?: boolean;
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
  const { colors } = useAppTheme();
  const { isAr } = useLocale();

  const confirmed = item.isConfirmed ?? item.confirmed ?? item.status === 'PAID';
  const name      = item.user?.fullName ?? `Record #${item.id}`;
  const dateStr   = item.date
    ? new Date(item.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
    : new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
          <Text style={[styles.period, { color: colors.textMuted }]}>{dateStr}</Text>
        </View>
        <View style={styles.right}>
          <Text style={[styles.amount, { color: colors.success }]}>${fmt(item.totalDailyPay ?? item.netPay ?? item.totalEarnings ?? 0)}</Text>
          <View style={[styles.badge, { backgroundColor: confirmed ? `${colors.success}15` : `${colors.warning}15` }]}>
            <Text style={[styles.badgeText, { color: confirmed ? colors.success : colors.warning }]}>
              {confirmed ? (isAr ? 'مؤكد' : 'CONFIRMED') : (isAr ? 'معلق' : 'PENDING')}
            </Text>
          </View>
        </View>
      </View>

      {((item.deductions ?? item.deductionAmount) != null || item.hoursWorked != null) && (
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          {item.hoursWorked != null && (
            <Text style={[styles.detail, { color: colors.text }]}>{isAr ? 'الساعات:' : 'Hours:'} <Text style={[styles.detailVal, { color: colors.text }]}>{item.hoursWorked}h</Text></Text>
          )}
          {(item.totalEarnings ?? item.totalDailyPay) != null && (
            <Text style={[styles.detail, { color: colors.text }]}>{isAr ? 'الإجمالي:' : 'Gross:'} <Text style={[styles.detailVal, { color: colors.text }]}>${fmt(item.totalEarnings ?? item.totalDailyPay ?? 0)}</Text></Text>
          )}
          {(item.deductions ?? item.deductionAmount) != null && (
            <Text style={[styles.detail, { color: colors.text }]}>{isAr ? 'الخصومات:' : 'Deductions:'} <Text style={[styles.detailVal, { color: colors.danger }]}>${fmt(item.deductions ?? item.deductionAmount ?? 0)}</Text></Text>
          )}
        </View>
      )}

      {!confirmed && (
        <TouchableOpacity
          style={[styles.confirmBtn, { backgroundColor: colors.success }, confirming && { opacity: 0.6 }]}
          onPress={onConfirm}
          disabled={confirming}
          activeOpacity={0.8}
        >
          {confirming
            ? <ActivityIndicator size="small" color={colors.textInverse} />
            : <>
                <Ionicons name="checkmark-circle" size={14} color={colors.textInverse} />
                <Text style={[styles.confirmText, { color: colors.textInverse }]}>{isAr ? 'تأكيد الدفع' : 'Confirm Payment'}</Text>
              </>
          }
        </TouchableOpacity>
      )}
    </View>
  );
}

export function PayrollAdminScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();

  const [records, setRecords]       = useState<PayrollRecord[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get<PayrollRecord[]>('/payroll/daily?limit=40');
      setRecords(Array.isArray(res) ? res : []);
    } catch (e: any) {
      Alert.alert(isAr ? 'خطأ' : 'Error', e?.message ?? 'Failed to load payroll');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleCalculateToday = () => {
    const today = new Date().toISOString().split('T')[0];
    Alert.alert(
      isAr ? 'احتساب اليوم' : 'Calculate Today',
      isAr ? `تشغيل احتساب الرواتب لـ ${today}؟` : `Run payroll calculation for ${today}?`,
      [
        { text: isAr ? 'إلغاء' : 'Cancel', style: 'cancel' },
        {
          text: isAr ? 'احتساب' : 'Calculate',
          onPress: async () => {
            setCalculating(true);
            try {
              await api.post('/payroll/daily/calculate-date', { date: today });
              setRefreshing(true);
              await load();
              Alert.alert(isAr ? 'تم' : 'Done', isAr ? 'تم احتساب الرواتب بنجاح.' : 'Payroll calculated successfully.');
            } catch (e: any) {
              Alert.alert(isAr ? 'خطأ' : 'Error', e?.message ?? 'Calculation failed');
            } finally {
              setCalculating(false);
            }
          },
        },
      ],
    );
  };

  const handleConfirm = async (id: number) => {
    setConfirmingId(id);
    try {
      await api.post(`/payroll/daily/${id}/confirm`, {});
      await load();
    } catch (e: any) {
      Alert.alert(isAr ? 'خطأ' : 'Error', e?.message ?? 'Failed to confirm');
    } finally {
      setConfirmingId(null);
    }
  };

  const totalNet      = records.reduce((s, r) => s + (r.totalDailyPay ?? r.netPay ?? r.totalEarnings ?? 0), 0);
  const pendingCount  = records.filter((r) => !(r.isConfirmed ?? r.confirmed) && r.status !== 'PAID').length;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title={isAr ? 'الرواتب' : 'Payroll Admin'}
        showBack
        rightIcon="calculator-outline"
        onRightPress={calculating ? undefined : handleCalculateToday}
      />
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(i, idx) => `${String(i.id)}-${idx}`}
          renderItem={({ item }) => (
            <PayCard
              item={item}
              onConfirm={() => void handleConfirm(item.id)}
              confirming={confirmingId === item.id}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); void load(); }}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={
            <View style={styles.statsRow}>
              <StatCard label={isAr ? 'إجمالي الرواتب' : 'Total Payroll'} value={`$${fmt(totalNet)}`} icon="cash" color={colors.success} style={styles.stat} />
              <StatCard label={isAr ? 'معلق' : 'Pending'} value={String(pendingCount)} icon="time" color={colors.warning} style={styles.stat} />
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="cash-outline" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>{isAr ? 'لا توجد سجلات رواتب' : 'No payroll records'}</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:       { flex: 1 },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:       { padding: spacing.md, paddingBottom: 40 },
  statsRow:   { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  stat:       { flex: 1 },
  card:       { borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  cardLeft:   { flex: 1, marginRight: spacing.sm },
  name:       { ...typography.h4 },
  period:     { ...typography.caption, marginTop: 2 },
  right:      { alignItems: 'flex-end', gap: 4 },
  amount:     { fontSize: 16, fontWeight: '800' },
  badge:      { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  badgeText:  { fontSize: 10, fontWeight: '700' },
  footer:     { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap', borderTopWidth: 1, paddingTop: 6, marginBottom: 8 },
  detail:     { ...typography.caption },
  detailVal:  { fontWeight: '700' },

  confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: radius.md, paddingVertical: 8 },
  confirmText:{ fontSize: 13, fontWeight: '700' },

  empty:      { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText:  { ...typography.bodySmall },
});
