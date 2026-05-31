import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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

interface AttRecord {
  id: number;
  user?: { fullName: string; role?: string };
  date?: string;
  checkIn?: string;
  checkOut?: string;
  status?: string;
  leaveType?: string;
  hoursWorked?: number;
}

type StatusOpt = 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY';
const STATUS_OPTIONS: StatusOpt[] = ['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY'];

interface FormState {
  date: string;
  checkIn: string;
  checkOut: string;
  status: StatusOpt;
  hoursWorked: string;
}

const DEFAULT_FORM: FormState = {
  date: new Date().toISOString().split('T')[0],
  checkIn: '',
  checkOut: '',
  status: 'PRESENT',
  hoursWorked: '',
};

function InlinePicker<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: T[]; onChange: (v: T) => void }) {
  const { colors } = useAppTheme();
  return (
    <View style={ps.wrap}>
      <Text style={[ps.label, { color: colors.textSecondary }]}>{label}</Text>
      <View style={ps.row}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[ps.chip, { borderColor: colors.border, backgroundColor: colors.surface }, value === opt && { borderColor: colors.primary, backgroundColor: colors.primaryLight }]}
            onPress={() => onChange(opt)}
            activeOpacity={0.7}
          >
            <Text style={[ps.chipText, { color: colors.textSecondary }, value === opt && { color: colors.primary }]}>{opt.replace('_', ' ')}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
const ps = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  label: { ...typography.caption, marginBottom: 6 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1.5 },
  chipText: { fontSize: 12, fontWeight: '600' },
});

