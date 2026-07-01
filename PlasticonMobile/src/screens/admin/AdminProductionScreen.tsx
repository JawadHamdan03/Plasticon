import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
import { useLocale } from '../../context/LocaleContext';
  ActivityIndicator, Alert, FlatList, RefreshControl,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface Machine { id: number; name: string; type: string | null; }
interface Shift { id: number; name: string; startTime?: string | null; endTime?: string | null; }

interface ProductionRecord {
  id: number;
  machineId?: number | null;
  machine?: { id: number; name: string; type?: string | null } | null;
  shift?: { id: number; name: string } | null;
  cartonsCount?: number | null;
  totalPieces?: number | null;
  createdAt: string;
  user?: { id: number; fullName: string } | null;
  documentPath?: string | null;
}

interface AdminOverview {
  totals: { totalRecords: number; totalCartons: number; totalPieces: number };
  byUser?: Array<{ userId: number; fullName: string; recordsCount: number; cartonsCount: number; totalPieces: number }>;
  byShift?: Array<{ shiftId: number | null; shiftName: string; recordsCount: number; cartonsCount: number; totalPieces: number }>;
  byShiftProduct?: Array<{ date: string; shiftId: number | null; shiftName: string; capsCartons: number; preformCartons: number; totalCartons: number; totalPieces: number }>;
  dailyByProduct?: Array<{ date: string; capsCartons: number; preformCartons: number; totalCartons: number; totalPieces: number }>;
  recentRecords?: ProductionRecord[];
}

interface ElectricityReading {
  id: number;
  date?: string;
  readingDate?: string;
  shift?: { id: number; name: string } | null;
  startReading: number;
  endReading: number;
  consumption?: number | null;
  kwhPriceSnap?: number | null;
  shiftCost?: number | null;
  notes?: string | null;
  recordedBy?: { fullName: string } | null;
}

type AdminTab = 'overview' | 'daily' | 'shifts' | 'records' | 'workers' | 'electricity';

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const fmt = (n: number) => n.toLocaleString();

function isPreformMachine(type?: string | null) {
  if (!type) return false;
  const t = type.toUpperCase();
  return t.includes('PREFORM') || t.includes('PET');
}

