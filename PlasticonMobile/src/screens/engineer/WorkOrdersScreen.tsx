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

const TASK_ICONS: Record<string, string> = {
  lubricate: '🛢️', mold: '🔩', clean_cavity: '🧹', oil_change: '🔧',
  belt_check: '⚙️', cooling: '❄️', electrical: '⚡', custom: '✏️',
};

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

type WOFilter = 'all' | 'today' | 'overdue' | 'done';

function isToday(d?: string) {
  if (!d) return false;
  return new Date(d).toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10);
}

function isOverdue(d?: string, status?: string) {
  if (!d || status === 'COMPLETED' || status === 'CANCELLED') return false;
  return new Date(d) < new Date();
}

function ChipRow({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.wrap}>
      <Text style={[styles.chipLabel, { color: colors.textMuted }]}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.chipRow}>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[styles.chip,
                { borderColor: colors.border, backgroundColor: colors.surface },
                value === opt && { borderColor: colors.primary, backgroundColor: colors.primaryLight },
              ]}
              onPress={() => onChange(opt)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText,
                { color: colors.textSecondary },
                value === opt && { color: colors.primary },
              ]}>{opt.replace('_', ' ')}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function WorkOrderModal({ visible, initial, machines, onClose, onSave, saving }: {
  visible: boolean; initial: FormState; machines: Machine[]; onClose: () => void;
  onSave: (f: FormState) => Promise<void>; saving: boolean;
}) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const [form, setForm] = useState<FormState>(initial);
  useEffect(() => { if (visible) setForm(initial); }, [visible, initial]);
  const set = (k: keyof FormState) => (v: string) => setForm((p) => ({ ...p, [k]: v }));
  const isEdit = initial.machineId !== '' || initial.description !== '';

  const handleSave = async () => {
    if (!form.machineId.trim()) return Alert.alert(isAr ? 'تحقق' : 'Validation', isAr ? 'الآلة مطلوبة.' : 'Machine is required.');
    await onSave(form);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.overlayBg} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.sheetTitle, { color: colors.text }]}>{isEdit ? (isAr ? 'تعديل أمر العمل' : 'Edit Work Order') : (isAr ? 'أمر عمل جديد' : 'New Work Order')}</Text>
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
                        form.machineId === String(m.id) && { borderColor: colors.primary, backgroundColor: colors.primaryLight },
                      ]}
                      onPress={() => setForm((p) => ({ ...p, machineId: String(m.id) }))}
                    >
                      <Text style={[styles.chipText,
                        { color: colors.textSecondary },
                        form.machineId === String(m.id) && { color: colors.primary },
                      ]}>{m.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            ) : (
              <TextInput style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }]} value={form.machineId} onChangeText={set('machineId')} placeholder={isAr ? 'رقم الآلة' : 'Machine ID'} placeholderTextColor={colors.textMuted} keyboardType="numeric" />
            )}

            <ChipRow label={isAr ? 'نوع المهمة' : 'Task Type'} value={form.scheduleType} options={SCHEDULE_TYPES} onChange={(v) => setForm((p) => ({ ...p, scheduleType: v }))} />
            <ChipRow label={isAr ? 'التكرار' : 'Frequency'} value={form.frequency} options={FREQUENCIES} onChange={(v) => setForm((p) => ({ ...p, frequency: v }))} />
            <ChipRow label={isAr ? 'الحالة' : 'Status'} value={form.status} options={STATUS_OPTIONS} onChange={(v) => setForm((p) => ({ ...p, status: v as StatusOpt }))} />

            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{isAr ? 'تاريخ الجدولة التالي' : 'Next Scheduled Date'}</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }]} value={form.nextScheduledDate} onChangeText={set('nextScheduledDate')} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted} />

            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{isAr ? 'الوصف' : 'Description'}</Text>
            <TextInput style={[styles.input, styles.multiline, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }]} value={form.description} onChangeText={set('description')} placeholder={isAr ? 'وصف اختياري' : 'Optional description'} placeholderTextColor={colors.textMuted} multiline numberOfLines={3} textAlignVertical="top" />
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

