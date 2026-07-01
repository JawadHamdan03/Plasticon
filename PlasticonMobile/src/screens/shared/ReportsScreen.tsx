import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
import { useLocale } from '../../context/LocaleContext';
  ActivityIndicator, Alert, RefreshControl, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';

// ─── Types ────────────────────────────────────────────────────────────────────
type TabKey = 'suppliers'|'customers'|'production'|'inventory'|'attendance'|'payroll'|'electricity'|'expenses'|'maintenance'|'quality'|'spareParts';
type Period  = 'daily'|'weekly'|'monthly'|'yearly';

interface PurRec  { id: number; totalAmount: number; date: string; supplier?: { id: number; name: string } }
interface SaleRec { id: number; totalAmount: number; date: string; customer?: { id: number; name: string } }

interface ProdReport { label?: string; totals: { recordsCount: number; totalCartons: number; totalPieces: number; totalDowntimeMinutes: number }; records: { createdAt: string; machineName: string; shiftName: string; userName: string; cartonsCount: number; totalPieces: number }[] }
interface InvReport  { label?: string; totals: { recordsCount: number; inCount: number; outCount: number; totalInQuantity: number; totalOutQuantity: number }; records: { createdAt: string; materialName: string; type: string; quantity: number; referenceType: string }[] }
interface AttReport  { label?: string; totals: { recordsCount: number; absentCount: number; totalLateMinutes: number; totalOvertimeMinutes: number }; records: { userName: string; shiftName: string | null; checkIn: string; checkOut: string | null; lateMinutes: number; overtimeMinutes: number }[] }
interface PayReport  { label?: string; totals: { recordsCount: number; totalBaseSalary: number; totalOvertimeSalary: number; totalPayout: number }; records: { userName: string; month: string; totalHours: number; overtimeHours: number; baseSalary: number; totalSalary: number }[] }
interface ElecDay    { date: string; totalConsumption: number; totalCost: number; shifts: { shift: { name: string }; consumption: number; shiftCost: number }[] }
interface ElecReport { days: ElecDay[]; summary: { totalConsumption: number; totalCost: number; totalReadings: number; currentKwhPrice: number } }
interface ExpRec    { id: number; category: string; amount: number; description: string | null; paymentStatus: string; submittedAt: string; submittedBy?: { fullName: string } }
interface MaintRec  { id: number; laborHours: number; sparesTotal: number; totalCost: number; notes: string | null; createdAt: string; maintenance: { machine: { name: string; type: string }; engineer: { fullName: string } } }
interface QualRec   { id: number; issueType: string; severity: string; description: string | null; resolvedAt: string | null; createdAt: string; machine: { name: string; type: string }; engineer: { fullName: string } }
interface SpareRec  { id: number; partName: string; quantity: number; unitPrice: number | null; status: string; createdAt: string; engineer: { fullName: string }; machine: { name: string; type: string } | null }

// ─── Tab config ───────────────────────────────────────────────────────────────
const TABS: { key: TabKey; icon: string; color: string; labelEn: string; labelAr: string }[] = [
  { key: 'suppliers',   icon: 'car-outline',              color: '#3b82f6', labelEn: 'Suppliers',    labelAr: 'الموردون' },
  { key: 'customers',   icon: 'people-outline',           color: '#10b981', labelEn: 'Customers',    labelAr: 'الزباين' },
  { key: 'production',  icon: 'hardware-chip-outline',    color: '#8b5cf6', labelEn: 'Production',   labelAr: 'الإنتاج' },
  { key: 'inventory',   icon: 'cube-outline',             color: '#f97316', labelEn: 'Raw Materials', labelAr: 'المواد الخام' },
  { key: 'attendance',  icon: 'time-outline',             color: '#06b6d4', labelEn: 'Attendance',   labelAr: 'الحضور' },
  { key: 'payroll',     icon: 'cash-outline',             color: '#ec4899', labelEn: 'Payroll',      labelAr: 'الرواتب' },
  { key: 'electricity', icon: 'flash-outline',            color: '#d97706', labelEn: 'Electricity',  labelAr: 'الكهرباء' },
  { key: 'expenses',    icon: 'receipt-outline',          color: '#ef4444', labelEn: 'Expenses',     labelAr: 'المصروفات' },
  { key: 'maintenance', icon: 'build-outline',            color: '#0891b2', labelEn: 'Maintenance',  labelAr: 'الصيانة' },
  { key: 'quality',     icon: 'shield-checkmark-outline', color: '#16a34a', labelEn: 'Quality',      labelAr: 'الجودة' },
  { key: 'spareParts',  icon: 'construct-outline',        color: '#7c3aed', labelEn: 'Spare Parts',  labelAr: 'قطع الغيار' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number, dec = 0) => n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
const todayStr  = () => new Date().toISOString().slice(0, 10);
const monthStr  = () => new Date().toISOString().slice(0, 7);
const yearStr   = () => String(new Date().getFullYear());

// ─── Sub-components ───────────────────────────────────────────────────────────
function KpiCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  return (
    <View style={[styles.kpiCard, { backgroundColor: colors.surface }]}>
      <Text style={[styles.kpiVal, { color }]} numberOfLines={1}>{value}</Text>
      <Text style={[styles.kpiLbl, { color: colors.textMuted }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function SectionLoading() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  return <View style={styles.sectionLoading}><ActivityIndicator color={colors.primary} /></View>;
}

function EmptySection({ isAr }: { isAr: boolean }) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  return (
    <View style={styles.emptySection}>
      <Ionicons name="document-outline" size={36} color={colors.textMuted} />
      <Text style={[styles.emptyTxt, { color: colors.textMuted }]}>{'لا توجد بيانات'}</Text>
    </View>
  );
}

function DateRangeRow({ fromDate, toDate, setFromDate, setToDate, onLoad, loading, isAr }: {
  fromDate: string; toDate: string;
  setFromDate: (v: string) => void; setToDate: (v: string) => void;
  onLoad?: () => void; loading: boolean; isAr: boolean;
}) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const inputStyle = [styles.dateInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }];
  return (
    <View style={styles.filterRow}>
      <View style={styles.dateGroup}>
        <Text style={[styles.filterLabel, { color: colors.textMuted }]}>{'من'}</Text>
        <TextInput style={inputStyle} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted} value={fromDate} onChangeText={setFromDate} />
      </View>
      <View style={styles.dateGroup}>
        <Text style={[styles.filterLabel, { color: colors.textMuted }]}>{'إلى'}</Text>
        <TextInput style={inputStyle} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted} value={toDate} onChangeText={setToDate} />
      </View>
      {onLoad && (
        <TouchableOpacity style={[styles.loadBtn, { backgroundColor: colors.primary }]} onPress={onLoad} disabled={loading}>
          {loading ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="refresh" size={16} color="#fff" />}
        </TouchableOpacity>
      )}
    </View>
  );
}