function minutesInDay(timeStr: string): number {
  const d = new Date(timeStr);
  if (!isNaN(d.getTime())) return d.getUTCHours() * 60 + d.getUTCMinutes();
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function getCurrentShift(shifts: Shift[], nowMinutes: number): Shift | null {
  for (const s of shifts) {
    if (!s.startTime || !s.endTime) continue;
    const start = minutesInDay(s.startTime);
    const end = minutesInDay(s.endTime);
    if (isNaN(start) || isNaN(end)) continue;
    if (end <= start) {
      if (nowMinutes >= start || nowMinutes < end) return s;
    } else {
      if (nowMinutes >= start && nowMinutes < end) return s;
    }
  }
  return null;
}

/* ─── KPI Card ───────────────────────────────────────────────────────────── */
function KpiCard({ icon, label, value, gradient, colors }: {
  icon: string; label: string; value: string | number; gradient: string[]; colors: any;
}) {
  return (
    <View style={[styles.kpiCard, { backgroundColor: gradient[0] }]}>
      <Text style={styles.kpiIcon}>{icon}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue}>{String(value)}</Text>
    </View>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */
export function AdminProductionScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Data
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [allRecords, setAllRecords] = useState<ProductionRecord[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [filterMachineId, setFilterMachineId] = useState<number | null>(null);

  // Date filters (shared across overview/daily/shifts/records/workers)
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Electricity
  const [elLoading, setElLoading] = useState(false);
  const [kwhPrice, setKwhPrice] = useState(0);
  const [kwhInput, setKwhInput] = useState('');
  const [savingKwh, setSavingKwh] = useState(false);
  const [elReadings, setElReadings] = useState<ElectricityReading[]>([]);
  const [elFromDate, setElFromDate] = useState('');
  const [elToDate, setElToDate] = useState('');
  const [elShiftId, setElShiftId] = useState<string>('');

  // Current shift
  const [nowMinutes, setNowMinutes] = useState(() => {
    const d = new Date();
    return d.getUTCHours() * 60 + d.getUTCMinutes();
  });

  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date();
      setNowMinutes(d.getUTCHours() * 60 + d.getUTCMinutes());
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  const currentShift = useMemo(() => getCurrentShift(shifts, nowMinutes), [shifts, nowMinutes]);

  /* ── Load production data ── */
  const loadProduction = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const qs: Record<string, string> = {};
      if (fromDate) qs.fromDate = fromDate;
      if (toDate) qs.toDate = toDate;
      const queryStr = Object.keys(qs).length
        ? '?' + new URLSearchParams(qs).toString()
        : '';

      const [machRes, shiftRes, allRes, ovRes] = await Promise.all([
        api.get<any>('/machines'),
        api.get<any>('/shifts'),
        api.get<any>('/production/all'),
        api.get<AdminOverview>(`/production/admin/overview${queryStr}`),
      ]);

      if (machRes) setMachines(Array.isArray(machRes) ? machRes : (machRes.items ?? machRes.data ?? []));
      if (shiftRes) setShifts(Array.isArray(shiftRes) ? shiftRes : (shiftRes.data ?? []));
      if (allRes) setAllRecords(Array.isArray(allRes) ? allRes : []);
      if (ovRes) setOverview(ovRes);
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  }, [fromDate, toDate]);

  useEffect(() => { void loadProduction(); }, [loadProduction]);

  /* ── Load electricity ── */
  const loadElectricity = useCallback(async () => {
    setElLoading(true);
    try {
      const qs: Record<string, string> = {};
      if (elFromDate) qs.fromDate = elFromDate;
      if (elToDate) qs.toDate = elToDate;
      if (elShiftId) qs.shiftId = elShiftId;
      const queryStr = Object.keys(qs).length
        ? '?' + new URLSearchParams(qs).toString()
        : '';

      const [prRes, rdRes] = await Promise.all([
        api.get<any>('/electricity/kwh-price'),
        api.get<any>(`/electricity/readings${queryStr}`),
      ]);

      if (prRes != null) {
        const p = typeof prRes === 'number' ? prRes : (prRes?.price ?? 0);
        setKwhPrice(p);
        setKwhInput(p > 0 ? String(p) : '');
      }
      if (rdRes) setElReadings(Array.isArray(rdRes) ? rdRes : []);
    } catch { /* silent */ }
    finally { setElLoading(false); }
  }, [elFromDate, elToDate, elShiftId]);

  useEffect(() => {
    if (activeTab === 'electricity') void loadElectricity();
  }, [activeTab, loadElectricity]);

  /* ── Save kWh price ── */
  const handleSaveKwh = async () => {
    const price = parseFloat(kwhInput);
    if (!price || price <= 0) {
      Alert.alert('خطأ', 'أدخل سعرًا صحيحًا');
      return;
    }
    setSavingKwh(true);
    try {
      await api.post('/electricity/kwh-price', { price });
      Alert.alert('تم', 'تم حفظ السعر بنجاح');
      void loadElectricity();
    } catch {
      Alert.alert('خطأ', 'فشل الحفظ');
    } finally { setSavingKwh(false); }
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (activeTab === 'electricity') {
      void loadElectricity().then(() => setRefreshing(false));
    } else {
      void loadProduction(true);
    }
  };

  /* ── Derived data ── */
  const dailyData = overview?.dailyByProduct ?? [];
  const shiftData = overview?.byShiftProduct ?? [];
  const byShift = overview?.byShift ?? [];
  const byUser = overview?.byUser ?? [];
  const filteredRecords = useMemo(() => {
    const recs = overview?.recentRecords ?? allRecords;
    return filterMachineId ? recs.filter((r) => r.machineId === filterMachineId) : recs;
  }, [overview, allRecords, filterMachineId]);

  const capsTotal = dailyData.reduce((s, d) => s + d.capsCartons, 0);
  const preformTotal = dailyData.reduce((s, d) => s + d.preformCartons, 0);
  const elTotalKwh = elReadings.reduce((s, r) => s + (r.consumption ?? 0), 0);
  const elTotalCost = elReadings.reduce((s, r) => s + (r.shiftCost ?? 0), 0);

  const TABS: { key: AdminTab; labelEn: string; labelAr: string }[] = [
    { key: 'overview',     labelEn: 'Overview',     labelAr: 'نظرة عامة' },
    { key: 'daily',        labelEn: 'Daily',         labelAr: 'يومي' },
    { key: 'shifts',       labelEn: 'Shifts',        labelAr: 'الشفتات' },
    { key: 'records',      labelEn: 'Records',       labelAr: 'السجلات' },
    { key: 'workers',      labelEn: 'Workers',       labelAr: 'العمال' },
    { key: 'electricity',  labelEn: 'Electricity',   labelAr: 'الكهرباء' },
  ];

  /* ─── Overview tab ──────────────────────────────────────────────────────── */
  const renderOverview = () => (
    <View style={styles.tabContent}>
      <View style={styles.kpiGrid}>
        <KpiCard icon="📋" label={'إجمالي السجلات'} value={overview?.totals.totalRecords ?? 0} gradient={['#3b82f6', '#1d4ed8']} colors={colors} />
        <KpiCard icon="📦" label={'إجمالي الكراتين'} value={fmt(overview?.totals.totalCartons ?? 0)} gradient={['#10b981', '#059669']} colors={colors} />
        <KpiCard icon="🔢" label={'إجمالي القطع'} value={fmt(overview?.totals.totalPieces ?? 0)} gradient={['#f97316', '#ea580c']} colors={colors} />
        <KpiCard icon="🧢" label={'كراتين الكابس'} value={fmt(capsTotal)} gradient={['#06b6d4', '#0284c7']} colors={colors} />
        <KpiCard icon="🏭" label={'صناديق البريفورم'} value={fmt(preformTotal)} gradient={['#8b5cf6', '#7c3aed']} colors={colors} />
      </View>

      {byShift.length > 0 && (
        <View style={[styles.tableCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.tableTitle, { color: colors.text }]}>
            {'ملخص حسب الشفت'}
          </Text>
          <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.th, { flex: 2, color: colors.textMuted }]}>{'الشفت'}</Text>
            <Text style={[styles.th, { color: colors.textMuted }]}>{'السجلات'}</Text>
            <Text style={[styles.th, { color: colors.textMuted }]}>{'كراتين'}</Text>
            <Text style={[styles.th, { color: colors.textMuted }]}>{'قطع'}</Text>
          </View>
          {byShift.map((row) => (
            <View key={row.shiftId ?? 'none'} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.td, { flex: 2, fontWeight: '600', color: colors.text }]}>{row.shiftName}</Text>
              <Text style={[styles.td, { color: colors.text }]}>{row.recordsCount}</Text>
              <Text style={[styles.td, { color: colors.text }]}>{fmt(row.cartonsCount)}</Text>
              <Text style={[styles.td, { fontWeight: '700', color: colors.primary }]}>{fmt(row.totalPieces)}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  /* ─── Daily tab ─────────────────────────────────────────────────────────── */
  const renderDaily = () => (
    <View style={styles.tabContent}>
      {dailyData.length === 0 ? (
        <View style={[styles.emptyBox, { backgroundColor: colors.surface }]}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>{'لا توجد بيانات'}</Text>
        </View>
      ) : (
        <View style={[styles.tableCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.tableTitle, { color: colors.text }]}>{'التقرير اليومي'}</Text>
          <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.th, { flex: 2, color: colors.textMuted }]}>{'التاريخ'}</Text>
            <Text style={[styles.th, { color: colors.textMuted }]}>{'كابس'}</Text>
            <Text style={[styles.th, { color: colors.textMuted }]}>{'بريفورم'}</Text>
            <Text style={[styles.th, { color: colors.textMuted }]}>{'قطع'}</Text>
          </View>
          {dailyData.map((row) => (
            <View key={row.date} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.td, { flex: 2, fontWeight: '700', color: colors.text }]}>{row.date}</Text>
              <Text style={[styles.td, { color: colors.text }]}>{fmt(row.capsCartons)}</Text>
              <Text style={[styles.td, { color: colors.text }]}>{fmt(row.preformCartons)}</Text>
              <Text style={[styles.td, { fontWeight: '700', color: colors.primary }]}>{fmt(row.totalPieces)}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  /* ─── Shifts tab ─────────────────────────────────────────────────────────── */
  const renderShifts = () => (
    <View style={styles.tabContent}>
      {shiftData.length === 0 ? (
        <View style={[styles.emptyBox, { backgroundColor: colors.surface }]}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>{'لا توجد بيانات'}</Text>
        </View>
      ) : (
        <View style={[styles.tableCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.tableTitle, { color: colors.text }]}>{'إنتاج الشفتات يومياً'}</Text>
          <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.th, { flex: 2, color: colors.textMuted }]}>{'التاريخ'}</Text>
            <Text style={[styles.th, { flex: 1.5, color: colors.textMuted }]}>{'الشفت'}</Text>
            <Text style={[styles.th, { color: colors.textMuted }]}>{'كابس'}</Text>
            <Text style={[styles.th, { color: colors.textMuted }]}>{'بريفورم'}</Text>
            <Text style={[styles.th, { color: colors.textMuted }]}>{'قطع'}</Text>
          </View>
          {shiftData.map((row) => (
            <View key={`${row.date}-${row.shiftId}`} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.td, { flex: 2, fontWeight: '600', color: colors.text }]}>{row.date}</Text>
              <Text style={[styles.td, { flex: 1.5, color: colors.text }]}>{row.shiftName}</Text>
              <Text style={[styles.td, { color: colors.text }]}>{fmt(row.capsCartons)}</Text>
              <Text style={[styles.td, { color: colors.text }]}>{fmt(row.preformCartons)}</Text>
              <Text style={[styles.td, { fontWeight: '700', color: colors.primary }]}>{fmt(row.totalPieces)}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  /* ─── Records tab ────────────────────────────────────────────────────────── */
  const renderRecordItem = ({ item }: { item: ProductionRecord }) => {
    const isPre = isPreformMachine(item.machine?.type);
    return (
      <View style={[styles.recordCard, { backgroundColor: colors.surface }]}>
        <View style={styles.recordCardHeader}>
          <View style={[styles.machineBadge, { backgroundColor: isPre ? 'rgba(59,130,246,.12)' : 'rgba(249,115,22,.12)' }]}>
            <Text style={[styles.machineBadgeText, { color: isPre ? '#3b82f6' : '#f97316' }]}>
              {isPre ? 'PRE' : 'CAPS'}
            </Text>
          </View>
          <Text style={[styles.recordMachine, { color: colors.text }]}>{item.machine?.name ?? '—'}</Text>
          <Text style={[styles.recordDate, { color: colors.textMuted }]}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.recordCardBody}>
          <View style={styles.recordStat}>
            <Ionicons name="person-outline" size={13} color={colors.textMuted} />
            <Text style={[styles.recordStatText, { color: colors.text }]}>{item.user?.fullName ?? '—'}</Text>
          </View>
          <View style={styles.recordStat}>
            <Ionicons name="time-outline" size={13} color={colors.textMuted} />
            <Text style={[styles.recordStatText, { color: colors.text }]}>{item.shift?.name ?? '—'}</Text>
          </View>
          <View style={styles.recordStat}>
            <Ionicons name="cube-outline" size={13} color={colors.textMuted} />
            <Text style={[styles.recordStatText, { color: colors.text }]}>{item.cartonsCount ?? 0} {'كرتون'}</Text>
          </View>
          <View style={styles.recordStat}>
            <Ionicons name="layers-outline" size={13} color={colors.textMuted} />
            <Text style={[styles.recordStatText, { color: colors.primary, fontWeight: '700' }]}>{fmt(item.totalPieces ?? 0)} {'قطعة'}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderRecords = () => (
    <View style={styles.tabContent}>
      {/* Machine filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow} contentContainerStyle={styles.chipsContent}>
        <TouchableOpacity
          style={[styles.chip, filterMachineId === null && { backgroundColor: colors.primary }]}
          onPress={() => setFilterMachineId(null)}
        >
          <Text style={[styles.chipText, { color: filterMachineId === null ? '#fff' : colors.textMuted }]}>
            {'الكل'}
          </Text>
        </TouchableOpacity>
        {machines.map((m) => (
          <TouchableOpacity
            key={m.id}
            style={[styles.chip, filterMachineId === m.id && { backgroundColor: colors.primary }]}
            onPress={() => setFilterMachineId(m.id)}
          >
            <Text style={[styles.chipText, { color: filterMachineId === m.id ? '#fff' : colors.textMuted }]}>
              {m.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={[styles.recordCount, { color: colors.textMuted }]}>
        {filteredRecords.length} {'سجل'}
      </Text>

      {filteredRecords.length === 0 ? (
        <View style={[styles.emptyBox, { backgroundColor: colors.surface }]}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>{'لا توجد سجلات'}</Text>
        </View>
      ) : (
        filteredRecords.slice(0, 50).map((r) => (
          <View key={r.id}>{renderRecordItem({ item: r })}</View>
        ))
      )}
    </View>
  );

  /* ─── Workers tab ────────────────────────────────────────────────────────── */
  const renderWorkers = () => (
    <View style={styles.tabContent}>
      {byUser.length === 0 ? (
        <View style={[styles.emptyBox, { backgroundColor: colors.surface }]}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>{'لا توجد بيانات'}</Text>
        </View>
      ) : (
        <View style={[styles.tableCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.tableTitle, { color: colors.text }]}>{'الإنتاج حسب العامل'}</Text>
          <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.th, { width: 28, color: colors.textMuted }]}>#</Text>
            <Text style={[styles.th, { flex: 2, color: colors.textMuted }]}>{'الاسم'}</Text>
            <Text style={[styles.th, { color: colors.textMuted }]}>{'سجلات'}</Text>
            <Text style={[styles.th, { color: colors.textMuted }]}>{'كراتين'}</Text>
            <Text style={[styles.th, { color: colors.textMuted }]}>{'قطع'}</Text>
          </View>
          {byUser.map((w, i) => (
            <View key={w.userId} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.td, { width: 28, color: colors.textMuted, fontWeight: '600' }]}>{i + 1}</Text>
              <Text style={[styles.td, { flex: 2, fontWeight: '700', color: colors.text }]}>{w.fullName}</Text>
              <Text style={[styles.td, { color: colors.text }]}>{w.recordsCount}</Text>
              <Text style={[styles.td, { color: colors.text }]}>{fmt(w.cartonsCount)}</Text>
              <Text style={[styles.td, { fontWeight: '800', color: colors.primary }]}>{fmt(w.totalPieces)}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  /* ─── Electricity tab ────────────────────────────────────────────────────── */
  const renderElectricity = () => (
    <View style={styles.tabContent}>
      {/* kWh price card */}
      <View style={[styles.kwhCard, { backgroundColor: colors.surface }]}>
        <View style={styles.kwhCardLeft}>
          <View style={[styles.kwhIconWrap, { backgroundColor: 'rgba(249,115,22,.12)' }]}>
            <Ionicons name="flash" size={22} color={colors.warning} />
          </View>
          <View>
            <Text style={[styles.kwhLabel, { color: colors.textMuted }]}>{'سعر الكيلوواط'}</Text>
            <Text style={[styles.kwhValue, { color: colors.text }]}>
              {kwhPrice > 0 ? `${kwhPrice.toFixed(4)} ILS` : '—'}
            </Text>
          </View>
        </View>
        <View style={styles.kwhCardRight}>
          <TextInput
            style={[styles.kwhInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
            value={kwhInput}
            onChangeText={setKwhInput}
            placeholder="0.0000"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
          />
          <TouchableOpacity
            style={[styles.kwhSaveBtn, { opacity: savingKwh ? 0.6 : 1 }]}
            onPress={handleSaveKwh}
            disabled={savingKwh}
          >
            {savingKwh
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.kwhSaveBtnText}>{'حفظ'}</Text>}
          </TouchableOpacity>
        </View>
      </View>

      {/* Electricity filter */}
      <View style={[styles.filterCard, { backgroundColor: colors.surface }]}>
        <Text style={[styles.filterLabel, { color: colors.textMuted }]}>{'تصفية'}</Text>
        <View style={styles.filterRow}>
          <View style={styles.filterField}>
            <Text style={[styles.filterFieldLabel, { color: colors.textMuted }]}>{'من'}</Text>
            <TextInput
              style={[styles.filterInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={elFromDate} onChangeText={setElFromDate}
              placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted}
            />
          </View>
          <View style={styles.filterField}>
            <Text style={[styles.filterFieldLabel, { color: colors.textMuted }]}>{'إلى'}</Text>
            <TextInput
              style={[styles.filterInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={elToDate} onChangeText={setElToDate}
              placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted}
            />
          </View>
          <View style={styles.filterField}>
            <Text style={[styles.filterFieldLabel, { color: colors.textMuted }]}>{'الشفت'}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 36 }}>
              <View style={{ flexDirection: 'row', gap: 4 }}>
                <TouchableOpacity
                  style={[styles.smallChip, elShiftId === '' && { backgroundColor: colors.primary }]}
                  onPress={() => setElShiftId('')}
                >
                  <Text style={[styles.smallChipText, { color: elShiftId === '' ? '#fff' : colors.textMuted }]}>
                    {'الكل'}
                  </Text>
                </TouchableOpacity>
                {shifts.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.smallChip, elShiftId === String(s.id) && { backgroundColor: colors.primary }]}
                    onPress={() => setElShiftId(String(s.id))}
                  >
                    <Text style={[styles.smallChipText, { color: elShiftId === String(s.id) ? '#fff' : colors.textMuted }]}>
                      {s.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
        <View style={styles.filterActions}>
          <TouchableOpacity style={[styles.applyBtn, { backgroundColor: colors.primary }]} onPress={() => void loadElectricity()}>
            <Text style={styles.applyBtnText}>{'تطبيق'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.clearBtn, { borderColor: colors.border }]}
            onPress={() => { setElFromDate(''); setElToDate(''); setElShiftId(''); }}
          >
            <Text style={[styles.clearBtnText, { color: colors.textMuted }]}>{'مسح'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Totals */}
      {elReadings.length > 0 && (
        <View style={[styles.elTotals, { backgroundColor: 'rgba(249,115,22,.08)', borderColor: 'rgba(249,115,22,.25)' }]}>
          <Text style={[styles.elTotalsText, { color: '#f97316' }]}>
            ⚡ {'الإجمالي:'} {elTotalKwh.toFixed(2)} kWh — {'التكلفة:'} {elTotalCost.toFixed(2)} ILS
          </Text>
        </View>
      )}

      {/* Readings list */}
      {elLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
      ) : elReadings.length === 0 ? (
        <View style={[styles.emptyBox, { backgroundColor: colors.surface }]}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>{'لا توجد قراءات'}</Text>
        </View>
      ) : (
        elReadings.map((r) => {
          const dateStr = r.date ?? r.readingDate;
          return (
            <View key={r.id} style={[styles.elCard, { backgroundColor: colors.surface }]}>
              <View style={styles.elCardHeader}>
                <View style={[styles.elIconWrap, { backgroundColor: 'rgba(249,115,22,.12)' }]}>
                  <Ionicons name="flash" size={18} color={colors.warning} />
                </View>
                <View style={{ flex: 1 }}>
                  {dateStr && <Text style={[styles.elCardDate, { color: colors.text }]}>{new Date(dateStr).toLocaleDateString()}</Text>}
                  {r.shift?.name && <Text style={[styles.elCardShift, { color: colors.textMuted }]}>{r.shift.name}</Text>}
                </View>
                {r.shiftCost != null && (
                  <Text style={[styles.elCardCost, { color: colors.warning }]}>
                    {r.shiftCost.toFixed(2)} ILS
                  </Text>
                )}
              </View>
              <View style={[styles.elCardStats, { borderTopColor: colors.border }]}>
                <View style={styles.elStat}>
                  <Text style={[styles.elStatLabel, { color: colors.textMuted }]}>{'بداية'}</Text>
                  <Text style={[styles.elStatValue, { color: colors.text }]}>{r.startReading}</Text>
                </View>
                <Ionicons name="arrow-forward" size={12} color={colors.textMuted} />
                <View style={styles.elStat}>
                  <Text style={[styles.elStatLabel, { color: colors.textMuted }]}>{'نهاية'}</Text>
                  <Text style={[styles.elStatValue, { color: colors.text }]}>{r.endReading}</Text>
                </View>
                <View style={[styles.elStat, { marginStart: 'auto' }]}>
                  <Text style={[styles.elStatLabel, { color: colors.textMuted }]}>{'استهلاك'}</Text>
                  <Text style={[styles.elStatValue, { color: colors.primary, fontWeight: '700' }]}>
                    {(r.consumption ?? 0).toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>
          );
        })
      )}
    </View>
  );

  /* ─── Main render ────────────────────────────────────────────────────────── */
  const renderActiveTab = () => {
    switch (activeTab) {
      case 'overview':     return renderOverview();
      case 'daily':        return renderDaily();
      case 'shifts':       return renderShifts();
      case 'records':      return renderRecords();
      case 'workers':      return renderWorkers();
      case 'electricity':  return renderElectricity();
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={'الإنتاج'} subtitle={'سجلات الإنتاج والتحليلات'} />

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Active shift banner */}
        {shifts.length > 0 && (
          <View style={[styles.shiftBanner, {
            backgroundColor: currentShift ? 'rgba(16,185,129,.08)' : colors.surface,
            borderColor: currentShift ? 'rgba(16,185,129,.35)' : colors.border,
          }]}>
            <View style={[styles.shiftDot, {
              backgroundColor: currentShift ? '#10b981' : colors.textMuted,
            }]} />
            <View style={{ flex: 1 }}>
              {currentShift ? (
                <>
                  <Text style={styles.shiftLabel}>{'الشفت الحالي'}</Text>
                  <Text style={[styles.shiftName, { color: colors.text }]}>{currentShift.name}</Text>
                </>
              ) : (
                <Text style={[styles.noShift, { color: colors.textMuted }]}>{'لا يوجد شفت نشط'}</Text>
              )}
            </View>
          </View>
        )}

        {/* Date range filter (for production tabs) */}
        {activeTab !== 'electricity' && (
          <View style={[styles.filterCard, { backgroundColor: colors.surface }]}>
            <View style={styles.filterRow}>
              <View style={styles.filterField}>
                <Text style={[styles.filterFieldLabel, { color: colors.textMuted }]}>{'من تاريخ'}</Text>
                <TextInput
                  style={[styles.filterInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                  value={fromDate} onChangeText={setFromDate}
                  placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted}
                />
              </View>
              <View style={styles.filterField}>
                <Text style={[styles.filterFieldLabel, { color: colors.textMuted }]}>{'إلى تاريخ'}</Text>
                <TextInput
                  style={[styles.filterInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                  value={toDate} onChangeText={setToDate}
                  placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>
            <View style={styles.filterActions}>
              <TouchableOpacity style={[styles.applyBtn, { backgroundColor: colors.primary }]} onPress={() => void loadProduction()}>
                <Text style={styles.applyBtnText}>{'تطبيق'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.clearBtn, { borderColor: colors.border }]}
                onPress={() => { setFromDate(''); setToDate(''); }}
              >
                <Text style={[styles.clearBtnText, { color: colors.textMuted }]}>{'مسح'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Tab bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.tabBar, { backgroundColor: colors.surface, borderColor: colors.border }]}
          contentContainerStyle={styles.tabBarContent}
        >
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tabBtn,
                activeTab === tab.key && { backgroundColor: colors.primary },
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[
                styles.tabBtnText,
                { color: activeTab === tab.key ? '#fff' : colors.textMuted },
              ]}>
                {isAr ? tab.labelAr : tab.labelEn}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Loading spinner */}
        {loading && (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
        )}

        {/* Active tab content */}
        {!loading && renderActiveTab()}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  safe: { flex: 1 },

  shiftBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: spacing.md, marginTop: spacing.sm,
    padding: spacing.sm, borderRadius: radius.lg, borderWidth: 1.5,
  },
  shiftDot: { width: 10, height: 10, borderRadius: 5 },
  shiftLabel: { fontSize: 10, fontWeight: '700', color: '#10b981', textTransform: 'uppercase', letterSpacing: 0.5 },
  shiftName: { ...typography.h4, marginTop: 1 },
  noShift: { ...typography.bodySmall },

  filterCard: {
    marginHorizontal: spacing.md, marginTop: spacing.sm,
    padding: spacing.md, borderRadius: radius.lg, ...shadow.sm,
  },
  filterLabel: { ...typography.sectionLabel, marginBottom: 6 },
  filterRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  filterField: { flex: 1, minWidth: 120 },
  filterFieldLabel: { ...typography.caption, marginBottom: 3 },
  filterInput: {
    borderWidth: 1, borderRadius: radius.md,
    paddingHorizontal: spacing.sm, paddingVertical: 6,
    fontSize: 13,
  },
  filterActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  applyBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: radius.md },
  applyBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  clearBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: radius.md, borderWidth: 1 },
  clearBtnText: { fontWeight: '600', fontSize: 13 },

  tabBar: {
    marginHorizontal: spacing.md, marginTop: spacing.sm,
    borderRadius: radius.lg, borderWidth: 1,
  },
  tabBarContent: { padding: 5, gap: 4 },
  tabBtn: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: radius.md },
  tabBtnText: { fontWeight: '700', fontSize: 12 },

  tabContent: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },

  // KPI cards
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  kpiCard: {
    flex: 1, minWidth: '45%', borderRadius: radius.xl,
    padding: spacing.md, gap: 3, ...shadow.sm,
  },
  kpiIcon: { fontSize: 22 },
  kpiLabel: { fontSize: 11, color: 'rgba(255,255,255,.85)', fontWeight: '500' },
  kpiValue: { fontSize: 22, fontWeight: '800', color: '#fff', lineHeight: 26 },

  // Tables
  tableCard: { borderRadius: radius.xl, overflow: 'hidden', marginBottom: spacing.md, ...shadow.sm },
  tableTitle: { ...typography.h4, padding: spacing.sm, paddingHorizontal: spacing.md },
  tableHeader: { flexDirection: 'row', paddingHorizontal: spacing.sm, paddingVertical: 7, borderBottomWidth: 1 },
  tableRow: { flexDirection: 'row', paddingHorizontal: spacing.sm, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  th: { flex: 1, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  td: { flex: 1, fontSize: 12 },

  // Records
  chipsRow: { marginBottom: 8 },
  chipsContent: { flexDirection: 'row', gap: 6, paddingBottom: 4 },
  chip: {
    paddingVertical: 5, paddingHorizontal: 12, borderRadius: 99,
    backgroundColor: 'rgba(128,128,128,.1)',
  },
  chipText: { fontSize: 12, fontWeight: '600' },
  recordCount: { ...typography.caption, marginBottom: 8 },
  recordCard: { borderRadius: radius.lg, padding: spacing.sm, marginBottom: spacing.sm, ...shadow.sm },
  recordCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  machineBadge: { paddingVertical: 2, paddingHorizontal: 6, borderRadius: 4 },
  machineBadgeText: { fontSize: 10, fontWeight: '800' },
  recordMachine: { ...typography.h4, flex: 1 },
  recordDate: { ...typography.caption },
  recordCardBody: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  recordStat: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  recordStatText: { fontSize: 12 },

  emptyBox: { borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center', marginBottom: spacing.md },
  emptyText: { ...typography.body },

  // kWh card
  kwhCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: radius.xl, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm,
  },
  kwhCardLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  kwhCardRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  kwhIconWrap: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  kwhLabel: { ...typography.caption },
  kwhValue: { ...typography.h4 },
  kwhInput: {
    width: 90, borderWidth: 1, borderRadius: radius.md,
    paddingHorizontal: 8, paddingVertical: 6, fontSize: 13, textAlign: 'center',
  },
  kwhSaveBtn: { backgroundColor: '#f97316', paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.md },
  kwhSaveBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  elTotals: {
    borderRadius: radius.md, padding: spacing.sm,
    borderWidth: 1, marginBottom: spacing.sm, alignItems: 'center',
  },
  elTotalsText: { fontWeight: '700', fontSize: 13 },

  elCard: { borderRadius: radius.lg, padding: spacing.sm, marginBottom: spacing.sm, ...shadow.sm },
  elCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  elIconWrap: { width: 34, height: 34, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  elCardDate: { ...typography.bodySmall, fontWeight: '600' },
  elCardShift: { ...typography.caption },
  elCardCost: { fontWeight: '700', fontSize: 14 },
  elCardStats: { flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 6 },
  elStat: { alignItems: 'center' },
  elStatLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  elStatValue: { fontSize: 14, fontWeight: '600', marginTop: 1 },

  smallChip: {
    paddingVertical: 4, paddingHorizontal: 10, borderRadius: 99,
    backgroundColor: 'rgba(128,128,128,.1)',
  },
  smallChipText: { fontSize: 11, fontWeight: '600' },
});
