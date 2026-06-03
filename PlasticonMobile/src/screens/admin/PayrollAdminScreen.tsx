import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, RefreshControl,
  ScrollView, StyleSheet, Switch, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

type PayrollTab = 'daily' | 'monthly' | 'salaries' | 'config';

interface DailyRecord {
  id: number;
  date?: string;
  hoursWorked?: number;
  totalDailyPay?: number;
  isConfirmed?: boolean;
  confirmedAt?: string | null;
  leaveType?: string | null;
  user?: { id: number; fullName: string; role?: string };
  attendance?: { id: number; checkIn?: string; checkOut?: string | null } | null;
  createdAt?: string;
}

interface MonthlyRecord {
  id: number;
  month?: string;
  totalSalary: number;
  baseSalary?: number;
  overtimeSalary?: number;
  totalHours?: number;
  user?: { fullName: string; role?: string };
}

interface Overview {
  totals: { payrollCount: number; totalBaseSalary: number; totalOvertimeSalary: number; totalPayout: number };
  byRole: { role: string; payrollCount: number; totalPayout: number }[];
}

interface UserSalary {
  id: number;
  fullName: string;
  role: string;
  roleDefaultSalary: number;
  individualSalary: number | null;
  effectiveSalary: number;
}

interface SalaryConfig { id: number; role: string; monthlySalary: number; }
interface DeductionRule { id: number; type: string; isActive: boolean; thresholdMinutes: number; deductionValue: number; }

