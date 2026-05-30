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
import { colors, radius, shadow, spacing, typography } from '../../theme';

interface AttRecord {
  id: number;
  user?: { fullName: string; role?: string };
  date: string;
  checkIn?: string;
  checkOut?: string;
  status?: string;
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

const STATUS_COLOR: Record<string, string> = {
  PRESENT:  colors.success,
  ABSENT:   colors.danger,
  LATE:     colors.warning,
  HALF_DAY: colors.info,
};

function InlinePicker<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: T[]; onChange: (v: T) => void }) {
  return (
    <View style={ps.wrap}>
      <Text style={ps.label}>{label}</Text>
      <View style={ps.row}>
        {options.map((opt) => (
          <TouchableOpacity key={opt} style={[ps.chip, value === opt && ps.chipActive]} onPress={() => onChange(opt)} activeOpacity={0.7}>
            <Text style={[ps.chipText, value === opt && ps.chipTextActive]}>{opt.replace('_', ' ')}</Text>
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
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  chipTextActive: { color: colors.primary },
});

function AttModal({ visible, initial, onClose, onSave, saving }: {
  visible: boolean; initial: FormState; onClose: () => void; onSave: (f: FormState) => Promise<void>; saving: boolean;
}) {
  const [form, setForm] = useState<FormState>(initial);
  useEffect(() => { if (visible) setForm(initial); }, [visible, initial]);
  const set = (k: keyof FormState) => (v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.date.trim()) return Alert.alert('Validation', 'Date is required.');
    await onSave(form);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.overlayBg} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Edit Attendance</Text>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.fieldLabel}>Date *</Text>
            <TextInput style={styles.input} value={form.date} onChangeText={set('date')} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted} />

            <Text style={styles.fieldLabel}>Check In</Text>
            <TextInput style={styles.input} value={form.checkIn} onChangeText={set('checkIn')} placeholder="HH:MM" placeholderTextColor={colors.textMuted} />

            <Text style={styles.fieldLabel}>Check Out</Text>
            <TextInput style={styles.input} value={form.checkOut} onChangeText={set('checkOut')} placeholder="HH:MM" placeholderTextColor={colors.textMuted} />

            <Text style={styles.fieldLabel}>Hours Worked</Text>
            <TextInput style={styles.input} value={form.hoursWorked} onChangeText={set('hoursWorked')} placeholder="e.g. 8" placeholderTextColor={colors.textMuted} keyboardType="numeric" />

            <InlinePicker label="Status" value={form.status} options={STATUS_OPTIONS} onChange={(v) => setForm((p) => ({ ...p, status: v }))} />
          </ScrollView>
          <View style={styles.sheetActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color={colors.textInverse} /> : <Text style={styles.saveText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function AttCard({ item, onEdit, onDelete }: { item: AttRecord; onEdit: () => void; onDelete: () => void }) {
  const status = item.status ?? 'PRESENT';
  const color  = STATUS_COLOR[status] ?? colors.textMuted;
  const name   = item.user?.fullName ?? `Record #${item.id}`;

  return (
    <View style={styles.card}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <View style={styles.cardContent}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.date}>{new Date(item.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
        {(item.checkIn || item.checkOut) && (
          <Text style={styles.times}>
            {item.checkIn ? `In: ${new Date(item.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
            {item.checkIn && item.checkOut ? '  ' : ''}
            {item.checkOut ? `Out: ${new Date(item.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
          </Text>
        )}
      </View>
      <View style={styles.right}>
        <View style={[styles.badge, { backgroundColor: `${color}15` }]}>
          <Text style={[styles.badgeText, { color }]}>{status.replace('_', ' ')}</Text>
        </View>
        {item.hoursWorked != null && <Text style={styles.hours}>{item.hoursWorked}h</Text>}
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
  const [records, setRecords]       = useState<AttRecord[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing]       = useState<AttRecord | null>(null);
  const [saving, setSaving]         = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ attendances: AttRecord[] }>('/attendance/all?limit=50');
      setRecords(res.attendances ?? []);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to load attendance');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const openEdit = (item: AttRecord) => { setEditing(item); setModalVisible(true); };

  const confirmDelete = (item: AttRecord) => {
    Alert.alert('Delete Record', `Delete attendance for "${item.user?.fullName ?? `#${item.id}`}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void handleDelete(item.id) },
    ]);
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/attendance/${id}`);
      setRefreshing(true);
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to delete');
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
      Alert.alert('Error', e?.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const present = records.filter((r) => r.status === 'PRESENT' || !r.status).length;
  const absent  = records.filter((r) => r.status === 'ABSENT').length;

  const initialForm: FormState = editing
    ? {
        date: editing.date ? editing.date.split('T')[0] : '',
        checkIn: editing.checkIn ? new Date(editing.checkIn).toTimeString().slice(0, 5) : '',
        checkOut: editing.checkOut ? new Date(editing.checkOut).toTimeString().slice(0, 5) : '',
        status: (editing.status as StatusOpt) ?? 'PRESENT',
        hoursWorked: editing.hoursWorked != null ? String(editing.hoursWorked) : '',
      }
    : DEFAULT_FORM;

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Attendance Admin" showBack />
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(i) => String(i.id)}
          renderItem={({ item }) => <AttCard item={item} onEdit={() => openEdit(item)} onDelete={() => confirmDelete(item)} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListHeaderComponent={
            <View style={styles.header}>
              <StatCard label="Present" value={String(present)} icon="checkmark-circle" color={colors.success} style={styles.stat} />
              <StatCard label="Absent"  value={String(absent)}  icon="close-circle"     color={colors.danger}  style={styles.stat} />
            </View>
          }
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="calendar-outline" size={44} color={colors.textMuted} /><Text style={styles.emptyText}>No attendance records</Text></View>}
        />
      )}

      <AttModal visible={modalVisible} initial={initialForm} onClose={() => setModalVisible(false)} onSave={handleSave} saving={saving} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: colors.background },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:        { padding: spacing.md, paddingBottom: 40 },
  header:      { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  stat:        { flex: 1 },
  card:        { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, gap: spacing.sm, ...shadow.sm },
  dot:         { width: 10, height: 10, borderRadius: 5, flexShrink: 0, marginTop: 4 },
  cardContent: { flex: 1 },
  name:        { ...typography.h4 },
  date:        { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  times:       { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  right:       { alignItems: 'flex-end', gap: 4 },
  badge:       { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  badgeText:   { fontSize: 10, fontWeight: '700' },
  hours:       { ...typography.caption, fontWeight: '700' },
  cardActions: { flexDirection: 'row', gap: 2 },
  actionBtn:   { padding: 3 },
  empty:       { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText:   { ...typography.bodySmall, color: colors.textMuted },

  overlay:     { flex: 1, justifyContent: 'flex-end' },
  overlayBg:   { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:       { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: spacing.xl, maxHeight: '85%' },
  sheetHandle: { width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  sheetTitle:  { ...typography.h3, textAlign: 'center', marginBottom: spacing.lg },
  fieldLabel:  { ...typography.caption, marginBottom: 6, marginTop: spacing.sm },
  input:       { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: 11, ...typography.body, marginBottom: 4 },
  sheetActions:{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  cancelBtn:   { flex: 1, paddingVertical: 13, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center' },
  cancelText:  { ...typography.body, fontWeight: '600', color: colors.textSecondary },
  saveBtn:     { flex: 2, paddingVertical: 13, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  saveText:    { ...typography.body, fontWeight: '700', color: colors.textInverse },
});
