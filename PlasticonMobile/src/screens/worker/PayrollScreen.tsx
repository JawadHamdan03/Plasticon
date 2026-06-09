import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, RefreshControl, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { DailyPayrollRecord, MonthlyPayroll } from '../../api/types';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

// ── Types ─────────────────────────────────────────────────────────────────────

type PayrollTab = 'daily' | 'monthly' | 'rates';

interface SalaryConfig { id: number; role: string; monthlySalary: number; }

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtMoney(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtMoneyShort(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function fmtDay(iso: string) {
  return new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}
function fmtMonthLabel(yyyyMM: string) {
  const [y, m] = yyyyMM.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString([], { month: 'long', year: 'numeric' });
}
function fmtTime(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const ROLE_COLORS: Record<string, string> = {
  WORKER: '#3B82F6', ENGINEER: '#10B981', ACCOUNTANT: '#F97316', ADMIN: '#EF4444', SALES_REP: '#8b5cf6',
};

const TABS: { key: PayrollTab; labelEn: string; labelAr: string; icon: string }[] = [
  { key: 'daily',   labelEn: 'Daily',         labelAr: 'اليومي',        icon: 'today-outline'    },
  { key: 'monthly', labelEn: 'Monthly',        labelAr: 'الشهري',        icon: 'calendar-outline' },
  { key: 'rates',   labelEn: 'Salary Rates',   labelAr: 'معدلات الراتب', icon: 'cash-outline'     },
];

// ── Daily row ─────────────────────────────────────────────────────────────────

function DayRow({ item }: { item: DailyPayrollRecord }) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const confirmed = !!item.isConfirmed;
  const missingCO = !item.attendance?.checkOut;

  return (
    <View style={[
      styles.card,
      { backgroundColor: colors.surface, borderLeftColor: confirmed ? colors.success : colors.warning },
    ]}>
      <View style={styles.cardHead}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardDate, { color: colors.text }]}>{fmtDay(item.date)}</Text>
          <View style={styles.metaRow}>
            <View style={styles.metaChip}>
              <Ionicons name="log-in-outline" size={11} color={colors.textMuted} />
              <Text style={[styles.metaText, { color: colors.textMuted }]}>{fmtTime(item.attendance?.checkIn)}</Text>
            </View>
            <View style={styles.metaChip}>
              <Ionicons name="log-out-outline" size={11} color={missingCO ? colors.warning : colors.textMuted} />
              <Text style={[styles.metaText, { color: missingCO ? colors.warning : colors.textMuted }]}>
                {missingCO ? (isAr ? 'مفقود' : 'Missing') : fmtTime(item.attendance?.checkOut)}
              </Text>
            </View>
            <View style={styles.metaChip}>
              <Ionicons name="time-outline" size={11} color={colors.textMuted} />
              <Text style={[styles.metaText, { color: colors.textMuted }]}>{item.hoursWorked.toFixed(1)}h</Text>
            </View>
            {item.leaveType && (
              <View style={[styles.pill, { backgroundColor: `${colors.info}18` }]}>
                <Text style={[styles.pillText, { color: colors.info }]}>{item.leaveType}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text style={[styles.cardPay, { color: colors.text }]}>${fmtMoney(item.totalDailyPay)}</Text>
          <View style={[styles.pill, { backgroundColor: confirmed ? `${colors.success}18` : `${colors.warning}18` }]}>
            <Text style={[styles.pillText, { color: confirmed ? colors.success : colors.warning }]}>
              {confirmed ? (isAr ? 'مؤكد' : 'Confirmed') : (isAr ? 'معلق' : 'Pending')}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ── Monthly card ──────────────────────────────────────────────────────────────

function MonthCard({ item }: { item: MonthlyPayroll }) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const mk = item.month?.slice(0, 7) ?? '';

  return (
    <View style={[styles.monthCard, { backgroundColor: colors.surface }]}>
      {/* Month title bar */}
      <View style={[styles.monthTitleBar, { backgroundColor: colors.primary }]}>
        <Text style={styles.monthTitle}>{fmtMonthLabel(mk)}</Text>
        <Text style={styles.monthTotalText}>${fmtMoneyShort(item.totalSalary)}</Text>
      </View>

      {/* Stats row */}
      <View style={styles.monthStats}>
        <View style={styles.monthStat}>
          <Text style={[styles.statVal, { color: colors.success }]}>${fmtMoney(item.totalSalary)}</Text>
          <Text style={[styles.statLbl, { color: colors.textMuted }]}>{isAr ? 'إجمالي الراتب' : 'Total Salary'}</Text>
        </View>
        {item.totalHours != null && (
          <View style={styles.monthStat}>
            <Text style={[styles.statVal, { color: colors.primary }]}>{item.totalHours.toFixed(1)}h</Text>
            <Text style={[styles.statLbl, { color: colors.textMuted }]}>{isAr ? 'إجمالي الساعات' : 'Total Hours'}</Text>
          </View>
        )}
        {item.baseSalary != null && (
          <View style={styles.monthStat}>
            <Text style={[styles.statVal, { color: colors.text }]}>${fmtMoneyShort(item.baseSalary)}</Text>
            <Text style={[styles.statLbl, { color: colors.textMuted }]}>{isAr ? 'الأساسي' : 'Base'}</Text>
          </View>
        )}
        {(item.overtimeSalary ?? 0) > 0 && (
          <View style={styles.monthStat}>
            <Text style={[styles.statVal, { color: colors.warning }]}>+${fmtMoneyShort(item.overtimeSalary!)}</Text>
            <Text style={[styles.statLbl, { color: colors.textMuted }]}>{isAr ? 'إضافي' : 'Overtime'}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function PayrollScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();

  const [tab, setTab] = useState<PayrollTab>('daily');

  const [monthlies,  setMonthlies]  = useState<MonthlyPayroll[]>([]);
  const [daily,      setDaily]      = useState<DailyPayrollRecord[]>([]);
  const [configs,    setConfigs]    = useState<SalaryConfig[]>([]);

  const [loadingMain,  setLoadingMain]  = useState(true);
  const [loadingRates, setLoadingRates] = useState(false);
  const [refreshing,   setRefreshing]   = useState(false);

  // Load daily + monthly (shared, loaded once)
  const loadMain = useCallback(async () => {
    try {
      const [mo, da] = await Promise.allSettled([
        api.get<{ payroll: MonthlyPayroll[] }>('/payroll/me?limit=24'),
        api.get<{ records: DailyPayrollRecord[] }>('/payroll/daily/me?limit=730'),
      ]);
      if (mo.status === 'fulfilled') setMonthlies(mo.value.payroll ?? []);
      if (da.status === 'fulfilled') setDaily(da.value.records ?? []);
    } finally {
      setLoadingMain(false);
      setRefreshing(false);
    }
  }, []);

  // Load salary config (role rates)
  const loadRates = useCallback(async () => {
    setLoadingRates(true);
    try {
      const res = await api.get<SalaryConfig[]>('/payroll/salary-config');
      setConfigs(Array.isArray(res) ? res : []);
    } catch { /* not critical */ }
    finally { setLoadingRates(false); }
  }, []);

  useEffect(() => { void loadMain(); }, [loadMain]);

  // Load rates when tab is first opened
  useEffect(() => {
    if (tab === 'rates' && configs.length === 0) void loadRates();
  }, [tab]); // eslint-disable-line

  const onRefresh = () => {
    setRefreshing(true);
    void loadMain();
    if (tab === 'rates') void loadRates();
  };

  // ── Totals for daily tab header ───────────────────────────────────────────
  const dailyTotal    = daily.reduce((s, r) => s + r.totalDailyPay, 0);
  const confirmedCnt  = daily.filter(r => r.isConfirmed).length;
  const pendingCnt    = daily.filter(r => !r.isConfirmed).length;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={isAr ? 'راتبي' : 'My Payroll'} showBack />

      {/* ── Tab bar ─────────────────────────────────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabScroll}
        contentContainerStyle={styles.tabContent}
      >
        {TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[
              styles.tabChip,
              { borderColor: colors.border },
              tab === t.key && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={() => setTab(t.key)}
            activeOpacity={0.8}
          >
            <Ionicons name={t.icon as any} size={13} color={tab === t.key ? '#fff' : colors.textMuted} />
            <Text style={[styles.tabText, { color: tab === t.key ? '#fff' : colors.textMuted }]}>
              {isAr ? t.labelAr : t.labelEn}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── DAILY TAB ───────────────────────────────────────────────────── */}
      {tab === 'daily' && (
        <FlatList
          data={daily}
          keyExtractor={(i, idx) => `daily-${i.id}-${idx}`}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListHeaderComponent={
            loadingMain ? null : (
              <View style={styles.statsRow}>
                <View style={[styles.statCard, { backgroundColor: `${colors.warning}15` }]}>
                  <Text style={[styles.statNum, { color: colors.warning }]}>{pendingCnt}</Text>
                  <Text style={[styles.statLbl, { color: colors.warning }]}>{isAr ? 'معلق' : 'Pending'}</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: `${colors.success}15` }]}>
                  <Text style={[styles.statNum, { color: colors.success }]}>{confirmedCnt}</Text>
                  <Text style={[styles.statLbl, { color: colors.success }]}>{isAr ? 'مؤكد' : 'Confirmed'}</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.statNum, { color: colors.text }]}>${fmtMoneyShort(dailyTotal)}</Text>
                  <Text style={[styles.statLbl, { color: colors.textMuted }]}>{isAr ? 'الإجمالي' : 'Total'}</Text>
                </View>
              </View>
            )
          }
          ListEmptyComponent={
            loadingMain
              ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
              : <View style={styles.empty}>
                  <Ionicons name="today-outline" size={44} color={colors.textMuted} />
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                    {isAr ? 'لا توجد سجلات يومية' : 'No daily records yet'}
                  </Text>
                </View>
          }
          renderItem={({ item }) => <DayRow item={item} />}
        />
      )}

      {/* ── MONTHLY TAB ─────────────────────────────────────────────────── */}
      {tab === 'monthly' && (
        <FlatList
          data={monthlies}
          keyExtractor={(i, idx) => `month-${i.id ?? idx}`}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            loadingMain
              ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
              : <View style={styles.empty}>
                  <Ionicons name="calendar-outline" size={44} color={colors.textMuted} />
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                    {isAr ? 'لا توجد سجلات شهرية' : 'No monthly records yet'}
                  </Text>
                </View>
          }
          renderItem={({ item }) => <MonthCard item={item} />}
        />
      )}

      {/* ── SALARY RATES TAB ────────────────────────────────────────────── */}
      {tab === 'rates' && (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {loadingRates ? (
            <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
          ) : configs.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="cash-outline" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {isAr ? 'لا توجد بيانات راتب' : 'No salary data available'}
              </Text>
            </View>
          ) : (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {isAr ? 'معدلات الراتب حسب الدور' : 'Salary Rates by Role'}
              </Text>
              {configs.map(c => {
                const rc = ROLE_COLORS[c.role] ?? colors.primary;
                const daily30 = c.monthlySalary / 30;
                const hourly  = c.monthlySalary / (30 * 8);
                return (
                  <View key={c.id} style={[styles.rateCard, { backgroundColor: colors.surface }]}>
                    {/* Role badge */}
                    <View style={[styles.roleBadge, { backgroundColor: `${rc}18` }]}>
                      <View style={[styles.roleColorDot, { backgroundColor: rc }]} />
                      <Text style={[styles.roleLabel, { color: rc }]}>{c.role}</Text>
                    </View>

                    {/* Rate breakdown */}
                    <View style={styles.rateGrid}>
                      <View style={[styles.rateCell, { backgroundColor: `${colors.success}10`, borderColor: `${colors.success}30` }]}>
                        <Text style={[styles.rateCellVal, { color: colors.success }]}>${fmtMoneyShort(c.monthlySalary)}</Text>
                        <Text style={[styles.rateCellLbl, { color: colors.textMuted }]}>{isAr ? 'شهرياً' : 'per month'}</Text>
                      </View>
                      <View style={[styles.rateCell, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}30` }]}>
                        <Text style={[styles.rateCellVal, { color: colors.primary }]}>${daily30.toFixed(2)}</Text>
                        <Text style={[styles.rateCellLbl, { color: colors.textMuted }]}>{isAr ? 'يومياً' : 'per day'}</Text>
                      </View>
                      <View style={[styles.rateCell, { backgroundColor: `${colors.warning}10`, borderColor: `${colors.warning}30` }]}>
                        <Text style={[styles.rateCellVal, { color: colors.warning }]}>${hourly.toFixed(2)}</Text>
                        <Text style={[styles.rateCellLbl, { color: colors.textMuted }]}>{isAr ? 'ساعياً' : 'per hour'}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}

              <View style={[styles.noteBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
                <Text style={[styles.noteText, { color: colors.textMuted }]}>
                  {isAr
                    ? 'الأسعار اليومية والساعية مبنية على 30 يوماً / 8 ساعات في اليوم. قد تختلف الرواتب الفعلية بسبب الإضافي أو الخصومات.'
                    : 'Daily and hourly rates are based on 30 days / 8 hours per day. Actual pay may vary due to overtime or deductions.'}
                </Text>
              </View>
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  center: { minHeight: 200, alignItems: 'center', justifyContent: 'center' },
  list:   { padding: spacing.md, paddingBottom: 40 },

  // Tabs
  tabScroll:  { flexGrow: 0 },
  tabContent: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: 8 },
  tabChip:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1.5 },
  tabText:    { fontSize: 12, fontWeight: '700' },

  // Daily stats header
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  statCard: { flex: 1, borderRadius: radius.md, padding: spacing.sm, alignItems: 'center', gap: 2, ...shadow.sm },
  statNum:  { fontSize: 17, fontWeight: '800' },
  statLbl:  { fontSize: 10, fontWeight: '700' },

  // Shared card base
  card:     { borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderLeftWidth: 3, ...shadow.sm },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  cardDate: { ...typography.h4, marginBottom: 6 },
  cardPay:  { fontSize: 16, fontWeight: '800' },

  metaRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  metaText: { ...typography.caption },

  pill:     { paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.full },
  pillText: { fontSize: 10, fontWeight: '700' },

  // Monthly card
  monthCard:     { borderRadius: radius.lg, overflow: 'hidden', marginBottom: spacing.md, ...shadow.sm },
  monthTitleBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  monthTitle:    { fontSize: 15, fontWeight: '800', color: '#fff' },
  monthTotalText:{ fontSize: 18, fontWeight: '800', color: '#fff' },
  monthStats:    { flexDirection: 'row', flexWrap: 'wrap', padding: spacing.md, gap: spacing.md },
  monthStat:     { alignItems: 'center', minWidth: 70 },
  statVal:       { fontSize: 16, fontWeight: '800' },

  // Rates tab
  sectionTitle: { ...typography.h4, marginBottom: spacing.sm },
  rateCard: {
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.sm,
  },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: radius.full,
    marginBottom: spacing.md,
  },
  roleColorDot: { width: 8, height: 8, borderRadius: 4 },
  roleLabel:    { fontSize: 13, fontWeight: '800' },
  rateGrid:     { flexDirection: 'row', gap: spacing.sm },
  rateCell: {
    flex: 1, alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 2,
  },
  rateCellVal: { fontSize: 15, fontWeight: '800' },
  rateCellLbl: { fontSize: 9, fontWeight: '600', textAlign: 'center' },

  noteBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    borderWidth: 1, borderRadius: radius.md,
    padding: spacing.md, marginTop: spacing.xs,
  },
  noteText: { flex: 1, ...typography.caption, lineHeight: 17 },

  empty:     { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText: { ...typography.bodySmall },
});
