import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, KeyboardAvoidingView,
  Modal, Platform, RefreshControl, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { Button, ScreenHeader } from '../../components';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

interface Machine { id: number; name: string; type?: string }
interface HealthRecord {
  id: number;
  machine?: { id: number; name: string };
  machineId?: number;
  operationalStatus: string;
  efficiencyRating: number;
  maintenanceHours: number;
  downtimePercentage: number;
  notes?: string | null;
  recordedAt: string;
}

const STATUS_LIST = ['OPERATIONAL', 'MAINTENANCE', 'BROKEN', 'OFFLINE'];
const STATUS_META: Record<string, { label: string; labelAr: string; color: (c: any) => string }> = {
  OPERATIONAL:       { label: 'Operational',       labelAr: 'تشغيلي',        color: (c) => c.success },
  MAINTENANCE:       { label: 'Maintenance',       labelAr: 'صيانة',          color: (c) => c.warning },
  UNDER_MAINTENANCE: { label: 'Under Maintenance', labelAr: 'تحت الصيانة',    color: (c) => c.warning },
  BROKEN:            { label: 'Broken',            labelAr: 'معطل',           color: (c) => c.danger },
  OFFLINE:           { label: 'Offline',           labelAr: 'غير متصل',       color: (c) => c.textMuted },
};

interface FormState {
  machineId: string;
  status: string;
  efficiency: string;
  maintHours: string;
  downtime: string;
  notes: string;
}
const emptyForm = (): FormState => ({ machineId: '', status: 'OPERATIONAL', efficiency: '100', maintHours: '0', downtime: '0', notes: '' });