function AttModal({ visible, initial, onClose, onSave, saving }: {
  visible: boolean; initial: FormState; onClose: () => void; onSave: (f: FormState) => Promise<void>; saving: boolean;
}) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const [form, setForm] = useState<FormState>(initial);
  useEffect(() => { if (visible) setForm(initial); }, [visible, initial]);
  const set = (k: keyof FormState) => (v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.date.trim()) return Alert.alert(isAr ? 'تحقق' : 'Validation', isAr ? 'التاريخ مطلوب.' : 'Date is required.');
    await onSave(form);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.overlayBg} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.sheetTitle, { color: colors.text }]}>{isAr ? 'تعديل الحضور' : 'Edit Attendance'}</Text>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{isAr ? 'التاريخ *' : 'Date *'}</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
              value={form.date}
              onChangeText={set('date')}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{isAr ? 'وقت الدخول' : 'Check In'}</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
              value={form.checkIn}
              onChangeText={set('checkIn')}
              placeholder="HH:MM"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{isAr ? 'وقت الخروج' : 'Check Out'}</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
              value={form.checkOut}
              onChangeText={set('checkOut')}
              placeholder="HH:MM"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{isAr ? 'ساعات العمل' : 'Hours Worked'}</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
              value={form.hoursWorked}
              onChangeText={set('hoursWorked')}
              placeholder={isAr ? 'مثال: 8' : 'e.g. 8'}
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
            />

            <InlinePicker label={isAr ? 'الحالة' : 'Status'} value={form.status} options={STATUS_OPTIONS} onChange={(v) => setForm((p) => ({ ...p, status: v }))} />
          </ScrollView>
          <View style={styles.sheetActions}>
            <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={onClose}>
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>{isAr ? 'إلغاء' : 'Cancel'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color={colors.textInverse} /> : <Text style={[styles.saveText, { color: colors.textInverse }]}>{isAr ? 'حفظ' : 'Save'}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function AttCard({ item, onEdit, onDelete }: { item: AttRecord; onEdit: () => void; onDelete: () => void }) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();

  const STATUS_COLOR: Record<string, string> = {
    PRESENT:  colors.success,
    ABSENT:   colors.danger,
    LATE:     colors.warning,
    HALF_DAY: colors.info,
  };

  const status   = item.status ?? item.leaveType ?? 'PRESENT';
  const color    = STATUS_COLOR[status] ?? colors.textMuted;
  const name     = item.user?.fullName ?? `${isAr ? 'سجل' : 'Record'} #${item.id}`;
  const dateStr  = item.date ?? item.checkIn ?? '';

  const statusLabel: Record<string, string> = {
    PRESENT:  isAr ? 'حاضر' : 'Present',
    ABSENT:   isAr ? 'غائب' : 'Absent',
    LATE:     isAr ? 'متأخر' : 'Late',
    HALF_DAY: isAr ? 'نصف يوم' : 'Half Day',
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <View style={styles.cardContent}>
        <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
        <Text style={[styles.date, { color: colors.textMuted }]}>{dateStr ? new Date(dateStr).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) : '—'}</Text>
        {(item.checkIn || item.checkOut) && (
          <Text style={[styles.times, { color: colors.textSecondary }]}>
            {item.checkIn ? `${isAr ? 'دخول' : 'In'}: ${new Date(item.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
            {item.checkIn && item.checkOut ? '  ' : ''}
            {item.checkOut ? `${isAr ? 'خروج' : 'Out'}: ${new Date(item.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
          </Text>
        )}
      </View>
      <View style={styles.right}>
        <View style={[styles.badge, { backgroundColor: `${color}15` }]}>
          <Text style={[styles.badgeText, { color }]}>{statusLabel[status] ?? status.replace('_', ' ')}</Text>
        </View>
        {item.hoursWorked != null && <Text style={[styles.hours, { color: colors.text }]}>{item.hoursWorked}h</Text>}
        <View style={styles.cardActions}>
          <TouchableOpacity onPress={onEdit} style={styles.actionBtn} hitSlop={6}>
            <Ionicons name="pencil-outline" size={14} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={styles.actionBtn} hitSlop={6}>
            <Ionicons name="trash-outline" size={14} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export function AttendanceAdminScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const [records, setRecords]       = useState<AttRecord[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing]       = useState<AttRecord | null>(null);
  const [saving, setSaving]         = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<AttRecord[]>('/attendance/all?limit=50');
      setRecords(Array.isArray(res) ? res : []);
    } catch (e: any) {
      Alert.alert(isAr ? 'خطأ' : 'Error', e?.message ?? (isAr ? 'فشل تحميل الحضور' : 'Failed to load attendance'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAr]);

  useEffect(() => { void load(); }, [load]);

  const openEdit = (item: AttRecord) => { setEditing(item); setModalVisible(true); };

  const confirmDelete = (item: AttRecord) => {
    Alert.alert(
      isAr ? 'حذف السجل' : 'Delete Record',
      `${isAr ? 'حذف حضور' : 'Delete attendance for'} "${item.user?.fullName ?? `#${item.id}`}"?`,
      [
        { text: isAr ? 'إلغاء' : 'Cancel', style: 'cancel' },
        { text: isAr ? 'حذف' : 'Delete', style: 'destructive', onPress: () => void handleDelete(item.id) },
      ]
    );
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/attendance/${id}`);
      setRefreshing(true);
      await load();
    } catch (e: any) {
      Alert.alert(isAr ? 'خطأ' : 'Error', e?.message ?? (isAr ? 'فشل الحذف' : 'Failed to delete'));
    }
  };

  const handleSave = async (form: FormState) => {
    if (!editing) return;
    setSaving(true);
    try {
      const body: Record<string, any> = {
        date: form.date.trim(),
        status: form.status,
      };
      if (form.checkIn.trim()) body.checkIn = form.checkIn.trim();
      if (form.checkOut.trim()) body.checkOut = form.checkOut.trim();
      if (form.hoursWorked.trim()) body.hoursWorked = Number(form.hoursWorked);
      await api.put(`/attendance/${editing.id}`, body);
      setModalVisible(false);
      setRefreshing(true);
      await load();
    } catch (e: any) {
      Alert.alert(isAr ? 'خطأ' : 'Error', e?.message ?? (isAr ? 'فشل الحفظ' : 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  const present = records.filter((r) => (r.status ?? r.leaveType ?? 'PRESENT') === 'PRESENT').length;
  const absent  = records.filter((r) => (r.status ?? r.leaveType) === 'ABSENT').length;

  const initialForm: FormState = editing
    ? {
        date: (editing.date ?? editing.checkIn ?? '').split('T')[0] ?? '',
        checkIn: editing.checkIn ? new Date(editing.checkIn).toTimeString().slice(0, 5) : '',
        checkOut: editing.checkOut ? new Date(editing.checkOut).toTimeString().slice(0, 5) : '',
        status: ((editing.status ?? editing.leaveType) as StatusOpt) ?? 'PRESENT',
        hoursWorked: editing.hoursWorked != null ? String(editing.hoursWorked) : '',
      }
    : DEFAULT_FORM;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={isAr ? 'الحضور' : 'Attendance'} showBack />
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(i, idx) => `${String(i.id)}-${idx}`}
          renderItem={({ item }) => <AttCard item={item} onEdit={() => openEdit(item)} onDelete={() => confirmDelete(item)} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListHeaderComponent={
            <View style={styles.header}>
              <StatCard label={isAr ? 'حاضر' : 'Present'} value={String(present)} icon="checkmark-circle" color={colors.success} style={styles.stat} />
              <StatCard label={isAr ? 'غائب' : 'Absent'}  value={String(absent)}  icon="close-circle"     color={colors.danger}  style={styles.stat} />
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>{isAr ? 'لا توجد سجلات حضور' : 'No attendance records'}</Text>
            </View>
          }
        />
      )}

      <AttModal visible={modalVisible} initial={initialForm} onClose={() => setModalVisible(false)} onSave={handleSave} saving={saving} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1 },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:        { padding: spacing.md, paddingBottom: 40 },
  header:      { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  stat:        { flex: 1 },
  card:        { flexDirection: 'row', alignItems: 'flex-start', borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, gap: spacing.sm, ...shadow.sm },
  dot:         { width: 10, height: 10, borderRadius: 5, flexShrink: 0, marginTop: 4 },
  cardContent: { flex: 1 },
  name:        { ...typography.h4 },
  date:        { ...typography.caption, marginTop: 2 },
  times:       { ...typography.caption, marginTop: 2 },
  right:       { alignItems: 'flex-end', gap: 4 },
  badge:       { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  badgeText:   { fontSize: 10, fontWeight: '700' },
  hours:       { ...typography.caption, fontWeight: '700' },
  cardActions: { flexDirection: 'row', gap: 2 },
  actionBtn:   { padding: 3 },
  empty:       { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText:   { ...typography.bodySmall },

  overlay:     { flex: 1, justifyContent: 'flex-end' },
  overlayBg:   { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:       { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: spacing.xl, maxHeight: '85%' },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  sheetTitle:  { ...typography.h3, textAlign: 'center', marginBottom: spacing.lg },
  fieldLabel:  { ...typography.caption, marginBottom: 6, marginTop: spacing.sm },
  input:       { borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: 11, ...typography.body, marginBottom: 4 },
  sheetActions:{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  cancelBtn:   { flex: 1, paddingVertical: 13, borderRadius: radius.md, borderWidth: 1.5, alignItems: 'center' },
  cancelText:  { ...typography.body, fontWeight: '600' },
  saveBtn:     { flex: 2, paddingVertical: 13, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  saveText:    { ...typography.body, fontWeight: '700' },
});
