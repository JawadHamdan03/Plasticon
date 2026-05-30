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
import { ScreenHeader } from '../../components';
import { colors, radius, shadow, spacing, typography } from '../../theme';

interface WorkOrder {
  id: number;
  machine?: { id: number; name: string; type: string };
  machineId?: number;
  scheduleType?: string;
  frequency?: string;
  nextScheduledDate?: string;
  status?: string;
  description?: string | null;
  assignedEngineer?: { id: number; fullName: string } | null;
  createdAt: string;
}

interface Machine {
  id: number;
  name: string;
  type?: string;
}

type StatusOpt = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
const STATUS_OPTIONS: StatusOpt[] = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

const SCHEDULE_TYPES = ['lubricate', 'mold', 'clean_cavity', 'oil_change', 'belt_check', 'cooling', 'electrical', 'custom'];
const FREQUENCIES     = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];

interface FormState {
  machineId: string;
  scheduleType: string;
  frequency: string;
  nextScheduledDate: string;
  description: string;
  status: StatusOpt;
}

const DEFAULT_FORM: FormState = {
  machineId: '', scheduleType: 'custom', frequency: 'monthly',
  nextScheduledDate: '', description: '', status: 'PENDING',
};

const STATUS_META: Record<string, { color: string; icon: string }> = {
  PENDING:     { color: colors.warning,   icon: 'time-outline' },
  IN_PROGRESS: { color: colors.info,      icon: 'play-circle-outline' },
  COMPLETED:   { color: colors.success,   icon: 'checkmark-circle-outline' },
  CANCELLED:   { color: colors.textMuted, icon: 'close-circle-outline' },
};

const TASK_ICONS: Record<string, string> = {
  lubricate: '🛢️', mold: '🔩', clean_cavity: '🧹', oil_change: '🔧',
  belt_check: '⚙️', cooling: '❄️', electrical: '⚡', custom: '✏️',
};

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// ─── Chip row helper ──────────────────────────────────────────────────────────

