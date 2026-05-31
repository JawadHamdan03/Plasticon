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

function InlinePicker<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: T[]; onChange: (v: T) => void }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.wrap}>
      <Text style={[styles.chipLabel, { color: colors.textMuted }]}>{label}</Text>
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
            ]}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function RequestModal({ visible, initial, onClose, onSave, saving }: {
  visible: boolean; initial: FormState; onClose: () => void; onSave: (f: FormState) => Promise<void>; saving: boolean;
}) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const [form, setForm] = useState<FormState>(initial);
  useEffect(() => { if (visible) setForm(initial); }, [visible, initial]);
  const set = (k: keyof FormState) => (v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.partName.trim()) return Alert.alert(isAr ? 'تحقق' : 'Validation', isAr ? 'اسم القطعة مطلوب.' : 'Part name is required.');
    if (!form.quantity.trim() || isNaN(Number(form.quantity))) return Alert.alert(isAr ? 'تحقق' : 'Validation', isAr ? 'الكمية يجب أن تكون رقماً.' : 'Quantity must be a number.');
    await onSave(form);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.overlayBg} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.sheetTitle, { color: colors.text }]}>{initial.partName ? (isAr ? 'تعديل الطلب' : 'Edit Request') : (isAr ? 'طلب قطعة جديدة' : 'New Part Request')}</Text>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{isAr ? 'اسم القطعة *' : 'Part Name *'}</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }]} value={form.partName} onChangeText={set('partName')} placeholder={isAr ? 'مثال: Bearing 6205' : 'e.g. Bearing 6205'} placeholderTextColor={colors.textMuted} />

            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{isAr ? 'الكمية *' : 'Quantity *'}</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }]} value={form.quantity} onChangeText={set('quantity')} placeholder="1" placeholderTextColor={colors.textMuted} keyboardType="numeric" />

            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{isAr ? 'رقم الآلة' : 'Machine ID'}</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }]} value={form.machineId} onChangeText={set('machineId')} placeholder={isAr ? 'رقم الآلة (اختياري)' : 'Machine ID (optional)'} placeholderTextColor={colors.textMuted} keyboardType="numeric" />

            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{isAr ? 'اسم المورد' : 'Supplier Name'}</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }]} value={form.supplierName} onChangeText={set('supplierName')} placeholder={isAr ? 'اختياري' : 'Optional'} placeholderTextColor={colors.textMuted} />

            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{isAr ? 'ملاحظات' : 'Notes'}</Text>
            <TextInput style={[styles.input, styles.multiline, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }]} value={form.notes} onChangeText={set('notes')} placeholder={isAr ? 'ملاحظات اختيارية' : 'Optional notes'} placeholderTextColor={colors.textMuted} multiline numberOfLines={3} textAlignVertical="top" />

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

