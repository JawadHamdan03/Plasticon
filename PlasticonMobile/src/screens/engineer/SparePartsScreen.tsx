import React, { useCallback, useEffect, useState } from 'react';
import {
import { useLocale } from '../../context/LocaleContext';
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
import { useAuth } from '../../auth/AuthContext';

interface Machine { id: number; name: string; type?: string }

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

interface FormState {
  partName: string;
  quantity: string;
  machineId: string;
  supplierName: string;
  notes: string;
}

const DEFAULT_FORM: FormState = {
  partName: '', quantity: '1', machineId: '', supplierName: '', notes: '',
};

function RequestModal({ visible, isEdit, initial, machines, onClose, onSave, saving }: {
  visible: boolean;
  isEdit: boolean;
  initial: FormState;
  machines: Machine[];
  onClose: () => void;
  onSave: (f: FormState) => Promise<void>;
  saving: boolean;
}) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const [form, setForm] = useState<FormState>(initial);
  useEffect(() => { if (visible) setForm(initial); }, [visible, initial]);
  const set = (k: keyof FormState) => (v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.partName.trim()) return Alert.alert('تحقق', 'اسم القطعة مطلوب.');
    if (!form.quantity.trim() || isNaN(Number(form.quantity))) return Alert.alert('تحقق', 'الكمية يجب أن تكون رقماً.');
    if (!isEdit && !form.machineId) return Alert.alert('تحقق', 'اختر آلة.');
    await onSave(form);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.overlayBg} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.sheetTitle, { color: colors.text }]}>
            {isEdit ? ('تعديل الطلب') : ('طلب قطعة جديدة')}
          </Text>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{'اسم القطعة *'}</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }]} value={form.partName} onChangeText={set('partName')} placeholder={'مثال: Bearing 6205'} placeholderTextColor={colors.textMuted} />

            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{'الكمية *'}</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }]} value={form.quantity} onChangeText={set('quantity')} placeholder="1" placeholderTextColor={colors.textMuted} keyboardType="numeric" />

            {/* Machine picker — only for new requests */}
            {!isEdit && machines.length > 0 && (
              <>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{'الآلة *'}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
                  <View style={styles.chipRow}>
                    {machines.map((m) => (
                      <TouchableOpacity
                        key={m.id}
                        style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.surfaceAlt },
                          form.machineId === String(m.id) && { borderColor: colors.primary, backgroundColor: colors.primaryLight }]}
                        onPress={() => set('machineId')(String(m.id))}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.chipText, { color: colors.textSecondary },
                          form.machineId === String(m.id) && { color: colors.primary }]}>
                          {m.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </>
            )}

            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{'اسم المورد'}</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }]} value={form.supplierName} onChangeText={set('supplierName')} placeholder={'اختياري'} placeholderTextColor={colors.textMuted} />

            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{'ملاحظات'}</Text>
            <TextInput style={[styles.input, styles.multiline, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }]} value={form.notes} onChangeText={set('notes')} placeholder={'ملاحظات اختيارية'} placeholderTextColor={colors.textMuted} multiline numberOfLines={3} textAlignVertical="top" />
          </ScrollView>
          <View style={styles.sheetActions}>
            <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={onClose}>
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>{'إلغاء'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color={colors.textInverse} /> : <Text style={[styles.saveText, { color: colors.textInverse }]}>{'حفظ'}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function RequestCard({ item, onEdit, onMarkReceived }: {
  item: SparePartRequest;
  onEdit: () => void;
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
  const canEdit = status !== 'RECEIVED' && status !== 'CANCELLED';

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderLeftWidth: 3, borderLeftColor: color }]}>
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <Text style={[styles.partName, { color: colors.text }]} numberOfLines={1}>{item.partName}</Text>
          {item.machine && <Text style={[styles.sub, { color: colors.textMuted }]}>{item.machine.name}</Text>}
          {item.supplierName && <Text style={[styles.sub, { color: colors.textMuted }]}>{'المورد: '}{item.supplierName}</Text>}
        </View>
        <View style={styles.qtyBlock}>
          <Text style={[styles.qty, { color: colors.primary }]}>×{item.quantity}</Text>
        </View>
        {canEdit && (
          <TouchableOpacity onPress={onEdit} style={styles.actionBtn} hitSlop={8}>
            <Ionicons name="pencil-outline" size={16} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.footer}>
        <View style={[styles.badge, { backgroundColor: `${color}18`, borderWidth: 1, borderColor: `${color}35` }]}>
          <Text style={[styles.badgeText, { color }]}>{status}</Text>
        </View>
        {item.notes ? <Text style={[styles.notes, { color: colors.textMuted }]} numberOfLines={1}>{item.notes}</Text> : null}
        {canEdit && (
          <TouchableOpacity style={[styles.receiveBtn, { backgroundColor: colors.success }]} onPress={onMarkReceived} activeOpacity={0.8}>
            <Ionicons name="checkmark" size={12} color="#fff" />
            <Text style={styles.receiveBtnText}>{'استُلم'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export function SparePartsScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const { user } = useAuth();
  const [requests, setRequests] = useState<SparePartRequest[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing]   = useState<SparePartRequest | null>(null);
  const [saving, setSaving]     = useState(false);

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'ACCOUNTANT';

  const load = useCallback(async () => {
    try {
      const endpoint = isAdmin ? '/spare-part-requests' : '/spare-part-requests/mine';
      const [res, mRes] = await Promise.all([
        api.get<SparePartRequest[]>(endpoint),
        api.get<Machine[]>('/machines').catch(() => [] as Machine[]),
      ]);
      setRequests(Array.isArray(res) ? res : []);
      setMachines(Array.isArray(mRes) ? mRes : []);
    } catch (e: any) {
      Alert.alert('خطأ', e?.message ?? ('فشل تحميل الطلبات'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAdmin, isAr]);

  useEffect(() => { void load(); }, [load]);

  const openCreate = () => { setEditing(null); setModalVisible(true); };
  const openEdit   = (item: SparePartRequest) => { setEditing(item); setModalVisible(true); };

  const handleMarkReceived = async (id: number) => {
    try {
      await api.patch(`/spare-part-requests/${id}/received`, {});
      await load();
    } catch (e: any) {
      Alert.alert('خطأ', e?.message ?? ('فشل التحديث'));
    }
  };

  const handleSave = async (form: FormState) => {
    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/spare-part-requests/${editing.id}`, {
          partName:     form.partName.trim(),
          quantity:     Number(form.quantity),
          supplierName: form.supplierName.trim() || undefined,
          notes:        form.notes.trim() || undefined,
        });
      } else {
        await api.post('/spare-part-requests', {
          partName:     form.partName.trim(),
          quantity:     Number(form.quantity),
          machineId:    Number(form.machineId),
          supplierName: form.supplierName.trim() || undefined,
          notes:        form.notes.trim() || undefined,
        });
      }
      setModalVisible(false);
      setRefreshing(true);
      await load();
    } catch (e: any) {
      Alert.alert('خطأ', e?.message ?? ('فشل الحفظ'));
    } finally {
      setSaving(false);
    }
  };

  const pendingCount  = requests.filter((r) => r.status === 'PENDING' || r.status === 'ORDERED').length;
  const receivedCount = requests.filter((r) => r.status === 'RECEIVED').length;

  const initialForm: FormState = editing
    ? {
        partName:     editing.partName,
        quantity:     String(editing.quantity),
        machineId:    editing.machineId ? String(editing.machineId) : (editing.machine?.id ? String(editing.machine.id) : ''),
        supplierName: editing.supplierName ?? '',
        notes:        editing.notes ?? '',
      }
    : DEFAULT_FORM;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title={'طلبات قطع الغيار'}
        subtitle={`${pendingCount} ${'نشط'}`}
        showBack
      />
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
              onMarkReceived={() => void handleMarkReceived(item.id)}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListHeaderComponent={
            <View style={styles.statsRow}>
              <StatCard label={'معلق'}  value={String(pendingCount)}  icon="time"             color={colors.warning} style={styles.stat} />
              <StatCard label={'مستلم'} value={String(receivedCount)} icon="checkmark-circle" color={colors.success} style={styles.stat} />
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="settings-outline" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {'لا توجد طلبات قطع غيار'}
              </Text>
            </View>
          }
        />
      )}

      <TouchableOpacity style={[styles.fab, { backgroundColor: colors.primary }]} onPress={openCreate} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <RequestModal
        visible={modalVisible}
        isEdit={!!editing}
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
  safe:     { flex: 1 },
  center:   { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:     { padding: spacing.md, paddingBottom: 100 },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  stat:     { flex: 1 },

  card:     { borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardTop:  { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm },
  cardLeft: { flex: 1, marginRight: spacing.sm },
  partName: { ...typography.h4 },
  sub:      { ...typography.caption, marginTop: 2 },
  qtyBlock: { alignItems: 'center', marginRight: spacing.sm },
  qty:      { fontSize: 18, fontWeight: '800' },
  actionBtn:{ padding: 4 },
  footer:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  badge:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  badgeText:{ fontSize: 10, fontWeight: '700' },
  notes:    { flex: 1, ...typography.caption, fontStyle: 'italic' },
  receiveBtn:    { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  receiveBtnText:{ fontSize: 11, fontWeight: '700', color: '#fff' },

  empty:     { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText: { ...typography.bodySmall },

  fab: { position: 'absolute', bottom: 28, right: 24, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', ...shadow.lg },

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

  chipRow:  { flexDirection: 'row', gap: spacing.sm },
  chip:     { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1.5 },
  chipText: { fontSize: 12, fontWeight: '600' },
});
