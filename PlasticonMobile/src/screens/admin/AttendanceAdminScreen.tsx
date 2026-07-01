import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
import { useLocale } from '../../context/LocaleContext';
  ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal,
  Platform, Pressable, RefreshControl, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';

// ─── Types ────────────────────────────────────────────────────────────────────
interface AttRecord {
  id:               number;
  userId:           number;
  checkIn:          string;
  checkOut?:        string | null;
  lateMinutes?:     number | null;
  overtimeMinutes?: number | null;
  notes?:           string | null;
  user?:            { fullName: string; username: string; role: string };
  shift?:           { id: number; name: string } | null;
}

interface AdminUser {
  id: number; fullName: string; username: string; role: string;
  isActive: boolean; deletedAt?: string | null;
}

interface AttSettings { lateGraceMinutes: number; overtimeGraceMinutes: number; }

type Tab       = 'monthly' | 'settings';
type DayStatus = 'present' | 'late' | 'open' | 'absent' | 'weekend' | 'future' | 'friday_ot';

interface EditForm { checkIn: string; checkOut: string; notes: string; }
type ModalMode = 'edit' | 'add' | null;

// ─── Constants ────────────────────────────────────────────────────────────────
const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const DAYS_SHORT_EN = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const DAYS_SHORT_AR = ['أحد','اثن','ثلا','أرب','خمي','جمع','سبت'];

