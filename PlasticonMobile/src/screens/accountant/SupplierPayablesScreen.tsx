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

interface Payable {
  id: number;
  supplierName?: string;
  supplier?: { id: number; name: string };
  amount: number;
  dueDate?: string;
  paymentStatus?: string;
  status?: string;
  notes?: string;
  createdAt: string;
}

type StatusOpt = 'PENDING' | 'PAID' | 'OVERDUE';
const STATUS_OPTIONS: StatusOpt[] = ['PENDING', 'PAID', 'OVERDUE'];

interface FormState {
  supplierName: string;
  amount: string;
  dueDate: string;
  status: StatusOpt;
  notes: string;
}

const DEFAULT_FORM: FormState = { supplierName: '', amount: '', dueDate: '', status: 'PENDING', notes: '' };

function fmt(n: number) { return n.toLocaleString('en-US', { minimumFractionDigits: 2 }); }

const STATUS_COLOR: Record<string, string> = {
  PENDING: colors.warning, PAID: colors.success, OVERDUE: colors.danger,
};

function InlinePicker<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: T[]; onChange: (v: T) => void }) {
  return (
    <View style={ps.wrap}>
      <Text style={ps.label}>{label}</Text>
      <View style={ps.row}>
        {options.map((opt) => (
          <TouchableOpacity key={opt} style={[ps.chip, value === opt && ps.chipActive]} onPress={() => onChange(opt)} activeOpacity={0.7}>
            <Text style={[ps.chipText, value === opt && ps.chipTextActive]}>{opt}</Text>
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
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  chipTextActive: { color: colors.primary },
});

function PayModal({ visible, initial, onClose, onSave, saving }: {
  visible: boolean; initial: FormState; onClose: () => void; onSave: (f: FormState) => Promise<void>; saving: boolean;
}) {
  const [form, setForm] = useState<FormState>(initial);
  useEffect(() => { if (visible) setForm(initial); }, [visible, initial]);
  const set = (k: keyof FormState) => (v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.supplierName.trim()) return Alert.alert('Validation', 'Supplier name is required.');
    if (!form.amount.trim() || isNaN(Number(form.amount))) return Alert.alert('Validation', 'Amount must be a number.');
    await onSave(form);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.overlayBg} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{initial.supplierName ? 'Edit Payable' : 'New Payable'}</Text>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.fieldLabel}>Supplier Name *</Text>
            <TextInput style={styles.input} value={form.supplierName} onChangeText={set('supplierName')} placeholder="Supplier name" placeholderTextColor={colors.textMuted} />

            <Text style={styles.fieldLabel}>Amount *</Text>
            <TextInput style={styles.input} value={form.amount} onChangeText={set('amount')} placeholder="0.00" placeholderTextColor={colors.textMuted} keyboardType="numeric" />

            <Text style={styles.fieldLabel}>Due Date</Text>
            <TextInput style={styles.input} value={form.dueDate} onChangeText={set('dueDate')} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted} />

            <InlinePicker label="Status" value={form.status} options={STATUS_OPTIONS} onChange={(v) => setForm((p) => ({ ...p, status: v }))} />

            <Text style={styles.fieldLabel}>Notes</Text>
            <TextInput style={[styles.input, styles.multiline]} value={form.notes} onChangeText={set('notes')} placeholder="Optional notes" placeholderTextColor={colors.textMuted} multiline numberOfLines={3} textAlignVertical="top" />
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

function PayCard({ item, onEdit, onDelete }: { item: Payable; onEdit: () => void; onDelete: () => void }) {
  const status  = item.paymentStatus ?? item.status ?? 'PENDING';
  const isPaid  = status === 'PAID';
  const overdue = !isPaid && item.dueDate ? new Date(item.dueDate) < new Date() : false;
  const displayStatus = overdue ? 'OVERDUE' : status;
  const color   = STATUS_COLOR[displayStatus] ?? colors.textMuted;
  const name    = item.supplierName ?? item.supplier?.name ?? `Payable #${item.id}`;
  const amount  = item.amount ?? 0;

  return (
    <View style={[styles.card, overdue && { borderLeftWidth: 3, borderLeftColor: colors.danger }]}>
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <Text style={styles.supplier} numberOfLines={1}>{name}</Text>
          {item.dueDate && (
            <Text style={styles.ref}>
              Due: {new Date(item.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
          )}
        </View>
        <View style={styles.cardRight}>
          <Text style={[styles.balance, { color: isPaid ? colors.success : color }]}>${fmt(amount)}</Text>
          <Text style={styles.balLabel}>{isPaid ? 'paid' : 'owed'}</Text>
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
          <Text style={[styles.badgeText, { color }]}>{displayStatus}</Text>
        </View>
        {item.notes ? <Text style={styles.notesText} numberOfLines={1}>{item.notes}</Text> : null}
      </View>
    </View>
  );
}

export function SupplierPayablesScreen() {
  const [records, setRecords]       = useState<Payable[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing]       = useState<Payable | null>(null);
  const [saving, setSaving]         = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<Payable[]>('/supplier-payables?limit=30');
      setRecords(Array.isArray(res) ? res : []);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to load payables');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const openCreate = () => { setEditing(null); setModalVisible(true); };
  const openEdit   = (item: Payable) => { setEditing(item); setModalVisible(true); };

  const confirmDelete = (item: Payable) => {
    Alert.alert('Delete Payable', `Delete payable for "${item.supplierName ?? item.supplier?.name ?? `#${item.id}`}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void handleDelete(item.id) },
    ]);
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/supplier-payables/${id}`);
      setRefreshing(true);
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to delete');
    }
  };

  const handleSave = async (form: FormState) => {
    setSaving(true);
    try {
      const body = {
        supplierName: form.supplierName.trim(),
        amount: Number(form.amount),
        dueDate: form.dueDate.trim() || undefined,
        paymentStatus: form.status,
        notes: form.notes.trim() || undefined,
      };
      if (editing) {
        await api.patch(`/supplier-payables/${editing.id}`, body);
      } else {
        await api.post('/supplier-payables', body);
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

  const totalOwed = records
    .filter((r) => (r.paymentStatus ?? r.status) !== 'PAID')
    .reduce((s, r) => s + (r.amount ?? 0), 0);

  const initialForm: FormState = editing
    ? {
        supplierName: editing.supplierName ?? editing.supplier?.name ?? '',
        amount: String(editing.amount ?? ''),
        dueDate: editing.dueDate ? editing.dueDate.split('T')[0] : '',
        status: ((editing.paymentStatus ?? editing.status) as StatusOpt) ?? 'PENDING',
        notes: editing.notes ?? '',
      }
    : DEFAULT_FORM;

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Supplier Payables" showBack />
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(i, idx) => `${String(i.id)}-${idx}`}
          renderItem={({ item }) => <PayCard item={item} onEdit={() => openEdit(item)} onDelete={() => confirmDelete(item)} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListHeaderComponent={<StatCard label="Total Owed to Suppliers" value={`$${fmt(totalOwed)}`} icon="business" color={colors.danger} style={styles.statHeader} />}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="business-outline" size={44} color={colors.textMuted} /><Text style={styles.emptyText}>No payables</Text></View>}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={openCreate} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color={colors.textInverse} />
      </TouchableOpacity>

      <PayModal visible={modalVisible} initial={initialForm} onClose={() => setModalVisible(false)} onSave={handleSave} saving={saving} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: colors.background },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:        { padding: spacing.md, paddingBottom: 100 },
  statHeader:  { marginBottom: spacing.md },

  card:        { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardTop:     { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  cardLeft:    { flex: 1, marginRight: spacing.sm },
  supplier:    { ...typography.h4 },
  ref:         { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  cardRight:   { alignItems: 'flex-end', marginRight: spacing.sm },
  balance:     { fontSize: 18, fontWeight: '800' },
  balLabel:    { ...typography.caption, color: colors.textMuted },
  cardActions: { flexDirection: 'column', gap: 4 },
  actionBtn:   { padding: 4 },
  metaRow:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 6 },
  badge:       { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  badgeText:   { fontSize: 10, fontWeight: '700' },
  notesText:   { ...typography.caption, color: colors.textMuted, flex: 1 },

  empty:       { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText:   { ...typography.bodySmall, color: colors.textMuted },

  fab:         { position: 'absolute', bottom: 28, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', ...shadow.lg },

  overlay:     { flex: 1, justifyContent: 'flex-end' },
  overlayBg:   { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:       { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: spacing.xl, maxHeight: '90%' },
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