function WorkOrderCard({ item, onEdit, onDelete, onChangeStatus, updatingId }: {
  item: WorkOrder;
  onEdit: () => void;
  onDelete: () => void;
  onChangeStatus: (id: number, status: StatusOpt) => void;
  updatingId: number | null;
}) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();

  const STATUS_META: Record<string, { color: string; icon: string }> = {
    PENDING:     { color: colors.warning,   icon: 'time-outline' },
    IN_PROGRESS: { color: colors.info,      icon: 'play-circle-outline' },
    COMPLETED:   { color: colors.success,   icon: 'checkmark-circle-outline' },
    CANCELLED:   { color: colors.textMuted, icon: 'close-circle-outline' },
  };

  const status   = (item.status ?? 'PENDING') as StatusOpt;
  const meta     = STATUS_META[status] ?? STATUS_META.PENDING;
  const taskIcon = item.scheduleType ? (TASK_ICONS[item.scheduleType] ?? '🔧') : '🔧';
  const updating = updatingId === item.id;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.cardTop}>
        <Text style={styles.taskIcon}>{taskIcon}</Text>
        <View style={styles.cardMain}>
          <Text style={[styles.machineName, { color: colors.text }]} numberOfLines={1}>{item.machine?.name ?? `WO #${item.id}`}</Text>
          <Text style={[styles.scheduleType, { color: colors.textMuted }]}>{item.scheduleType ?? 'Task'} · {item.frequency}</Text>
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

      {item.description ? <Text style={[styles.desc, { color: colors.textSecondary }]} numberOfLines={2}>{item.description}</Text> : null}

      <View style={styles.footer}>
        <Text style={[styles.dueLabel, { color: colors.textMuted }]}>{isAr ? 'الموعد: ' : 'Due: '}<Text style={[styles.dueDate, { color: colors.text }]}>{fmtDate(item.nextScheduledDate)}</Text></Text>
        {item.assignedEngineer ? (
          <View style={styles.assignee}>
            <Ionicons name="person" size={11} color={colors.textMuted} />
            <Text style={[styles.assigneeText, { color: colors.textMuted }]}>{item.assignedEngineer.fullName}</Text>
          </View>
        ) : null}
      </View>

      {!updating && (
        <View style={styles.statusBtns}>
          {status === 'PENDING' && (
            <TouchableOpacity style={[styles.statusBtn, { backgroundColor: `${colors.info}15` }]} onPress={() => onChangeStatus(item.id, 'IN_PROGRESS')}>
              <Ionicons name="play-circle" size={13} color={colors.info} />
              <Text style={[styles.statusBtnText, { color: colors.info }]}>{isAr ? 'ابدأ' : 'Start'}</Text>
            </TouchableOpacity>
          )}
          {status === 'IN_PROGRESS' && (
            <TouchableOpacity style={[styles.statusBtn, { backgroundColor: `${colors.success}15` }]} onPress={() => onChangeStatus(item.id, 'COMPLETED')}>
              <Ionicons name="checkmark-circle" size={13} color={colors.success} />
              <Text style={[styles.statusBtnText, { color: colors.success }]}>{isAr ? 'أكمل' : 'Complete'}</Text>
            </TouchableOpacity>
          )}
          {status === 'COMPLETED' && (
            <TouchableOpacity style={[styles.statusBtn, { backgroundColor: `${colors.warning}15` }]} onPress={() => onChangeStatus(item.id, 'PENDING')}>
              <Ionicons name="refresh-circle" size={13} color={colors.warning} />
              <Text style={[styles.statusBtnText, { color: colors.warning }]}>{isAr ? 'إعادة فتح' : 'Reopen'}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      {updating && <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 8 }} />}
    </View>
  );
}

