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

interface Receivable {
  id: number;
  customerName?: string;
  customer?: { id: number; name: string };
  amount: number;
  dueDate?: string;
  status?: string;
  notes?: string;
  createdAt: string;
}

type StatusOpt = 'PENDING' | 'COLLECTED' | 'OVERDUE';
const STATUS_OPTIONS: StatusOpt[] = ['PENDING', 'COLLECTED', 'OVERDUE'];

interface FormState {
  customerName: string;
  amount: string;
  dueDate: string;
  status: StatusOpt;
  notes: string;
}

const DEFAULT_FORM: FormState = { customerName: '', amount: '', dueDate: '', status: 'PENDING', notes: '' };

function fmt(n: number) { return n.toLocaleString('en-US', { minimumFractionDigits: 2 }); }

function InlinePicker<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: T[]; onChange: (v: T) => void }) {
  const { colors } = useAppTheme();
  return (
    <View style={ps.wrap}>
      <Text style={[ps.label, { color: colors.text }]}>{label}</Text>
      <View style={ps.row}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[ps.chip, { borderColor: colors.border, backgroundColor: colors.surface }, value === opt && { borderColor: colors.primary, backgroundColor: colors.primaryLight }]}
            onPress={() => onChange(opt)}
            activeOpacity={0.7}
          >
            <Text style={[ps.chipText, { color: colors.textSecondary }, value === opt && { color: colors.primary }]}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
const ps = StyleSheet.create({
  wrap:  { marginBottom: spacing.md },
  label: { ...typography.caption, marginBottom: 6 },
  row:   { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip:  { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1.5 },
  chipText: { fontSize: 13, fontWeight: '600' },
});

function RecModal({ visible, initial, onClose, onSave, saving }: {
  visible: boolean; initial: FormState; onClose: () => void; onSave: (f: FormState) => Promise<void>; saving: boolean;
}) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const [form, setForm] = useState<FormState>(initial);
  useEffect(() => { if (visible) setForm(initial); }, [visible, initial]);
  const set = (k: keyof FormState) => (v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.customerName.trim()) return Alert.alert(isAr ? 'تحقق' : 'Validation', isAr ? 'اسم العميل مطلوب.' : 'Customer name is required.');
    if (!form.amount.trim() || isNaN(Number(form.amount))) return Alert.alert(isAr ? 'تحقق' : 'Validation', isAr ? 'يجب أن يكون المبلغ رقماً.' : 'Amount must be a number.');
    await onSave(form);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.overlayBg} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.sheetTitle, { color: colors.text }]}>{initial.customerName ? (isAr ? 'تعديل المستحق' : 'Edit Receivable') : (isAr ? 'مستحق جديد' : 'New Receivable')}</Text>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={[styles.fieldLabel, { color: colors.text }]}>{isAr ? 'اسم العميل *' : 'Customer Name *'}</Text>
            <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]} value={form.customerName} onChangeText={set('customerName')} placeholder={isAr ? 'اسم العميل' : 'Customer name'} placeholderTextColor={colors.textMuted} />

            <Text style={[styles.fieldLabel, { color: colors.text }]}>{isAr ? 'المبلغ *' : 'Amount *'}</Text>
            <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]} value={form.amount} onChangeText={set('amount')} placeholder="0.00" placeholderTextColor={colors.textMuted} keyboardType="numeric" />

            <Text style={[styles.fieldLabel, { color: colors.text }]}>{isAr ? 'تاريخ الاستحقاق' : 'Due Date'}</Text>
            <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]} value={form.dueDate} onChangeText={set('dueDate')} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted} />

            <InlinePicker label={isAr ? 'الحالة' : 'Status'} value={form.status} options={STATUS_OPTIONS} onChange={(v) => setForm((p) => ({ ...p, status: v }))} />

            <Text style={[styles.fieldLabel, { color: colors.text }]}>{isAr ? 'ملاحظات' : 'Notes'}</Text>
            <TextInput style={[styles.input, styles.multiline, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]} value={form.notes} onChangeText={set('notes')} placeholder={isAr ? 'ملاحظات اختيارية' : 'Optional notes'} placeholderTextColor={colors.textMuted} multiline numberOfLines={3} textAlignVertical="top" />
          </ScrollView>
          <View style={styles.sheetActions}>
            <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={onClose}><Text style={[styles.cancelText, { color: colors.textSecondary }]}>{isAr ? 'إلغاء' : 'Cancel'}</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color={colors.textInverse} /> : <Text style={[styles.saveText, { color: colors.textInverse }]}>{isAr ? 'حفظ' : 'Save'}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function RecCard({ item, onEdit, onDelete }: { item: Receivable; onEdit: () => void; onDelete: () => void }) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();

  const STATUS_COLOR: Record<string, string> = {
    PENDING: colors.warning, COLLECTED: colors.success, OVERDUE: colors.danger,
  };

  const status  = item.status ?? 'PENDING';
  const isPaid  = status === 'COLLECTED' || status === 'PAID';
  const color   = STATUS_COLOR[status] ?? STATUS_COLOR['PENDING'];
  const name    = item.customerName ?? item.customer?.name ?? `${isAr ? 'سجل' : 'Record'} #${item.id}`;
  const amount  = item.amount ?? 0;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <Text style={[styles.customer, { color: colors.text }]} numberOfLines={1}>{name}</Text>
          {item.dueDate && (
            <Text style={[styles.inv, { color: colors.textMuted }]}>
              {isAr ? 'تاريخ الاستحقاق:' : 'Due:'} {new Date(item.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
          )}
        </View>
        <View style={styles.cardRight}>
          <Text style={[styles.balance, { color: isPaid ? colors.success : color }]}>${fmt(amount)}</Text>
          <Text style={[styles.balLabel, { color: colors.textMuted }]}>{isPaid ? (isAr ? 'محصل' : 'collected') : (isAr ? 'متبقي' : 'outstanding')}</Text>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity onPress={onEdit} style={styles.actionBtn} hitSlop={6}>
            <Ionicons name="pencil-outline" size={16} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={styles.actionBtn} hitSlop={6}>
            <Ionicons name="trash-outline" size={16} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.metaRow}>
        <View style={[styles.badge, { backgroundColor: `${color}15` }]}>
          <Text style={[styles.badgeText, { color }]}>{status}</Text>
        </View>
        {item.notes ? <Text style={[styles.notesText, { color: colors.textMuted }]} numberOfLines={1}>{item.notes}</Text> : null}
      </View>
    </View>
  );
}

