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
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

interface Workflow {
  id: number;
  workflowName?: string;
  title?: string;
  status?: string;
  itemsCount?: number;
  approverCount?: number;
  createdBy?: { fullName: string };
  createdAt: string;
}

type WFStatus = 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
const WF_STATUS_OPTIONS: WFStatus[] = ['ACTIVE', 'DRAFT', 'ARCHIVED'];

interface FormState {
  workflowName: string;
  status: WFStatus;
}

const DEFAULT_FORM: FormState = { workflowName: '', status: 'ACTIVE' };

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

function WorkflowCard({ item, onEdit, onDelete }: {
  item: Workflow; onEdit: () => void; onDelete: () => void;
}) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();

  const STATUS_META: Record<string, { color: string; icon: string }> = {
    ACTIVE:   { color: colors.success,   icon: 'checkmark-circle' },
    DRAFT:    { color: colors.textMuted, icon: 'document-outline' },
    ARCHIVED: { color: colors.info,      icon: 'archive-outline' },
    PENDING:  { color: colors.warning,   icon: 'time' },
    APPROVED: { color: colors.success,   icon: 'checkmark-circle' },
    REJECTED: { color: colors.danger,    icon: 'close-circle' },
    REVIEW:   { color: colors.info,      icon: 'eye' },
  };

  const status = item.status ?? 'DRAFT';
  const meta   = STATUS_META[status] ?? STATUS_META.DRAFT;
  const name   = item.workflowName ?? item.title ?? `${isAr ? 'سير عمل #' : 'Workflow #'}${item.id}`;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.cardTop}>
        <View style={[styles.iconWrap, { backgroundColor: `${meta.color}15` }]}>
          <Ionicons name={meta.icon as any} size={20} color={meta.color} />
        </View>
        <View style={styles.cardContent}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{name}</Text>
          <Text style={[styles.requester, { color: colors.textMuted }]}>
            {item.createdBy?.fullName ?? (isAr ? 'غير معروف' : 'Unknown')}
          </Text>
        </View>
        <View style={styles.cardActions}>
          <View style={[styles.badge, { backgroundColor: `${meta.color}15` }]}>
            <Text style={[styles.badgeText, { color: meta.color }]}>{status}</Text>
          </View>
          <TouchableOpacity onPress={onEdit} style={styles.actionBtn} hitSlop={6}>
            <Ionicons name="pencil-outline" size={16} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={styles.actionBtn} hitSlop={6}>
            <Ionicons name="trash-outline" size={16} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </View>
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        {(item.itemsCount ?? 0) > 0 && (
          <Text style={[styles.detail, { color: colors.textSecondary }]}>
            {isAr ? 'العناصر:' : 'Items:'} <Text style={[styles.detailVal, { color: colors.text }]}>{item.itemsCount}</Text>
          </Text>
        )}
        {(item.approverCount ?? 0) > 0 && (
          <Text style={[styles.detail, { color: colors.textSecondary }]}>
            {isAr ? 'المعتمدون:' : 'Approvers:'} <Text style={[styles.detailVal, { color: colors.text }]}>{item.approverCount}</Text>
          </Text>
        )}
        <Text style={[styles.detail, { color: colors.textMuted }]}>
          {new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
        </Text>
      </View>
    </View>
  );
}

function WorkflowFormModal({ visible, initial, onClose, onSave, saving }: {
  visible: boolean; initial: FormState; onClose: () => void;
  onSave: (f: FormState) => Promise<void>; saving: boolean;
}) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const [form, setForm] = useState<FormState>(initial);

  useEffect(() => { if (visible) setForm(initial); }, [visible, initial]);

  const handleSave = async () => {
    if (!form.workflowName.trim()) {
      Alert.alert(isAr ? 'تحقق' : 'Validation', isAr ? 'اسم سير العمل مطلوب.' : 'Workflow name is required.');
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
            {initial.workflowName ? (isAr ? 'تعديل سير العمل' : 'Edit Workflow') : (isAr ? 'سير عمل جديد' : 'New Workflow')}
          </Text>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{isAr ? 'اسم سير العمل *' : 'Workflow Name *'}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }]}
              value={form.workflowName}
              onChangeText={(v) => setForm((p) => ({ ...p, workflowName: v }))}
              placeholder={isAr ? 'مثال: موافقة الشراء' : 'e.g. Purchase Approval'}
              placeholderTextColor={colors.textMuted}
            />
            <InlinePicker
              label={isAr ? 'الحالة' : 'Status'}
              value={form.status}
              options={WF_STATUS_OPTIONS}
              onChange={(v) => setForm((p) => ({ ...p, status: v }))}
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

