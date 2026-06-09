import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, RefreshControl, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../api/client';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

// ── Types ──────────────────────────────────────────────────────────────────────
interface TodayAttendance {
  checkIn: string | null; checkOut: string | null;
  lateMinutes: number; overtimeMinutes: number;
}
interface AttendanceRecord {
  id: number; checkIn: string; checkOut: string | null;
  overtimeMinutes: number; leaveType: string | null;
  shift?: { name: string } | null;
}
interface DailyPayroll {
  id: number; date: string; hoursWorked: number;
  dailyRate: number; totalDailyPay: number;
  deductionAmount: number; deductionNotes: string | null;
  isConfirmed: boolean;
}
interface MonthlyPayroll {
  id: number; month: string; totalHours: number;
  baseSalary: number; overtimeSalary: number; totalSalary: number;
}
interface ProductionRecord {
  id: number; createdAt: string; productType?: string;
  goodCount?: number; defectCount?: number;
  cartonsCount?: number; totalPieces?: number;
  shift?: { name: string } | null;
  machine?: { name: string } | null;
}
interface Snapshot {
  id: number; createdAt: string; machineLabel?: string;
  machineCounter?: number; electricityKwh?: number; notes?: string | null;
}
interface ToolRecord {
  id: number; createdAt?: string; created_at?: string;
  reason?: string; durationMinutes?: number; notes?: string | null;
  materialType?: string; wasteKg?: number;
  shiftDate?: string; completedItems?: number; totalItems?: number;
  title?: string; review_status?: string;
  issueType?: string; severity?: string; description?: string;
  target_date?: string; target_units?: number; actual_units?: number;
  note?: string | null; achieved?: boolean; achievementRatio?: number;
  machine_label?: string; current_kwh?: number; baseline_kwh?: number; message?: string;
}

