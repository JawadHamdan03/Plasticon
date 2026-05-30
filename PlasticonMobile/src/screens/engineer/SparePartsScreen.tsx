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

interface SparePartRequest {
  id: number;
  partName: string;
  quantity: number;
  machine?: { id: number; name: string };
  machineId?: number;
  notes?: string | null;
  supplierName?: string | null;
  status?: string;
  requestedBy?: { fullName: string };
  receivedAt?: string | null;
  createdAt: string;
}

type StatusOpt = 'PENDING' | 'ORDERED' | 'RECEIVED' | 'CANCELLED';
const STATUS_OPTIONS: StatusOpt[] = ['PENDING', 'ORDERED', 'RECEIVED', 'CANCELLED'];

interface FormState {
  partName: string;
  quantity: string;
  machineId: string;
  supplierName: string;
  notes: string;
  status: StatusOpt;
}

const DEFAULT_FORM: FormState = {
  partName: '', quantity: '1', machineId: '', supplierName: '', notes: '', status: 'PENDING',
};

const STATUS_COLOR: Record<string, string> = {
  PENDING:   colors.warning,
  ORDERED:   colors.info,
  RECEIVED:  colors.success,
  CANCELLED: colors.textMuted,
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
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  chipTextActive: { color: colors.primary },
});

function RequestModal({ visible, initial, onClose, onSave, saving }: {
  visible: boolean; initial: FormState; onClose: () => void; onSave: (f: FormState) => Promise<void>; saving: boolean;
}) {
  const [form, setForm] = useState<FormState>(initial);
  useEffect(() => { if (visible) setForm(initial); }, [visible, initial]);
  const set = (k: keyof FormState) => (v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.partName.trim()) return Alert.alert('Validation', 'Part name is required.');
    if (!form.quantity.trim() || isNaN(Number(form.quantity))) return Alert.alert('Validation', 'Quantity must be a number.');
    await onSave(form);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.overlayBg} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{initial.partName ? 'Edit Request' : 'New Part Request'}</Text>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.fieldLabel}>Part Name *</Text>
            <TextInput style={styles.input} value={form.partName} onChangeText={set('partName')} placeholder="e.g. Bearing 6205" placeholderTextColor={colors.textMuted} />

            <Text style={styles.fieldLabel}>Quantity *</Text>
            <TextInput style={styles.input} value={form.quantity} onChangeText={set('quantity')} placeholder="1" placeholderTextColor={colors.textMuted} keyboardType="numeric" />

            <Text style={styles.fieldLabel}>Machine ID</Text>
            <TextInput style={styles.input} value={form.machineId} onChangeText={set('machineId')} placeholder="Machine ID (optional)" placeholderTextColor={colors.textMuted} keyboardType="numeric" />

            <Text style={styles.fieldLabel}>Supplier Name</Text>
            <TextInput style={styles.input} value={form.supplierName} onChangeText={set('supplierName')} placeholder="Optional" placeholderTextColor={colors.textMuted} />

            <Text style={styles.fieldLabel}>Notes</Text>
            <TextInput style={[styles.input, styles.multiline]} value={form.notes} onChangeText={set('notes')} placeholder="Optional notes" placeholderTextColor={colors.textMuted} multiline numberOfLines={3} textAlignVertical="top" />

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