export function CustomerReceivablesScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();

  const [records, setRecords]       = useState<Receivable[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing]       = useState<Receivable | null>(null);
  const [saving, setSaving]         = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<Receivable[]>('/customer-receivables?limit=30');
      setRecords(Array.isArray(res) ? res : []);
    } catch (e: any) {
      Alert.alert(isAr ? 'خطأ' : 'Error', e?.message ?? (isAr ? 'فشل تحميل المستحقات' : 'Failed to load receivables'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAr]);

  useEffect(() => { void load(); }, [load]);

  const openCreate = () => { setEditing(null); setModalVisible(true); };
  const openEdit   = (item: Receivable) => { setEditing(item); setModalVisible(true); };

  const confirmDelete = (item: Receivable) => {
    Alert.alert(
      isAr ? 'حذف المستحق' : 'Delete Receivable',
      `${isAr ? 'حذف سجل لـ' : 'Delete record for'} "${item.customerName ?? item.customer?.name ?? `#${item.id}`}"?`,
      [
        { text: isAr ? 'إلغاء' : 'Cancel', style: 'cancel' },
        { text: isAr ? 'حذف' : 'Delete', style: 'destructive', onPress: () => void handleDelete(item.id) },
      ],
    );
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/customer-receivables/${id}`);
      setRefreshing(true);
      await load();
    } catch (e: any) {
      Alert.alert(isAr ? 'خطأ' : 'Error', e?.message ?? (isAr ? 'فشل الحذف' : 'Failed to delete'));
    }
  };

  const handleSave = async (form: FormState) => {
    setSaving(true);
    try {
      const body = {
        customerName: form.customerName.trim(),
        amount: Number(form.amount),
        dueDate: form.dueDate.trim() || undefined,
        status: form.status,
        notes: form.notes.trim() || undefined,
      };
      if (editing) {
        await api.patch(`/customer-receivables/${editing.id}`, body);
      } else {
        await api.post('/customer-receivables', body);
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

  const STAT_FILTERS = ['ALL', 'PENDING', 'COLLECTED', 'OVERDUE'] as const;
  const visible = statusFilter === 'ALL' ? records : records.filter((r) => r.status === statusFilter);
  const totalAmt    = records.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const pendingAmt  = records.filter((r) => r.status === 'PENDING').reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const collectedAmt= records.filter((r) => r.status === 'COLLECTED').reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const overdueCount= records.filter((r) => r.status === 'OVERDUE').length;

  const initialForm: FormState = editing
    ? {
        customerName: editing.customerName ?? editing.customer?.name ?? '',
        amount: String(editing.amount ?? ''),
        dueDate: editing.dueDate ? editing.dueDate.split('T')[0] : '',
        status: (editing.status as StatusOpt) ?? 'PENDING',
        notes: editing.notes ?? '',
      }
    : DEFAULT_FORM;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={isAr ? 'مستحقات العملاء' : 'Customer Receivables'} showBack />
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(i, idx) => `${String(i.id)}-${idx}`}
          renderItem={({ item }) => <RecCard item={item} onEdit={() => openEdit(item)} onDelete={() => confirmDelete(item)} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListHeaderComponent={
            <View>
              <View style={styles.kpiRow}>
                <StatCard label={isAr ? 'الإجمالي' : 'Total'} value={`$${fmt(totalAmt)}`} icon="people" color={colors.primary} style={styles.kpi} />
                <StatCard label={isAr ? 'معلق' : 'Pending'} value={`$${fmt(pendingAmt)}`} icon="time" color={colors.warning} style={styles.kpi} />
              </View>
              <View style={[styles.kpiRow, { marginBottom: spacing.sm }]}>
                <StatCard label={isAr ? 'محصل' : 'Collected'} value={`$${fmt(collectedAmt)}`} icon="checkmark-circle" color={colors.success} style={styles.kpi} />
                <StatCard label={isAr ? 'متأخر' : 'Overdue'} value={String(overdueCount)} icon="alert-circle" color={colors.danger} style={styles.kpi} />
              </View>
              <View style={[styles.filterRow, { marginBottom: spacing.sm }]}>
                {STAT_FILTERS.map((f) => (
                  <TouchableOpacity key={f}
                    style={[styles.filterChip, statusFilter === f && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                    onPress={() => setStatusFilter(f)}>
                    <Text style={[styles.filterText, { color: statusFilter === f ? '#fff' : colors.textMuted }]}>
                      {isAr ? (f === 'ALL' ? 'الكل' : f === 'PENDING' ? 'معلق' : f === 'COLLECTED' ? 'محصل' : 'متأخر') : (f === 'ALL' ? 'All' : f)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          }
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="people-outline" size={44} color={colors.textMuted} /><Text style={[styles.emptyText, { color: colors.textMuted }]}>{isAr ? 'لا توجد مستحقات' : 'No receivables'}</Text></View>}
        />
      )}

      <TouchableOpacity style={[styles.fab, { backgroundColor: colors.primary }]} onPress={openCreate} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color={colors.textInverse} />
      </TouchableOpacity>

      <RecModal visible={modalVisible} initial={initialForm} onClose={() => setModalVisible(false)} onSave={handleSave} saving={saving} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1 },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:        { padding: spacing.md, paddingBottom: 100 },
  kpiRow:      { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  kpi:         { flex: 1 },
  filterRow:   { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  filterChip:  { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1.5, borderColor: '#E2E8F0' },
  filterText:  { fontSize: 12, fontWeight: '600' as const },

  card:        { borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardTop:     { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  cardLeft:    { flex: 1, marginRight: spacing.sm },
  customer:    { ...typography.h4 },
  inv:         { ...typography.caption, marginTop: 2 },
  cardRight:   { alignItems: 'flex-end', marginRight: spacing.sm },
  balance:     { fontSize: 18, fontWeight: '800' },
  balLabel:    { ...typography.caption },
  cardActions: { flexDirection: 'column', gap: 4 },
  actionBtn:   { padding: 4 },
  metaRow:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 6 },
  badge:       { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  badgeText:   { fontSize: 10, fontWeight: '700' },
  notesText:   { ...typography.caption, flex: 1 },

  empty:       { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText:   { ...typography.bodySmall },

  fab:         { position: 'absolute', bottom: 28, right: 24, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', ...shadow.lg },

  overlay:     { flex: 1, justifyContent: 'flex-end' },
  overlayBg:   { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:       { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: spacing.xl, maxHeight: '90%' },
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
});