const STATUS_CFG: Record<DayStatus, { bg: string; textColor: string; en: string; ar: string }> = {
  present:   { bg: '#dcfce7', textColor: '#15803d', en: 'Present',  ar: 'حاضر'       },
  late:      { bg: '#fef9c3', textColor: '#a16207', en: 'Late',     ar: 'متأخر'      },
  open:      { bg: '#dbeafe', textColor: '#1d4ed8', en: 'Open',     ar: 'مفتوح'      },
  absent:    { bg: '#fee2e2', textColor: '#b91c1c', en: 'Absent',   ar: 'غائب'       },
  weekend:   { bg: '#f3f4f6', textColor: '#9ca3af', en: 'Off',      ar: 'إجازة'      },
  future:    { bg: 'transparent', textColor: '#9ca3af', en: '—',    ar: '—'          },
  friday_ot: { bg: '#fff7ed', textColor: '#c2410c', en: 'Fri OT',  ar: 'إضافي جمعة' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function pad(n: number) { return String(n).padStart(2, '0'); }
function fmtHHMM(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fmtDur(ci: string, co?: string | null) {
  if (!co) return '—';
  const m = Math.max(0, Math.floor((new Date(co).getTime() - new Date(ci).getTime()) / 60000));
  return m ? `${Math.floor(m / 60)}h ${m % 60}m` : '—';
}
function dayStatus(rec: AttRecord | undefined, isPast: boolean, isFriday: boolean): DayStatus {
  if (isFriday) return rec ? 'friday_ot' : 'weekend';
  if (!isPast)  return 'future';
  if (!rec)     return 'absent';
  if (rec.checkOut) return (rec.lateMinutes ?? 0) > 0 ? 'late' : 'present';
  return 'open';
}
function buildDateStr(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatKpi({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <View style={[kpiSt.card, { backgroundColor: color }]}>
      <Text style={kpiSt.val}>{value}</Text>
      <Text style={kpiSt.lbl}>{label}</Text>
    </View>
  );
}
const kpiSt = StyleSheet.create({
  card: { flex: 1, borderRadius: radius.lg, padding: spacing.sm, alignItems: 'center', minHeight: 66 },
  val:  { color: '#fff', fontSize: 22, fontWeight: '800', lineHeight: 26 },
  lbl:  { color: 'rgba(255,255,255,.85)', fontSize: 10, fontWeight: '600', marginTop: 2, textAlign: 'center' },
});

function StatusBadge({ status, isAr }: { status: DayStatus; isAr: boolean }) {
  const c = STATUS_CFG[status];
  return (
    <View style={[bdgSt.badge, { backgroundColor: c.bg }]}>
      <Text style={[bdgSt.text, { color: c.textColor }]}>{isAr ? c.ar : c.en}</Text>
    </View>
  );
}
const bdgSt = StyleSheet.create({
  badge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 99 },
  text:  { fontSize: 10, fontWeight: '700' },
});

// ─── Edit / Add Bottom Sheet ──────────────────────────────────────────────────
function RecordModal({ visible, mode, form, onChange, onSave, onCancel, saving, isAr, colors, dateLabel }: {
  visible: boolean; mode: ModalMode; form: EditForm;
  onChange: (k: keyof EditForm, v: string) => void;
  onSave: () => void; onCancel: () => void;
  saving: boolean; isAr: boolean; colors: any; dateLabel: string;
}) {
  const title = mode === 'add'
    ? (isAr ? `إضافة حضور — ${dateLabel}` : `Add Attendance — ${dateLabel}`)
    : (isAr ? `تعديل — ${dateLabel}` : `Edit — ${dateLabel}`);

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <KeyboardAvoidingView style={ms.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={ms.bg} onPress={onCancel} />
        <View style={[ms.sheet, { backgroundColor: colors.surface }]}>
          <View style={[ms.handle, { backgroundColor: colors.border }]} />
          <Text style={[ms.title, { color: colors.text }]}>{title}</Text>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={[ms.label, { color: colors.textSecondary }]}>{'وقت الدخول (HH:MM)'}</Text>
            <TextInput
              style={[ms.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
              value={form.checkIn} onChangeText={(v) => onChange('checkIn', v)}
              placeholder="08:00" placeholderTextColor={colors.textMuted}
            />
            <Text style={[ms.label, { color: colors.textSecondary }]}>{'وقت الخروج (HH:MM)'}</Text>
            <TextInput
              style={[ms.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
              value={form.checkOut} onChangeText={(v) => onChange('checkOut', v)}
              placeholder={'اتركه فارغاً إن لم يخرج'}
              placeholderTextColor={colors.textMuted}
            />
            <Text style={[ms.label, { color: colors.textSecondary }]}>{'ملاحظات'}</Text>
            <TextInput
              style={[ms.input, ms.inputMulti, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
              value={form.notes} onChangeText={(v) => onChange('notes', v)}
              placeholder={'ملاحظة اختيارية…'}
              placeholderTextColor={colors.textMuted} multiline numberOfLines={2}
            />
          </ScrollView>
          <View style={ms.actions}>
            <TouchableOpacity style={[ms.cancelBtn, { borderColor: colors.border }]} onPress={onCancel}>
              <Text style={[ms.cancelText, { color: colors.textSecondary }]}>{'إلغاء'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[ms.saveBtn, { backgroundColor: mode === 'add' ? '#16a34a' : colors.primary }, saving && { opacity: 0.6 }]}
              onPress={onSave} disabled={saving}
            >
              {saving
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={ms.saveText}>{'حفظ'}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
const ms = StyleSheet.create({
  overlay:    { flex: 1, justifyContent: 'flex-end' },
  bg:         { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,.45)' },
  sheet:      { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: spacing.xl, maxHeight: '80%' },
  handle:     { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  title:      { ...typography.h3, textAlign: 'center', marginBottom: spacing.md },
  label:      { ...typography.caption, marginBottom: 5, marginTop: spacing.sm },
  input:      { borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 11, ...typography.body, marginBottom: 2 },
  inputMulti: { height: 64, textAlignVertical: 'top' },
  actions:    { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  cancelBtn:  { flex: 1, paddingVertical: 13, borderRadius: radius.md, borderWidth: 1.5, alignItems: 'center' },
  cancelText: { ...typography.body, fontWeight: '600' },
  saveBtn:    { flex: 2, paddingVertical: 13, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  saveText:   { ...typography.body, fontWeight: '700', color: '#fff' },
});

// ─── Employee Picker Modal ────────────────────────────────────────────────────
function UserPickerModal({ visible, users, onSelect, onClose, isAr, colors }: {
  visible: boolean; users: AdminUser[];
  onSelect: (u: AdminUser) => void; onClose: () => void;
  isAr: boolean; colors: any;
}) {
  const [q, setQ] = useState('');
  const filtered  = q.trim()
    ? users.filter((u) => (u.fullName + u.username).toLowerCase().includes(q.toLowerCase()))
    : users;

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <Pressable style={ms.bg} onPress={onClose} />
      <View style={[up.sheet, { backgroundColor: colors.surface }]}>
        <View style={[ms.handle, { backgroundColor: colors.border }]} />
        <Text style={[ms.title, { color: colors.text }]}>{'اختر موظفاً'}</Text>
        <TextInput
          style={[ms.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
          placeholder={'بحث…'} placeholderTextColor={colors.textMuted}
          value={q} onChangeText={setQ}
        />
        <FlatList
          data={filtered}
          keyExtractor={(u) => String(u.id)}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item: u }) => (
            <TouchableOpacity style={[up.row, { borderBottomColor: colors.border }]} onPress={() => { onSelect(u); setQ(''); }}>
              <Text style={[up.name, { color: colors.text }]}>{u.fullName || u.username}</Text>
              <Text style={[up.role, { color: colors.textMuted }]}>{u.role}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={[up.empty, { color: colors.textMuted }]}>{'لا نتائج'}</Text>}
        />
      </View>
    </Modal>
  );
}
const up = StyleSheet.create({
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.md, paddingBottom: spacing.xl, maxHeight: '75%' },
  row:   { paddingVertical: 12, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name:  { ...typography.body, fontWeight: '600' },
  role:  { ...typography.caption },
  empty: { textAlign: 'center', paddingVertical: spacing.lg, ...typography.bodySmall },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export function AttendanceAdminScreen() {
  const { colors } = useAppTheme();
  const { isAr }   = useLocale();

  const today = useMemo(() => new Date(), []);

  const [tab,            setTab]            = useState<Tab>('monthly');
  const [users,          setUsers]          = useState<AdminUser[]>([]);
  const [selectedUser,   setSelectedUser]   = useState<AdminUser | null>(null);
  const [year,           setYear]           = useState(today.getFullYear());
  const [month,          setMonth]          = useState(today.getMonth() + 1);
  const [records,        setRecords]        = useState<AttRecord[]>([]);
  const [loading,        setLoading]        = useState(false);
  const [refreshing,     setRefreshing]     = useState(false);
  const [userPickerOpen, setUserPickerOpen] = useState(false);

  // Modal for edit / add
  const [modalMode,  setModalMode]  = useState<ModalMode>(null);
  const [modalDay,   setModalDay]   = useState<number | null>(null);
  const [modalRecId, setModalRecId] = useState<number | null>(null);
  const [editForm,   setEditForm]   = useState<EditForm>({ checkIn: '', checkOut: '', notes: '' });
  const [saving,     setSaving]     = useState(false);

  // Settings
  const [settings,      setSettings]      = useState<AttSettings>({ lateGraceMinutes: 30, overtimeGraceMinutes: 30 });
  const [settingsForm,  setSettingsForm]  = useState<AttSettings>({ lateGraceMinutes: 30, overtimeGraceMinutes: 30 });
  const [settingsSaving,setSettingsSaving]= useState(false);

  // ── Load helpers ──────────────────────────────────────────────────────────
  const loadUsers = useCallback(async () => {
    try {
      const res = await api.get<AdminUser[]>('/users/all');
      const active = (Array.isArray(res) ? res : []).filter((u) => !u.deletedAt && u.isActive);
      setUsers(active);
      if (active.length > 0 && !selectedUser) setSelectedUser(active[0]);
    } catch { /* ignore */ }
  }, []); // eslint-disable-line

  const loadRecords = useCallback(async (silent = false) => {
    if (!selectedUser) { setRecords([]); return; }
    silent ? setRefreshing(true) : setLoading(true);
    try {
      const daysInMo = new Date(year, month, 0).getDate();
      const from = `${year}-${pad(month)}-01`;
      const to   = `${year}-${pad(month)}-${pad(daysInMo)}`;
      const res = await api.get<AttRecord[]>(`/attendance/all?userId=${selectedUser.id}&fromDate=${from}&toDate=${to}`);
      setRecords(Array.isArray(res) ? res : []);
    } catch { setRecords([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, [selectedUser, year, month]);

  const loadSettings = useCallback(async () => {
    try {
      const res = await api.get<AttSettings>('/attendance/settings');
      if (res && typeof res === 'object') { setSettings(res); setSettingsForm(res); }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { void loadUsers(); void loadSettings(); }, [loadUsers, loadSettings]);
  useEffect(() => { void loadRecords(); }, [loadRecords]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const daysInMonth = useMemo(() => new Date(year, month, 0).getDate(), [year, month]);

  const recordsByDay = useMemo(() => {
    const map = new Map<number, AttRecord>();
    for (const r of records) {
      const d = new Date(r.checkIn);
      if (d.getFullYear() === year && d.getMonth() + 1 === month) {
        const k = d.getDate(); if (!map.has(k)) map.set(k, r);
      }
    }
    return map;
  }, [records, year, month]);

  const stats = useMemo(() => {
    let present = 0, absent = 0, late = 0, totalOT = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dt  = new Date(year, month - 1, d);
      const dow = dt.getDay();
      if (dt > today) continue;
      const r = recordsByDay.get(d);
      if (dow === 5) { if (r) totalOT += r.overtimeMinutes ?? 0; continue; }
      if (!r) { absent++; continue; }
      present++;
      if ((r.lateMinutes ?? 0) > 0) late++;
      totalOT += r.overtimeMinutes ?? 0;
    }
    const otH = Math.floor(totalOT / 60), otM = totalOT % 60;
    return { present, absent, late, ot: totalOT ? `${otH}h ${otM}m` : '0h' };
  }, [daysInMonth, recordsByDay, year, month, today]);

  // ── Month / Year navigation ───────────────────────────────────────────────
  const prevMonth = () => { if (month === 1) { setMonth(12); setYear((y) => y - 1); } else setMonth((m) => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear((y) => y + 1); } else setMonth((m) => m + 1); };

  // ── Edit / Add handlers ───────────────────────────────────────────────────
  const openEdit = (rec: AttRecord, day: number) => {
    setModalMode('edit');
    setModalDay(day);
    setModalRecId(rec.id);
    setEditForm({
      checkIn:  fmtHHMM(rec.checkIn)  === '—' ? '' : fmtHHMM(rec.checkIn),
      checkOut: fmtHHMM(rec.checkOut) === '—' ? '' : fmtHHMM(rec.checkOut),
      notes:    rec.notes ?? '',
    });
  };

  const openAdd = (day: number) => {
    setModalMode('add');
    setModalDay(day);
    setModalRecId(null);
    setEditForm({ checkIn: '08:00', checkOut: '17:00', notes: '' });
  };

  const closeModal = () => { setModalMode(null); setModalDay(null); setModalRecId(null); };

  const handleSave = async () => {
    if (!modalDay || !selectedUser) return;
    setSaving(true);
    const dateStr = buildDateStr(year, month, modalDay);

    const toIso = (hhmm: string) =>
      hhmm.trim() ? `${dateStr}T${hhmm.trim()}:00` : null;

    try {
      if (modalMode === 'edit' && modalRecId) {
        await api.put(`/attendance/${modalRecId}`, {
          checkIn:  toIso(editForm.checkIn)  ?? undefined,
          checkOut: toIso(editForm.checkOut) ?? null,
          notes:    editForm.notes.trim()    || null,
        });
      } else if (modalMode === 'add') {
        const ci = toIso(editForm.checkIn);
        if (!ci) { Alert.alert('مطلوب', 'وقت الدخول مطلوب'); setSaving(false); return; }
        await api.post('/attendance', {
          userId:   selectedUser.id,
          checkIn:  ci,
          checkOut: toIso(editForm.checkOut) ?? null,
          notes:    editForm.notes.trim()    || null,
        });
      }
      closeModal();
      void loadRecords(true);
    } catch (e: any) {
      Alert.alert('خطأ', e?.message ?? ('فشل الحفظ'));
    } finally { setSaving(false); }
  };

  const handleDelete = (rec: AttRecord, day: number) => {
    Alert.alert(
      'حذف السجل',
      isAr ? `حذف سجل يوم ${day}؟` : `Delete record for day ${day}?`,
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'حذف', style: 'destructive', onPress: async () => {
          try {
            await api.delete(`/attendance/${rec.id}`);
            void loadRecords(true);
          } catch (e: any) {
            Alert.alert('خطأ', e?.message);
          }
        }},
      ],
    );
  };

  // ── Settings ──────────────────────────────────────────────────────────────
  const saveSettings = async () => {
    setSettingsSaving(true);
    try {
      const res = await api.put<AttSettings>('/attendance/settings', settingsForm);
      setSettings(res); setSettingsForm(res);
      Alert.alert('تم', 'تم حفظ الإعدادات.');
    } catch (e: any) {
      Alert.alert('خطأ', e?.message);
    } finally { setSettingsSaving(false); }
  };

  // ── Localization helpers ──────────────────────────────────────────────────
  const monthNames = isAr ? MONTHS_AR : MONTHS_EN;
  const dayNames   = isAr ? DAYS_SHORT_AR : DAYS_SHORT_EN;

  const modalDateLabel = modalDay
    ? `${buildDateStr(year, month, modalDay)} (${dayNames[new Date(year, month - 1, modalDay).getDay()]})`
    : '';

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title={'الحضور والغياب'}
        subtitle={'تقويم شهري لكل موظف'}
        showBack
        rightIcon="refresh-outline"
        onRightPress={() => void loadRecords(true)}
      />

      {/* ── Tab bar ── */}
      <View style={[s.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {(['monthly', 'settings'] as Tab[]).map((t) => (
          <TouchableOpacity key={t} style={[s.tabBtn, tab === t && [s.tabActive, { borderBottomColor: colors.primary }]]} onPress={() => setTab(t)}>
            <Ionicons
              name={t === 'monthly' ? 'calendar' : 'settings-outline'}
              size={15}
              color={tab === t ? colors.primary : colors.textMuted}
            />
            <Text style={[s.tabText, { color: tab === t ? colors.primary : colors.textMuted }]}>
              {t === 'monthly' ? ('العرض الشهري') : ('الإعدادات')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'monthly' ? (
        <ScrollView
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadRecords(true)} tintColor={colors.primary} />}
        >
          {/* Controls */}
          <View style={[s.controlsCard, { backgroundColor: colors.surface }]}>
            {/* Employee picker */}
            <TouchableOpacity style={[s.empPicker, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]} onPress={() => setUserPickerOpen(true)}>
              <Ionicons name="person-outline" size={16} color={colors.primary} />
              <Text style={[s.empPickerText, { color: selectedUser ? colors.text : colors.textMuted }]} numberOfLines={1}>
                {selectedUser ? `${selectedUser.fullName || selectedUser.username} · ${selectedUser.role}` : ('— اختر موظفاً —')}
              </Text>
              <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
            </TouchableOpacity>

            {/* Month / Year navigation */}
            <View style={s.navRow}>
              <TouchableOpacity style={[s.navBtn, { borderColor: colors.border }]} onPress={prevMonth}>
                <Ionicons name="chevron-back" size={18} color={colors.text} />
              </TouchableOpacity>
              <Text style={[s.monthLabel, { color: colors.text }]}>{monthNames[month - 1]} {year}</Text>
              <TouchableOpacity style={[s.navBtn, { borderColor: colors.border }]} onPress={nextMonth}>
                <Ionicons name="chevron-forward" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* KPI cards */}
          {selectedUser && (
            <View style={s.kpiRow}>
              <StatKpi label={'حاضر'}   value={stats.present} color="#10b981" />
              <StatKpi label={'غائب'}    value={stats.absent}  color="#ef4444" />
              <StatKpi label={'متأخر'}     value={stats.late}    color="#f59e0b" />
              <StatKpi label={'إضافي'}       value={stats.ot}      color="#8b5cf6" />
            </View>
          )}

          {/* Day list */}
          {!selectedUser ? (
            <View style={s.empty}>
              <Ionicons name="people-outline" size={44} color={colors.textMuted} />
              <Text style={[s.emptyText, { color: colors.textMuted }]}>{'اختر موظفاً لعرض التقويم الشهري'}</Text>
            </View>
          ) : loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
          ) : (
            Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const date    = new Date(year, month - 1, day);
              const dow     = date.getDay();
              const isFri   = dow === 5;
              const todayEnd = new Date(today); todayEnd.setHours(23, 59, 59);
              const isPast  = date <= todayEnd;
              const rec     = recordsByDay.get(day);
              const status  = dayStatus(rec, isPast, isFri);
              const isToday = date.toDateString() === today.toDateString();
              const dateStr = buildDateStr(year, month, day);

              return (
                <View key={day} style={[s.dayRow, { backgroundColor: colors.surface, borderLeftColor: STATUS_CFG[status].textColor }, isToday && { borderLeftWidth: 4 }]}>
                  {/* Day label */}
                  <View style={s.dayLabel}>
                    <View style={[s.dayNumCircle, isToday && { backgroundColor: colors.primary }]}>
                      <Text style={[s.dayNum, { color: isToday ? '#fff' : colors.text }]}>{day}</Text>
                    </View>
                    <Text style={[s.dayName, { color: colors.textMuted }]}>{dayNames[dow]}</Text>
                  </View>

                  {/* Status + times */}
                  <View style={s.dayInfo}>
                    <StatusBadge status={status} isAr={isAr} />
                    {rec && (
                      <Text style={[s.times, { color: colors.textSecondary }]}>
                        {fmtHHMM(rec.checkIn)} → {fmtHHMM(rec.checkOut)}
                      </Text>
                    )}
                    {rec && fmtDur(rec.checkIn, rec.checkOut) !== '—' && (
                      <Text style={[s.dur, { color: colors.textMuted }]}>{fmtDur(rec.checkIn, rec.checkOut)}</Text>
                    )}
                    {rec && (rec.lateMinutes ?? 0) > 0 && (
                      <Text style={[s.lateText, { color: '#a16207' }]}>+{rec.lateMinutes}m {'تأخير'}</Text>
                    )}
                    {rec && (rec.overtimeMinutes ?? 0) > 0 && (
                      <Text style={[s.otText, { color: '#7c3aed' }]}>+{rec.overtimeMinutes}m {'إضافي'}</Text>
                    )}
                    <Text style={[s.dateStr, { color: colors.textMuted }]}>{dateStr}</Text>
                  </View>

                  {/* Actions */}
                  <View style={s.dayActions}>
                    {rec ? (
                      <>
                        <TouchableOpacity style={[s.actBtn, { borderColor: colors.border }]} onPress={() => openEdit(rec, day)}>
                          <Ionicons name="pencil" size={13} color={colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={[s.actBtn, { borderColor: '#fecaca', backgroundColor: '#fee2e2' }]} onPress={() => handleDelete(rec, day)}>
                          <Ionicons name="trash-outline" size={13} color="#b91c1c" />
                        </TouchableOpacity>
                      </>
                    ) : isPast && !isFri ? (
                      <TouchableOpacity style={[s.addDayBtn, { borderColor: '#86efac', backgroundColor: '#dcfce7' }]} onPress={() => openAdd(day)}>
                        <Ionicons name="add" size={14} color="#15803d" />
                        <Text style={[s.addDayText, { color: '#15803d' }]}>{'إضافة'}</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      ) : (
        /* ── Settings tab ── */
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <View style={[s.settingsCard, { backgroundColor: colors.surface }]}>
            <View style={s.settingsHeader}>
              <View style={[s.settingsIcon, { backgroundColor: `${colors.warning}15` }]}>
                <Ionicons name="settings-outline" size={22} color={colors.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.settingsTitle, { color: colors.text }]}>{'فترات السماح'}</Text>
                <Text style={[s.settingsSub, { color: colors.textMuted }]}>
                  {'الحضور ضمن نافذة السماح لا يُحسب تأخيراً. المغادرة ضمن نافذة الإضافي لا تُحسب إضافياً.'}
                </Text>
              </View>
            </View>

            {/* Late grace */}
            <View style={[s.graceBlock, { backgroundColor: '#fef9c3', borderColor: '#fde68a' }]}>
              <Text style={[s.graceLabel, { color: '#a16207' }]}>{'فترة سماح التأخير'}</Text>
              <Text style={[s.graceSaved, { color: '#a16207' }]}>{'محفوظ:'} {settings.lateGraceMinutes}m</Text>
              <View style={s.graceInput}>
                <TextInput
                  style={[s.graceNum, { borderColor: '#fde68a' }]}
                  value={String(settingsForm.lateGraceMinutes)}
                  onChangeText={(v) => setSettingsForm((p) => ({ ...p, lateGraceMinutes: Math.max(0, Number(v) || 0) }))}
                  keyboardType="numeric"
                />
                <Text style={{ color: '#a16207', fontWeight: '600' }}>{'دقيقة'}</Text>
              </View>
            </View>

            {/* OT grace */}
            <View style={[s.graceBlock, { backgroundColor: 'rgba(139,92,246,.07)', borderColor: 'rgba(139,92,246,.25)' }]}>
              <Text style={[s.graceLabel, { color: '#7c3aed' }]}>{'فترة سماح الإضافي'}</Text>
              <Text style={[s.graceSaved, { color: '#7c3aed' }]}>{'محفوظ:'} {settings.overtimeGraceMinutes}m</Text>
              <View style={s.graceInput}>
                <TextInput
                  style={[s.graceNum, { borderColor: 'rgba(139,92,246,.35)' }]}
                  value={String(settingsForm.overtimeGraceMinutes)}
                  onChangeText={(v) => setSettingsForm((p) => ({ ...p, overtimeGraceMinutes: Math.max(0, Number(v) || 0) }))}
                  keyboardType="numeric"
                />
                <Text style={{ color: '#7c3aed', fontWeight: '600' }}>{'دقيقة'}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[s.saveSettingsBtn, { backgroundColor: colors.primary }, settingsSaving && { opacity: 0.6 }]}
              onPress={saveSettings} disabled={settingsSaving}
            >
              {settingsSaving
                ? <ActivityIndicator size="small" color="#fff" />
                : <>
                    <Ionicons name="save-outline" size={16} color="#fff" />
                    <Text style={s.saveSettingsText}>{'حفظ الإعدادات'}</Text>
                  </>}
            </TouchableOpacity>
            <Text style={[s.settingsNote, { color: colors.textMuted }]}>
              {'التغييرات تسري على الحضور الجديد فقط'}
            </Text>
          </View>
        </ScrollView>
      )}

      {/* ── Modals ── */}
      <RecordModal
        visible={modalMode !== null}
        mode={modalMode}
        form={editForm}
        onChange={(k, v) => setEditForm((p) => ({ ...p, [k]: v }))}
        onSave={handleSave}
        onCancel={closeModal}
        saving={saving}
        isAr={isAr}
        colors={colors}
        dateLabel={modalDateLabel}
      />

      <UserPickerModal
        visible={userPickerOpen}
        users={users}
        onSelect={(u) => { setSelectedUser(u); setUserPickerOpen(false); }}
        onClose={() => setUserPickerOpen(false)}
        isAr={isAr}
        colors={colors}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:    { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },

  tabBar:   { flexDirection: 'row', borderBottomWidth: 1 },
  tabBtn:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomWidth: 2 },
  tabText:  { fontSize: 13, fontWeight: '600' },

  controlsCard: { borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, ...shadow.sm, gap: spacing.sm },
  empPicker:    { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: radius.md, padding: spacing.sm },
  empPickerText:{ flex: 1, fontSize: 14, fontWeight: '500' },
  navRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBtn:       { width: 36, height: 36, borderRadius: radius.md, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  monthLabel:   { ...typography.h3, flex: 1, textAlign: 'center' },

  kpiRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },

  empty:     { alignItems: 'center', paddingVertical: 60, gap: spacing.sm },
  emptyText: { ...typography.bodySmall, textAlign: 'center' },

  dayRow:     { flexDirection: 'row', borderRadius: radius.md, padding: spacing.sm, marginBottom: 5, borderLeftWidth: 2, borderLeftColor: 'transparent', ...shadow.sm, alignItems: 'flex-start', gap: 8 },
  dayLabel:   { width: 42, alignItems: 'center', paddingTop: 2 },
  dayNumCircle:{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dayNum:     { fontSize: 14, fontWeight: '700' },
  dayName:    { fontSize: 10, fontWeight: '600', marginTop: 2 },
  dayInfo:    { flex: 1, gap: 2 },
  times:      { fontSize: 12, fontWeight: '600' },
  dur:        { fontSize: 11 },
  lateText:   { fontSize: 11, fontWeight: '700' },
  otText:     { fontSize: 11, fontWeight: '700' },
  dateStr:    { fontSize: 10 },
  dayActions: { alignItems: 'flex-end', gap: 4, justifyContent: 'flex-start' },
  actBtn:     { width: 28, height: 28, borderRadius: radius.sm, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  addDayBtn:  { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 5, borderRadius: radius.sm, borderWidth: 1 },
  addDayText: { fontSize: 11, fontWeight: '700' },

  settingsCard:   { borderRadius: radius.xl, padding: spacing.lg, ...shadow.sm },
  settingsHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.lg },
  settingsIcon:   { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  settingsTitle:  { ...typography.h3 },
  settingsSub:    { ...typography.caption, marginTop: 3, lineHeight: 17 },
  graceBlock:     { borderRadius: radius.md, padding: spacing.md, borderWidth: 1, marginBottom: spacing.md },
  graceLabel:     { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  graceSaved:     { fontSize: 11, fontWeight: '600', marginBottom: 8 },
  graceInput:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  graceNum:       { width: 80, borderWidth: 1.5, borderRadius: radius.sm, padding: 8, fontSize: 18, fontWeight: '700', textAlign: 'center', backgroundColor: '#fff' },
  saveSettingsBtn:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: radius.lg, paddingVertical: 13, marginTop: spacing.sm },
  saveSettingsText:{ color: '#fff', fontWeight: '700', fontSize: 15 },
  settingsNote:   { ...typography.caption, textAlign: 'center', marginTop: spacing.sm },
});