function ChipRow({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <View style={ps.wrap}>
      <Text style={ps.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={ps.row}>
          {options.map((opt) => (
            <TouchableOpacity key={opt} style={[ps.chip, value === opt && ps.chipActive]} onPress={() => onChange(opt)} activeOpacity={0.7}>
              <Text style={[ps.chipText, value === opt && ps.chipTextActive]}>{opt.replace('_', ' ')}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
const ps = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  label: { ...typography.caption, marginBottom: 6 },
  row: { flexDirection: 'row', gap: spacing.sm },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  chipTextActive: { color: colors.primary },
});

// ─── Form Modal ───────────────────────────────────────────────────────────────

function WorkOrderModal({ visible, initial, machines, onClose, onSave, saving }: {
  visible: boolean; initial: FormState; machines: Machine[]; onClose: () => void;
  onSave: (f: FormState) => Promise<void>; saving: boolean;
}) {
  const [form, setForm] = useState<FormState>(initial);
  useEffect(() => { if (visible) setForm(initial); }, [visible, initial]);
  const set = (k: keyof FormState) => (v: string) => setForm((p) => ({ ...p, [k]: v }));
  const isEdit = initial.machineId !== '' || initial.description !== '';

  const handleSave = async () => {
    if (!form.machineId.trim()) return Alert.alert('Validation', 'Machine is required.');
    await onSave(form);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.overlayBg} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{isEdit ? 'Edit Work Order' : 'New Work Order'}</Text>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            <Text style={styles.fieldLabel}>Machine *</Text>
            {machines.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  {machines.map((m) => (
                    <TouchableOpacity
                      key={m.id}
                      style={[ps.chip, form.machineId === String(m.id) && ps.chipActive]}
                      onPress={() => setForm((p) => ({ ...p, machineId: String(m.id) }))}
                    >
                      <Text style={[ps.chipText, form.machineId === String(m.id) && ps.chipTextActive]}>{m.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            ) : (
              <TextInput style={styles.input} value={form.machineId} onChangeText={set('machineId')} placeholder="Machine ID" placeholderTextColor={colors.textMuted} keyboardType="numeric" />
            )}

            <ChipRow label="Task Type" value={form.scheduleType} options={SCHEDULE_TYPES} onChange={(v) => setForm((p) => ({ ...p, scheduleType: v }))} />
            <ChipRow label="Frequency" value={form.frequency} options={FREQUENCIES} onChange={(v) => setForm((p) => ({ ...p, frequency: v }))} />
            <ChipRow label="Status" value={form.status} options={STATUS_OPTIONS} onChange={(v) => setForm((p) => ({ ...p, status: v as StatusOpt }))} />

            <Text style={styles.fieldLabel}>Next Scheduled Date</Text>
            <TextInput style={styles.input} value={form.nextScheduledDate} onChangeText={set('nextScheduledDate')} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted} />

            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput style={[styles.input, styles.multiline]} value={form.description} onChangeText={set('description')} placeholder="Optional description" placeholderTextColor={colors.textMuted} multiline numberOfLines={3} textAlignVertical="top" />
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

// ─── Card ─────────────────────────────────────────────────────────────────────

function WorkOrderCard({ item, onEdit, onDelete, onChangeStatus, updatingId }: {
  item: WorkOrder;
  onEdit: () => void;
  onDelete: () => void;
  onChangeStatus: (id: number, status: StatusOpt) => void;
  updatingId: number | null;
}) {
  const status   = (item.status ?? 'PENDING') as StatusOpt;
  const meta     = STATUS_META[status] ?? STATUS_META.PENDING;
  const taskIcon = item.scheduleType ? (TASK_ICONS[item.scheduleType] ?? '🔧') : '🔧';
  const updating = updatingId === item.id;

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.taskIcon}>{taskIcon}</Text>
        <View style={styles.cardMain}>
          <Text style={styles.machineName} numberOfLines={1}>{item.machine?.name ?? `WO #${item.id}`}</Text>
          <Text style={styles.scheduleType}>{item.scheduleType ?? 'Task'} · {item.frequency}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: `${meta.color}15` }]}>
          <Ionicons name={meta.icon as any} size={12} color={meta.color} />
          <Text style={[styles.badgeText, { color: meta.color }]}>{status.replace('_', ' ')}</Text>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity onPress={onEdit} style={styles.actionBtn} hitSlop={6}>
            <Ionicons name="pencil-outline" size={14} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={styles.actionBtn} hitSlop={6}>
            <Ionicons name="trash-outline" size={14} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </View>

      {item.description ? <Text style={styles.desc} numberOfLines={2}>{item.description}</Text> : null}

      <View style={styles.footer}>
        <Text style={styles.dueLabel}>Due: <Text style={styles.dueDate}>{fmtDate(item.nextScheduledDate)}</Text></Text>
        {item.assignedEngineer ? (
          <View style={styles.assignee}>
            <Ionicons name="person" size={11} color={colors.textMuted} />
            <Text style={styles.assigneeText}>{item.assignedEngineer.fullName}</Text>
          </View>
        ) : null}
      </View>

      {/* Quick status actions */}
      {!updating && (
        <View style={styles.statusBtns}>
          {status === 'PENDING' && (
            <TouchableOpacity style={[styles.statusBtn, { backgroundColor: `${colors.info}15` }]} onPress={() => onChangeStatus(item.id, 'IN_PROGRESS')}>
              <Ionicons name="play-circle" size={13} color={colors.info} />
              <Text style={[styles.statusBtnText, { color: colors.info }]}>Start</Text>
            </TouchableOpacity>
          )}
          {status === 'IN_PROGRESS' && (
            <TouchableOpacity style={[styles.statusBtn, { backgroundColor: `${colors.success}15` }]} onPress={() => onChangeStatus(item.id, 'COMPLETED')}>
              <Ionicons name="checkmark-circle" size={13} color={colors.success} />
              <Text style={[styles.statusBtnText, { color: colors.success }]}>Complete</Text>
            </TouchableOpacity>
          )}
          {status === 'COMPLETED' && (
            <TouchableOpacity style={[styles.statusBtn, { backgroundColor: `${colors.warning}15` }]} onPress={() => onChangeStatus(item.id, 'PENDING')}>
              <Ionicons name="refresh-circle" size={13} color={colors.warning} />
              <Text style={[styles.statusBtnText, { color: colors.warning }]}>Reopen</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      {updating && <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 8 }} />}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function WorkOrdersScreen() {
  const [orders, setOrders]         = useState<WorkOrder[]>([]);
  const [machines, setMachines]     = useState<Machine[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing]       = useState<WorkOrder | null>(null);
  const [saving, setSaving]         = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const [woRes, mRes] = await Promise.all([
        api.get<{ schedules?: WorkOrder[]; workOrders?: WorkOrder[] }>('/maintenance-schedule?limit=40'),
        api.get<{ machines?: Machine[] }>('/machines').catch(() => ({ machines: [] })),
      ]);
      setOrders(woRes.schedules ?? woRes.workOrders ?? []);
      setMachines((mRes as any).machines ?? []);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to load work orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const openCreate = () => { setEditing(null); setModalVisible(true); };
  const openEdit   = (item: WorkOrder) => { setEditing(item); setModalVisible(true); };

  const confirmDelete = (item: WorkOrder) => {
    Alert.alert('Delete Work Order', `Delete "${item.machine?.name ?? `WO #${item.id}`}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void handleDelete(item.id) },
    ]);
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/maintenance-schedule/${id}`);
      setRefreshing(true);
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to delete');
    }
  };

  const handleChangeStatus = async (id: number, status: StatusOpt) => {
    setUpdatingId(id);
    try {
      await api.patch(`/maintenance-schedule/${id}`, { status });
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSave = async (form: FormState) => {
    setSaving(true);
    try {
      const body: Record<string, any> = {
        machineId: Number(form.machineId),
        scheduleType: form.scheduleType,
        frequency: form.frequency,
        status: form.status,
      };
      if (form.nextScheduledDate.trim()) body.nextScheduledDate = form.nextScheduledDate.trim();
      if (form.description.trim()) body.description = form.description.trim();

      if (editing) {
        await api.patch(`/maintenance-schedule/${editing.id}`, body);
      } else {
        await api.post('/maintenance-schedule', body);
      }
      setModalVisible(false);
      setRefreshing(true);
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const pending   = orders.filter((o) => o.status === 'PENDING' || o.status === 'IN_PROGRESS').length;
  const completed = orders.filter((o) => o.status === 'COMPLETED').length;

  const initialForm: FormState = editing
    ? {
        machineId: editing.machineId ? String(editing.machineId) : (editing.machine?.id ? String(editing.machine.id) : ''),
        scheduleType: editing.scheduleType ?? 'custom',
        frequency: editing.frequency ?? 'monthly',
        nextScheduledDate: editing.nextScheduledDate ? editing.nextScheduledDate.split('T')[0] : '',
        description: editing.description ?? '',
        status: (editing.status as StatusOpt) ?? 'PENDING',
      }
    : DEFAULT_FORM;

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Work Orders" subtitle={`${pending} active · ${completed} done`} showBack />
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(i) => String(i.id)}
          renderItem={({ item }) => (
            <WorkOrderCard
              item={item}
              onEdit={() => openEdit(item)}
              onDelete={() => confirmDelete(item)}
              onChangeStatus={handleChangeStatus}
              updatingId={updatingId}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="clipboard-outline" size={44} color={colors.textMuted} /><Text style={styles.emptyText}>No work orders</Text></View>}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={openCreate} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color={colors.textInverse} />
      </TouchableOpacity>

      <WorkOrderModal
        visible={modalVisible}
        initial={initialForm}
        machines={machines}
        onClose={() => setModalVisible(false)}
        onSave={handleSave}
        saving={saving}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:   { padding: spacing.md, paddingBottom: 100 },

  card:        { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardTop:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 8 },
  taskIcon:    { fontSize: 22, width: 36, textAlign: 'center' },
  cardMain:    { flex: 1 },
  machineName: { ...typography.h4 },
  scheduleType:{ ...typography.caption, marginTop: 1 },
  badge:       { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  badgeText:   { fontSize: 10, fontWeight: '700' },
  cardActions: { flexDirection: 'column', gap: 2 },
  actionBtn:   { padding: 3 },
  desc:        { ...typography.bodySmall, color: colors.textSecondary, marginBottom: 8 },
  footer:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  dueLabel:    { ...typography.caption },
  dueDate:     { fontWeight: '700', color: colors.text },
  assignee:    { flexDirection: 'row', alignItems: 'center', gap: 3 },
  assigneeText:{ ...typography.caption },
  statusBtns:  { flexDirection: 'row', gap: spacing.sm },
  statusBtn:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full },
  statusBtnText:{ fontSize: 12, fontWeight: '700' },

  empty:    { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText:{ ...typography.bodySmall, color: colors.textMuted },

  fab:         { position: 'absolute', bottom: 28, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', ...shadow.lg },

  overlay:     { flex: 1, justifyContent: 'flex-end' },
  overlayBg:   { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:       { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: spacing.xl, maxHeight: '92%' },
  sheetHandle: { width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  sheetTitle:  { ...typography.h3, textAlign: 'center', marginBottom: spacing.lg },
  fieldLabel:  { ...typography.caption, marginBottom: 6, marginTop: spacing.sm },
  input:       { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: 11, ...typography.body, marginBottom: 4 },
  multiline:   { height: 80, paddingTop: 10 },
  sheetActions:{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  cancelBtn:   { flex: 1, paddingVertical: 13, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center' },
  cancelText:  { ...typography.body, fontWeight: '600', color: colors.textSecondary },
  saveBtn:     { flex: 2, paddingVertical: 13, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  saveText:    { ...typography.body, fontWeight: '700', color: colors.textInverse },
});