function RecordModal({ visible, machines, initial, title, onClose, onSave }: {
  visible: boolean; machines: Machine[]; initial: FormState; title: string;
  onClose: () => void; onSave: (f: FormState) => Promise<void>;
}) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const [form, setForm] = useState<FormState>(initial);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (visible) setForm(initial); }, [visible, initial]);
  const set = (k: keyof FormState) => (v: string) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.machineId) { Alert.alert(isAr ? 'مطلوب' : 'Required', isAr ? 'اختر آلة.' : 'Select a machine.'); return; }
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <Text style={[styles.sheetTitle, { color: colors.text }]}>{title}</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{isAr ? 'الآلة *' : 'Machine *'}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
              {machines.map((m) => (
                <TouchableOpacity key={m.id}
                  style={[styles.pill, { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
                    form.machineId === String(m.id) && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={() => set('machineId')(String(m.id))}
                >
                  <Text style={[styles.pillText, { color: colors.text }, form.machineId === String(m.id) && styles.pillActive]}>{m.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{isAr ? 'الحالة *' : 'Status *'}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
              {STATUS_LIST.map((s) => (
                <TouchableOpacity key={s}
                  style={[styles.pill, { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
                    form.status === s && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={() => set('status')(s)}
                >
                  <Text style={[styles.pillText, { color: colors.text }, form.status === s && styles.pillActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {[
              { label: isAr ? 'معدل الكفاءة (%)' : 'Efficiency (%)', key: 'efficiency' as const },
              { label: isAr ? 'ساعات الصيانة' : 'Maintenance Hours', key: 'maintHours' as const },
              { label: isAr ? 'نسبة التوقف (%)' : 'Downtime (%)', key: 'downtime' as const },
            ].map((f) => (
              <View key={f.key} style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{f.label}</Text>
                <TextInput
                  style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                  placeholderTextColor={colors.textMuted} keyboardType="decimal-pad"
                  value={form[f.key]} onChangeText={set(f.key)}
                />
              </View>
            ))}

            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{isAr ? 'ملاحظات' : 'Notes'}</Text>
              <TextInput
                style={[styles.input, styles.inputMulti, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                placeholderTextColor={colors.textMuted} multiline value={form.notes} onChangeText={set('notes')}
              />
            </View>

            <View style={styles.actions}>
              <Button variant="ghost" onPress={onClose} style={styles.actionBtn}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
              <Button onPress={submit} loading={saving} style={styles.actionBtn}>{isAr ? 'حفظ' : 'Save'}</Button>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function HealthCard({ item, onEdit, onDelete }: { item: HealthRecord; onEdit: () => void; onDelete: () => void }) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const meta = STATUS_META[item.operationalStatus] ?? STATUS_META.OFFLINE;
  const color = meta.color(colors);

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.cardTop}>
        <Text style={[styles.machineName, { color: colors.text }]} numberOfLines={1}>{item.machine?.name ?? `Record #${item.id}`}</Text>
        <View style={styles.cardTopRight}>
          <View style={[styles.badge, { backgroundColor: `${color}18` }]}>
            <Text style={[styles.badgeText, { color }]}>{isAr ? meta.labelAr : meta.label}</Text>
          </View>
          <TouchableOpacity onPress={onEdit} hitSlop={8} style={styles.iconBtn}>
            <Ionicons name="pencil-outline" size={15} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} hitSlop={8} style={styles.iconBtn}>
            <Ionicons name="trash-outline" size={15} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </View>
      <View style={[styles.metrics, { borderTopColor: colors.border }]}>
        <View style={styles.metric}>
          <Text style={[styles.metricVal, { color: colors.primary }]}>{item.efficiencyRating}%</Text>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>{isAr ? 'الكفاءة' : 'Efficiency'}</Text>
        </View>
        <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />
        <View style={styles.metric}>
          <Text style={[styles.metricVal, { color: item.downtimePercentage > 10 ? colors.danger : colors.text }]}>{item.downtimePercentage}%</Text>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>{isAr ? 'التوقف' : 'Downtime'}</Text>
        </View>
        <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />
        <View style={styles.metric}>
          <Text style={[styles.metricVal, { color: colors.text }]}>{item.maintenanceHours}h</Text>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>{isAr ? 'ساعات الصيانة' : 'Maint. Hrs'}</Text>
        </View>
      </View>
      {item.notes ? <Text style={[styles.notes, { color: colors.textMuted }]} numberOfLines={2}>{item.notes}</Text> : null}
    </View>
  );
}

export function MachineHealthScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const [records, setRecords]   = useState<HealthRecord[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal]       = useState(false);
  const [editing, setEditing]   = useState<HealthRecord | null>(null);

  const load = useCallback(async () => {
    try {
      const [rec, mach] = await Promise.allSettled([
        api.get<{ records: HealthRecord[] } | HealthRecord[]>('/machine-health?limit=40'),
        api.get<{ machines: Machine[] } | Machine[]>('/machines'),
      ]);
      if (rec.status  === 'fulfilled') {
        const v = rec.value;
        setRecords(Array.isArray(v) ? v : (v as any).records ?? []);
      }
      if (mach.status === 'fulfilled') {
        const v = mach.value;
        setMachines(Array.isArray(v) ? v : (v as any).machines ?? []);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const openCreate = () => { setEditing(null); setModal(true); };
  const openEdit   = (item: HealthRecord) => { setEditing(item); setModal(true); };

  const confirmDelete = (item: HealthRecord) => {
    Alert.alert(
      isAr ? 'حذف السجل' : 'Delete Record',
      `${isAr ? 'حذف سجل' : 'Delete record for'} "${item.machine?.name ?? `#${item.id}`}"?`,
      [
        { text: isAr ? 'إلغاء' : 'Cancel', style: 'cancel' },
        { text: isAr ? 'حذف' : 'Delete', style: 'destructive', onPress: () => void doDelete(item.id) },
      ],
    );
  };

  const doDelete = async (id: number) => {
    try {
      await api.delete(`/machine-health/${id}`);
      setRecords((prev) => prev.filter((r) => r.id !== id));
    } catch (e: any) {
      Alert.alert(isAr ? 'خطأ' : 'Error', e?.message ?? (isAr ? 'فشل الحذف.' : 'Failed to delete.'));
    }
  };

  const handleSave = async (form: FormState) => {
    const body = {
      machineId:          parseInt(form.machineId, 10),
      operationalStatus:  form.status,
      efficiencyRating:   parseFloat(form.efficiency) || 100,
      maintenanceHours:   parseFloat(form.maintHours) || 0,
      downtimePercentage: parseFloat(form.downtime)   || 0,
      notes:              form.notes.trim() || undefined,
    };
    try {
      if (editing) {
        await api.patch(`/machine-health/${editing.id}`, body);
      } else {
        await api.post('/machine-health', body);
      }
      setModal(false);
      setLoading(true);
      void load();
    } catch (e: any) {
      Alert.alert(isAr ? 'خطأ' : 'Error', e?.message ?? (isAr ? 'فشل الحفظ.' : 'Failed to save.'));
    }
  };

  const initForm: FormState = editing
    ? {
        machineId: editing.machineId ? String(editing.machineId) : (editing.machine?.id ? String(editing.machine.id) : ''),
        status:    editing.operationalStatus,
        efficiency: String(editing.efficiencyRating),
        maintHours: String(editing.maintenanceHours),
        downtime:   String(editing.downtimePercentage),
        notes:      editing.notes ?? '',
      }
    : emptyForm();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={isAr ? 'صحة الآلات' : 'Machine Health'} subtitle={`${records.length} ${isAr ? 'سجل' : 'records'}`} showBack />
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(i) => String(i.id)}
          renderItem={({ item }) => (
            <HealthCard item={item} onEdit={() => openEdit(item)} onDelete={() => confirmDelete(item)} />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="pulse-outline" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>{isAr ? 'لا توجد سجلات صحة' : 'No health records'}</Text>
            </View>
          }
        />
      )}
      <TouchableOpacity style={[styles.fab, { backgroundColor: colors.primary }]} onPress={openCreate} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
      <RecordModal
        visible={modal}
        machines={machines}
        initial={initForm}
        title={editing ? (isAr ? 'تعديل السجل' : 'Edit Record') : (isAr ? 'تسجيل سجل صحة' : 'Log Health Record')}
        onClose={() => setModal(false)}
        onSave={handleSave}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:   { padding: spacing.md, paddingBottom: 100 },

  card:        { borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  machineName: { ...typography.h3, flex: 1, marginRight: spacing.sm },
  cardTopRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badge:       { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  badgeText:   { fontSize: 11, fontWeight: '700' },
  iconBtn:     { padding: 3 },
  metrics:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingVertical: spacing.sm, borderTopWidth: 1 },
  metric:      { alignItems: 'center' },
  metricVal:   { fontSize: 20, fontWeight: '800' },
  metricLabel: { ...typography.caption, marginTop: 2 },
  metricDivider: { width: 1, height: 36 },
  notes:       { ...typography.bodySmall, marginTop: spacing.sm, fontStyle: 'italic' },

  empty:     { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText: { ...typography.bodySmall },

  fab: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', ...shadow.lg },

  overlay:  { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:    { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: 40, maxHeight: '90%' },
  handle:   { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  sheetTitle: { ...typography.h2, marginBottom: spacing.md },
  field:    { marginBottom: spacing.md },
  fieldLabel: { ...typography.caption, marginBottom: 6 },
  input:    { borderWidth: 1.5, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 11, fontSize: 15 },
  inputMulti: { height: 80, textAlignVertical: 'top' },
  pill:     { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1.5, marginRight: spacing.sm },
  pillText: { fontSize: 13, fontWeight: '600' },
  pillActive: { color: '#fff' },
  actions:  { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  actionBtn: { flex: 1 },
});