export function ApprovalWorkflowsScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const [workflows, setWorkflows]   = useState<Workflow[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing]       = useState<Workflow | null>(null);
  const [saving, setSaving]         = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<Workflow[]>('/approval-workflows?limit=30');
      setWorkflows(Array.isArray(res) ? res : []);
    } catch (e: any) {
      Alert.alert(isAr ? 'خطأ' : 'Error', e?.message ?? (isAr ? 'فشل التحميل' : 'Failed to load workflows'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAr]);

  useEffect(() => { void load(); }, [load]);

  const openCreate = () => { setEditing(null); setModalVisible(true); };
  const openEdit   = (item: Workflow) => { setEditing(item); setModalVisible(true); };

  const confirmDelete = (item: Workflow) => {
    const name = item.workflowName ?? item.title ?? `${isAr ? 'سير عمل #' : 'Workflow #'}${item.id}`;
    Alert.alert(
      isAr ? 'حذف سير العمل' : 'Delete Workflow',
      isAr ? `حذف "${name}"؟ لا يمكن التراجع.` : `Delete "${name}"? This cannot be undone.`,
      [
        { text: isAr ? 'إلغاء' : 'Cancel', style: 'cancel' },
        { text: isAr ? 'حذف' : 'Delete', style: 'destructive', onPress: () => void handleDelete(item.id) },
      ],
    );
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/approval-workflows/${id}`);
      setRefreshing(true);
      await load();
    } catch (e: any) {
      Alert.alert(isAr ? 'خطأ' : 'Error', e?.message ?? (isAr ? 'فشل الحذف' : 'Failed to delete'));
    }
  };

  const handleSave = async (form: FormState) => {
    setSaving(true);
    try {
      const body = { workflowName: form.workflowName.trim(), status: form.status };
      if (editing) {
        await api.patch(`/approval-workflows/${editing.id}`, body);
      } else {
        await api.post('/approval-workflows', body);
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

  const initialForm: FormState = editing
    ? { workflowName: editing.workflowName ?? editing.title ?? '', status: (editing.status as WFStatus) ?? 'ACTIVE' }
    : DEFAULT_FORM;

  const pending = workflows.filter((w) => w.status === 'DRAFT').length;
  const subtitle = pending > 0
    ? `${pending} ${isAr ? 'في انتظار المراجعة' : 'awaiting review'}`
    : `${workflows.length} ${isAr ? 'إجمالي' : 'total'}`;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={isAr ? 'سير عمل الموافقات' : 'Approval Workflows'} subtitle={subtitle} showBack />
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={workflows}
          keyExtractor={(i, idx) => `${String(i.id)}-${idx}`}
          renderItem={({ item }) => (
            <WorkflowCard item={item} onEdit={() => openEdit(item)} onDelete={() => confirmDelete(item)} />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="git-merge-outline" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {isAr ? 'لا توجد سير عمل بعد' : 'No workflows yet'}
              </Text>
            </View>
          }
        />
      )}
      <TouchableOpacity style={[styles.fab, { backgroundColor: colors.primary }]} onPress={openCreate} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
      <WorkflowFormModal visible={modalVisible} initial={initialForm} onClose={() => setModalVisible(false)} onSave={handleSave} saving={saving} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1 },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:        { padding: spacing.md, paddingBottom: 100 },

  card:        { borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardTop:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 8 },
  iconWrap:    { width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardContent: { flex: 1 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  title:       { ...typography.h4 },
  requester:   { ...typography.caption, marginTop: 2 },
  badge:       { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  badgeText:   { fontSize: 10, fontWeight: '700' },
  actionBtn:   { padding: 4 },
  footer:      { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, borderTopWidth: 1, paddingTop: 8 },
  detail:      { ...typography.caption },
  detailVal:   { fontWeight: '700' },

  empty:       { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText:   { ...typography.bodySmall },

  fab:         { position: 'absolute', bottom: 28, right: 24, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', ...shadow.lg },

  overlay:      { flex: 1, justifyContent: 'flex-end' },
  overlayBg:    { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:        { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: spacing.xl, maxHeight: '90%' },
  sheetHandle:  { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  sheetTitle:   { ...typography.h3, textAlign: 'center', marginBottom: spacing.lg },
  fieldLabel:   { ...typography.caption, marginBottom: 6, marginTop: spacing.sm },
  input:        { borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: 11, ...typography.body, marginBottom: 4 },
  sheetActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  cancelBtn:    { flex: 1, paddingVertical: 13, borderRadius: radius.md, borderWidth: 1.5, alignItems: 'center' },
  cancelText:   { ...typography.body, fontWeight: '600' },
  saveBtn:      { flex: 2, paddingVertical: 13, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  saveText:     { ...typography.body, fontWeight: '700', color: '#fff' },

  pickerWrap:  { marginBottom: spacing.md },
  pickerLabel: { ...typography.caption, marginBottom: 6 },
  pickerRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip:        { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1.5 },
  chipText:    { fontSize: 13, fontWeight: '600' },
});