function fmt(n: number) { return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }
function fmtTime(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const ROLE_COLORS: Record<string, string> = {
  WORKER: '#3B82F6', ENGINEER: '#10B981', ACCOUNTANT: '#F97316', ADMIN: '#EF4444',
};

const DEDUCTION_META: Record<string, { labelEn: string; labelAr: string; icon: string; showThreshold: boolean; showValue: boolean }> = {
  LATE_ARRIVAL:      { labelEn: 'Late Arrival',       labelAr: 'تأخر دخول',       icon: 'time-outline',         showThreshold: true,  showValue: true  },
  EARLY_CHECKOUT:    { labelEn: 'Early Checkout',      labelAr: 'خروج مبكر',       icon: 'log-out-outline',      showThreshold: true,  showValue: false },
  UNEXCUSED_ABSENCE: { labelEn: 'Unexcused Absence',   labelAr: 'غياب بدون عذر',   icon: 'close-circle-outline', showThreshold: false, showValue: false },
  SICK_LEAVE:        { labelEn: 'Sick Leave Pay Rate', labelAr: 'أجر إجازة مرضية', icon: 'medkit-outline',       showThreshold: false, showValue: true  },
};

const TABS: { key: PayrollTab; labelEn: string; labelAr: string; icon: string }[] = [
  { key: 'daily',    labelEn: 'Daily Payroll',   labelAr: 'الرواتب اليومية', icon: 'today-outline'     },
  { key: 'monthly',  labelEn: 'Monthly Summary', labelAr: 'الملخص الشهري',  icon: 'calendar-outline'  },
  { key: 'salaries', labelEn: 'User Salaries',   labelAr: 'رواتب الموظفين', icon: 'people-outline'    },
  { key: 'config',   labelEn: 'Salary Config',   labelAr: 'إعداد الرواتب',  icon: 'settings-outline'  },
];

export function PayrollAdminScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();

  const today0 = new Date().toISOString().slice(0, 10);
  const month0 = new Date().toISOString().slice(0, 7);

  const [tab, setTab] = useState<PayrollTab>('daily');

  // Daily
  const [dateFilter,   setDateFilter]   = useState(today0);
  const [daily,        setDaily]        = useState<DailyRecord[]>([]);
  const [dailyLoading, setDailyLoading] = useState(true);
  const [dailyRefresh, setDailyRefresh] = useState(false);
  const [calculating,  setCalculating]  = useState(false);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);

  // Monthly
  const [monthFilter,    setMonthFilter]    = useState(month0);
  const [overview,       setOverview]       = useState<Overview | null>(null);
  const [monthlyRecords, setMonthlyRecords] = useState<MonthlyRecord[]>([]);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [monthlyRefresh, setMonthlyRefresh] = useState(false);
  const [calcMonthly,    setCalcMonthly]    = useState(false);
  const [editMonthlyId,  setEditMonthlyId]  = useState<number | null>(null);
  const [editMonthlyVal, setEditMonthlyVal] = useState('');
  const [savingMonthly,  setSavingMonthly]  = useState(false);

  // User Salaries
  const [userSalaries,     setUserSalaries]     = useState<UserSalary[]>([]);
  const [salariesLoading,  setSalariesLoading]  = useState(false);
  const [salariesRefresh,  setSalariesRefresh]  = useState(false);
  const [editSalaryUserId, setEditSalaryUserId] = useState<number | null>(null);
  const [editSalaryVal,    setEditSalaryVal]    = useState('');
  const [savingUserSalary, setSavingUserSalary] = useState(false);

  // Salary Config
  const [configs,        setConfigs]        = useState<SalaryConfig[]>([]);
  const [configLoading,  setConfigLoading]  = useState(false);
  const [editConfigRole, setEditConfigRole] = useState<string | null>(null);
  const [editConfigVal,  setEditConfigVal]  = useState('');
  const [savingConfig,   setSavingConfig]   = useState(false);
  const [deductions,     setDeductions]     = useState<DeductionRule[]>([]);
  const [dedLoading,     setDedLoading]     = useState(false);
  const [togglingRule,   setTogglingRule]   = useState<string | null>(null);
  const [editRuleType,   setEditRuleType]   = useState<string | null>(null);
  const [editThreshold,  setEditThreshold]  = useState('');
  const [editDedVal,     setEditDedVal]     = useState('');
  const [savingRule,     setSavingRule]     = useState(false);

  // ── Loaders ──────────────────────────────────────────────────────────────────

  const loadDaily = useCallback(async (date?: string) => {
    const d = date ?? dateFilter;
    try {
      const res = await api.get<DailyRecord[]>(`/payroll/daily?date=${d}&limit=50`);
      setDaily(Array.isArray(res) ? res : []);
    } catch (e: any) { Alert.alert(isAr ? 'خطأ' : 'Error', e?.message ?? 'Failed'); }
    finally { setDailyLoading(false); setDailyRefresh(false); }
  }, [dateFilter]); // eslint-disable-line

  const loadMonthly = useCallback(async (month?: string) => {
    setMonthlyLoading(true);
    const m = month ?? monthFilter;
    try {
      const [ov, recs] = await Promise.all([
        api.get<Overview>(`/payroll/admin/overview?month=${m}`),
        api.get<MonthlyRecord[]>(`/payroll?month=${m}`),
      ]);
      setOverview(ov as Overview);
      setMonthlyRecords(Array.isArray(recs) ? recs : []);
    } catch (e: any) { Alert.alert(isAr ? 'خطأ' : 'Error', e?.message ?? 'Failed'); }
    finally { setMonthlyLoading(false); setMonthlyRefresh(false); }
  }, [monthFilter]); // eslint-disable-line

  const loadUserSalaries = useCallback(async () => {
    setSalariesLoading(true);
    try {
      const res = await api.get<UserSalary[]>('/payroll/admin/user-salaries');
      setUserSalaries(Array.isArray(res) ? res : []);
    } catch (e: any) { Alert.alert(isAr ? 'خطأ' : 'Error', e?.message ?? 'Failed'); }
    finally { setSalariesLoading(false); setSalariesRefresh(false); }
  }, []); // eslint-disable-line

  const loadConfig = useCallback(async () => {
    setConfigLoading(true); setDedLoading(true);
    try {
      const [cfgs, rules] = await Promise.all([
        api.get<SalaryConfig[]>('/payroll/salary-config'),
        api.get<DeductionRule[]>('/payroll/admin/deduction-rules'),
      ]);
      setConfigs(Array.isArray(cfgs) ? cfgs : []);
      setDeductions(Array.isArray(rules) ? rules : []);
    } catch (e: any) { Alert.alert(isAr ? 'خطأ' : 'Error', e?.message ?? 'Failed'); }
    finally { setConfigLoading(false); setDedLoading(false); }
  }, []); // eslint-disable-line

  useEffect(() => {
    if (tab === 'daily')    { setDailyLoading(true); void loadDaily(); }
    if (tab === 'monthly')  void loadMonthly();
    if (tab === 'salaries') void loadUserSalaries();
    if (tab === 'config')   void loadConfig();
  }, [tab]); // eslint-disable-line

  // ── Actions ──────────────────────────────────────────────────────────────────

  const handleCalculateDaily = () => {
    Alert.alert(
      isAr ? 'احتساب الرواتب' : 'Calculate Payroll',
      `${isAr ? 'تشغيل الاحتساب لـ' : 'Calculate for'} ${dateFilter}?`,
      [
        { text: isAr ? 'إلغاء' : 'Cancel', style: 'cancel' },
        { text: isAr ? 'احتساب' : 'Calculate', onPress: async () => {
            setCalculating(true);
            try {
              await api.post('/payroll/daily/calculate-date', { date: dateFilter });
              setDailyLoading(true); await loadDaily();
              Alert.alert(isAr ? 'تم' : 'Done', isAr ? 'تم الاحتساب بنجاح' : 'Payroll calculated');
            } catch (e: any) { Alert.alert(isAr ? 'خطأ' : 'Error', e?.message ?? 'Failed'); }
            finally { setCalculating(false); }
          },
        },
      ],
    );
  };

  const handleConfirmRecord = async (id: number) => {
    setConfirmingId(id);
    try {
      await api.post(`/payroll/daily/${id}/confirm`, {});
      setDaily(prev => prev.map(r => r.id === id ? { ...r, isConfirmed: true } : r));
    } catch (e: any) { Alert.alert(isAr ? 'خطأ' : 'Error', e?.message ?? 'Failed'); }
    finally { setConfirmingId(null); }
  };

  const handleCalculateMonthly = () => {
    Alert.alert(
      isAr ? 'احتساب شهري' : 'Calculate Monthly',
      `${isAr ? 'احتساب رواتب' : 'Calculate payrolls for'} ${monthFilter}?`,
      [
        { text: isAr ? 'إلغاء' : 'Cancel', style: 'cancel' },
        { text: isAr ? 'احتساب' : 'Calculate', onPress: async () => {
            setCalcMonthly(true);
            try { await api.post('/payroll/monthly/calculate', { month: monthFilter }); await loadMonthly(); }
            catch (e: any) { Alert.alert(isAr ? 'خطأ' : 'Error', e?.message ?? 'Failed'); }
            finally { setCalcMonthly(false); }
          },
        },
      ],
    );
  };

  const handleSaveMonthly = async () => {
    if (!editMonthlyId) return;
    setSavingMonthly(true);
    try {
      await api.put(`/payroll/${editMonthlyId}`, { totalSalary: Number(editMonthlyVal) });
      setMonthlyRecords(prev => prev.map(r => r.id === editMonthlyId ? { ...r, totalSalary: Number(editMonthlyVal) } : r));
      setEditMonthlyId(null);
    } catch (e: any) { Alert.alert(isAr ? 'خطأ' : 'Error', e?.message ?? 'Failed'); }
    finally { setSavingMonthly(false); }
  };

  const handleDeleteMonthly = (id: number) => {
    Alert.alert(isAr ? 'حذف' : 'Delete', isAr ? 'حذف سجل الراتب؟' : 'Delete this payroll record?', [
      { text: isAr ? 'إلغاء' : 'Cancel', style: 'cancel' },
      { text: isAr ? 'حذف' : 'Delete', style: 'destructive', onPress: async () => {
          try { await api.delete(`/payroll/${id}`); setMonthlyRecords(prev => prev.filter(r => r.id !== id)); }
          catch (e: any) { Alert.alert(isAr ? 'خطأ' : 'Error', e?.message ?? 'Failed'); }
        },
      },
    ]);
  };

  const handleSaveUserSalary = async () => {
    if (editSalaryUserId == null) return;
    setSavingUserSalary(true);
    try {
      const monthlySalary = editSalaryVal.trim() === '' ? null : Number(editSalaryVal);
      await api.put(`/payroll/admin/user-salaries/${editSalaryUserId}`, { monthlySalary });
      await loadUserSalaries(); setEditSalaryUserId(null);
    } catch (e: any) { Alert.alert(isAr ? 'خطأ' : 'Error', e?.message ?? 'Failed'); }
    finally { setSavingUserSalary(false); }
  };

  const handleResetUserSalary = async (userId: number) => {
    setSavingUserSalary(true);
    try {
      await api.put(`/payroll/admin/user-salaries/${userId}`, { monthlySalary: null });
      await loadUserSalaries();
    } catch (e: any) { Alert.alert(isAr ? 'خطأ' : 'Error', e?.message ?? 'Failed'); }
    finally { setSavingUserSalary(false); }
  };

  const handleSaveConfig = async () => {
    if (!editConfigRole) return;
    setSavingConfig(true);
    try {
      await api.put('/payroll/salary-config', { role: editConfigRole, monthlySalary: Number(editConfigVal) });
      await loadConfig(); setEditConfigRole(null);
    } catch (e: any) { Alert.alert(isAr ? 'خطأ' : 'Error', e?.message ?? 'Failed'); }
    finally { setSavingConfig(false); }
  };

  const handleToggleRule = async (type: string, isActive: boolean) => {
    setTogglingRule(type);
    try {
      await api.put(`/payroll/admin/deduction-rules/${type}`, { isActive });
      setDeductions(prev => prev.map(r => r.type === type ? { ...r, isActive } : r));
    } catch (e: any) { Alert.alert(isAr ? 'خطأ' : 'Error', e?.message ?? 'Failed'); }
    finally { setTogglingRule(null); }
  };

  const handleSaveRule = async () => {
    if (!editRuleType) return;
    setSavingRule(true);
    try {
      await api.put(`/payroll/admin/deduction-rules/${editRuleType}`, {
        thresholdMinutes: Number(editThreshold),
        deductionValue: Number(editDedVal),
      });
      setDeductions(prev => prev.map(r => r.type === editRuleType
        ? { ...r, thresholdMinutes: Number(editThreshold), deductionValue: Number(editDedVal) }
        : r));
      setEditRuleType(null);
    } catch (e: any) { Alert.alert(isAr ? 'خطأ' : 'Error', e?.message ?? 'Failed'); }
    finally { setSavingRule(false); }
  };

  // ── Derived ──────────────────────────────────────────────────────────────────

  const pendingCount   = useMemo(() => daily.filter(r => !r.isConfirmed).length, [daily]);
  const confirmedCount = useMemo(() => daily.filter(r => !!r.isConfirmed).length, [daily]);
  const dailyTotal     = useMemo(() => daily.reduce((s, r) => s + (r.totalDailyPay ?? 0), 0), [daily]);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title={isAr ? 'إدارة الرواتب' : 'Payroll Management'}
        subtitle={isAr ? 'تأكيد الرواتب اليومية وعرض التقارير' : 'Confirm daily payrolls and view monthly reports'}
        showBack
      />

      {/* Tab bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabContent}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabChip, { borderColor: colors.border }, tab === t.key && { backgroundColor: colors.primary, borderColor: colors.primary }]}
            onPress={() => setTab(t.key)}
            activeOpacity={0.8}
          >
            <Ionicons name={t.icon as any} size={13} color={tab === t.key ? '#fff' : colors.textMuted} />
            <Text style={[styles.tabText, { color: tab === t.key ? '#fff' : colors.textMuted }]}>
              {isAr ? t.labelAr : t.labelEn}
            </Text>
            {t.key === 'daily' && pendingCount > 0 && (
              <View style={[styles.pendingDot, { backgroundColor: colors.warning }]}>
                <Text style={styles.pendingDotText}>{pendingCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── DAILY TAB ── */}
      {tab === 'daily' && (
        <FlatList
          data={daily}
          keyExtractor={(i, idx) => `${i.id}-${idx}`}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={dailyRefresh} onRefresh={() => { setDailyRefresh(true); void loadDaily(); }} tintColor={colors.primary} />}
          ListHeaderComponent={
            <View>
              <View style={styles.statsRow}>
                <View style={[styles.statCard, { backgroundColor: `${colors.warning}15` }]}>
                  <Text style={[styles.statNum, { color: colors.warning }]}>{pendingCount}</Text>
                  <Text style={[styles.statLbl, { color: colors.warning }]}>{isAr ? 'معلق' : 'Pending'}</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: `${colors.success}15` }]}>
                  <Text style={[styles.statNum, { color: colors.success }]}>{confirmedCount}</Text>
                  <Text style={[styles.statLbl, { color: colors.success }]}>{isAr ? 'مؤكد' : 'Confirmed'}</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.statNum, { color: colors.text }]}>${fmt(dailyTotal)}</Text>
                  <Text style={[styles.statLbl, { color: colors.textMuted }]}>{isAr ? 'الإجمالي' : 'Total'}</Text>
                </View>
              </View>
              <View style={[styles.filterRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="calendar-outline" size={15} color={colors.textMuted} />
                <TextInput
                  style={[styles.filterInput, { color: colors.text }]}
                  value={dateFilter}
                  onChangeText={setDateFilter}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textMuted}
                  returnKeyType="search"
                  onSubmitEditing={() => { setDailyLoading(true); void loadDaily(); }}
                />
                <TouchableOpacity style={[styles.smallBtn, { backgroundColor: colors.primary }]} onPress={() => { setDailyLoading(true); void loadDaily(); }}>
                  <Ionicons name="search-outline" size={14} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.smallBtn, { backgroundColor: colors.info }, calculating && { opacity: 0.6 }]}
                  onPress={handleCalculateDaily}
                  disabled={calculating}
                >
                  {calculating ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.smallBtnText}>{isAr ? 'احتساب' : 'Calc'}</Text>}
                </TouchableOpacity>
              </View>
            </View>
          }
          ListEmptyComponent={
            dailyLoading
              ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
              : <View style={styles.empty}>
                  <Ionicons name="cash-outline" size={44} color={colors.textMuted} />
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>{isAr ? 'لا توجد سجلات لهذا اليوم' : 'No records for this date'}</Text>
                </View>
          }
          renderItem={({ item: r }) => {
            const confirmed = !!r.isConfirmed;
            const roleColor = ROLE_COLORS[r.user?.role ?? ''] ?? colors.primary;
            const missingCO = !r.attendance?.checkOut;
            return (
              <View style={[styles.card, { backgroundColor: colors.surface, borderLeftColor: confirmed ? colors.success : colors.warning }]}>
                <View style={styles.cardHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardName, { color: colors.text }]}>{r.user?.fullName ?? `#${r.id}`}</Text>
                    <View style={styles.pillRow}>
                      <View style={[styles.pill, { backgroundColor: `${roleColor}15` }]}>
                        <Text style={[styles.pillText, { color: roleColor }]}>{r.user?.role ?? '—'}</Text>
                      </View>
                      {r.date && <Text style={[styles.caption, { color: colors.textMuted }]}>{new Date(r.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</Text>}
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text style={[styles.payAmt, { color: colors.success }]}>${fmt(r.totalDailyPay ?? 0)}</Text>
                    <View style={[styles.pill, { backgroundColor: confirmed ? `${colors.success}15` : `${colors.warning}15` }]}>
                      <Text style={[styles.pillText, { color: confirmed ? colors.success : colors.warning }]}>
                        {confirmed ? (isAr ? 'مؤكد' : 'CONFIRMED') : (isAr ? 'معلق' : 'PENDING')}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={[styles.cardFoot, { borderTopColor: colors.border }]}>
                  <View style={styles.infoChip}><Ionicons name="log-in-outline" size={11} color={colors.textMuted} /><Text style={[styles.caption, { color: colors.textMuted }]}>{fmtTime(r.attendance?.checkIn)}</Text></View>
                  <View style={styles.infoChip}><Ionicons name="log-out-outline" size={11} color={missingCO ? colors.warning : colors.textMuted} /><Text style={[styles.caption, { color: missingCO ? colors.warning : colors.textMuted }]}>{missingCO ? (isAr ? 'مفقود' : 'Missing') : fmtTime(r.attendance?.checkOut)}</Text></View>
                  <View style={styles.infoChip}><Ionicons name="time-outline" size={11} color={colors.textMuted} /><Text style={[styles.caption, { color: colors.textMuted }]}>{r.hoursWorked?.toFixed(1) ?? '—'}h</Text></View>
                  {r.leaveType && <View style={[styles.pill, { backgroundColor: `${colors.info}15` }]}><Text style={[styles.pillText, { color: colors.info }]}>{r.leaveType}</Text></View>}
                </View>
                {!confirmed && (
                  <TouchableOpacity
                    style={[styles.confirmBtn, { backgroundColor: colors.success }, confirmingId === r.id && { opacity: 0.6 }]}
                    onPress={() => void handleConfirmRecord(r.id)}
                    disabled={confirmingId === r.id}
                  >
                    {confirmingId === r.id
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <><Ionicons name="checkmark-circle" size={14} color="#fff" /><Text style={styles.confirmText}>{isAr ? 'تأكيد الدفع' : 'Confirm Payment'}</Text></>
                    }
                  </TouchableOpacity>
                )}
              </View>
            );
          }}
        />
      )}

      {/* ── MONTHLY TAB ── */}
      {tab === 'monthly' && (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={monthlyRefresh} onRefresh={() => { setMonthlyRefresh(true); void loadMonthly(); }} tintColor={colors.primary} />}
        >
          <View style={[styles.filterRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="calendar-outline" size={15} color={colors.textMuted} />
            <TextInput
              style={[styles.filterInput, { color: colors.text }]}
              value={monthFilter}
              onChangeText={setMonthFilter}
              placeholder="YYYY-MM"
              placeholderTextColor={colors.textMuted}
            />
            <TouchableOpacity style={[styles.smallBtn, { backgroundColor: colors.primary }]} onPress={() => void loadMonthly()}>
              <Ionicons name="search-outline" size={14} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.smallBtn, { backgroundColor: colors.info }, calcMonthly && { opacity: 0.6 }]}
              onPress={handleCalculateMonthly}
              disabled={calcMonthly}
            >
              {calcMonthly ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.smallBtnText}>{isAr ? 'احتساب' : 'Calc'}</Text>}
            </TouchableOpacity>
          </View>

          {monthlyLoading ? (
            <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
          ) : (
            <>
              <View style={styles.statsRow}>
                <View style={[styles.statCard, { backgroundColor: `${colors.primary}15` }]}>
                  <Text style={[styles.statNum, { color: colors.primary }]}>{overview?.totals.payrollCount ?? 0}</Text>
                  <Text style={[styles.statLbl, { color: colors.primary }]}>{isAr ? 'سجلات' : 'Records'}</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: `${colors.success}15` }]}>
                  <Text style={[styles.statNum, { color: colors.success }]}>${fmt(overview?.totals.totalPayout ?? 0)}</Text>
                  <Text style={[styles.statLbl, { color: colors.success }]}>{isAr ? 'الإجمالي' : 'Payout'}</Text>
                </View>
              </View>
              <View style={[styles.statsRow, { marginBottom: spacing.md }]}>
                <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.statNum, { color: colors.text }]}>${fmt(overview?.totals.totalBaseSalary ?? 0)}</Text>
                  <Text style={[styles.statLbl, { color: colors.textMuted }]}>{isAr ? 'الأساسي' : 'Base'}</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: `${colors.warning}15` }]}>
                  <Text style={[styles.statNum, { color: colors.warning }]}>${fmt(overview?.totals.totalOvertimeSalary ?? 0)}</Text>
                  <Text style={[styles.statLbl, { color: colors.warning }]}>{isAr ? 'إضافي' : 'OT'}</Text>
                </View>
              </View>

              {/* By Role */}
              {(overview?.byRole ?? []).length > 0 && (
                <View style={[styles.section, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>{isAr ? 'حسب الدور' : 'By Role'}</Text>
                  {(overview?.byRole ?? []).map(r => {
                    const pct = overview ? (r.totalPayout / (overview.totals.totalPayout || 1)) * 100 : 0;
                    const c = ROLE_COLORS[r.role] ?? colors.primary;
                    return (
                      <View key={r.role} style={{ marginBottom: spacing.sm }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                          <Text style={[styles.pillText, { color: c, fontSize: 12 }]}>{r.role}</Text>
                          <Text style={[styles.caption, { color: colors.text, fontWeight: '700' }]}>${fmt(r.totalPayout)}</Text>
                        </View>
                        <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
                          <View style={[styles.progressFill, { width: `${pct}%` as any, backgroundColor: c }]} />
                        </View>
                        <Text style={[styles.caption, { color: colors.textMuted, marginTop: 2 }]}>{r.payrollCount} {isAr ? 'موظف' : 'employees'}</Text>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Per-employee */}
              <Text style={[styles.sectionTitle, { color: colors.text, marginTop: spacing.sm }]}>{isAr ? 'تفاصيل الموظفين' : 'Employee Details'}</Text>
              {monthlyRecords.map(r => {
                const isEd = editMonthlyId === r.id;
                const rc = ROLE_COLORS[r.user?.role ?? ''] ?? colors.primary;
                return (
                  <View key={r.id} style={[styles.card, { backgroundColor: colors.surface }]}>
                    <View style={styles.cardHead}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.cardName, { color: colors.text }]}>{r.user?.fullName ?? '—'}</Text>
                        <View style={styles.pillRow}>
                          <View style={[styles.pill, { backgroundColor: `${rc}15` }]}><Text style={[styles.pillText, { color: rc }]}>{r.user?.role ?? '—'}</Text></View>
                          {r.month && <Text style={[styles.caption, { color: colors.textMuted }]}>{r.month}</Text>}
                        </View>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        {isEd ? (
                          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                            <TextInput
                              style={[styles.inlineInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                              value={editMonthlyVal}
                              onChangeText={setEditMonthlyVal}
                              keyboardType="decimal-pad"
                              autoFocus
                            />
                            <TouchableOpacity onPress={() => void handleSaveMonthly()} disabled={savingMonthly}>
                              {savingMonthly ? <ActivityIndicator size="small" color={colors.success} /> : <Ionicons name="checkmark-circle" size={22} color={colors.success} />}
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setEditMonthlyId(null)}>
                              <Ionicons name="close-circle" size={22} color={colors.textMuted} />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                            <Text style={[styles.payAmt, { color: colors.success }]}>${fmt(r.totalSalary)}</Text>
                            <TouchableOpacity onPress={() => { setEditMonthlyId(r.id); setEditMonthlyVal(String(r.totalSalary)); }}>
                              <Ionicons name="pencil-outline" size={14} color={colors.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleDeleteMonthly(r.id)}>
                              <Ionicons name="trash-outline" size={14} color={colors.danger} />
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    </View>
                    {(r.totalHours != null || r.baseSalary != null) && (
                      <View style={[styles.cardFoot, { borderTopColor: colors.border }]}>
                        {r.totalHours != null && <View style={styles.infoChip}><Ionicons name="time-outline" size={11} color={colors.textMuted} /><Text style={[styles.caption, { color: colors.textMuted }]}>{r.totalHours.toFixed(1)}h</Text></View>}
                        {r.baseSalary != null && <View style={styles.infoChip}><Ionicons name="cash-outline" size={11} color={colors.textMuted} /><Text style={[styles.caption, { color: colors.textMuted }]}>{isAr ? 'أساسي' : 'Base'}: ${fmt(r.baseSalary)}</Text></View>}
                        {(r.overtimeSalary ?? 0) > 0 && <View style={styles.infoChip}><Ionicons name="add-circle-outline" size={11} color={colors.warning} /><Text style={[styles.caption, { color: colors.warning }]}>+${(r.overtimeSalary ?? 0).toFixed(1)}</Text></View>}
                      </View>
                    )}
                  </View>
                );
              })}
              {monthlyRecords.length === 0 && !monthlyLoading && (
                <View style={styles.empty}>
                  <Ionicons name="cash-outline" size={44} color={colors.textMuted} />
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>{isAr ? 'لا سجلات لهذا الشهر' : 'No records for this month'}</Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}

      {/* ── USER SALARIES TAB ── */}
      {tab === 'salaries' && (
        <FlatList
          data={userSalaries}
          keyExtractor={u => String(u.id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={salariesRefresh} onRefresh={() => { setSalariesRefresh(true); void loadUserSalaries(); }} tintColor={colors.primary} />}
          ListEmptyComponent={
            salariesLoading
              ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
              : <View style={styles.empty}><Ionicons name="people-outline" size={44} color={colors.textMuted} /><Text style={[styles.emptyText, { color: colors.textMuted }]}>{isAr ? 'لا يوجد موظفون' : 'No employees found'}</Text></View>
          }
          renderItem={({ item: u }) => {
            const isEd = editSalaryUserId === u.id;
            const isSav = savingUserSalary && editSalaryUserId === u.id;
            const isCustom = u.individualSalary != null;
            const rc = ROLE_COLORS[u.role] ?? colors.primary;
            return (
              <View style={[styles.card, { backgroundColor: colors.surface }]}>
                <View style={styles.cardHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardName, { color: colors.text }]}>{u.fullName}</Text>
                    <View style={styles.pillRow}>
                      <View style={[styles.pill, { backgroundColor: `${rc}15` }]}><Text style={[styles.pillText, { color: rc }]}>{u.role}</Text></View>
                      {isCustom && <View style={[styles.pill, { backgroundColor: `${colors.info}15` }]}><Text style={[styles.pillText, { color: colors.info }]}>{isAr ? 'مخصص' : 'Custom'}</Text></View>}
                    </View>
                  </View>
                  {isEd ? (
                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                      <TextInput
                        style={[styles.inlineInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt, width: 120 }]}
                        value={editSalaryVal}
                        onChangeText={setEditSalaryVal}
                        keyboardType="decimal-pad"
                        placeholder={`${u.roleDefaultSalary}`}
                        placeholderTextColor={colors.textMuted}
                        autoFocus
                      />
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity onPress={() => void handleSaveUserSalary()} disabled={isSav}>
                          {isSav ? <ActivityIndicator size="small" color={colors.success} /> : <Ionicons name="checkmark-circle" size={22} color={colors.success} />}
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setEditSalaryUserId(null)}>
                          <Ionicons name="close-circle" size={22} color={colors.textMuted} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Text style={[styles.payAmt, { color: isCustom ? colors.info : colors.success }]}>${fmt(u.effectiveSalary)}<Text style={{ fontSize: 10, color: colors.textMuted }}>/mo</Text></Text>
                      <Text style={[styles.caption, { color: colors.textMuted }]}>${(u.effectiveSalary / 30).toFixed(1)}/day</Text>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity onPress={() => { setEditSalaryUserId(u.id); setEditSalaryVal(String(u.effectiveSalary)); }}>
                          <Ionicons name="pencil-outline" size={14} color={colors.primary} />
                        </TouchableOpacity>
                        {isCustom && (
                          <TouchableOpacity onPress={() => void handleResetUserSalary(u.id)}>
                            <Ionicons name="refresh-outline" size={14} color={colors.textMuted} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  )}
                </View>
                {!isCustom && (
                  <Text style={[styles.caption, { color: colors.textMuted, marginTop: 4 }]}>
                    {isAr ? `راتب الدور: $${fmt(u.roleDefaultSalary)}` : `Role default: $${fmt(u.roleDefaultSalary)}`}
                  </Text>
                )}
              </View>
            );
          }}
        />
      )}

      {/* ── SALARY CONFIG TAB ── */}
      {tab === 'config' && (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {configLoading ? (
            <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
          ) : (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{isAr ? 'رواتب الأدوار الشهرية' : 'Monthly Salary by Role'}</Text>
              {configs.map(c => {
                const isEd = editConfigRole === c.role;
                const rc = ROLE_COLORS[c.role] ?? colors.primary;
                return (
                  <View key={c.id} style={[styles.configRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={[styles.pill, { backgroundColor: `${rc}20`, paddingHorizontal: 12 }]}>
                      <Text style={[styles.pillText, { color: rc, fontSize: 12 }]}>{c.role}</Text>
                    </View>
                    {isEd ? (
                      <View style={{ flex: 1, flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                        <TextInput
                          style={[styles.inlineInput, { flex: 1, borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                          value={editConfigVal}
                          onChangeText={setEditConfigVal}
                          keyboardType="decimal-pad"
                          autoFocus
                        />
                        <TouchableOpacity onPress={() => void handleSaveConfig()} disabled={savingConfig}>
                          {savingConfig ? <ActivityIndicator size="small" color={colors.success} /> : <Ionicons name="checkmark-circle" size={22} color={colors.success} />}
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setEditConfigRole(null)}>
                          <Ionicons name="close-circle" size={22} color={colors.textMuted} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View>
                          <Text style={[styles.cardName, { color: colors.text }]}>${fmt(c.monthlySalary)}<Text style={{ fontSize: 11, color: colors.textMuted }}>/mo</Text></Text>
                          <Text style={[styles.caption, { color: colors.textMuted }]}>≈ ${(c.monthlySalary / 30).toFixed(1)}/day</Text>
                        </View>
                        <TouchableOpacity onPress={() => { setEditConfigRole(c.role); setEditConfigVal(String(c.monthlySalary)); }}>
                          <Ionicons name="pencil-outline" size={16} color={colors.primary} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}

              <Text style={[styles.sectionTitle, { color: colors.text, marginTop: spacing.lg }]}>{isAr ? 'قواعد الخصم التلقائي' : 'Deduction Rules'}</Text>
              {dedLoading && <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} />}
              {deductions.map(rule => {
                const meta = DEDUCTION_META[rule.type];
                if (!meta) return null;
                const isEd = editRuleType === rule.type;
                const isTog = togglingRule === rule.type;
                return (
                  <View key={rule.type} style={[styles.ruleCard, { backgroundColor: colors.surface, borderColor: rule.isActive ? colors.primary : colors.border }]}>
                    <View style={styles.ruleHead}>
                      <Ionicons name={meta.icon as any} size={18} color={rule.isActive ? colors.primary : colors.textMuted} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.cardName, { color: colors.text }]}>{isAr ? meta.labelAr : meta.labelEn}</Text>
                        <View style={styles.pillRow}>
                          {meta.showThreshold && (
                            <View style={[styles.pill, { backgroundColor: colors.surfaceAlt }]}>
                              <Text style={[styles.pillText, { color: colors.textMuted }]}>{isAr ? 'الحد' : 'Threshold'}: {rule.thresholdMinutes}min</Text>
                            </View>
                          )}
                          {meta.showValue && (
                            <View style={[styles.pill, { backgroundColor: colors.surfaceAlt }]}>
                              <Text style={[styles.pillText, { color: colors.textMuted }]}>{rule.deductionValue}{rule.type === 'SICK_LEAVE' ? '%' : '$'}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 6 }}>
                        {isTog
                          ? <ActivityIndicator size="small" color={colors.primary} />
                          : <Switch value={rule.isActive} onValueChange={v => void handleToggleRule(rule.type, v)} trackColor={{ false: colors.border, true: `${colors.primary}70` }} thumbColor={rule.isActive ? colors.primary : colors.textMuted} />
                        }
                        {!isEd && (
                          <TouchableOpacity onPress={() => { setEditRuleType(rule.type); setEditThreshold(String(rule.thresholdMinutes)); setEditDedVal(String(rule.deductionValue)); }}>
                            <Ionicons name="pencil-outline" size={14} color={colors.primary} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                    {isEd && (
                      <View style={[styles.ruleEdit, { borderTopColor: colors.border }]}>
                        {meta.showThreshold && (
                          <View style={styles.editFieldRow}>
                            <Text style={[styles.caption, { color: colors.textMuted }]}>{isAr ? 'الحد (دقيقة)' : 'Threshold (min)'}</Text>
                            <TextInput style={[styles.inlineInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt, width: 90 }]} value={editThreshold} onChangeText={setEditThreshold} keyboardType="number-pad" />
                          </View>
                        )}
                        {meta.showValue && (
                          <View style={styles.editFieldRow}>
                            <Text style={[styles.caption, { color: colors.textMuted }]}>{isAr ? 'القيمة' : 'Value'}</Text>
                            <TextInput style={[styles.inlineInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt, width: 90 }]} value={editDedVal} onChangeText={setEditDedVal} keyboardType="decimal-pad" />
                          </View>
                        )}
                        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
                          <TouchableOpacity style={[styles.smallBtn, { backgroundColor: colors.primary, flex: 2, paddingVertical: 10 }, savingRule && { opacity: 0.6 }]} onPress={() => void handleSaveRule()} disabled={savingRule}>
                            {savingRule ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.smallBtnText}>{isAr ? 'حفظ' : 'Save'}</Text>}
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.smallBtn, { backgroundColor: colors.surfaceAlt, flex: 1, paddingVertical: 10 }]} onPress={() => setEditRuleType(null)}>
                            <Text style={[styles.smallBtnText, { color: colors.textMuted }]}>{isAr ? 'إلغاء' : 'Cancel'}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </>
          )}
        </ScrollView>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  center: { minHeight: 200, alignItems: 'center', justifyContent: 'center' },
  list:   { padding: spacing.md, paddingBottom: 40 },

  tabScroll:  { flexGrow: 0 },
  tabContent: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: 8 },
  tabChip:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1.5 },
  tabText:    { fontSize: 12, fontWeight: '700' },
  pendingDot: { minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  pendingDotText: { fontSize: 9, fontWeight: '800', color: '#fff' },

  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  statCard: { flex: 1, borderRadius: radius.md, padding: spacing.sm, alignItems: 'center', gap: 2, ...shadow.sm },
  statNum:  { fontSize: 18, fontWeight: '800' },
  statLbl:  { fontSize: 10, fontWeight: '700' },

  filterRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.md, borderWidth: 1.5, paddingHorizontal: spacing.sm, paddingVertical: 8, marginBottom: spacing.md },
  filterInput:{ flex: 1, fontSize: 14, paddingVertical: 0 },
  smallBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.md },
  smallBtnText:{ fontSize: 12, fontWeight: '700', color: '#fff' },

  card:     { borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, borderLeftWidth: 3, borderLeftColor: 'transparent', ...shadow.sm },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 },
  cardName: { ...typography.h4 },
  cardFoot: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, borderTopWidth: 1, paddingTop: spacing.sm, marginTop: spacing.xs },
  pillRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  pill:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  pillText: { fontSize: 10, fontWeight: '700' },
  caption:  { ...typography.caption },
  payAmt:   { fontSize: 16, fontWeight: '800' },
  infoChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  confirmBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: radius.md, paddingVertical: 8, marginTop: spacing.sm },
  confirmText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  inlineInput: { borderWidth: 1.5, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 6, fontSize: 14 },

  section:     { borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  sectionTitle:{ ...typography.h4, marginBottom: spacing.sm },
  progressBg:  { height: 5, borderRadius: 99, marginBottom: 2 },
  progressFill:{ height: 5, borderRadius: 99 },

  configRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.md, borderWidth: 1, padding: spacing.md, marginBottom: spacing.sm },

  ruleCard:     { borderRadius: radius.lg, borderWidth: 1.5, padding: spacing.md, marginBottom: spacing.sm },
  ruleHead:     { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  ruleEdit:     { borderTopWidth: 1, marginTop: spacing.sm, paddingTop: spacing.sm },
  editFieldRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs },

  empty:     { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText: { ...typography.bodySmall },
});
