import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { ScreenHeader } from '../../components';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

interface HealthRecord {
  id: number;
  machine?: { id: number; name: string };
  machineId?: number;
  operationalStatus: string;
  efficiencyRating: number;
  maintenanceHours: number;
  downtimePercentage?: number;
  notes?: string | null;
  recordedAt: string;
}

interface Machine { id: number; name: string }

type OpsStatus = 'OPERATIONAL' | 'MAINTENANCE' | 'OFFLINE' | 'DEGRADED';
const OPS_OPTIONS: OpsStatus[] = ['OPERATIONAL', 'MAINTENANCE', 'OFFLINE', 'DEGRADED'];

interface FormState {
  machineId: string;
  operationalStatus: OpsStatus;
  efficiencyRating: string;
  maintenanceHours: string;
  downtimePercentage: string;
  notes: string;
}

const DEFAULT_FORM: FormState = {
  machineId: '', operationalStatus: 'OPERATIONAL', efficiencyRating: '100',
  maintenanceHours: '0', downtimePercentage: '0', notes: '',
};

function nextDue(dateStr: string) {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + 6);
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function InlinePicker<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: T[]; onChange: (v: T) => void;
}) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.pickerWrap}>
      <Text style={[styles.pickerLabel, { color: colors.textMuted }]}>{label}</Text>
      <View style={styles.pickerRow}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[styles.chip,
              { borderColor: colors.border, backgroundColor: colors.surface },
              value === opt && { borderColor: colors.primary, backgroundColor: `${colors.primary}18` },
            ]}
            onPress={() => onChange(opt)}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, { color: colors.textSecondary }, value === opt && { color: colors.primary }]}>
              {opt}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function CalModal({ visible, machines, onClose, onSave, saving, initialForm, isEdit }: {
  visible: boolean; machines: Machine[]; onClose: () => void;
  onSave: (f: FormState) => Promise<void>; saving: boolean;
  initialForm?: FormState; isEdit?: boolean;
}) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const [form, setForm] = useState<FormState>(initialForm ?? DEFAULT_FORM);
  useEffect(() => { if (visible) setForm(initialForm ?? DEFAULT_FORM); }, [visible, initialForm]);
  const set = (k: keyof FormState) => (v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.machineId.trim()) {
      Alert.alert(isAr ? 'تحقق' : 'Validation', isAr ? 'معرف الآلة مطلوب.' : 'Machine ID is required.');
      return;
    }
    if (isNaN(Number(form.efficiencyRating))) {
      Alert.alert(isAr ? 'تحقق' : 'Validation', isAr ? 'يجب أن تكون الكفاءة رقماً 0-100.' : 'Efficiency must be a number 0–100.');
      return;
    }
    await onSave(form);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.overlayBg} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.sheetTitle, { color: colors.text }]}>
            {isEdit ? (isAr ? 'تعديل سجل المعايرة' : 'Edit Calibration Record') : (isAr ? 'سجل معايرة جديد' : 'New Calibration Record')}
          </Text>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{isAr ? 'الآلة *' : 'Machine *'}</Text>
            {machines.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  {machines.map((m, idx) => (
                    <TouchableOpacity
                      key={`${m.id}-${idx}`}
                      style={[styles.chip,
                        { borderColor: colors.border, backgroundColor: colors.surface },
                        form.machineId === String(m.id) && { borderColor: colors.primary, backgroundColor: `${colors.primary}18` },
                      ]}
                      onPress={() => setForm((p) => ({ ...p, machineId: String(m.id) }))}
                    >
                      <Text style={[styles.chipText, { color: colors.textSecondary }, form.machineId === String(m.id) && { color: colors.primary }]}>
                        {m.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            ) : (
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }]}
                value={form.machineId}
                onChangeText={set('machineId')}
                placeholder={isAr ? 'معرف الآلة' : 'Machine ID'}
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
              />
            )}

            <InlinePicker
              label={isAr ? 'الحالة التشغيلية' : 'Operational Status'}
              value={form.operationalStatus}
              options={OPS_OPTIONS}
              onChange={(v) => setForm((p) => ({ ...p, operationalStatus: v }))}
            />

            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{isAr ? 'معدل الكفاءة (0-100)' : 'Efficiency Rating (0–100)'}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }]}
              value={form.efficiencyRating} onChangeText={set('efficiencyRating')}
              placeholder="100" placeholderTextColor={colors.textMuted} keyboardType="numeric"
            />

            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{isAr ? 'ساعات الصيانة' : 'Maintenance Hours'}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }]}
              value={form.maintenanceHours} onChangeText={set('maintenanceHours')}
              placeholder="0" placeholderTextColor={colors.textMuted} keyboardType="numeric"
            />

            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{isAr ? 'نسبة التوقف %' : 'Downtime %'}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }]}
              value={form.downtimePercentage} onChangeText={set('downtimePercentage')}
              placeholder="0" placeholderTextColor={colors.textMuted} keyboardType="numeric"
            />

            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{isAr ? 'ملاحظات' : 'Notes'}</Text>
            <TextInput
              style={[styles.input, styles.multiline, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }]}
              value={form.notes} onChangeText={set('notes')}
              placeholder={isAr ? 'ملاحظات اختيارية' : 'Optional notes'}
              placeholderTextColor={colors.textMuted} multiline numberOfLines={3} textAlignVertical="top"
            />
          </ScrollView>
          <View style={styles.sheetActions}>
            <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={onClose}>
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>{isAr ? 'إلغاء' : 'Cancel'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.saveText}>{isAr ? 'حفظ' : 'Save'}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function CalCard({ item, onEdit }: { item: HealthRecord; onEdit: () => void }) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();

  const OPS_COLOR: Record<string, string> = {
    OPERATIONAL: colors.success, MAINTENANCE: colors.warning,
    OFFLINE: colors.danger,      DEGRADED: colors.info,
  };

  function calStatus(eff: number) {
    if (eff >= 90) return { label: isAr ? 'صالح'         : 'Valid',    color: colors.success, icon: 'checkmark-circle' as const };
    if (eff >= 75) return { label: isAr ? 'مستحق قريباً' : 'Due Soon', color: colors.warning, icon: 'time' as const };
    return               { label: isAr ? 'منتهي'         : 'Expired',  color: colors.danger,  icon: 'alert-circle' as const };
  }

  const { label, color, icon } = calStatus(item.efficiencyRating);
  const opsColor = OPS_COLOR[item.operationalStatus] ?? colors.textMuted;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderLeftColor: color, borderLeftWidth: 3 }]}>
      <View style={styles.cardTop}>
        <Text style={[styles.machineName, { color: colors.text }]} numberOfLines={1}>
          {item.machine?.name ?? `${isAr ? 'سجل #' : 'Record #'}${item.id}`}
        </Text>
        <View style={styles.badges}>
          <View style={[styles.badge, { backgroundColor: `${opsColor}15` }]}>
            <Text style={[styles.badgeText, { color: opsColor }]}>{item.operationalStatus}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: `${color}18` }]}>
            <Ionicons name={icon} size={11} color={color} />
            <Text style={[styles.badgeText, { color }]}>{label}</Text>
          </View>
          <TouchableOpacity onPress={onEdit} hitSlop={8} style={{ padding: 3 }}>
            <Ionicons name="pencil-outline" size={15} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.details}>
        <View style={styles.detailBlock}>
          <Text style={[styles.detailLabel, { color: colors.textMuted }]}>{isAr ? 'الكفاءة' : 'Efficiency'}</Text>
          <Text style={[styles.detailValue, { color }]}>{item.efficiencyRating}%</Text>
        </View>
        <View style={styles.detailBlock}>
          <Text style={[styles.detailLabel, { color: colors.textMuted }]}>{isAr ? 'آخر معايرة' : 'Last Calibrated'}</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>
            {new Date(item.recordedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
          </Text>
        </View>
        <View style={styles.detailBlock}>
          <Text style={[styles.detailLabel, { color: colors.textMuted }]}>{isAr ? 'التالية' : 'Next Due'}</Text>
          <Text style={[styles.detailValue, { color: item.efficiencyRating < 75 ? colors.danger : colors.text }]}>
            {nextDue(item.recordedAt)}
          </Text>
        </View>
      </View>
      {item.notes ? <Text style={[styles.notes, { color: colors.textMuted }]} numberOfLines={1}>{item.notes}</Text> : null}
    </View>
  );
}