function RequestCard({ item, onEdit, onDelete, onMarkReceived }: {
  item: SparePartRequest;
  onEdit: () => void;
  onDelete: () => void;
  onMarkReceived: () => void;
}) {
  const status = item.status ?? 'PENDING';
  const color  = STATUS_COLOR[status] ?? colors.textMuted;

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <Text style={styles.partName} numberOfLines={1}>{item.partName}</Text>
          {item.machine && <Text style={styles.sub}>{item.machine.name}</Text>}
          {item.supplierName && <Text style={styles.sub}>Supplier: {item.supplierName}</Text>}
        </View>
        <View style={styles.qtyBlock}>
          <Text style={styles.qty}>×{item.quantity}</Text>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity onPress={onEdit} style={styles.actionBtn} hitSlop={6}>
            <Ionicons name="pencil-outline" size={15} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={styles.actionBtn} hitSlop={6}>
            <Ionicons name="trash-outline" size={15} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={[styles.badge, { backgroundColor: `${color}15` }]}>
          <Text style={[styles.badgeText, { color }]}>{status}</Text>
        </View>
        {item.notes ? <Text style={styles.notes} numberOfLines={1}>{item.notes}</Text> : null}
        {status !== 'RECEIVED' && status !== 'CANCELLED' && (
          <TouchableOpacity style={styles.receiveBtn} onPress={onMarkReceived} activeOpacity={0.8}>
            <Ionicons name="checkmark" size={12} color={colors.textInverse} />
            <Text style={styles.receiveBtnText}>Received</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export function SparePartsScreen() {
  const [requests, setRequests]     = useState<SparePartRequest[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing]       = useState<SparePartRequest | null>(null);
  const [saving, setSaving]         = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<SparePartRequest[]>('/spare-part-requests?limit=60');
      setRequests(Array.isArray(res) ? res : []);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to load requests');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const openCreate = () => { setEditing(null); setModalVisible(true); };
  const openEdit   = (item: SparePartRequest) => { setEditing(item); setModalVisible(true); };

  const confirmDelete = (item: SparePartRequest) => {
    Alert.alert('Delete Request', `Delete request for "${item.partName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void handleDelete(item.id) },
    ]);
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/spare-part-requests/${id}`);
      setRefreshing(true);
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to delete');
    }
  };

  const handleMarkReceived = async (id: number) => {
    try {
      await api.patch(`/spare-part-requests/${id}/received`, {});
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to update');
    }
  };

  const handleSave = async (form: FormState) => {
    setSaving(true);
    try {
      const body: Record<string, any> = {
        partName: form.partName.trim(),
        quantity: Number(form.quantity),
        status: form.status,
      };
      if (form.machineId.trim()) body.machineId = Number(form.machineId);
      if (form.supplierName.trim()) body.supplierName = form.supplierName.trim();
      if (form.notes.trim()) body.notes = form.notes.trim();

      if (editing) {
        await api.patch(`/spare-part-requests/${editing.id}`, body);
      } else {
        await api.post('/spare-part-requests', body);
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

  const pendingCount   = requests.filter((r) => r.status === 'PENDING' || r.status === 'ORDERED').length;
  const receivedCount  = requests.filter((r) => r.status === 'RECEIVED').length;

  const initialForm: FormState = editing
    ? {
        partName: editing.partName,
        quantity: String(editing.quantity),
        machineId: editing.machineId ? String(editing.machineId) : (editing.machine?.id ? String(editing.machine.id) : ''),
        supplierName: editing.supplierName ?? '',
        notes: editing.notes ?? '',
        status: (editing.status as StatusOpt) ?? 'PENDING',
      }
    : DEFAULT_FORM;

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Spare Parts Requests" subtitle={`${pendingCount} active`} showBack />
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(i, idx) => `${String(i.id)}-${idx}`}
          renderItem={({ item }) => (
            <RequestCard
              item={item}
              onEdit={() => openEdit(item)}
              onDelete={() => confirmDelete(item)}
              onMarkReceived={() => void handleMarkReceived(item.id)}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListHeaderComponent={
            <View style={styles.statsRow}>
              <StatCard label="Pending" value={String(pendingCount)} icon="time" color={colors.warning} style={styles.stat} />
              <StatCard label="Received" value={String(receivedCount)} icon="checkmark-circle" color={colors.success} style={styles.stat} />
            </View>
          }
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="settings-outline" size={44} color={colors.textMuted} /><Text style={styles.emptyText}>No spare part requests</Text></View>}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={openCreate} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color={colors.textInverse} />
      </TouchableOpacity>

      <RequestModal visible={modalVisible} initial={initialForm} onClose={() => setModalVisible(false)} onSave={handleSave} saving={saving} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: colors.background },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:        { padding: spacing.md, paddingBottom: 100 },
  statsRow:    { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  stat:        { flex: 1 },

  card:        { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardTop:     { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm },
  cardLeft:    { flex: 1, marginRight: spacing.sm },
  partName:    { ...typography.h4 },
  sub:         { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  qtyBlock:    { alignItems: 'center', marginRight: spacing.sm },
  qty:         { fontSize: 18, fontWeight: '800', color: colors.text },
  cardActions: { flexDirection: 'column', gap: 2 },
  actionBtn:   { padding: 3 },
  footer:      { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  badge:       { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  badgeText:   { fontSize: 10, fontWeight: '700' },
  notes:       { flex: 1, ...typography.caption, color: colors.textMuted, fontStyle: 'italic' },
  receiveBtn:  { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.success, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  receiveBtnText: { fontSize: 11, fontWeight: '700', color: colors.textInverse },

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