function PeriodRow({ period, setPeriod, filterDate, setFilterDate, filterMonth, setFilterMonth, filterYear, setFilterYear, onLoad, loading, isAr }: {
  period: Period; setPeriod: (p: Period) => void;
  filterDate: string; setFilterDate: (v: string) => void;
  filterMonth: string; setFilterMonth: (v: string) => void;
  filterYear: string; setFilterYear: (v: string) => void;
  onLoad: () => void; loading: boolean; isAr: boolean;
}) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const PERIODS: { key: Period; en: string; ar: string }[] = [
    { key: 'daily',   en: 'Day',   ar: 'يوم'   },
    { key: 'weekly',  en: 'Week',  ar: 'أسبوع' },
    { key: 'monthly', en: 'Month', ar: 'شهر'   },
    { key: 'yearly',  en: 'Year',  ar: 'سنة'   },
  ];
  const inputStyle = [styles.dateInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }];
  return (
    <View style={styles.filterWrap}>
      <View style={styles.chipsRow}>
        {PERIODS.map(p => {
          const active = period === p.key;
          return (
            <TouchableOpacity key={p.key} style={[styles.chip, active && { backgroundColor: colors.primary }]} onPress={() => setPeriod(p.key)}>
              <Text style={[styles.chipTxt, { color: active ? '#fff' : colors.textMuted }]}>{isAr ? p.ar : p.en}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.filterRow}>
        {(period === 'daily' || period === 'weekly') && (
          <TextInput style={[inputStyle, { flex: 1 }]} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted} value={filterDate} onChangeText={setFilterDate} />
        )}
        {period === 'monthly' && (
          <TextInput style={[inputStyle, { flex: 1 }]} placeholder="YYYY-MM" placeholderTextColor={colors.textMuted} value={filterMonth} onChangeText={setFilterMonth} />
        )}
        {period === 'yearly' && (
          <TextInput style={[inputStyle, { flex: 1 }]} placeholder="YYYY" placeholderTextColor={colors.textMuted} value={filterYear} onChangeText={setFilterYear} keyboardType="number-pad" />
        )}
        <TouchableOpacity style={[styles.loadBtn, { backgroundColor: colors.primary }]} onPress={onLoad} disabled={loading}>
          {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.loadBtnTxt}>{'تحميل'}</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── PDF Builder ──────────────────────────────────────────────────────────────
function buildPdfHtml(title: string, kpis: { label: string; value: string }[], rows: string[][], headers: string[], isAr: boolean): string {
  const now = new Date().toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' });
  const dir = 'rtl';
  const kpiHtml = kpis.map(k => `<div class="kpi"><div class="kv">${k.value}</div><div class="kl">${k.label}</div></div>`).join('');
  const headRow = headers.map(h => `<th>${h}</th>`).join('');
  const bodyRows = rows.slice(0, 100).map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('');
  return `<!DOCTYPE html><html dir="${dir}"><head><meta charset="utf-8"><style>
body{font-family:Arial,sans-serif;padding:24px;color:#1a1a2e;direction:${dir}}
h1{color:#3b82f6;font-size:22px;margin-bottom:4px}
.date{color:#6b7280;font-size:12px;margin-bottom:20px}
.kpis{display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap}
.kpi{background:#f0f9ff;border-radius:8px;padding:12px 16px;min-width:120px;text-align:center}
.kv{font-size:22px;font-weight:800;color:#1d4ed8}
.kl{font-size:11px;color:#6b7280;margin-top:2px}
table{width:100%;border-collapse:collapse;font-size:12px}
th{background:#3b82f6;color:#fff;padding:8px 6px;text-align:${'right'}}
td{padding:7px 6px;border-bottom:1px solid #f3f4f6}
tr:nth-child(even) td{background:#f8fafc}
.footer{margin-top:32px;font-size:10px;color:#9ca3af;text-align:center}
</style></head><body>
<h1>${title}</h1><div class="date">${'تاريخ الإصدار'}: ${now}</div>
<div class="kpis">${kpiHtml}</div>
<table><thead><tr>${headRow}</tr></thead><tbody>${bodyRows}</tbody></table>
<div class="footer">Plasticon Factory Management System</div>
</body></html>`;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function ReportsScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();

  const [activeTab, setActiveTab] = useState<TabKey>('suppliers');
  const [exporting, setExporting]   = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMap, setLoadingMap] = useState<Partial<Record<TabKey, boolean>>>({});
  const setTL = (tab: TabKey, val: boolean) => setLoadingMap(p => ({ ...p, [tab]: val }));

  // Data states
  const [purchases,   setPurchases]   = useState<PurRec[]>([]);
  const [sales,       setSales]       = useState<SaleRec[]>([]);
  const [production,  setProduction]  = useState<ProdReport | null>(null);
  const [inventory,   setInventory]   = useState<InvReport | null>(null);
  const [attendance,  setAttendance]  = useState<AttReport | null>(null);
  const [payroll,     setPayroll]     = useState<PayReport | null>(null);
  const [electricity, setElectricity] = useState<ElecReport | null>(null);
  const [expenses,    setExpenses]    = useState<ExpRec[]>([]);
  const [maintenance, setMaintenance] = useState<MaintRec[]>([]);
  const [quality,     setQuality]     = useState<QualRec[]>([]);
  const [spareParts,  setSpareParts]  = useState<SpareRec[]>([]);

  // Filter states
  const [period,       setPeriod]       = useState<Period>('daily');
  const [filterDate,   setFilterDate]   = useState(todayStr());
  const [filterMonth,  setFilterMonth]  = useState(monthStr());
  const [filterYear,   setFilterYear]   = useState(yearStr());
  const [fromDate,     setFromDate]     = useState('');
  const [toDate,       setToDate]       = useState('');
  const [qualSeverity, setQualSeverity] = useState('ALL');
  const [spareStatus,  setSpareStatus]  = useState('ALL');

  // Derived data
  const filteredPurchases = useMemo(() => filterByDate(purchases, 'date', fromDate, toDate), [purchases, fromDate, toDate]);
  const filteredSales      = useMemo(() => filterByDate(sales,     'date', fromDate, toDate), [sales, fromDate, toDate]);
  const filteredExpenses   = useMemo(() => filterByDate(expenses,  'submittedAt', fromDate, toDate), [expenses, fromDate, toDate]);
  const filteredMaint      = useMemo(() => filterByDate(maintenance, 'createdAt', fromDate, toDate), [maintenance, fromDate, toDate]);

  const supplierRows = useMemo(() => groupBy(filteredPurchases, r => r.supplier?.id ?? 0, r => ({ name: r.supplier?.name ?? `#${r.id}`, total: r.totalAmount ?? 0 })), [filteredPurchases]);
  const customerRows = useMemo(() => groupBy(filteredSales,     r => r.customer?.id ?? 0, r => ({ name: r.customer?.name ?? `#${r.id}`, total: r.totalAmount ?? 0 })), [filteredSales]);

  const filteredQuality    = useMemo(() => qualSeverity === 'ALL' ? quality    : quality.filter(q => q.severity === qualSeverity),   [quality, qualSeverity]);
  const filteredSpareParts = useMemo(() => spareStatus  === 'ALL' ? spareParts : spareParts.filter(s => s.status === spareStatus), [spareParts, spareStatus]);

  // ── Loaders ──
  const buildQ = useCallback(() => {
    let q = `period=${period}`;
    if (period === 'daily'  || period === 'weekly')  { if (filterDate)  q += `&date=${filterDate}`; }
    if (period === 'monthly')                         { if (filterMonth) q += `&month=${filterMonth}`; }
    if (period === 'yearly')                          { if (filterYear)  q += `&year=${filterYear}`; }
    return q;
  }, [period, filterDate, filterMonth, filterYear]);

  const loadCommerce = useCallback(async () => {
    setTL('suppliers', true); setTL('customers', true);
    const [pur, sal] = await Promise.allSettled([api.get<any>('/purchases/all'), api.get<any>('/sales/all')]);
    if (pur.status === 'fulfilled') setPurchases(asArray(pur.value, ['data','purchases']));
    if (sal.status === 'fulfilled') setSales(asArray(sal.value, ['data','sales']));
    setTL('suppliers', false); setTL('customers', false);
  }, []);

  const loadProduction  = useCallback(async () => { setTL('production',  true); try { const r = await api.get<any>(`/reports/production/activity?${buildQ()}`);  setProduction(r?.totals ? r : (r?.report ?? null));  } catch { setProduction(null);  } finally { setTL('production',  false); } }, [buildQ]);
  const loadInventory   = useCallback(async () => { setTL('inventory',   true); try { const r = await api.get<any>(`/reports/inventory/activity?${buildQ()}`);   setInventory(r?.totals ? r : (r?.report ?? null));   } catch { setInventory(null);   } finally { setTL('inventory',   false); } }, [buildQ]);
  const loadAttendance  = useCallback(async () => { setTL('attendance',  true); try { const r = await api.get<any>(`/reports/attendance/activity?${buildQ()}`);  setAttendance(r?.totals ? r : (r?.report ?? null));  } catch { setAttendance(null);  } finally { setTL('attendance',  false); } }, [buildQ]);
  const loadPayroll     = useCallback(async () => { setTL('payroll',     true); try { const r = await api.get<any>(`/reports/payroll/activity?${buildQ()}`);     setPayroll(r?.totals ? r : (r?.report ?? null));     } catch { setPayroll(null);     } finally { setTL('payroll',     false); } }, [buildQ]);

  const loadElectricity = useCallback(async () => {
    setTL('electricity', true);
    try {
      const params: string[] = [];
      if (fromDate) params.push(`fromDate=${fromDate}`);
      if (toDate)   params.push(`toDate=${toDate}`);
      const r = await api.get<any>(`/electricity/report${params.length ? '?' + params.join('&') : ''}`);
      setElectricity(r?.days ? r : (r?.summary ? r : null));
    } catch { setElectricity(null); } finally { setTL('electricity', false); }
  }, [fromDate, toDate]);

  const loadExpenses    = useCallback(async () => { setTL('expenses',    true); try { const r = await api.get<any>('/expenses');              setExpenses(asArray(r,   ['data','expenses']));    } catch { setExpenses([]);    } finally { setTL('expenses',    false); } }, []);
  const loadMaintenance = useCallback(async () => { setTL('maintenance', true); try { const r = await api.get<any>('/maintenance-costs');     setMaintenance(asArray(r, ['data','costs']));      } catch { setMaintenance([]); } finally { setTL('maintenance', false); } }, []);
  const loadQuality     = useCallback(async () => { setTL('quality',     true); try { const r = await api.get<any>('/quality-checks/all');    setQuality(asArray(r,    ['data','checks']));      } catch { setQuality([]);     } finally { setTL('quality',     false); } }, []);
  const loadSpareParts  = useCallback(async () => { setTL('spareParts',  true); try { const r = await api.get<any>('/spare-part-requests');   setSpareParts(asArray(r, ['data','requests']));    } catch { setSpareParts([]);  } finally { setTL('spareParts',  false); } }, []);

  const loadAll = useCallback(async () => {
    await Promise.all([loadCommerce(), loadExpenses(), loadMaintenance(), loadQuality(), loadSpareParts()]);
    void loadProduction(); void loadInventory(); void loadAttendance(); void loadPayroll(); void loadElectricity();
  }, [loadCommerce, loadExpenses, loadMaintenance, loadQuality, loadSpareParts, loadProduction, loadInventory, loadAttendance, loadPayroll, loadElectricity]);

  useEffect(() => { void loadAll(); }, []);

  const onRefresh = async () => { setRefreshing(true); await loadAll(); setRefreshing(false); };

  // ── Export ──
  const handleExport = async () => {
    const { title, kpis, headers, rows } = buildExportData();
    setExporting(true);
    try {
      const html = buildPdfHtml(title, kpis, rows, headers, isAr);
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const can = await Sharing.isAvailableAsync();
      if (can) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'مشاركة التقرير' });
      else Alert.alert('تم الحفظ', uri);
    } catch (e: any) {
      Alert.alert('خطأ', e?.message ?? 'Export failed');
    } finally { setExporting(false); }
  };

  function buildExportData(): { title: string; kpis: { label: string; value: string }[]; headers: string[]; rows: string[][] } {
    const _ = (en: string, ar: string) => isAr ? ar : en;
    switch (activeTab) {
      case 'suppliers':
        return { title: _('Supplier Report','تقرير الموردين'), kpis: [{ label: _('Suppliers','الموردون'), value: String(supplierRows.length) }, { label: _('Total Spent','الإجمالي'), value: `$${fmt(supplierRows.reduce((s,r)=>s+r.total,0))}` }], headers: [_('Supplier','المورد'),_('Invoices','فواتير'),_('Total','الإجمالي')], rows: supplierRows.map(r=>[r.name,String(r.count),`$${fmt(r.total)}`]) };
      case 'customers':
        return { title: _('Customer Report','تقرير الزباين'), kpis: [{ label: _('Customers','الزباين'), value: String(customerRows.length) }, { label: _('Total Revenue','الإيرادات'), value: `$${fmt(customerRows.reduce((s,r)=>s+r.total,0))}` }], headers: [_('Customer','الزبون'),_('Orders','طلبات'),_('Total','الإجمالي')], rows: customerRows.map(r=>[r.name,String(r.count),`$${fmt(r.total)}`]) };
      case 'production': {
        const t = production?.totals;
        return { title: _('Production Report','تقرير الإنتاج'), kpis: [{ label: _('Records','السجلات'), value: String(t?.recordsCount??0) },{ label: _('Total Pieces','إجمالي القطع'), value: fmt(t?.totalPieces??0) },{ label: _('Cartons','كرتونات'), value: fmt(t?.totalCartons??0) }], headers: [_('Date','التاريخ'),_('Machine','الآلة'),_('Shift','الشفت'),_('User','المستخدم'),_('Cartons','كرتونات'),_('Pieces','قطع')], rows: (production?.records??[]).map(r=>[fmtDate(r.createdAt),r.machineName,r.shiftName,r.userName,String(r.cartonsCount),String(r.totalPieces)]) };
      }
      case 'inventory': {
        const t = inventory?.totals;
        return { title: _('Raw Materials Report','تقرير المواد الخام'), kpis: [{ label: _('Records','السجلات'), value: String(t?.recordsCount??0) },{ label: _('IN Qty','كمية واردة'), value: fmt(t?.totalInQuantity??0) },{ label: _('OUT Qty','كمية صادرة'), value: fmt(t?.totalOutQuantity??0) }], headers: [_('Date','التاريخ'),_('Material','المادة'),_('Type','النوع'),_('Qty','الكمية')], rows: (inventory?.records??[]).map(r=>[fmtDate(r.createdAt),r.materialName,r.type,String(r.quantity)]) };
      }
      case 'attendance': {
        const t = attendance?.totals;
        return { title: _('Attendance Report','تقرير الحضور'), kpis: [{ label: _('Records','السجلات'), value: String(t?.recordsCount??0) },{ label: _('Absent','الغياب'), value: String(t?.absentCount??0) },{ label: _('Late Mins','دقائق تأخير'), value: String(t?.totalLateMinutes??0) }], headers: [_('User','الموظف'),_('Shift','الشفت'),_('Check In','دخول'),_('Late','تأخير')], rows: (attendance?.records??[]).map(r=>[r.userName,r.shiftName??'—',fmtDate(r.checkIn),String(r.lateMinutes)]) };
      }
      case 'payroll': {
        const t = payroll?.totals;
        return { title: _('Payroll Report','تقرير الرواتب'), kpis: [{ label: _('Records','السجلات'), value: String(t?.recordsCount??0) },{ label: _('Base Salary','الراتب الأساسي'), value: `$${fmt(t?.totalBaseSalary??0)}` },{ label: _('Total Payout','إجمالي الصرف'), value: `$${fmt(t?.totalPayout??0)}` }], headers: [_('User','الموظف'),_('Month','الشهر'),_('Hours','ساعات'),_('OT Hours','إضافي'),_('Total','الإجمالي')], rows: (payroll?.records??[]).map(r=>[r.userName,r.month,String(r.totalHours),String(r.overtimeHours),`$${fmt(r.totalSalary)}`]) };
      }
      case 'electricity': {
        const s = electricity?.summary;
        return { title: _('Electricity Report','تقرير الكهرباء'), kpis: [{ label: _('Total kWh','الاستهلاك'), value: fmt(s?.totalConsumption??0,1) },{ label: _('Total Cost','الإجمالي'), value: `$${fmt(s?.totalCost??0)}` },{ label: _('Readings','القراءات'), value: String(s?.totalReadings??0) }], headers: [_('Date','التاريخ'),_('Consumption kWh','استهلاك kWh'),_('Cost','التكلفة')], rows: (electricity?.days??[]).map(d=>[d.date,fmt(d.totalConsumption,1),`$${fmt(d.totalCost)}`]) };
      }
      case 'expenses':
        return { title: _('Expenses Report','تقرير المصروفات'), kpis: [{ label: _('Count','العدد'), value: String(filteredExpenses.length) },{ label: _('Total','الإجمالي'), value: `$${fmt(filteredExpenses.reduce((s,e)=>s+e.amount,0))}` }], headers: [_('Date','التاريخ'),_('Category','الفئة'),_('Amount','المبلغ'),_('Status','الحالة')], rows: filteredExpenses.map(e=>[fmtDate(e.submittedAt),e.category,`$${fmt(e.amount)}`,e.paymentStatus]) };
      case 'maintenance':
        return { title: _('Maintenance Report','تقرير الصيانة'), kpis: [{ label: _('Records','السجلات'), value: String(filteredMaint.length) },{ label: _('Total Cost','إجمالي التكلفة'), value: `$${fmt(filteredMaint.reduce((s,r)=>s+r.totalCost,0))}` }], headers: [_('Machine','الآلة'),_('Engineer','المهندس'),_('Labor Hrs','ساعات العمل'),_('Spares','قطع الغيار'),_('Total','الإجمالي')], rows: filteredMaint.map(r=>[r.maintenance.machine.name,r.maintenance.engineer.fullName,String(r.laborHours),`$${fmt(r.sparesTotal)}`,`$${fmt(r.totalCost)}`]) };
      case 'quality':
        return { title: _('Quality Report','تقرير الجودة'), kpis: [{ label: _('Total','الإجمالي'), value: String(filteredQuality.length) },{ label: _('Critical','حرجة'), value: String(filteredQuality.filter(q=>q.severity==='CRITICAL').length) },{ label: _('Resolved','محلولة'), value: String(filteredQuality.filter(q=>q.resolvedAt).length) }], headers: [_('Machine','الآلة'),_('Engineer','المهندس'),_('Issue','المشكلة'),_('Severity','الخطورة'),_('Resolved','حُلت')], rows: filteredQuality.map(r=>[r.machine.name,r.engineer.fullName,r.issueType,r.severity,r.resolvedAt?fmtDate(r.resolvedAt):'—']) };
      case 'spareParts':
        return { title: _('Spare Parts Report','تقرير قطع الغيار'), kpis: [{ label: _('Total','الإجمالي'), value: String(filteredSpareParts.length) },{ label: _('Pending','معلقة'), value: String(filteredSpareParts.filter(s=>s.status==='PENDING').length) },{ label: _('Total Cost','إجمالي التكلفة'), value: `$${fmt(filteredSpareParts.reduce((s,r)=>s+(r.unitPrice??0)*r.quantity,0))}` }], headers: [_('Part','القطعة'),_('Machine','الآلة'),_('Qty','الكمية'),_('Status','الحالة'),_('Engineer','المهندس')], rows: filteredSpareParts.map(r=>[r.partName,r.machine?.name??'—',String(r.quantity),r.status,r.engineer.fullName]) };
    }
  }

  // ── Tab content ──
  const tabCfg = TABS.find(t => t.key === activeTab)!;
  const isLoading = !!loadingMap[activeTab];

  function renderContent() {
    switch (activeTab) {

      case 'suppliers': {
        const total = supplierRows.reduce((s, r) => s + r.total, 0);
        return (
          <>
            <DateRangeRow fromDate={fromDate} toDate={toDate} setFromDate={setFromDate} setToDate={setToDate} loading={isLoading} isAr={isAr} />
            <View style={styles.kpiRow}>
              <KpiCard label={'الموردون'}      value={supplierRows.length}           color="#3b82f6" />
              <KpiCard label={'الفواتير'}       value={filteredPurchases.length}       color="#0891b2" />
              <KpiCard label={'الإجمالي'}          value={`$${fmt(total)}`}               color={colors.success} />
            </View>
            {isLoading ? <SectionLoading /> : supplierRows.length === 0 ? <EmptySection isAr={isAr} /> : supplierRows.map((r, i) => (
              <View key={i} style={[styles.row, { backgroundColor: colors.surface }]}>
                <View style={[styles.rowIcon, { backgroundColor: '#3b82f620' }]}><Ionicons name="car-outline" size={16} color="#3b82f6" /></View>
                <View style={styles.rowBody}>
                  <Text style={[styles.rowTitle, { color: colors.text }]}>{r.name}</Text>
                  <Text style={[styles.rowSub, { color: colors.textMuted }]}>{r.count} {'فاتورة'}</Text>
                </View>
                <Text style={[styles.rowAmt, { color: colors.success }]}>${fmt(r.total)}</Text>
              </View>
            ))}
          </>
        );
      }

      case 'customers': {
        const total = customerRows.reduce((s, r) => s + r.total, 0);
        return (
          <>
            <DateRangeRow fromDate={fromDate} toDate={toDate} setFromDate={setFromDate} setToDate={setToDate} loading={isLoading} isAr={isAr} />
            <View style={styles.kpiRow}>
              <KpiCard label={'الزباين'}       value={customerRows.length}            color="#10b981" />
              <KpiCard label={'الطلبات'}          value={filteredSales.length}           color="#0891b2" />
              <KpiCard label={'الإيرادات'}       value={`$${fmt(total)}`}               color={colors.success} />
            </View>
            {isLoading ? <SectionLoading /> : customerRows.length === 0 ? <EmptySection isAr={isAr} /> : customerRows.map((r, i) => (
              <View key={i} style={[styles.row, { backgroundColor: colors.surface }]}>
                <View style={[styles.rowIcon, { backgroundColor: '#10b98120' }]}><Ionicons name="people-outline" size={16} color="#10b981" /></View>
                <View style={styles.rowBody}>
                  <Text style={[styles.rowTitle, { color: colors.text }]}>{r.name}</Text>
                  <Text style={[styles.rowSub, { color: colors.textMuted }]}>{r.count} {'طلب'}</Text>
                </View>
                <Text style={[styles.rowAmt, { color: colors.success }]}>${fmt(r.total)}</Text>
              </View>
            ))}
          </>
        );
      }

      case 'production': {
        const t = production?.totals;
        return (
          <>
            <PeriodRow period={period} setPeriod={setPeriod} filterDate={filterDate} setFilterDate={setFilterDate} filterMonth={filterMonth} setFilterMonth={setFilterMonth} filterYear={filterYear} setFilterYear={setFilterYear} onLoad={loadProduction} loading={isLoading} isAr={isAr} />
            <View style={styles.kpiRow}>
              <KpiCard label={'السجلات'}         value={t?.recordsCount??0}             color="#8b5cf6" />
              <KpiCard label={'القطع'}            value={fmt(t?.totalPieces??0)}         color={colors.primary} />
              <KpiCard label={'كرتون'}           value={fmt(t?.totalCartons??0)}        color={colors.info} />
            </View>
            {isLoading ? <SectionLoading /> : !production ? <EmptySection isAr={isAr} /> : production.records.slice(0, 30).map((r, i) => (
              <View key={i} style={[styles.row, { backgroundColor: colors.surface }]}>
                <View style={styles.rowBody}>
                  <Text style={[styles.rowTitle, { color: colors.text }]}>{r.machineName} · {r.shiftName}</Text>
                  <Text style={[styles.rowSub, { color: colors.textMuted }]}>{r.userName} · {fmtDate(r.createdAt)}</Text>
                </View>
                <View style={styles.rowRight}>
                  <Text style={[styles.rowAmt, { color: '#8b5cf6' }]}>{fmt(r.totalPieces)} {'ق'}</Text>
                  <Text style={[styles.rowSub, { color: colors.textMuted }]}>{r.cartonsCount} {'كرتون'}</Text>
                </View>
              </View>
            ))}
          </>
        );
      }

      case 'inventory': {
        const t = inventory?.totals;
        return (
          <>
            <PeriodRow period={period} setPeriod={setPeriod} filterDate={filterDate} setFilterDate={setFilterDate} filterMonth={filterMonth} setFilterMonth={setFilterMonth} filterYear={filterYear} setFilterYear={setFilterYear} onLoad={loadInventory} loading={isLoading} isAr={isAr} />
            <View style={styles.kpiRow}>
              <KpiCard label={'السجلات'}         value={t?.recordsCount??0}             color="#f97316" />
              <KpiCard label={'وارد'}             value={fmt(t?.totalInQuantity??0)}     color={colors.success} />
              <KpiCard label={'صادر'}            value={fmt(t?.totalOutQuantity??0)}    color={colors.danger} />
            </View>
            {isLoading ? <SectionLoading /> : !inventory ? <EmptySection isAr={isAr} /> : inventory.records.slice(0, 30).map((r, i) => (
              <View key={i} style={[styles.row, { backgroundColor: colors.surface }]}>
                <View style={[styles.rowIcon, { backgroundColor: r.type === 'IN' ? `${colors.success}20` : `${colors.danger}20` }]}>
                  <Ionicons name={r.type === 'IN' ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'} size={16} color={r.type === 'IN' ? colors.success : colors.danger} />
                </View>
                <View style={styles.rowBody}>
                  <Text style={[styles.rowTitle, { color: colors.text }]}>{r.materialName}</Text>
                  <Text style={[styles.rowSub, { color: colors.textMuted }]}>{r.referenceType} · {fmtDate(r.createdAt)}</Text>
                </View>
                <Text style={[styles.rowAmt, { color: r.type === 'IN' ? colors.success : colors.danger }]}>{r.type === 'IN' ? '+' : '-'}{fmt(r.quantity)}</Text>
              </View>
            ))}
          </>
        );
      }

      case 'attendance': {
        const t = attendance?.totals;
        return (
          <>
            <PeriodRow period={period} setPeriod={setPeriod} filterDate={filterDate} setFilterDate={setFilterDate} filterMonth={filterMonth} setFilterMonth={setFilterMonth} filterYear={filterYear} setFilterYear={setFilterYear} onLoad={loadAttendance} loading={isLoading} isAr={isAr} />
            <View style={styles.kpiRow}>
              <KpiCard label={'السجلات'}         value={t?.recordsCount??0}             color="#06b6d4" />
              <KpiCard label={'الغياب'}           value={t?.absentCount??0}              color={colors.danger} />
              <KpiCard label={'دقائق تأخير'}   value={t?.totalLateMinutes??0}         color={colors.warning} />
            </View>
            {isLoading ? <SectionLoading /> : !attendance ? <EmptySection isAr={isAr} /> : attendance.records.slice(0, 30).map((r, i) => (
              <View key={i} style={[styles.row, { backgroundColor: colors.surface }]}>
                <View style={styles.rowBody}>
                  <Text style={[styles.rowTitle, { color: colors.text }]}>{r.userName}</Text>
                  <Text style={[styles.rowSub, { color: colors.textMuted }]}>{r.shiftName ?? '—'} · {fmtDate(r.checkIn)}</Text>
                </View>
                <View style={styles.rowRight}>
                  {r.lateMinutes > 0 && <Text style={[styles.rowSub, { color: colors.warning }]}>{r.lateMinutes} {'د تأخير'}</Text>}
                  {r.overtimeMinutes > 0 && <Text style={[styles.rowSub, { color: colors.success }]}>{r.overtimeMinutes} {'د إضافي'}</Text>}
                </View>
              </View>
            ))}
          </>
        );
      }

      case 'payroll': {
        const t = payroll?.totals;
        return (
          <>
            <PeriodRow period={period} setPeriod={setPeriod} filterDate={filterDate} setFilterDate={setFilterDate} filterMonth={filterMonth} setFilterMonth={setFilterMonth} filterYear={filterYear} setFilterYear={setFilterYear} onLoad={loadPayroll} loading={isLoading} isAr={isAr} />
            <View style={styles.kpiRow}>
              <KpiCard label={'السجلات'}         value={t?.recordsCount??0}             color="#ec4899" />
              <KpiCard label={'الراتب الأساسي'}     value={`$${fmt(t?.totalBaseSalary??0)}`} color={colors.info} />
              <KpiCard label={'إجمالي الصرف'}     value={`$${fmt(t?.totalPayout??0)}`}   color={colors.success} />
            </View>
            {isLoading ? <SectionLoading /> : !payroll ? <EmptySection isAr={isAr} /> : payroll.records.slice(0, 30).map((r, i) => (
              <View key={i} style={[styles.row, { backgroundColor: colors.surface }]}>
                <View style={styles.rowBody}>
                  <Text style={[styles.rowTitle, { color: colors.text }]}>{r.userName}</Text>
                  <Text style={[styles.rowSub, { color: colors.textMuted }]}>{r.month} · {r.totalHours}h + {r.overtimeHours}h OT</Text>
                </View>
                <Text style={[styles.rowAmt, { color: colors.success }]}>${fmt(r.totalSalary)}</Text>
              </View>
            ))}
          </>
        );
      }

      case 'electricity': {
        const s = electricity?.summary;
        return (
          <>
            <DateRangeRow fromDate={fromDate} toDate={toDate} setFromDate={setFromDate} setToDate={setToDate} onLoad={loadElectricity} loading={isLoading} isAr={isAr} />
            <View style={styles.kpiRow}>
              <KpiCard label={'الاستهلاك'}           value={`${fmt(s?.totalConsumption??0,1)}`} color="#d97706" />
              <KpiCard label={'التكلفة'}            value={`$${fmt(s?.totalCost??0)}`}        color={colors.danger} />
              <KpiCard label={'القراءات'}       value={s?.totalReadings??0}                color={colors.info} />
            </View>
            {isLoading ? <SectionLoading /> : !electricity ? <EmptySection isAr={isAr} /> : electricity.days.slice(0, 30).map((d, i) => (
              <View key={i} style={[styles.row, { backgroundColor: colors.surface }]}>
                <View style={styles.rowBody}>
                  <Text style={[styles.rowTitle, { color: colors.text }]}>{d.date}</Text>
                  <Text style={[styles.rowSub, { color: colors.textMuted }]}>{d.shifts.length} {'شفتات'}</Text>
                </View>
                <View style={styles.rowRight}>
                  <Text style={[styles.rowAmt, { color: '#d97706' }]}>{fmt(d.totalConsumption,1)} kWh</Text>
                  <Text style={[styles.rowSub, { color: colors.textMuted }]}>${fmt(d.totalCost)}</Text>
                </View>
              </View>
            ))}
          </>
        );
      }

      case 'expenses': {
        const total = filteredExpenses.reduce((s, e) => s + e.amount, 0);
        const approved = filteredExpenses.filter(e => e.paymentStatus === 'APPROVED').reduce((s, e) => s + e.amount, 0);
        return (
          <>
            <DateRangeRow fromDate={fromDate} toDate={toDate} setFromDate={setFromDate} setToDate={setToDate} loading={isLoading} isAr={isAr} />
            <View style={styles.kpiRow}>
              <KpiCard label={'العدد'}             value={filteredExpenses.length}        color="#ef4444" />
              <KpiCard label={'الإجمالي'}          value={`$${fmt(total)}`}               color={colors.danger} />
              <KpiCard label={'معتمد'}          value={`$${fmt(approved)}`}            color={colors.success} />
            </View>
            {isLoading ? <SectionLoading /> : filteredExpenses.length === 0 ? <EmptySection isAr={isAr} /> : filteredExpenses.slice(0, 30).map((e, i) => (
              <View key={i} style={[styles.row, { backgroundColor: colors.surface }]}>
                <View style={styles.rowBody}>
                  <Text style={[styles.rowTitle, { color: colors.text }]}>{e.category}</Text>
                  <Text style={[styles.rowSub, { color: colors.textMuted }]}>{e.submittedBy?.fullName ?? '—'} · {fmtDate(e.submittedAt)}</Text>
                </View>
                <View style={styles.rowRight}>
                  <Text style={[styles.rowAmt, { color: colors.danger }]}>${fmt(e.amount)}</Text>
                  <Text style={[styles.rowSub, { color: e.paymentStatus === 'APPROVED' ? colors.success : colors.warning }]}>{e.paymentStatus}</Text>
                </View>
              </View>
            ))}
          </>
        );
      }

      case 'maintenance': {
        const total = filteredMaint.reduce((s, r) => s + r.totalCost, 0);
        const totalHrs = filteredMaint.reduce((s, r) => s + r.laborHours, 0);
        return (
          <>
            <DateRangeRow fromDate={fromDate} toDate={toDate} setFromDate={setFromDate} setToDate={setToDate} loading={isLoading} isAr={isAr} />
            <View style={styles.kpiRow}>
              <KpiCard label={'السجلات'}         value={filteredMaint.length}           color="#0891b2" />
              <KpiCard label={'ساعات العمل'}   value={fmt(totalHrs,1)}               color={colors.info} />
              <KpiCard label={'إجمالي التكلفة'} value={`$${fmt(total)}`}            color={colors.danger} />
            </View>
            {isLoading ? <SectionLoading /> : filteredMaint.length === 0 ? <EmptySection isAr={isAr} /> : filteredMaint.slice(0, 30).map((r, i) => (
              <View key={i} style={[styles.row, { backgroundColor: colors.surface }]}>
                <View style={styles.rowBody}>
                  <Text style={[styles.rowTitle, { color: colors.text }]}>{r.maintenance.machine.name}</Text>
                  <Text style={[styles.rowSub, { color: colors.textMuted }]}>{r.maintenance.engineer.fullName} · {fmtDate(r.createdAt)}</Text>
                </View>
                <View style={styles.rowRight}>
                  <Text style={[styles.rowAmt, { color: '#0891b2' }]}>${fmt(r.totalCost)}</Text>
                  <Text style={[styles.rowSub, { color: colors.textMuted }]}>{r.laborHours}h labor</Text>
                </View>
              </View>
            ))}
          </>
        );
      }

      case 'quality': {
        const SEVS = ['ALL','CRITICAL','HIGH','MEDIUM','LOW'];
        const sevColors: Record<string,string> = { CRITICAL: colors.danger, HIGH: colors.warning, MEDIUM: colors.info, LOW: colors.success, ALL: colors.primary };
        return (
          <>
            <View style={styles.chipsRow}>
              {SEVS.map(s => {
                const active = qualSeverity === s;
                return (
                  <TouchableOpacity key={s} style={[styles.chip, active && { backgroundColor: sevColors[s] }]} onPress={() => setQualSeverity(s)}>
                    <Text style={[styles.chipTxt, { color: active ? '#fff' : colors.textMuted }]}>{isAr ? arSeverity(s) : s}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.kpiRow}>
              <KpiCard label={'الإجمالي'}          value={filteredQuality.length}         color="#16a34a" />
              <KpiCard label={'حرجة'}           value={filteredQuality.filter(q=>q.severity==='CRITICAL').length} color={colors.danger} />
              <KpiCard label={'محلولة'}         value={filteredQuality.filter(q=>q.resolvedAt).length} color={colors.success} />
            </View>
            {isLoading ? <SectionLoading /> : filteredQuality.length === 0 ? <EmptySection isAr={isAr} /> : filteredQuality.slice(0, 30).map((r, i) => (
              <View key={i} style={[styles.row, { backgroundColor: colors.surface }]}>
                <View style={[styles.rowIcon, { backgroundColor: `${sevColors[r.severity]}20` }]}>
                  <Ionicons name="shield-checkmark-outline" size={16} color={sevColors[r.severity]} />
                </View>
                <View style={styles.rowBody}>
                  <Text style={[styles.rowTitle, { color: colors.text }]}>{r.machine.name} · {r.issueType}</Text>
                  <Text style={[styles.rowSub, { color: colors.textMuted }]}>{r.engineer.fullName} · {fmtDate(r.createdAt)}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: `${sevColors[r.severity]}20` }]}>
                  <Text style={[styles.badgeTxt, { color: sevColors[r.severity] }]}>{r.severity}</Text>
                </View>
              </View>
            ))}
          </>
        );
      }

      case 'spareParts': {
        const STATUSES = ['ALL','PENDING','RECEIVED'];
        const stColors: Record<string,string> = { ALL: colors.primary, PENDING: colors.warning, RECEIVED: colors.success };
        const totalCost = filteredSpareParts.reduce((s, r) => s + (r.unitPrice ?? 0) * r.quantity, 0);
        return (
          <>
            <View style={styles.chipsRow}>
              {STATUSES.map(s => {
                const active = spareStatus === s;
                return (
                  <TouchableOpacity key={s} style={[styles.chip, active && { backgroundColor: stColors[s] }]} onPress={() => setSpareStatus(s)}>
                    <Text style={[styles.chipTxt, { color: active ? '#fff' : colors.textMuted }]}>{isAr ? arStatus(s) : s}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.kpiRow}>
              <KpiCard label={'الإجمالي'}          value={filteredSpareParts.length}      color="#7c3aed" />
              <KpiCard label={'معلقة'}           value={filteredSpareParts.filter(s=>s.status==='PENDING').length} color={colors.warning} />
              <KpiCard label={'التكلفة'}       value={`$${fmt(totalCost)}`}           color={colors.danger} />
            </View>
            {isLoading ? <SectionLoading /> : filteredSpareParts.length === 0 ? <EmptySection isAr={isAr} /> : filteredSpareParts.slice(0, 30).map((r, i) => (
              <View key={i} style={[styles.row, { backgroundColor: colors.surface }]}>
                <View style={styles.rowBody}>
                  <Text style={[styles.rowTitle, { color: colors.text }]}>{r.partName}</Text>
                  <Text style={[styles.rowSub, { color: colors.textMuted }]}>{r.machine?.name ?? '—'} · {r.engineer.fullName}</Text>
                </View>
                <View style={styles.rowRight}>
                  <View style={[styles.badge, { backgroundColor: `${stColors[r.status]}20` }]}>
                    <Text style={[styles.badgeTxt, { color: stColors[r.status] }]}>{r.status}</Text>
                  </View>
                  {r.unitPrice != null && <Text style={[styles.rowSub, { color: colors.textMuted }]}>${fmt((r.unitPrice??0)*r.quantity)}</Text>}
                </View>
              </View>
            ))}
          </>
        );
      }
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={'التقارير'} subtitle={'تقارير المصنع الشاملة'} showBack />

      {/* Tab bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.tabBar, { borderBottomColor: colors.border }]} contentContainerStyle={styles.tabBarContent}>
        {TABS.map(tab => {
          const active = tab.key === activeTab;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabBtn, active && { backgroundColor: tab.color }]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons name={tab.icon as any} size={13} color={active ? '#fff' : colors.textMuted} />
              <Text style={[styles.tabTxt, { color: active ? '#fff' : colors.textMuted }]}>
                {isAr ? tab.labelAr : tab.labelEn}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Content */}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Section title */}
        <View style={styles.sectionTitle}>
          <View style={[styles.sectionIcon, { backgroundColor: tabCfg.color }]}>
            <Ionicons name={tabCfg.icon as any} size={16} color="#fff" />
          </View>
          <Text style={[styles.sectionTitleTxt, { color: colors.text }]}>
            {isAr ? tabCfg.labelAr : tabCfg.labelEn}
          </Text>
        </View>

        {renderContent()}

        {/* Export PDF */}
        <TouchableOpacity
          style={[styles.pdfBtn, { backgroundColor: exporting ? colors.textMuted : '#ef4444' }]}
          onPress={handleExport}
          disabled={exporting}
        >
          <Ionicons name={exporting ? 'hourglass-outline' : 'document-text'} size={18} color="#fff" />
          <Text style={styles.pdfBtnTxt}>
            {exporting ? ('جارٍ التصدير...') : ('تصدير PDF')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Utility functions ────────────────────────────────────────────────────────
function asArray<T>(res: any, keys: string[]): T[] {
  if (Array.isArray(res)) return res as T[];
  for (const k of keys) { if (Array.isArray(res?.[k])) return res[k] as T[]; }
  return [];
}

function filterByDate<T extends Record<string, any>>(arr: T[], field: string, from: string, to: string): T[] {
  if (!from && !to) return arr;
  return arr.filter(r => {
    const t = new Date(r[field]).getTime();
    if (isNaN(t)) return false;
    if (from && t < new Date(from).getTime()) return false;
    if (to   && t > new Date(to + 'T23:59:59').getTime()) return false;
    return true;
  });
}

function groupBy<T>(arr: T[], getId: (r: T) => number, getData: (r: T) => { name: string; total: number }): { id: number; name: string; count: number; total: number }[] {
  const map = new Map<number, { id: number; name: string; count: number; total: number }>();
  for (const r of arr) {
    const id = getId(r);
    const { name, total } = getData(r);
    const cur = map.get(id) ?? { id, name, count: 0, total: 0 };
    cur.count++;
    cur.total += total;
    map.set(id, cur);
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

function arSeverity(s: string) {
  return { ALL: 'الكل', CRITICAL: 'حرجة', HIGH: 'عالية', MEDIUM: 'متوسطة', LOW: 'منخفضة' }[s] ?? s;
}
function arStatus(s: string) {
  return { ALL: 'الكل', PENDING: 'معلقة', RECEIVED: 'مستلمة' }[s] ?? s;
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:            { flex: 1 },
  tabBar:          { borderBottomWidth: 1, maxHeight: 52 },
  tabBarContent:   { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, gap: spacing.xs, alignItems: 'center' },
  tabBtn:          { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, backgroundColor: '#e5e7eb' },
  tabTxt:          { fontSize: 12, fontWeight: '600' },
  content:         { padding: spacing.md, paddingBottom: 40 },
  sectionTitle:    { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  sectionIcon:     { width: 30, height: 30, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  sectionTitleTxt: { ...typography.h3 },
  kpiRow:          { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  kpiCard:         { flex: 1, borderRadius: radius.md, padding: spacing.sm, alignItems: 'center', ...shadow.sm },
  kpiVal:          { fontSize: 18, fontWeight: '800' },
  kpiLbl:          { fontSize: 10, fontWeight: '600', marginTop: 2, textAlign: 'center' },
  filterWrap:      { marginBottom: spacing.md, gap: spacing.sm },
  filterRow:       { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  filterLabel:     { fontSize: 11, fontWeight: '600', marginBottom: 3 },
  dateGroup:       { flex: 1 },
  dateInput:       { borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 7, fontSize: 13 },
  loadBtn:         { paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', minWidth: 60 },
  loadBtnTxt:      { color: '#fff', fontWeight: '700', fontSize: 13 },
  chipsRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm },
  chip:            { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, backgroundColor: '#e5e7eb' },
  chipTxt:         { fontSize: 11, fontWeight: '700' },
  row:             { flexDirection: 'row', alignItems: 'center', borderRadius: radius.md, padding: spacing.sm, marginBottom: 6, gap: spacing.sm, ...shadow.sm },
  rowIcon:         { width: 34, height: 34, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rowBody:         { flex: 1 },
  rowTitle:        { ...typography.bodySmall, fontWeight: '600' },
  rowSub:          { fontSize: 11, marginTop: 1 },
  rowAmt:          { fontSize: 14, fontWeight: '800' },
  rowRight:        { alignItems: 'flex-end', gap: 2 },
  badge:           { paddingHorizontal: 7, paddingVertical: 3, borderRadius: radius.full },
  badgeTxt:        { fontSize: 9, fontWeight: '800' },
  sectionLoading:  { paddingVertical: 40, alignItems: 'center' },
  emptySection:    { alignItems: 'center', paddingVertical: 40, gap: spacing.sm },
  emptyTxt:        { ...typography.bodySmall },
  pdfBtn:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: spacing.md, borderRadius: radius.lg, marginTop: spacing.lg },
  pdfBtnTxt:       { color: '#fff', fontWeight: '700', fontSize: 15 },
});