export function WorkOrdersScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const [orders, setOrders]         = useState<WorkOrder[]>([]);
  const [machines, setMachines]     = useState<Machine[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing]       = useState<WorkOrder | null>(null);
  const [saving, setSaving]         = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [woFilter, setWoFilter]     = useState<WOFilter>('all');

  const load = useCallback(async () => {
    try {
      const [woRes, mRes] = await Promise.all([
        api.get<WorkOrder[]>('/maintenance-schedule?limit=40'),
        api.get<Machine[]>('/machines').catch(() => [] as Machine[]),
      ]);
      setOrders(Array.isArray(woRes) ? woRes : []);
      setMachines(Array.isArray(mRes) ? mRes : []);
    } catch (e: any) {
      Alert.alert(isAr ? 'خطأ' : 'Error', e?.message ?? (isAr ? 'فشل تحميل أوامر العمل' : 'Failed to load work orders'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAr]);

  useEffect(() => { void load(); }, [load]);

  const openCreate = () => { setEditing(null); setModalVisible(true); };
  const openEdit   = (item: WorkOrder) => { setEditing(item); setModalVisible(true); };

  const confirmDelete = (item: WorkOrder) => {
    Alert.alert(
      isAr ? 'حذف أمر العمل' : 'Delete Work Order',
      `${isAr ? 'حذف' : 'Delete'} "${item.machine?.name ?? `WO #${item.id}`}"?`,
      [
        { text: isAr ? 'إلغاء' : 'Cancel', style: 'cancel' },
        { text: isAr ? 'حذف' : 'Delete', style: 'destructive', onPress: () => void handleDelete(item.id) },
      ],
    );
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/maintenance-schedule/${id}`);
      setRefreshing(true);
      await load();
    } catch (e: any) {
      Alert.alert(isAr ? 'خطأ' : 'Error', e?.message ?? (isAr ? 'فشل الحذف' : 'Failed to delete'));
    }
  };

  const handleChangeStatus = async (id: number, status: StatusOpt) => {
    setUpdatingId(id);
    try {
      await api.patch(`/maintenance-schedule/${id}`, { status });
      await load();
    } catch (e: any) {
      Alert.alert(isAr ? 'خطأ' : 'Error', e?.message ?? (isAr ? 'فشل تحديث الحالة' : 'Failed to update status'));
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
      Alert.alert(isAr ? 'خطأ' : 'Error', e?.message ?? (isAr ? 'فشل الحفظ' : 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  const pending   = orders.filter((o) => o.status === 'PENDING' || o.status === 'IN_PROGRESS').length;
  const completed = orders.filter((o) => o.status === 'COMPLETED').length;

  const displayed = useMemo(() => {
    if (woFilter === 'today')   return orders.filter((o) => isToday(o.nextScheduledDate));
    if (woFilter === 'overdue') return orders.filter((o) => isOverdue(o.nextScheduledDate, o.status));
    if (woFilter === 'done')    return orders.filter((o) => o.status === 'COMPLETED');
    return orders;
  }, [orders, woFilter]);

  const WO_FILTERS: { key: WOFilter; labelEn: string; labelAr: string }[] = [
    { key: 'all',     labelEn: 'All',     labelAr: 'الكل' },
    { key: 'today',   labelEn: 'Today',   labelAr: 'اليوم' },
    { key: 'overdue', labelEn: 'Overdue', labelAr: 'متأخر' },
    { key: 'done',    labelEn: 'Done',    labelAr: 'مكتمل' },
  ];

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
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={isAr ? 'أوامر العمل' : 'Work Orders'} subtitle={`${pending} ${isAr ? 'نشط' : 'active'} · ${completed} ${isAr ? 'مكتمل' : 'done'}`} showBack />
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={(i, idx) => `${String(i.id)}-${idx}`}
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
          ListHeaderComponent={
            <View style={[styles.filterRow, { borderColor: colors.border }]}>
              {WO_FILTERS.map((f) => (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.filterTab, woFilter === f.key && { backgroundColor: colors.primary }]}
                  onPress={() => setWoFilter(f.key)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.filterTabText, { color: woFilter === f.key ? '#fff' : colors.textMuted }]}>
                    {isAr ? f.labelAr : f.labelEn}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="clipboard-outline" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>{isAr ? 'لا توجد أوامر عمل' : 'No work orders'}</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity style={[styles.fab, { backgroundColor: colors.primary }]} onPress={openCreate} activeOpacity={0.85}>
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

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:   { padding: spacing.md, paddingBottom: 100 },

  card:        { borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardTop:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 8 },
  taskIcon:    { fontSize: 22, width: 36, textAlign: 'center' },
  cardMain:    { flex: 1 },
  machineName: { ...typography.h4 },
  scheduleType:{ ...typography.caption, marginTop: 1 },
  badge:       { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  badgeText:   { fontSize: 10, fontWeight: '700' },
  cardActions: { flexDirection: 'column', gap: 2 },
  actionBtn:   { padding: 3 },
  desc:        { ...typography.bodySmall, marginBottom: 8 },
  footer:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  dueLabel:    { ...typography.caption },
  dueDate:     { fontWeight: '700' },
  assignee:    { flexDirection: 'row', alignItems: 'center', gap: 3 },
  assigneeText:{ ...typography.caption },
  statusBtns:  { flexDirection: 'row', gap: spacing.sm },
  statusBtn:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full },
  statusBtnText:{ fontSize: 12, fontWeight: '700' },

  filterRow:     { flexDirection: 'row', borderWidth: 1, borderRadius: radius.md, marginBottom: spacing.md, overflow: 'hidden' },
  filterTab:     { flex: 1, paddingVertical: 9, alignItems: 'center' },
  filterTabText: { fontSize: 12, fontWeight: '700' },

  empty:    { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText:{ ...typography.bodySmall },

  fab: { position: 'absolute', bottom: 28, right: 24, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', ...shadow.lg },

  overlay:  { flex: 1, justifyContent: 'flex-end' },
  overlayBg:{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:    { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: spacing.xl, maxHeight: '92%' },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  sheetTitle:  { ...typography.h3, textAlign: 'center', marginBottom: spacing.lg },
  fieldLabel:  { ...typography.caption, marginBottom: 6, marginTop: spacing.sm },
  input:       { borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: 11, ...typography.body, marginBottom: 4 },
  multiline:   { height: 80, paddingTop: 10 },
  sheetActions:{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  cancelBtn:   { flex: 1, paddingVertical: 13, borderRadius: radius.md, borderWidth: 1.5, alignItems: 'center' },
  cancelText:  { ...typography.body, fontWeight: '600' },
  saveBtn:     { flex: 2, paddingVertical: 13, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  saveText:    { ...typography.body, fontWeight: '700' },

  wrap:     { marginBottom: spacing.md },
  chipLabel:{ ...typography.caption, marginBottom: 6 },
  chipRow:  { flexDirection: 'row', gap: spacing.sm },
  chip:     { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1.5 },
  chipText: { fontSize: 12, fontWeight: '600' },
});