export function CalibrationScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const today0 = new Date().toISOString().slice(0, 10);
  const month0 = new Date().toISOString().slice(0, 7) + '-01';
  const [records, setRecords]       = useState<HealthRecord[]>([]);
  const [machines, setMachines]     = useState<Machine[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing]       = useState<HealthRecord | null>(null);
  const [saving, setSaving]         = useState(false);
  const [fromDate, setFromDate] = useState(month0);
  const [toDate,   setToDate]   = useState(today0);
  const [isCheckedIn, setIsCheckedIn] = useState(false);

  const inRange = (d: string) => { const s = d.slice(0, 10); return (!fromDate || s >= fromDate) && (!toDate || s <= toDate); };
  const filteredRecords = useMemo(() => records.filter(r => inRange(r.recordedAt)), [records, fromDate, toDate]); // eslint-disable-line

  const load = useCallback(async () => {
    try {
      const [healthRes, machinesRes, attRes] = await Promise.all([
        api.get<HealthRecord[]>('/machine-health?limit=40'),
        api.get<Machine[]>('/machines').catch(() => [] as Machine[]),
        api.get<any>('/attendance/me').catch(() => []),
      ]);
      setRecords(Array.isArray(healthRes) ? healthRes : []);
      setMachines(Array.isArray(machinesRes) ? machinesRes : []);
      const attList: any[] = Array.isArray(attRes) ? attRes : (attRes?.data ?? []);
      setIsCheckedIn(attList.some((r: any) => !r.checkOut));
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const openCreate = () => {
    if (!isCheckedIn) {
      Alert.alert(
        isAr ? 'تسجيل الدخول مطلوب' : 'Check-In Required',
        isAr ? 'يجب تسجيل الدخول قبل إضافة سجل معايرة.' : 'You must check in before adding a calibration record.',
      );
      return;
    }
    setEditing(null);
    setModalVisible(true);
  };;
  const openEdit   = (item: HealthRecord) => { setEditing(item); setModalVisible(true); };

  const handleSave = async (form: FormState) => {
    setSaving(true);
    try {
      const body: Record<string, any> = {
        machineId: Number(form.machineId),
        operationalStatus: form.operationalStatus,
        efficiencyRating: Number(form.efficiencyRating),
        maintenanceHours: Number(form.maintenanceHours),
      };
      if (form.downtimePercentage.trim()) body.downtimePercentage = Number(form.downtimePercentage);
      if (form.notes.trim()) body.notes = form.notes.trim();
      if (editing) {
        await api.patch(`/machine-health/${editing.id}`, body);
      } else {
        await api.post('/machine-health', body);
      }
      setModalVisible(false);
      setEditing(null);
      setRefreshing(true);
      await load();
    } catch (e: any) {
      Alert.alert(isAr ? 'خطأ' : 'Error', e?.message ?? (isAr ? 'فشل حفظ السجل' : 'Failed to save record'));
    } finally {
      setSaving(false);
    }
  };

  const editForm: FormState = editing
    ? {
        machineId: editing.machineId ? String(editing.machineId) : (editing.machine?.id ? String(editing.machine.id) : ''),
        operationalStatus: editing.operationalStatus as OpsStatus,
        efficiencyRating: String(editing.efficiencyRating),
        maintenanceHours: String(editing.maintenanceHours),
        downtimePercentage: editing.downtimePercentage != null ? String(editing.downtimePercentage) : '0',
        notes: editing.notes ?? '',
      }
    : DEFAULT_FORM;

  const expiredCount = filteredRecords.filter((r) => r.efficiencyRating < 75).length;
  const subtitle = expiredCount
    ? `${expiredCount} ${isAr ? 'تحتاج اهتماماً' : 'need attention'}`
    : (isAr ? 'كل المعايرات سليمة' : 'All calibrated');

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={isAr ? 'المعايرة' : 'Calibration'} subtitle={subtitle} showBack />
      {!isCheckedIn && !loading && (
        <View style={[styles.notCheckedBanner, { backgroundColor: `${colors.warning}15`, borderColor: `${colors.warning}50` }]}>
          <Ionicons name="warning-outline" size={16} color={colors.warning} />
          <Text style={[styles.notCheckedText, { color: colors.warning }]}>
            {isAr ? 'يجب تسجيل الدخول لإضافة سجلات معايرة' : 'Check in to add calibration records'}
          </Text>
        </View>
      )}
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={filteredRecords}
          keyExtractor={(i, idx) => `${String(i.id)}-${idx}`}
          renderItem={({ item }) => <CalCard item={item} onEdit={() => openEdit(item)} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListHeaderComponent={
            <View style={[styles.filterBar, { backgroundColor: colors.surface }]}>
              <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
              <TextInput
                style={[styles.filterInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                value={fromDate} onChangeText={setFromDate}
                placeholder="From YYYY-MM-DD" placeholderTextColor={colors.textMuted}
              />
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>→</Text>
              <TextInput
                style={[styles.filterInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                value={toDate} onChangeText={setToDate}
                placeholder="To YYYY-MM-DD" placeholderTextColor={colors.textMuted}
              />
              <TouchableOpacity onPress={() => { setFromDate(month0); setToDate(today0); }} style={[styles.filterReset, { borderColor: colors.border }]}>
                <Ionicons name="refresh-outline" size={13} color={colors.primary} />
              </TouchableOpacity>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="checkmark-circle-outline" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {isAr ? 'لا توجد سجلات معايرة' : 'No calibration records'}
              </Text>
            </View>
          }
        />
      )}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: isCheckedIn ? colors.primary : colors.textMuted }]}
        onPress={openCreate}
        activeOpacity={0.85}
      >
        <Ionicons name={isCheckedIn ? 'add' : 'lock-closed'} size={isCheckedIn ? 28 : 22} color="#fff" />
      </TouchableOpacity>
      <CalModal
        visible={modalVisible}
        machines={machines}
        onClose={() => { setModalVisible(false); setEditing(null); }}
        onSave={handleSave}
        saving={saving}
        initialForm={editForm}
        isEdit={editing != null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1 },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:    { padding: spacing.md, paddingBottom: 100 },

  card:        { borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  machineName: { ...typography.h4, flex: 1, marginRight: spacing.sm },
  badges:      { flexDirection: 'column', alignItems: 'flex-end', gap: 4 },
  badge:       { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  badgeText:   { fontSize: 10, fontWeight: '700' },
  details:     { flexDirection: 'row', justifyContent: 'space-between' },
  detailBlock: { alignItems: 'center' },
  detailLabel: { ...typography.caption, marginBottom: 2 },
  detailValue: { ...typography.h4 },
  notes:       { ...typography.caption, marginTop: spacing.sm, fontStyle: 'italic' },

  filterBar:   { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.sm, paddingVertical: 8, borderRadius: radius.md, marginBottom: spacing.sm },
  filterInput: { flex: 1, borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, fontSize: 13 },
  filterReset: { width: 30, height: 30, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },

  empty:     { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText: { ...typography.bodySmall },

  notCheckedBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: spacing.md, marginBottom: 4, paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1 },
  notCheckedText:   { fontSize: 13, fontWeight: '600', flex: 1 },

  fab: { position: 'absolute', bottom: 28, right: 24, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', ...shadow.lg },

  overlay:      { flex: 1, justifyContent: 'flex-end' },
  overlayBg:    { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:        { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: spacing.xl, maxHeight: '90%' },
  sheetHandle:  { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  sheetTitle:   { ...typography.h3, textAlign: 'center', marginBottom: spacing.lg },
  fieldLabel:   { ...typography.caption, marginBottom: 6, marginTop: spacing.sm },
  input:        { borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: 11, ...typography.body, marginBottom: 4 },
  multiline:    { height: 80, paddingTop: 10 },
  sheetActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  cancelBtn:    { flex: 1, paddingVertical: 13, borderRadius: radius.md, borderWidth: 1.5, alignItems: 'center' },
  cancelText:   { ...typography.body, fontWeight: '600' },
  saveBtn:      { flex: 2, paddingVertical: 13, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  saveText:     { ...typography.body, fontWeight: '700', color: '#fff' },

  pickerWrap:  { marginBottom: spacing.md },
  pickerLabel: { ...typography.caption, marginBottom: 6 },
  pickerRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip:        { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1.5 },
  chipText:    { fontSize: 12, fontWeight: '600' },
});