function RequestCard({ item, onEdit, onDelete, onMarkReceived }: {
  item: SparePartRequest;
  onEdit: () => void;
  onDelete: () => void;
  onMarkReceived: () => void;
}) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();

  const STATUS_COLOR: Record<string, string> = {
    PENDING:   colors.warning,
    ORDERED:   colors.info,
    RECEIVED:  colors.success,
    CANCELLED: colors.textMuted,
  };

  const status = item.status ?? 'PENDING';
  const color  = STATUS_COLOR[status] ?? colors.textMuted;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <Text style={[styles.partName, { color: colors.text }]} numberOfLines={1}>{item.partName}</Text>
          {item.machine && <Text style={[styles.sub, { color: colors.textMuted }]}>{item.machine.name}</Text>}
          {item.supplierName && <Text style={[styles.sub, { color: colors.textMuted }]}>{isAr ? 'المورد: ' : 'Supplier: '}{item.supplierName}</Text>}
        </View>
        <View style={styles.qtyBlock}>
          <Text style={[styles.qty, { color: colors.text }]}>×{item.quantity}</Text>
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
        {item.notes ? <Text style={[styles.notes, { color: colors.textMuted }]} numberOfLines={1}>{item.notes}</Text> : null}
        {status !== 'RECEIVED' && status !== 'CANCELLED' && (
          <TouchableOpacity style={[styles.receiveBtn, { backgroundColor: colors.success }]} onPress={onMarkReceived} activeOpacity={0.8}>
            <Ionicons name="checkmark" size={12} color={colors.textInverse} />
            <Text style={[styles.receiveBtnText, { color: colors.textInverse }]}>{isAr ? 'استُلم' : 'Received'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export function SparePartsScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
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
      Alert.alert(isAr ? 'خطأ' : 'Error', e?.message ?? (isAr ? 'فشل تحميل الطلبات' : 'Failed to load requests'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAr]);

  useEffect(() => { void load(); }, [load]);

  const openCreate = () => { setEditing(null); setModalVisible(true); };
  const openEdit   = (item: SparePartRequest) => { setEditing(item); setModalVisible(true); };

  const confirmDelete = (item: SparePartRequest) => {
    Alert.alert(
      isAr ? 'حذف الطلب' : 'Delete Request',
      `${isAr ? 'حذف طلب' : 'Delete request for'} "${item.partName}"?`,
      [
        { text: isAr ? 'إلغاء' : 'Cancel', style: 'cancel' },
        { text: isAr ? 'حذف' : 'Delete', style: 'destructive', onPress: () => void handleDelete(item.id) },
      ],
    );
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/spare-part-requests/${id}`);
      setRefreshing(true);
      await load();
    } catch (e: any) {
      Alert.alert(isAr ? 'خطأ' : 'Error', e?.message ?? (isAr ? 'فشل الحذف' : 'Failed to delete'));
    }
  };

  const handleMarkReceived = async (id: number) => {
    try {
      await api.patch(`/spare-part-requests/${id}/received`, {});
      await load();
    } catch (e: any) {
      Alert.alert(isAr ? 'خطأ' : 'Error', e?.message ?? (isAr ? 'فشل التحديث' : 'Failed to update'));
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
      Alert.alert(isAr ? 'خطأ' : 'Error', e?.message ?? (isAr ? 'فشل الحفظ' : 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  const pendingCount  = requests.filter((r) => r.status === 'PENDING' || r.status === 'ORDERED').length;
  const receivedCount = requests.filter((r) => r.status === 'RECEIVED').length;

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
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={isAr ? 'طلبات قطع الغيار' : 'Spare Parts Requests'} subtitle={`${pendingCount} ${isAr ? 'نشط' : 'active'}`} showBack />
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
              <StatCard label={isAr ? 'معلق' : 'Pending'} value={String(pendingCount)} icon="time" color={colors.warning} style={styles.stat} />
              <StatCard label={isAr ? 'مستلم' : 'Received'} value={String(receivedCount)} icon="checkmark-circle" color={colors.success} style={styles.stat} />
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="settings-outline" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>{isAr ? 'لا توجد طلبات قطع غيار' : 'No spare part requests'}</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity style={[styles.fab, { backgroundColor: colors.primary }]} onPress={openCreate} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color={colors.textInverse} />
      </TouchableOpacity>

      <RequestModal visible={modalVisible} initial={initialForm} onClose={() => setModalVisible(false)} onSave={handleSave} saving={saving} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:     { flex: 1 },
  center:   { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:     { padding: spacing.md, paddingBottom: 100 },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  stat:     { flex: 1 },

  card:        { borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardTop:     { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm },
  cardLeft:    { flex: 1, marginRight: spacing.sm },
  partName:    { ...typography.h4 },
  sub:         { ...typography.caption, marginTop: 2 },
  qtyBlock:    { alignItems: 'center', marginRight: spacing.sm },
  qty:         { fontSize: 18, fontWeight: '800' },
  cardActions: { flexDirection: 'column', gap: 2 },
  actionBtn:   { padding: 3 },
  footer:      { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  badge:       { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  badgeText:   { fontSize: 10, fontWeight: '700' },
  notes:       { flex: 1, ...typography.caption, fontStyle: 'italic' },
  receiveBtn:  { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  receiveBtnText: { fontSize: 11, fontWeight: '700' },

  empty:    { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText:{ ...typography.bodySmall },

  fab: { position: 'absolute', bottom: 28, right: 24, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', ...shadow.lg },

  overlay:  { flex: 1, justifyContent: 'flex-end' },
  overlayBg:{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:    { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: spacing.xl, maxHeight: '90%' },
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
  chipRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip:     { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1.5 },
  chipText: { fontSize: 12, fontWeight: '600' },
});