type HubTab = 'overview' | 'attendance' | 'pay' | 'production' | 'readings' | 'tools';
type ToolSub = 'stops' | 'checklist' | 'waste' | 'target' | 'kaizen' | 'quality' | 'micro' | 'anomaly';

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}
function fmtDT(iso: string): string {
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtMin(min: number): string {
  if (!min) return '0m';
  const h = Math.floor(min / 60); const m = min % 60;
  if (h === 0) return `${m}m`; if (m === 0) return `${h}h`; return `${h}h ${m}m`;
}
function greeting(isAr: boolean): string {
  const h = new Date().getHours();
  if (isAr) {
    if (h < 12) return 'صباح الخير'; if (h < 17) return 'مساء الخير'; return 'مساء النور';
  }
  if (h < 12) return 'Good morning'; if (h < 17) return 'Good afternoon'; return 'Good evening';
}

// ── Small card components ──────────────────────────────────────────────────────
function KpiCard({ label, value, icon, color, colors }: { label: string; value: string; icon: string; color: string; colors: any }) {
  return (
    <View style={[styles.kpiCard, { backgroundColor: colors.surface }]}>
      <View style={[styles.kpiIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text style={[styles.kpiVal, { color }]}>{value}</Text>
      <Text style={[styles.kpiLabel, { color: colors.textMuted }]} numberOfLines={2}>{label}</Text>
    </View>
  );
}

function QuickBtn({ icon, label, color, onPress, colors }: { icon: string; label: string; color: string; onPress: () => void; colors: any }) {
  return (
    <TouchableOpacity style={[styles.qBtn, { borderColor: `${color}28`, backgroundColor: colors.surface }]} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.qBtnIcon, { backgroundColor: `${color}14` }]}>
        <Ionicons name={icon as any} size={21} color={color} />
      </View>
      <Text style={[styles.qBtnLabel, { color }]} numberOfLines={2}>{label}</Text>
    </TouchableOpacity>
  );
}

function Row({ children, colors, last }: { children: React.ReactNode; colors: any; last?: boolean }) {
  return (
    <View style={[styles.row, !last && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
      {children}
    </View>
  );
}

function SectionCard({ children, colors }: { children: React.ReactNode; colors: any }) {
  return <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>{children}</View>;
}

function Empty({ icon, msg }: { icon: string; msg: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.empty}>
      <Ionicons name={icon as any} size={36} color={colors.textMuted} />
      <Text style={[styles.emptyText, { color: colors.textMuted }]}>{msg}</Text>
    </View>
  );
}

function Chip({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <View style={[styles.chip, { backgroundColor: bg, borderColor: `${color}44` }]}>
      <Text style={[styles.chipText, { color }]}>{label}</Text>
    </View>
  );
}

function LoadingView() {
  const { colors } = useAppTheme();
  return <View style={styles.tabLoading}><ActivityIndicator color={colors.primary} /></View>;
}

// ── Main Screen ────────────────────────────────────────────────────────────────
export function WorkerHubScreen() {
  const { colors }  = useAppTheme();
  const { isAr }    = useLocale();
  const { user }    = useAuth();
  const navigation  = useNavigation<any>();
  const firstName   = (user?.fullName ?? 'Worker').split(' ')[0];

  const [tab, setTab]       = useState<HubTab>('overview');
  const [toolSub, setToolSub] = useState<ToolSub>('stops');

  // Overview data
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewRefreshing, setOverviewRefreshing] = useState(false);
  const [checkedIn, setCheckedIn]   = useState(false);
  const [todayAtt, setTodayAtt]     = useState<TodayAttendance | null>(null);
  const [prodToday, setProdToday]   = useState(0);
  const [recentLogs, setRecentLogs] = useState<ProductionRecord[]>([]);
  const [snapsToday, setSnapsToday] = useState(0);
  const [openStops, setOpenStops]   = useState(0);
  const [shiftName, setShiftName]   = useState<string | null>(null);
  const [recentKaizen, setRecentKaizen] = useState<ToolRecord[]>([]);
  const [kaizenTotal, setKaizenTotal]   = useState(0);

  // Tab-specific data (lazy loaded)
  const [tabLoading, setTabLoading]   = useState(false);
  const [attendance, setAttendance]   = useState<AttendanceRecord[]>([]);
  const [dailyPay,   setDailyPay]     = useState<DailyPayroll[]>([]);
  const [monthlyPay, setMonthlyPay]   = useState<MonthlyPayroll[]>([]);
  const [payView,    setPayView]      = useState<'daily' | 'monthly'>('daily');
  const [productions,setProductions]  = useState<ProductionRecord[]>([]);
  const [snapshots,  setSnapshots]    = useState<Snapshot[]>([]);
  const [toolData,   setToolData]     = useState<Record<ToolSub, ToolRecord[]>>({ stops: [], checklist: [], waste: [], target: [], kaizen: [], quality: [], micro: [], anomaly: [] });

  const loadOverview = useCallback(async () => {
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const [shifts, att, prod, snaps, stops, kaizen] = await Promise.allSettled([
        api.get<any>('/shifts?limit=3'),
        api.get<any>('/attendance/me?limit=1'),
        api.get<any>('/production/me?limit=5'),
        api.get<any>(`/settings/snapshots/mine?limit=200&from=${todayStr}&to=${todayStr}`),
        api.get<any>('/worker-tools/machine-stop-alerts/mine?limit=50'),
        api.get<any>('/worker-tools/kaizen/mine'),
      ]);

      const shift0    = shifts.status  === 'fulfilled' ? (shifts.value?.shifts?.[0] ?? shifts.value?.[0])       : null;
      const att0      = att.status     === 'fulfilled' ? (att.value?.records?.[0] ?? att.value?.[0])            : null;
      const prodVal   = prod.status    === 'fulfilled' ? prod.value                                              : null;
      const snapArr   = snaps.status   === 'fulfilled' ? (Array.isArray(snaps.value) ? snaps.value : [])        : [];
      const stopsArr  = stops.status   === 'fulfilled' ? (Array.isArray(stops.value) ? stops.value : (stops.value?.alerts ?? [])) : [];
      const kaizenArr: ToolRecord[] = kaizen.status === 'fulfilled'
        ? (Array.isArray(kaizen.value) ? kaizen.value : ((kaizen.value as any)?.data ?? []))
        : [];

      const todayDate = new Date().toDateString();
      const ci = att0?.checkIn ? new Date(att0.checkIn).toDateString() === todayDate && !att0.checkOut : false;
      setCheckedIn(ci);
      setTodayAtt(att0 ? { checkIn: att0.checkIn ?? null, checkOut: att0.checkOut ?? null, lateMinutes: att0.lateMinutes ?? 0, overtimeMinutes: att0.overtimeMinutes ?? 0 } : null);
      setShiftName(shift0 ? (shift0.shiftName ?? shift0.name ?? null) : null);
      setProdToday(prodVal?.total ?? 0);
      setRecentLogs(prodVal?.records ?? []);
      setSnapsToday(snapArr.length);
      setOpenStops(stopsArr.filter((s: any) => !s.resolved_at && !s.resolvedAt).length);
      setRecentKaizen(kaizenArr.slice(0, 3));
      setKaizenTotal(kaizenArr.length);
    } finally {
      setOverviewLoading(false);
      setOverviewRefreshing(false);
    }
  }, []);

  const loadTab = useCallback(async (t: HubTab) => {
    if (t === 'overview') return;
    setTabLoading(true);
    try {
      if (t === 'attendance') {
        const res = await api.get<any>('/attendance/me?limit=60');
        setAttendance(Array.isArray(res) ? res : (res?.records ?? []));
      } else if (t === 'pay') {
        const [dr, mr] = await Promise.allSettled([
          api.get<any>('/payroll/daily/me'),
          api.get<any>('/payroll/me'),
        ]);
        if (dr.status === 'fulfilled') setDailyPay(dr.value?.records ?? (Array.isArray(dr.value) ? dr.value : []));
        if (mr.status === 'fulfilled') setMonthlyPay(Array.isArray(mr.value) ? mr.value : []);
      } else if (t === 'production') {
        const res = await api.get<any>('/production/me?limit=50');
        setProductions(Array.isArray(res) ? res : (res?.records ?? []));
      } else if (t === 'readings') {
        const res = await api.get<any>('/settings/snapshots/mine?limit=50');
        setSnapshots(Array.isArray(res) ? res : (res?.items ?? []));
      } else if (t === 'tools') {
        const [sr, cr, wr, tr, kr, qr, mr, ar] = await Promise.allSettled([
          api.get<any>('/worker-tools/machine-stop-alerts/mine'),
          api.get<any>('/worker-tools/shift-checklists/mine'),
          api.get<any>('/worker-tools/material-waste/mine'),
          api.get<any>('/worker-tools/daily-targets/mine'),
          api.get<any>('/worker-tools/kaizen/mine'),
          api.get<any>('/worker-tools/quality-issues/mine'),
          api.get<any>('/worker-tools/micro-stops/mine'),
          api.get<any>('/worker-tools/electricity-anomaly-alerts/mine'),
        ]);
        const arr = (r: PromiseSettledResult<any>) => r.status === 'fulfilled' ? (Array.isArray(r.value) ? r.value : (r.value?.data ?? r.value?.items ?? [])) : [];
        setToolData({
          stops:     arr(sr), checklist: arr(cr), waste:   arr(wr), target:  arr(tr),
          kaizen:    arr(kr), quality:   arr(qr), micro:   arr(mr), anomaly: arr(ar),
        });
      }
    } catch { /* silently ignore */ }
    finally { setTabLoading(false); }
  }, []);

  useEffect(() => { void loadOverview(); }, [loadOverview]);
  useEffect(() => { void loadTab(tab); }, [tab, loadTab]);

  const nav = (en: string, ar: string) => isAr ? ar : en;

  const TABS: { key: HubTab; label: string; labelAr: string; icon: string }[] = [
    { key: 'overview',    label: 'Overview',    labelAr: 'نظرة عامة',    icon: 'grid-outline'       },
    { key: 'attendance',  label: 'Attendance',  labelAr: 'الحضور',        icon: 'calendar-outline'   },
    { key: 'pay',         label: 'My Pay',      labelAr: 'راتبي',         icon: 'cash-outline'        },
    { key: 'production',  label: 'Production',  labelAr: 'الإنتاج',       icon: 'cube-outline'       },
    { key: 'readings',    label: 'Readings',    labelAr: 'القراءات',      icon: 'camera-outline'     },
    { key: 'tools',       label: 'Tool Logs',   labelAr: 'سجلات الأدوات', icon: 'construct-outline'  },
  ];

  const TOOL_SUBS: { key: ToolSub; label: string; labelAr: string; icon: string; color: string }[] = [
    { key: 'stops',     label: 'Machine Stops', labelAr: 'توقف الآلات',    icon: 'stop-circle',  color: colors.danger   },
    { key: 'checklist', label: 'Checklist',     labelAr: 'قائمة التحقق',   icon: 'checkbox',     color: colors.success  },
    { key: 'waste',     label: 'Waste',         labelAr: 'هدر المواد',     icon: 'trash',        color: colors.warning  },
    { key: 'target',    label: 'Targets',       labelAr: 'الأهداف',        icon: 'flag',         color: colors.info     },
    { key: 'kaizen',    label: 'Kaizen',        labelAr: 'كايزن',          icon: 'bulb',         color: colors.accent   },
    { key: 'quality',   label: 'Quality',       labelAr: 'الجودة',         icon: 'shield',       color: colors.primary  },
    { key: 'micro',     label: 'Micro Stops',   labelAr: 'توقفات مايكرو', icon: 'pause-circle', color: colors.warning  },
    { key: 'anomaly',   label: 'Elec. Alerts',  labelAr: 'تنبيهات كهرباء', icon: 'flash',        color: '#f59e0b'       },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>

      {/* ── Greeting header ─────────────────────────────────────────────── */}
      <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.greetSub, { color: colors.textMuted }]}>{greeting(isAr)},</Text>
          <Text style={[styles.greetName, { color: colors.text }]}>{firstName} 👷</Text>
        </View>
        <View style={[styles.statusPill,
          overviewLoading ? { backgroundColor: colors.surface, borderColor: colors.border }
            : checkedIn ? { backgroundColor: '#dcfce7', borderColor: '#86efac' }
              : { backgroundColor: '#fee2e2', borderColor: '#fca5a5' }]}>
          <View style={[styles.dot, { backgroundColor: checkedIn ? '#16a34a' : '#dc2626' }]} />
          <Text style={[styles.statusText, { color: checkedIn ? '#15803d' : '#b91c1c' }]}>
            {overviewLoading ? '...' : checkedIn ? nav('Checked In', 'في العمل') : nav('Not In', 'غير مسجل')}
          </Text>
        </View>
      </View>

      {/* ── Tab bar ─────────────────────────────────────────────────────── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.tabBar, { borderBottomColor: colors.border }]} contentContainerStyle={styles.tabBarContent}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <TouchableOpacity key={t.key} style={[styles.tabBtn, active && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]} onPress={() => setTab(t.key)} activeOpacity={0.75}>
              <Ionicons name={t.icon as any} size={14} color={active ? colors.primary : colors.textMuted} />
              <Text style={[styles.tabBtnText, { color: active ? colors.primary : colors.textMuted, fontWeight: active ? '700' : '500' }]}>
                {isAr ? t.labelAr : t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Tab content ─────────────────────────────────────────────────── */}

      {/* OVERVIEW */}
      {tab === 'overview' && (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={overviewRefreshing} onRefresh={() => { setOverviewRefreshing(true); void loadOverview(); }} tintColor={colors.primary} />}
        >
          {overviewLoading ? (
            <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
          ) : (
            <>
              {/* KPI cards */}
              <View style={styles.kpiGrid}>
                <KpiCard label={nav('Production Today', 'إنتاج اليوم')}   value={String(prodToday)}          icon="cube-outline"    color={colors.primary} colors={colors} />
                <KpiCard label={nav('Shift', 'الوردية')}                  value={shiftName ?? '—'}           icon="time-outline"    color={colors.accent}  colors={colors} />
                <KpiCard label={nav('Snapshots Today', 'لقطات اليوم')}     value={String(snapsToday)}         icon="camera-outline"  color="#8b5cf6"        colors={colors} />
                <KpiCard label={nav('Open Stops', 'توقفات مفتوحة')}        value={String(openStops)}          icon="warning-outline" color={openStops ? colors.danger : colors.success} colors={colors} />
              </View>

              {/* Attendance card */}
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{nav("TODAY'S ATTENDANCE", 'حضور اليوم')}</Text>
              <View style={[styles.attCard, { backgroundColor: colors.surface }]}>
                <View style={styles.attRow}>
                  <View style={styles.attItem}>
                    <Ionicons name="log-in-outline" size={18} color={colors.success} style={styles.attIcon} />
                    <View>
                      <Text style={[styles.attLabel, { color: colors.textMuted }]}>{nav('Check-In', 'الدخول')}</Text>
                      <Text style={[styles.attVal, { color: colors.text }]}>{fmtTime(todayAtt?.checkIn ?? null)}</Text>
                    </View>
                  </View>
                  <View style={[styles.attDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.attItem}>
                    <Ionicons name="log-out-outline" size={18} color={colors.info} style={styles.attIcon} />
                    <View>
                      <Text style={[styles.attLabel, { color: colors.textMuted }]}>{nav('Check-Out', 'الخروج')}</Text>
                      <Text style={[styles.attVal, { color: colors.text }]}>{fmtTime(todayAtt?.checkOut ?? null)}</Text>
                    </View>
                  </View>
                </View>
                {((todayAtt?.lateMinutes ?? 0) > 0 || (todayAtt?.overtimeMinutes ?? 0) > 0) && (
                  <View style={[styles.attTags, { borderTopColor: colors.border }]}>
                    {(todayAtt?.lateMinutes ?? 0) > 0 && (
                      <View style={styles.attTag}><Ionicons name="alert-circle-outline" size={13} color="#a16207" /><Text style={styles.attTagLate}>{nav('Late', 'تأخير')}: +{fmtMin(todayAtt?.lateMinutes ?? 0)}</Text></View>
                    )}
                    {(todayAtt?.overtimeMinutes ?? 0) > 0 && (
                      <View style={styles.attTag}><Ionicons name="time-outline" size={13} color="#7c3aed" /><Text style={styles.attTagOt}>{nav('OT', 'إضافي')}: +{fmtMin(todayAtt?.overtimeMinutes ?? 0)}</Text></View>
                    )}
                  </View>
                )}
                {!todayAtt && <Text style={[styles.attNoRecord, { color: colors.textMuted }]}>{nav('No attendance record for today', 'لا يوجد سجل حضور لليوم')}</Text>}
              </View>

              {/* Quick actions */}
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{nav('QUICK ACTIONS', 'الإجراءات السريعة')}</Text>
              <View style={styles.qGrid}>
                <QuickBtn icon="time-outline"              label={nav('Attendance',  'حضوري')}         color={colors.success} colors={colors} onPress={() => navigation.navigate('Attendance')} />
                <QuickBtn icon="cube-outline"              label={nav('Production',  'الإنتاج')}        color={colors.primary} colors={colors} onPress={() => navigation.navigate('Production')} />
                <QuickBtn icon="camera-outline"            label={nav('Snapshots',   'اللقطات')}        color="#8b5cf6"        colors={colors} onPress={() => navigation.navigate('Snapshots')} />
                <QuickBtn icon="warning-outline"           label={nav('Machine Stops','توقف آلات')}     color={colors.danger}  colors={colors} onPress={() => navigation.navigate('MachineStops')} />
                <QuickBtn icon="flash-outline"             label={nav('Elec. Record','قراءات كهرباء')} color={colors.warning} colors={colors} onPress={() => navigation.navigate('ElectricityRecord')} />
                <QuickBtn icon="bulb-outline"              label={nav('Kaizen',      'كايزن')}          color={colors.accent}  colors={colors} onPress={() => navigation.navigate('KaizenIdeas')} />
                <QuickBtn icon="chatbubble-ellipses-outline" label={nav('AI Chat',  'الدردشة')}         color={colors.info}    colors={colors} onPress={() => navigation.navigate('AI', { screen: 'Assistant' })} />
              </View>

              {/* Recent production logs */}
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{nav('RECENT PRODUCTION', 'الإنتاج الأخير')}</Text>
              <View style={[styles.listCard, { backgroundColor: colors.surface }]}>
                {recentLogs.length ? recentLogs.map((log, i) => (
                  <View key={`${log.id}-${i}`} style={[styles.row, i < recentLogs.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                    <View style={[styles.logDot, { backgroundColor: colors.primary }]} />
                    <Text style={[styles.logName, { color: colors.text }]} numberOfLines={1}>{(log as any).productName ?? log.productType ?? `Log #${log.id}`}</Text>
                    <Text style={[styles.logQty, { color: colors.primary }]}>{((log as any).totalPieces ?? log.goodCount ?? 0).toLocaleString()} {nav('units', 'وحدة')}</Text>
                  </View>
                )) : (
                  <Empty icon="cube-outline" msg={nav('No production logged today', 'لا يوجد إنتاج مسجل اليوم')} />
                )}
              </View>

              {/* Recent Kaizen */}
              <View style={styles.kaizenHeader}>
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{nav('KAIZEN IDEAS', 'أفكار كايزن')}</Text>
                <TouchableOpacity onPress={() => navigation.navigate('KaizenIdeas')}>
                  <Text style={[styles.seeAll, { color: colors.accent }]}>{nav('See all', 'عرض الكل')} ({kaizenTotal})</Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.listCard, { backgroundColor: colors.surface }]}>
                {recentKaizen.length ? recentKaizen.map((idea, i) => {
                  const sc = idea.review_status?.toUpperCase();
                  const sColor = sc === 'APPROVED' ? colors.success : sc === 'REJECTED' ? colors.danger : colors.warning;
                  const sLabel = sc === 'APPROVED' ? nav('Approved', 'مقبول') : sc === 'REJECTED' ? nav('Rejected', 'مرفوض') : nav('Pending', 'قيد المراجعة');
                  return (
                    <View key={idea.id} style={[styles.row, i < recentKaizen.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                      <View style={[styles.logDot, { backgroundColor: colors.accent }]} />
                      <Text style={[styles.logName, { color: colors.text }]} numberOfLines={1}>{idea.title}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: `${sColor}18` }]}><Text style={[styles.statusText, { color: sColor }]}>{sLabel}</Text></View>
                    </View>
                  );
                }) : (
                  <TouchableOpacity onPress={() => navigation.navigate('KaizenIdeas')} activeOpacity={0.75}>
                    <Empty icon="bulb-outline" msg={nav('No kaizen ideas yet — tap to add one', 'لا توجد أفكار كايزن — اضغط لإضافة فكرة')} />
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
        </ScrollView>
      )}

      {/* ATTENDANCE */}
      {tab === 'attendance' && (
        tabLoading ? <LoadingView /> : (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.summaryRow}>
              <Chip label={`${attendance.length} ${nav('Records', 'سجل')}`}     color="#3b82f6" bg="#3b82f614" />
              <Chip label={`${attendance.filter(r => r.checkOut).length} ${nav('Full Days', 'أيام كاملة')}`} color="#10b981" bg="#10b98114" />
              <Chip label={`${attendance.filter(r => !r.checkOut).length} ${nav('Missing Out', 'بدون خروج')}`} color="#f59e0b" bg="#f59e0b14" />
            </View>
            {attendance.length === 0 ? <Empty icon="calendar-outline" msg={nav('No attendance records yet', 'لا توجد سجلات حضور بعد')} /> : (
              <SectionCard colors={colors}>
                {attendance.map((r, i) => {
                  const hours = r.checkOut ? ((new Date(r.checkOut).getTime() - new Date(r.checkIn).getTime()) / 3600000).toFixed(1) : null;
                  const missing = !r.checkOut;
                  return (
                    <Row key={r.id} colors={colors} last={i === attendance.length - 1}>
                      <View style={styles.attRecordLeft}>
                        <Text style={[styles.attRecordDate, { color: colors.text }]}>{fmtDate(r.checkIn)}</Text>
                        <Text style={[styles.attRecordTimes, { color: colors.textMuted }]}>
                          {fmtTime(r.checkIn)} → {r.checkOut ? fmtTime(r.checkOut) : '—'}
                          {hours ? `  ·  ${hours}h` : ''}
                          {r.overtimeMinutes > 0 ? `  +${(r.overtimeMinutes / 60).toFixed(1)}h OT` : ''}
                        </Text>
                        {r.shift && <Text style={[styles.attRecordShift, { color: colors.textMuted }]}>{r.shift.name}</Text>}
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: missing ? '#fef9c310' : '#dcfce710', borderWidth: 0 }]}>
                        <Text style={[styles.statusText, { color: missing ? '#a16207' : '#15803d' }]}>{missing ? nav('No Out', 'بدون خروج') : '✓'}</Text>
                      </View>
                    </Row>
                  );
                })}
              </SectionCard>
            )}
          </ScrollView>
        )
      )}

      {/* PAY */}
      {tab === 'pay' && (
        tabLoading ? <LoadingView /> : (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.summaryRow}>
              <Chip label={`${dailyPay.filter(r => r.isConfirmed).reduce((s, r) => s + r.totalDailyPay, 0).toFixed(0)} ₪ ${nav('Earned', 'مكتسب')}`} color="#10b981" bg="#10b98114" />
              <Chip label={`${dailyPay.length} ${nav('Daily', 'يومي')}`} color="#3b82f6" bg="#3b82f614" />
              <Chip label={`${monthlyPay.length} ${nav('Monthly', 'شهري')}`} color="#8b5cf6" bg="#8b5cf614" />
            </View>
            <View style={[styles.subTabRow, { borderBottomColor: colors.border }]}>
              {(['daily', 'monthly'] as const).map((v) => (
                <TouchableOpacity key={v} style={[styles.subTab, payView === v && { borderBottomColor: colors.success, borderBottomWidth: 2 }]} onPress={() => setPayView(v)}>
                  <Text style={[styles.subTabText, { color: payView === v ? colors.success : colors.textMuted, fontWeight: payView === v ? '700' : '500' }]}>
                    {v === 'daily' ? nav('Daily', 'يومي') : nav('Monthly', 'شهري')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {payView === 'daily' && (
              dailyPay.length === 0 ? <Empty icon="cash-outline" msg={nav('No daily payroll records yet', 'لا توجد سجلات راتب يومي')} /> : (
                <SectionCard colors={colors}>
                  {dailyPay.map((r, i) => (
                    <Row key={r.id} colors={colors} last={i === dailyPay.length - 1}>
                      <View style={styles.attRecordLeft}>
                        <Text style={[styles.attRecordDate, { color: colors.text }]}>{fmtDate(r.date)}</Text>
                        <Text style={[styles.attRecordTimes, { color: colors.textMuted }]}>
                          {r.hoursWorked.toFixed(1)}h · {r.dailyRate.toFixed(0)} ₪/day
                          {r.deductionAmount > 0 ? `  −${r.deductionAmount.toFixed(0)} ₪` : ''}
                        </Text>
                      </View>
                      <View>
                        <Text style={[styles.payAmt, { color: '#10b981' }]}>{r.totalDailyPay.toFixed(0)} ₪</Text>
                        <Text style={[styles.payStatus, { color: r.isConfirmed ? '#15803d' : '#a16207' }]}>{r.isConfirmed ? nav('✓ Confirmed', '✓ مؤكد') : nav('Pending', 'انتظار')}</Text>
                      </View>
                    </Row>
                  ))}
                </SectionCard>
              )
            )}
            {payView === 'monthly' && (
              monthlyPay.length === 0 ? <Empty icon="calendar-outline" msg={nav('No monthly payroll records yet', 'لا توجد سجلات راتب شهري')} /> : (
                <SectionCard colors={colors}>
                  {monthlyPay.map((r, i) => (
                    <Row key={r.id} colors={colors} last={i === monthlyPay.length - 1}>
                      <View style={styles.attRecordLeft}>
                        <Text style={[styles.attRecordDate, { color: colors.text }]}>{r.month}</Text>
                        <Text style={[styles.attRecordTimes, { color: colors.textMuted }]}>
                          {r.totalHours.toFixed(1)}h · {nav('Base', 'أساسي')}: {r.baseSalary.toFixed(0)} ₪
                          {r.overtimeSalary > 0 ? `  +${r.overtimeSalary.toFixed(0)} OT` : ''}
                        </Text>
                      </View>
                      <Text style={[styles.payAmt, { color: '#10b981' }]}>{r.totalSalary.toFixed(0)} ₪</Text>
                    </Row>
                  ))}
                </SectionCard>
              )
            )}
          </ScrollView>
        )
      )}

      {/* PRODUCTION */}
      {tab === 'production' && (
        tabLoading ? <LoadingView /> : (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.summaryRow}>
              <Chip label={`${productions.length} ${nav('Records', 'سجل')}`} color="#f59e0b" bg="#f59e0b14" />
              <Chip label={`${productions.reduce((s, r) => s + (r.goodCount ?? r.cartonsCount ?? 0), 0)} ${nav('Good', 'جيد')}`} color="#10b981" bg="#10b98114" />
              <Chip label={`${productions.reduce((s, r) => s + (r.defectCount ?? 0), 0)} ${nav('Defects', 'عيوب')}`} color="#ef4444" bg="#ef444414" />
            </View>
            {productions.length === 0 ? <Empty icon="cube-outline" msg={nav('No production records yet', 'لا توجد سجلات إنتاج')} /> : (
              <SectionCard colors={colors}>
                {productions.map((r, i) => (
                  <Row key={r.id} colors={colors} last={i === productions.length - 1}>
                    <View style={styles.attRecordLeft}>
                      <Text style={[styles.attRecordDate, { color: colors.text }]}>{r.productType ?? `Record #${r.id}`}{r.machine ? `  ·  ${r.machine.name}` : ''}</Text>
                      <Text style={[styles.attRecordTimes, { color: colors.textMuted }]}>
                        {nav('Good:', 'جيد:')} {r.goodCount ?? r.cartonsCount ?? 0}
                        {(r.defectCount ?? 0) > 0 ? `  ·  ${nav('Defects:', 'عيوب:')} ${r.defectCount}` : ''}
                        {r.shift ? `  ·  ${r.shift.name}` : ''}
                      </Text>
                    </View>
                    <Text style={[styles.attRecordShift, { color: colors.textMuted }]}>{fmtDT(r.createdAt)}</Text>
                  </Row>
                ))}
              </SectionCard>
            )}
          </ScrollView>
        )
      )}

      {/* READINGS */}
      {tab === 'readings' && (
        tabLoading ? <LoadingView /> : (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.summaryRow}>
              <Chip label={`${snapshots.length} ${nav('Snapshots', 'لقطات')}`} color="#8b5cf6" bg="#8b5cf614" />
              <Chip label={`${snapshots.reduce((s, r) => s + (r.electricityKwh ?? 0), 0).toFixed(1)} kWh`} color="#f59e0b" bg="#f59e0b14" />
            </View>
            {snapshots.length === 0 ? <Empty icon="camera-outline" msg={nav('No readings recorded yet', 'لا توجد قراءات بعد')} /> : (
              <SectionCard colors={colors}>
                {snapshots.map((r, i) => (
                  <Row key={r.id} colors={colors} last={i === snapshots.length - 1}>
                    <View style={styles.attRecordLeft}>
                      <Text style={[styles.attRecordDate, { color: colors.text }]}>{r.machineLabel ?? `Snap #${r.id}`}</Text>
                      <Text style={[styles.attRecordTimes, { color: colors.textMuted }]}>
                        🔢 {nav('Counter:', 'العداد:')} {(r.machineCounter ?? 0).toLocaleString()}  ·  ⚡ {(r.electricityKwh ?? 0).toFixed(2)} kWh
                      </Text>
                      {r.notes ? <Text style={[styles.attRecordShift, { color: colors.textMuted }]} numberOfLines={1}>{r.notes}</Text> : null}
                    </View>
                    <Text style={[styles.attRecordShift, { color: colors.textMuted }]}>{fmtDT(r.createdAt)}</Text>
                  </Row>
                ))}
              </SectionCard>
            )}
          </ScrollView>
        )
      )}

      {/* TOOLS */}
      {tab === 'tools' && (
        <View style={{ flex: 1 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.subTabBar, { borderBottomColor: colors.border }]} contentContainerStyle={styles.subTabBarContent}>
            {TOOL_SUBS.map((s) => {
              const active = toolSub === s.key;
              const cnt = toolData[s.key].length;
              return (
                <TouchableOpacity key={s.key} style={[styles.subTabPill, active && { backgroundColor: s.color }]} onPress={() => setToolSub(s.key)} activeOpacity={0.75}>
                  <Ionicons name={s.icon as any} size={11} color={active ? '#fff' : s.color} />
                  <Text style={[styles.subTabPillText, { color: active ? '#fff' : s.color }]}>
                    {isAr ? s.labelAr : s.label}{cnt > 0 ? ` (${cnt})` : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          {tabLoading ? <LoadingView /> : (
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
              {toolData[toolSub].length === 0 ? <Empty icon="document-outline" msg={nav('No records yet', 'لا توجد سجلات بعد')} /> : (
                <SectionCard colors={colors}>
                  {toolData[toolSub].map((r, i) => {
                    const ts = r.createdAt ?? r.created_at ?? '';
                    const last = i === toolData[toolSub].length - 1;
                    if (toolSub === 'stops' || toolSub === 'micro') return (
                      <Row key={r.id} colors={colors} last={last}>
                        <View style={styles.attRecordLeft}>
                          <Text style={[styles.attRecordDate, { color: colors.text }]}>{r.reason ?? `Stop #${r.id}`}</Text>
                          {r.durationMinutes != null && <Text style={[styles.attRecordTimes, { color: colors.textMuted }]}>{r.durationMinutes} {nav('min', 'دقيقة')}{r.notes ? `  ·  ${r.notes}` : ''}</Text>}
                        </View>
                        <Text style={[styles.attRecordShift, { color: colors.textMuted }]}>{ts ? fmtDT(ts) : ''}</Text>
                      </Row>
                    );
                    if (toolSub === 'checklist') return (
                      <Row key={r.id} colors={colors} last={last}>
                        <View style={styles.attRecordLeft}>
                          <Text style={[styles.attRecordDate, { color: colors.text }]}>{nav('Checklist', 'قائمة تحقق')} · {r.shiftDate?.slice(0, 10) ?? ''}</Text>
                          <Text style={[styles.attRecordTimes, { color: colors.textMuted }]}>{r.completedItems}/{r.totalItems} {nav('completed', 'مكتمل')}</Text>
                        </View>
                        <Text style={[styles.attRecordShift, { color: colors.textMuted }]}>{ts ? fmtDT(ts) : ''}</Text>
                      </Row>
                    );
                    if (toolSub === 'waste') return (
                      <Row key={r.id} colors={colors} last={last}>
                        <View style={styles.attRecordLeft}>
                          <Text style={[styles.attRecordDate, { color: colors.text }]}>{r.materialType ?? `Waste #${r.id}`}</Text>
                          <Text style={[styles.attRecordTimes, { color: colors.textMuted }]}>{r.wasteKg} kg{r.reason ? `  ·  ${r.reason}` : ''}</Text>
                        </View>
                        <Text style={[styles.attRecordShift, { color: colors.textMuted }]}>{ts ? fmtDT(ts) : ''}</Text>
                      </Row>
                    );
                    if (toolSub === 'target') {
                      const pct = Math.round((r.achievementRatio ?? 0) * 100);
                      return (
                        <Row key={r.id} colors={colors} last={last}>
                          <View style={styles.attRecordLeft}>
                            <Text style={[styles.attRecordDate, { color: colors.text }]}>{r.target_date?.slice(0, 10) ?? fmtDT(ts)}</Text>
                            <Text style={[styles.attRecordTimes, { color: colors.textMuted }]}>{nav('Target:', 'الهدف:')} {r.target_units}  ·  {nav('Actual:', 'الفعلي:')} {r.actual_units}  ·  {pct}%</Text>
                          </View>
                          <View style={[styles.statusBadge, { backgroundColor: r.achieved ? '#dcfce710' : '#fee2e210' }]}>
                            <Text style={[styles.statusText, { color: r.achieved ? '#15803d' : '#b91c1c' }]}>{r.achieved ? '✓' : '✗'}</Text>
                          </View>
                        </Row>
                      );
                    }
                    if (toolSub === 'kaizen') return (
                      <Row key={r.id} colors={colors} last={last}>
                        <View style={styles.attRecordLeft}>
                          <Text style={[styles.attRecordDate, { color: colors.text }]} numberOfLines={1}>{r.title ?? `Idea #${r.id}`}</Text>
                        </View>
                        <View style={styles.rowRight}>
                          {r.review_status && <View style={[styles.statusBadge, { backgroundColor: `${r.review_status === 'APPROVED' ? colors.success : r.review_status === 'REJECTED' ? colors.danger : colors.warning}18` }]}>
                            <Text style={[styles.statusText, { color: r.review_status === 'APPROVED' ? colors.success : r.review_status === 'REJECTED' ? colors.danger : colors.warning }]}>{r.review_status}</Text>
                          </View>}
                          <Text style={[styles.attRecordShift, { color: colors.textMuted }]}>{ts ? fmtDT(ts) : ''}</Text>
                        </View>
                      </Row>
                    );
                    if (toolSub === 'quality') return (
                      <Row key={r.id} colors={colors} last={last}>
                        <View style={styles.attRecordLeft}>
                          <Text style={[styles.attRecordDate, { color: colors.text }]}>{r.issueType ?? `Issue #${r.id}`}</Text>
                          {r.description && <Text style={[styles.attRecordTimes, { color: colors.textMuted }]} numberOfLines={1}>{r.description}</Text>}
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: r.severity === 'HIGH' ? '#fee2e218' : r.severity === 'MEDIUM' ? '#fef9c318' : '#dbeafe18' }]}>
                          <Text style={[styles.statusText, { color: r.severity === 'HIGH' ? '#b91c1c' : r.severity === 'MEDIUM' ? '#854d0e' : '#1d4ed8' }]}>{r.severity}</Text>
                        </View>
                      </Row>
                    );
                    if (toolSub === 'anomaly') return (
                      <Row key={r.id} colors={colors} last={last}>
                        <View style={styles.attRecordLeft}>
                          <Text style={[styles.attRecordDate, { color: colors.text }]}>{r.machine_label ?? `Alert #${r.id}`}</Text>
                          <Text style={[styles.attRecordTimes, { color: colors.textMuted }]}>
                            {nav('Current:', 'الحالي:')} {Number(r.current_kwh ?? 0).toFixed(2)} kWh  ·  {nav('Base:', 'الأساس:')} {Number(r.baseline_kwh ?? 0).toFixed(2)} kWh
                          </Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: r.severity === 'CRITICAL' ? '#fee2e218' : '#fef9c318' }]}>
                          <Text style={[styles.statusText, { color: r.severity === 'CRITICAL' ? '#b91c1c' : '#854d0e' }]}>{r.severity}</Text>
                        </View>
                      </Row>
                    );
                    return null;
                  })}
                </SectionCard>
              )}
            </ScrollView>
          )}
        </View>
      )}

    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:    { flex: 1 },
  content: { padding: spacing.md, paddingBottom: 40 },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },

  topBar:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.sm, borderBottomWidth: 1 },
  greetSub:     { ...typography.bodySmall, marginBottom: 1 },
  greetName:    { ...typography.h2 },
  statusPill:   { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, borderWidth: 1 },
  dot:          { width: 7, height: 7, borderRadius: 4 },
  statusText:   { fontSize: 11, fontWeight: '700' },

  tabBar:        { maxHeight: 46, borderBottomWidth: 1 },
  tabBarContent: { paddingHorizontal: spacing.sm, alignItems: 'center', gap: 2 },
  tabBtn:        { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 12, marginBottom: -1 },
  tabBtnText:    { fontSize: 12 },

  subTabBar:        { maxHeight: 44, borderBottomWidth: 1 },
  subTabBarContent: { paddingHorizontal: spacing.sm, alignItems: 'center', gap: 6, paddingVertical: 7 },
  subTabPill:       { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, backgroundColor: '#e5e7eb' },
  subTabPillText:   { fontSize: 11, fontWeight: '700' },

  subTabRow:     { flexDirection: 'row', borderBottomWidth: 1, marginBottom: spacing.md },
  subTab:        { flex: 1, paddingVertical: 10, alignItems: 'center', marginBottom: -1 },
  subTabText:    { fontSize: 13 },

  summaryRow: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap', marginBottom: spacing.md },
  chip:       { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, borderWidth: 1 },
  chipText:   { fontSize: 12, fontWeight: '700' },

  sectionCard:  { borderRadius: radius.lg, overflow: 'hidden', marginBottom: spacing.md, ...shadow.sm },
  row:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 11, gap: spacing.sm },
  rowRight:     { alignItems: 'flex-end', gap: 4 },

  attRecordLeft:   { flex: 1 },
  attRecordDate:   { ...typography.h4, marginBottom: 2 },
  attRecordTimes:  { ...typography.bodySmall, marginBottom: 1 },
  attRecordShift:  { ...typography.caption },

  kpiGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  kpiCard:  { width: '47.5%', borderRadius: radius.lg, padding: spacing.md, alignItems: 'flex-start', gap: 6, ...shadow.sm },
  kpiIcon:  { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  kpiVal:   { fontSize: 22, fontWeight: '800', lineHeight: 26 },
  kpiLabel: { fontSize: 11, fontWeight: '600', lineHeight: 14 },

  sectionLabel: { ...typography.caption, fontWeight: '700', letterSpacing: 0.7, marginBottom: spacing.sm, textTransform: 'uppercase' },

  attCard:    { borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.lg, ...shadow.sm },
  attRow:     { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  attItem:    { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  attIcon:    { marginTop: 2 },
  attDivider: { width: 1, height: 36, marginHorizontal: spacing.sm },
  attLabel:   { fontSize: 11, fontWeight: '600', marginBottom: 2 },
  attVal:     { fontSize: 17, fontWeight: '800', fontVariant: ['tabular-nums'] },
  attTags:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1 },
  attTag:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.full, backgroundColor: '#fef9c3' },
  attTagLate: { fontSize: 11, fontWeight: '700', color: '#a16207' },
  attTagOt:   { fontSize: 11, fontWeight: '700', color: '#7c3aed' },
  attNoRecord: { ...typography.bodySmall, textAlign: 'center', paddingVertical: spacing.sm },

  qGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  qBtn:     { width: '31%', alignItems: 'center', paddingVertical: spacing.md, borderRadius: radius.lg, borderWidth: 1.5, gap: 6, ...shadow.sm },
  qBtnIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  qBtnLabel:{ fontSize: 10, fontWeight: '700', textAlign: 'center', lineHeight: 13 },

  kaizenHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  seeAll:       { fontSize: 12, fontWeight: '700' },
  statusBadge:  { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full, flexShrink: 0 },

  listCard:   { borderRadius: radius.lg, marginBottom: spacing.md, overflow: 'hidden', ...shadow.sm },
  logDot:     { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  logName:    { ...typography.body, flex: 1 },
  logQty:     { ...typography.bodySmall, fontWeight: '700', flexShrink: 0 },

  tabLoading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty:      { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  emptyText:  { ...typography.bodySmall, textAlign: 'center' },

  payAmt:    { ...typography.h4, textAlign: 'right', color: '#10b981' },
  payStatus: { fontSize: 10, fontWeight: '700', textAlign: 'right' },
});
