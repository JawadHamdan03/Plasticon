import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Dimensions, RefreshControl,
  ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { radius, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

const W = Dimensions.get('window').width;
const CHART_W = W - spacing.md * 2 - 2;

// ─── Types ────────────────────────────────────────────────────────────────────

type Overview = {
  totalUsers?: number; activeUsers?: number;
  production?: { todayPieces: number; weekPieces: number; monthPieces: number; todayCartons: number };
  totalMachines?: number; operationalMachines?: number;
  machinesByStatus?: { status: string; count: number }[];
  usersByRole?: { role: string; count: number }[];
  qualityBySeverity?: { severity: string; count: number }[];
  salesThisMonth?: number; purchasesThisMonth?: number;
  expensesThisMonth?: number; payrollThisMonth?: number;
  totalRawMaterials?: number; outOfStockCount?: number;
  lowStockMaterials?: { name: string; currentQuantity: number; minQuantity: number }[];
  maintenanceThisMonth?: number; overdueSchedules?: number;
  attendanceToday?: number; lateToday?: number;
  invoicesPending?: number; invoicesOverdue?: number;
};

type Charts = {
  productionByDay?: { date: string; pieces: number; cartons: number }[];
  electricityByDay?: { date: string; kwh: number }[];
  salesByMonth?: { month: string; amount: number }[];
  expensesByMonth?: { month: string; amount: number }[];
  attendanceByDay?: { date: string; present: number; late: number }[];
  maintenanceByMonth?: { month: string; count: number }[];
  quotationsByStatus?: { status: string; count: number }[];
  qualityBySeverity?: { severity: string; count: number }[];
  machinesByStatus?: { status: string; count: number }[];
  usersByRole?: { role: string; count: number }[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtNum(n?: number) {
  if (!n) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

function fmtMoney(n?: number) {
  if (!n) return '₪0';
  if (n >= 1_000_000) return `₪${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `₪${(n / 1_000).toFixed(0)}K`;
  return `₪${Math.round(n)}`;
}

const PIE_COLORS = ['#10b981','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#84cc16'];

function buildPie(items: { label: string; value: number }[], colors: string[], legendColor: string) {
  return items
    .filter((i) => i.value > 0)
    .map((i, idx) => ({
      name: i.label,
      population: i.value,
      color: colors[idx % colors.length],
      legendFontColor: legendColor,
      legendFontSize: 11,
    }));
}

function ensure(arr: any[] | undefined, fallback: number[]): number[] {
  if (!arr || arr.length === 0) return fallback;
  const vals = arr.map((x: any) => Number(x) || 0);
  return vals.length ? vals : fallback;
}

const MACHINE_COLORS: Record<string, string> = {
  OPERATIONAL: '#10b981', UNDER_MAINTENANCE: '#f59e0b',
  BROKEN: '#ef4444', OFFLINE: '#6b7280', DECOMMISSIONED: '#9ca3af',
};
const SEVERITY_COLORS: Record<string, string> = {
  LOW: '#10b981', MEDIUM: '#f59e0b', HIGH: '#f97316', CRITICAL: '#ef4444',
};
const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#6b7280', SENT: '#3b82f6', ACCEPTED: '#10b981', REJECTED: '#ef4444', EXPIRED: '#f59e0b',
};
const ROLE_COLORS: Record<string, string> = {
  WORKER: '#3b82f6', ENGINEER: '#10b981', ACCOUNTANT: '#f97316',
  ADMIN: '#ef4444', SALES_REP: '#8b5cf6',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ icon, title, color }: { icon: string; title: string; color: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={[sectionStyles.header, { borderLeftColor: color }]}>
      <Ionicons name={icon as any} size={16} color={color} />
      <Text style={[sectionStyles.title, { color: colors.text }]}>{title}</Text>
    </View>
  );
}

function KpiRow({ items }: { items: { label: string; value: string; color: string }[] }) {
  const { colors } = useAppTheme();
  return (
    <View style={kpiStyles.row}>
      {items.map((item) => (
        <View key={item.label} style={[kpiStyles.card, { backgroundColor: item.color + '18', borderColor: item.color + '44' }]}>
          <Text style={[kpiStyles.val, { color: item.color }]}>{item.value}</Text>
          <Text style={[kpiStyles.lbl, { color: colors.textSecondary }]}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

function ChartCard({ children, title }: { children: React.ReactNode; title: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={[chartCardStyles.wrap, { backgroundColor: colors.surface }]}>
      <Text style={[chartCardStyles.title, { color: colors.textSecondary }]}>{title}</Text>
      {children}
    </View>
  );
}

function LegendRow({ items }: { items: { label: string; color: string; value: string | number }[] }) {
  const { colors } = useAppTheme();
  return (
    <View style={legendStyles.wrap}>
      {items.map((i) => (
        <View key={i.label} style={legendStyles.item}>
          <View style={[legendStyles.dot, { backgroundColor: i.color }]} />
          <Text style={[legendStyles.lbl, { color: colors.textSecondary }]}>{i.label}</Text>
          <Text style={[legendStyles.val, { color: colors.text }]}>{i.value}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Tab list ─────────────────────────────────────────────────────────────────

const DAY_PRESETS = [1, 3, 7, 14, 30, 90] as const;

function DayRangeSelector({ days, onChange }: { days: number; onChange: (d: number) => void }) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: spacing.sm, gap: 8, flexDirection: 'row', alignItems: 'center' }}
      style={{ paddingVertical: 8 }}
    >
      {DAY_PRESETS.map(d => {
        const active = days === d;
        const label = d === 1
          ? (isAr ? 'اليوم' : 'Today')
          : isAr ? `${d}ي` : `${d}d`;
        return (
          <TouchableOpacity
            key={d}
            onPress={() => onChange(d)}
            style={{
              paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
              backgroundColor: active ? colors.primary : colors.surfaceAlt,
              borderWidth: 1, borderColor: active ? colors.primary : colors.border,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: active ? '#fff' : colors.textMuted }}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const TABS = ['Production','Finance','HR','Engineering','Sales'] as const;
type Tab = typeof TABS[number];

// ─── Main screen ──────────────────────────────────────────────────────────────

export function AdminAnalyticsScreen() {
  const { colors, isDark } = useAppTheme();
  const { isAr } = useLocale();

  const [overview,   setOverview]   = useState<Overview | null>(null);
  const [charts,     setCharts]     = useState<Charts | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab,        setTab]        = useState<Tab>('Production');
  const [days,       setDays]       = useState(7);

  const load = useCallback(async (d = days) => {
    try {
      const [ov, ch] = await Promise.all([
        api.get<Overview>('/dashboard/overview'),
        api.get<Charts>(`/dashboard/charts?days=${d}`),
      ]);
      setOverview(ov ?? {});
      setCharts(ch ?? {});
    } catch {
      setOverview({});
      setCharts({});
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [days]);

  const handleDaysChange = (d: number) => {
    setDays(d);
    void load(d);
  };

  useEffect(() => { void load(); }, [load]);

  const chartCfg = {
    backgroundGradientFrom: colors.surface,
    backgroundGradientTo:   colors.surface,
    color: (opacity = 1) => `rgba(255,107,53,${opacity})`,
    labelColor: () => colors.textSecondary,
    strokeWidth: 2,
    barPercentage: 0.65,
    decimalPlaces: 0,
    propsForLabels: { fontSize: 9 },
  };

  const pieTextColor = isDark ? '#e5e7eb' : '#374151';

  // ─── Production charts ──────────────────────────────────────────────────────
  const renderProduction = () => {
    const byDay   = charts?.productionByDay ?? [];
    const labels  = byDay.length ? byDay.map((d) => d.date) : ['—'];
    const pieces  = ensure(byDay.map((d) => d.pieces), [0]);
    const cartons = ensure(byDay.map((d) => d.cartons), [0]);
    const prod    = overview?.production;

    return (
      <>
        <KpiRow items={[
          { label: isAr ? 'اليوم'    : 'Today',  value: fmtNum(prod?.todayPieces),  color: '#3b82f6' },
          { label: isAr ? 'الأسبوع' : 'Week',   value: fmtNum(prod?.weekPieces),   color: '#10b981' },
          { label: isAr ? 'الشهر'   : 'Month',  value: fmtNum(prod?.monthPieces),  color: '#f59e0b' },
          { label: isAr ? 'كراتين اليوم' : 'Cartons', value: fmtNum(prod?.todayCartons), color: '#8b5cf6' },
        ]} />

        <ChartCard title={isAr ? `قطع الإنتاج — آخر ${days} أيام` : `Production Pieces — Last ${days}d`}>
          <BarChart
            data={{ labels, datasets: [{ data: pieces }] }}
            width={CHART_W} height={200}
            chartConfig={{ ...chartCfg, color: (o = 1) => `rgba(59,130,246,${o})` }}
            fromZero showValuesOnTopOfBars
            style={styles.chart}
            yAxisLabel="" yAxisSuffix=""
          />
        </ChartCard>

        <ChartCard title={isAr ? `الكراتين — آخر ${days} أيام` : `Cartons — Last ${days}d`}>
          <BarChart
            data={{ labels, datasets: [{ data: cartons }] }}
            width={CHART_W} height={180}
            chartConfig={{ ...chartCfg, color: (o = 1) => `rgba(139,92,246,${o})` }}
            fromZero showValuesOnTopOfBars
            style={styles.chart}
            yAxisLabel="" yAxisSuffix=""
          />
        </ChartCard>
      </>
    );
  };

  // ─── Finance charts ─────────────────────────────────────────────────────────
  const renderFinance = () => {
    const salesData    = charts?.salesByMonth    ?? [];
    const expData      = charts?.expensesByMonth ?? [];

    const allMonths    = [...new Set([...salesData.map((d) => d.month), ...expData.map((d) => d.month)])].sort();
    const salesVals    = ensure(allMonths.map((m) => salesData.find((d) => d.month === m)?.amount ?? 0), [0]);
    const expVals      = ensure(allMonths.map((m) => expData.find((d) => d.month === m)?.amount ?? 0), [0]);
    const labels       = allMonths.length ? allMonths : ['—'];

    const finPie = buildPie([
      { label: isAr ? 'مبيعات'  : 'Sales',     value: overview?.salesThisMonth ?? 0 },
      { label: isAr ? 'مشتريات' : 'Purchases', value: overview?.purchasesThisMonth ?? 0 },
      { label: isAr ? 'مصروفات' : 'Expenses',  value: overview?.expensesThisMonth ?? 0 },
      { label: isAr ? 'رواتب'   : 'Payroll',   value: overview?.payrollThisMonth ?? 0 },
    ], ['#10b981','#3b82f6','#f59e0b','#ef4444'], pieTextColor);

    return (
      <>
        <KpiRow items={[
          { label: isAr ? 'مبيعات'  : 'Sales',    value: fmtMoney(overview?.salesThisMonth),    color: '#10b981' },
          { label: isAr ? 'مشتريات': 'Purchases', value: fmtMoney(overview?.purchasesThisMonth), color: '#3b82f6' },
          { label: isAr ? 'مصروفات': 'Expenses',  value: fmtMoney(overview?.expensesThisMonth),  color: '#f59e0b' },
          { label: isAr ? 'رواتب'  : 'Payroll',   value: fmtMoney(overview?.payrollThisMonth),   color: '#ef4444' },
        ]} />

        {finPie.length > 0 && (
          <ChartCard title={isAr ? 'توزيع المالية (الشهر الحالي)' : 'Finance Breakdown (This Month)'}>
            <PieChart
              data={finPie}
              width={CHART_W} height={180}
              chartConfig={chartCfg}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="10"
              hasLegend
            />
          </ChartCard>
        )}

        <ChartCard title={isAr ? 'المبيعات — آخر 6 أشهر' : 'Sales — Last 6 Months'}>
          <LineChart
            data={{ labels, datasets: [{ data: salesVals, color: (o = 1) => `rgba(16,185,129,${o})` }] }}
            width={CHART_W} height={200}
            chartConfig={{ ...chartCfg, color: (o = 1) => `rgba(16,185,129,${o})` }}
            bezier style={styles.chart}
            yAxisLabel="₪" yAxisSuffix=""
          />
        </ChartCard>

        <ChartCard title={isAr ? 'المصروفات — آخر 6 أشهر' : 'Expenses — Last 6 Months'}>
          <LineChart
            data={{ labels, datasets: [{ data: expVals, color: (o = 1) => `rgba(249,115,22,${o})` }] }}
            width={CHART_W} height={200}
            chartConfig={{ ...chartCfg, color: (o = 1) => `rgba(249,115,22,${o})` }}
            bezier style={styles.chart}
            yAxisLabel="₪" yAxisSuffix=""
          />
        </ChartCard>

        <KpiRow items={[
          { label: isAr ? 'فواتير معلقة' : 'Pending Invoices', value: String(overview?.invoicesPending ?? 0), color: '#f59e0b' },
          { label: isAr ? 'فواتير متأخرة': 'Overdue Invoices', value: String(overview?.invoicesOverdue ?? 0), color: '#ef4444' },
        ]} />
      </>
    );
  };

  // ─── HR charts ──────────────────────────────────────────────────────────────
  const renderHR = () => {
    const attData  = charts?.attendanceByDay ?? [];
    const labels   = attData.length ? attData.map((d) => d.date) : ['—'];
    const present  = ensure(attData.map((d) => d.present), [0]);
    const late     = ensure(attData.map((d) => d.late), [0]);

    const roleData = (charts?.usersByRole ?? overview?.usersByRole ?? []);
    const rolePie  = buildPie(
      roleData.map((r) => ({ label: r.role, value: r.count })),
      roleData.map((r) => ROLE_COLORS[r.role] ?? '#6b7280'),
      pieTextColor,
    );

    return (
      <>
        <KpiRow items={[
          { label: isAr ? 'إجمالي الموظفين' : 'Total Staff',    value: String(overview?.totalUsers ?? 0),  color: '#3b82f6' },
          { label: isAr ? 'نشطون'           : 'Active',         value: String(overview?.activeUsers ?? 0), color: '#10b981' },
          { label: isAr ? 'حضور اليوم'      : 'Today Attendance',value: String(overview?.attendanceToday ?? 0), color: '#8b5cf6' },
          { label: isAr ? 'متأخرون اليوم'   : 'Late Today',     value: String(overview?.lateToday ?? 0),   color: '#f59e0b' },
        ]} />

        {rolePie.length > 0 && (
          <ChartCard title={isAr ? 'توزيع الموظفين حسب الدور' : 'Staff by Role'}>
            <PieChart
              data={rolePie}
              width={CHART_W} height={200}
              chartConfig={chartCfg}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="10"
              hasLegend
            />
          </ChartCard>
        )}

        <ChartCard title={isAr ? `الحضور — آخر ${days} أيام` : `Attendance — Last ${days}d`}>
          <BarChart
            data={{ labels, datasets: [{ data: present }] }}
            width={CHART_W} height={180}
            chartConfig={{ ...chartCfg, color: (o = 1) => `rgba(139,92,246,${o})` }}
            fromZero showValuesOnTopOfBars
            style={styles.chart}
            yAxisLabel="" yAxisSuffix=""
          />
          <LegendRow items={[
            { label: isAr ? 'حضور' : 'Present', color: '#8b5cf6', value: '' },
            ...attData.map((d) => ({ label: d.date, color: '#8b5cf6', value: `${d.present} (${d.late} ${isAr ? 'متأخر' : 'late'})` })).slice(0, 3),
          ]} />
        </ChartCard>
      </>
    );
  };

  // ─── Engineering charts ─────────────────────────────────────────────────────
  const renderEngineering = () => {
    const elecData  = charts?.electricityByDay ?? [];
    const elecLbls  = elecData.length ? elecData.map((d) => d.date) : ['—'];
    const elecVals  = ensure(elecData.map((d) => d.kwh), [0]);

    const maintData = charts?.maintenanceByMonth ?? [];
    const maintLbls = maintData.length ? maintData.map((d) => d.month) : ['—'];
    const maintVals = ensure(maintData.map((d) => d.count), [0]);

    const machData  = (charts?.machinesByStatus ?? overview?.machinesByStatus ?? []);
    const machPie   = buildPie(
      machData.map((m) => ({ label: m.status.replace('_', ' '), value: m.count })),
      machData.map((m) => MACHINE_COLORS[m.status] ?? '#6b7280'),
      pieTextColor,
    );

    const qualData  = (charts?.qualityBySeverity ?? overview?.qualityBySeverity ?? []);
    const qualLbls  = qualData.length ? qualData.map((q) => q.severity) : ['—'];
    const qualVals  = ensure(qualData.map((q) => q.count), [0]);

    return (
      <>
        <KpiRow items={[
          { label: isAr ? 'إجمالي الآلات'     : 'Total Machines',    value: String(overview?.totalMachines ?? 0),     color: '#3b82f6' },
          { label: isAr ? 'تعمل'              : 'Operational',       value: String(overview?.operationalMachines ?? 0),color: '#10b981' },
          { label: isAr ? 'صيانة الشهر'       : 'Maintenance/Month', value: String(overview?.maintenanceThisMonth ?? 0), color: '#f59e0b' },
          { label: isAr ? 'جداول متأخرة'      : 'Overdue Schedules', value: String(overview?.overdueSchedules ?? 0),  color: '#ef4444' },
        ]} />

        {machPie.length > 0 && (
          <ChartCard title={isAr ? 'حالة الآلات' : 'Machine Status'}>
            <PieChart
              data={machPie}
              width={CHART_W} height={200}
              chartConfig={chartCfg}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="10"
              hasLegend
            />
          </ChartCard>
        )}

        <ChartCard title={isAr ? `كهرباء (kWh) — آخر ${days} أيام` : `Electricity (kWh) — Last ${days}d`}>
          <LineChart
            data={{ labels: elecLbls, datasets: [{ data: elecVals }] }}
            width={CHART_W} height={200}
            chartConfig={{ ...chartCfg, color: (o = 1) => `rgba(234,179,8,${o})` }}
            bezier style={styles.chart}
            yAxisLabel="" yAxisSuffix=" kWh"
          />
        </ChartCard>

        <ChartCard title={isAr ? 'بلاغات الصيانة — آخر 6 أشهر' : 'Maintenance Reports — Last 6 Months'}>
          <BarChart
            data={{ labels: maintLbls, datasets: [{ data: maintVals }] }}
            width={CHART_W} height={180}
            chartConfig={{ ...chartCfg, color: (o = 1) => `rgba(245,158,11,${o})` }}
            fromZero showValuesOnTopOfBars
            style={styles.chart}
            yAxisLabel="" yAxisSuffix=""
          />
        </ChartCard>

        {qualData.length > 0 && (
          <ChartCard title={isAr ? 'مشاكل الجودة حسب الخطورة' : 'Quality Issues by Severity'}>
            <BarChart
              data={{ labels: qualLbls, datasets: [{ data: qualVals }] }}
              width={CHART_W} height={180}
              chartConfig={{ ...chartCfg, color: (o = 1) => `rgba(239,68,68,${o})` }}
              fromZero showValuesOnTopOfBars
              style={styles.chart}
              yAxisLabel="" yAxisSuffix=""
            />
            <LegendRow items={qualData.map((q) => ({
              label: q.severity,
              color: SEVERITY_COLORS[q.severity] ?? '#6b7280',
              value: q.count,
            }))} />
          </ChartCard>
        )}

        {/* Inventory */}
        <KpiRow items={[
          { label: isAr ? 'إجمالي المواد'   : 'Raw Materials',  value: String(overview?.totalRawMaterials ?? 0), color: '#06b6d4' },
          { label: isAr ? 'نفدت المخزون'    : 'Out of Stock',   value: String(overview?.outOfStockCount ?? 0),   color: '#ef4444' },
        ]} />
        {(overview?.lowStockMaterials ?? []).length > 0 && (
          <ChartCard title={isAr ? 'مواد قاربت النفاد' : 'Low Stock Materials'}>
            {(overview!.lowStockMaterials!).map((m) => {
              const pct = Math.min(100, Math.round((m.currentQuantity / Math.max(m.minQuantity, 1)) * 100));
              return (
                <View key={m.name} style={styles.matRow}>
                  <Text style={[styles.matName, { color: colors.text }]} numberOfLines={1}>{m.name}</Text>
                  <View style={[styles.matBarBg, { backgroundColor: colors.border }]}>
                    <View style={[styles.matBarFill, { width: `${pct}%` as any, backgroundColor: pct < 50 ? '#ef4444' : '#f59e0b' }]} />
                  </View>
                  <Text style={[styles.matPct, { color: colors.textSecondary }]}>{pct}%</Text>
                </View>
              );
            })}
          </ChartCard>
        )}
      </>
    );
  };

  // ─── Sales charts ────────────────────────────────────────────────────────────
  const renderSales = () => {
    const quotData = charts?.quotationsByStatus ?? [];
    const quotLbls = quotData.length ? quotData.map((q) => q.status.slice(0, 4)) : ['—'];
    const quotVals = ensure(quotData.map((q) => q.count), [0]);

    return (
      <>
        {quotData.length > 0 && (
          <>
            <ChartCard title={isAr ? 'عروض الأسعار حسب الحالة' : 'Quotations by Status'}>
              <BarChart
                data={{ labels: quotLbls, datasets: [{ data: quotVals }] }}
                width={CHART_W} height={180}
                chartConfig={{ ...chartCfg, color: (o = 1) => `rgba(139,92,246,${o})` }}
                fromZero showValuesOnTopOfBars
                style={styles.chart}
                yAxisLabel="" yAxisSuffix=""
              />
              <LegendRow items={quotData.map((q) => ({
                label: q.status,
                color: STATUS_COLORS[q.status] ?? '#6b7280',
                value: q.count,
              }))} />
            </ChartCard>
          </>
        )}
        <KpiRow items={[
          { label: isAr ? 'مبيعات الشهر'  : 'Sales/Month',     value: fmtMoney(overview?.salesThisMonth),    color: '#10b981' },
          { label: isAr ? 'مشتريات الشهر' : 'Purchases/Month', value: fmtMoney(overview?.purchasesThisMonth), color: '#3b82f6' },
        ]} />
      </>
    );
  };

  const renderTab = () => {
    switch (tab) {
      case 'Production':  return renderProduction();
      case 'Finance':     return renderFinance();
      case 'HR':          return renderHR();
      case 'Engineering': return renderEngineering();
      case 'Sales':       return renderSales();
    }
  };

  const TAB_LABELS: Record<Tab, string> = {
    Production:  isAr ? 'الإنتاج' : 'Production',
    Finance:     isAr ? 'المالية' : 'Finance',
    HR:          isAr ? 'الموارد' : 'HR',
    Engineering: isAr ? 'الهندسة' : 'Engineering',
    Sales:       isAr ? 'المبيعات': 'Sales',
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={isAr ? 'التحليلات' : 'Analytics'} showBack />

      {/* Tab bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}
        contentContainerStyle={{ paddingHorizontal: spacing.sm }}
      >
        {TABS.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tabItem, tab === t && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabTxt, { color: tab === t ? colors.primary : colors.textSecondary }]}>
              {TAB_LABELS[t]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Day range selector */}
      <View style={[styles.dayBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <DayRangeSelector days={days} onChange={handleDaysChange} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); void load(); }}
              tintColor={colors.primary}
            />
          }
        >
          {renderTab()}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:    { flex: 1 },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.md, gap: spacing.sm },
  tabBar:  { borderBottomWidth: 1, maxHeight: 46, flexGrow: 0 },
  dayBar:  { borderBottomWidth: 1, flexGrow: 0 },
  tabItem: { paddingHorizontal: spacing.sm, paddingVertical: 12, marginRight: 4 },
  tabTxt:  { ...typography.caption, fontWeight: '700', fontSize: 12 },
  chart:   { borderRadius: radius.md, marginTop: 6 },
  matRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  matName: { ...typography.caption, width: 90 },
  matBarBg:{ flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  matBarFill: { height: 8, borderRadius: 4 },
  matPct:  { ...typography.caption, width: 36, textAlign: 'right' },
});

const sectionStyles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, borderLeftWidth: 3, paddingLeft: 8, marginBottom: 4, marginTop: 8 },
  title:  { ...typography.h4 },
});

const kpiStyles = StyleSheet.create({
  row:  { flexDirection: 'row', gap: spacing.xs, marginBottom: 4 },
  card: { flex: 1, borderRadius: radius.md, padding: spacing.sm, alignItems: 'center', borderWidth: 1 },
  val:  { ...typography.h3, fontWeight: '800', fontSize: 16 },
  lbl:  { ...typography.caption, textAlign: 'center', marginTop: 2, fontSize: 10 },
});

const chartCardStyles = StyleSheet.create({
  wrap:  { borderRadius: radius.lg, padding: spacing.sm, overflow: 'hidden' },
  title: { ...typography.caption, fontWeight: '700', marginBottom: 4 },
});

const legendStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot:  { width: 8, height: 8, borderRadius: 4 },
  lbl:  { ...typography.caption, fontSize: 10 },
  val:  { ...typography.caption, fontWeight: '700', fontSize: 10 },
});
