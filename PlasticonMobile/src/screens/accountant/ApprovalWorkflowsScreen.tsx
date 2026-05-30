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

// ─── Types ────────────────────────────────────────────────────────────────────

interface Workflow {
  id: number;
  workflowName?: string;
  title?: string;
  requestType?: string;
  requester?: { fullName: string };
  requestedBy?: string;
  amount?: number;
  status?: string;
  priority?: string;
  createdAt: string;
}

type WFStatus = 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
const WF_STATUS_OPTIONS: WFStatus[] = ['ACTIVE', 'DRAFT', 'ARCHIVED'];

interface FormState {
  workflowName: string;
  status: WFStatus;
}

const DEFAULT_FORM: FormState = { workflowName: '', status: 'ACTIVE' };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { color: string; icon: string }> = {
  ACTIVE:   { color: colors.success, icon: 'checkmark-circle' },
  DRAFT:    { color: colors.textMuted, icon: 'document-outline' },
  ARCHIVED: { color: colors.info,    icon: 'archive-outline' },
  PENDING:  { color: colors.warning, icon: 'time' },
  APPROVED: { color: colors.success, icon: 'checkmark-circle' },
  REJECTED: { color: colors.danger,  icon: 'close-circle' },
  REVIEW:   { color: colors.info,    icon: 'eye' },
};

const PRIORITY_COLOR: Record<string, string> = {
  HIGH:     colors.danger,
  MEDIUM:   colors.warning,
  LOW:      colors.success,
  CRITICAL: '#7C3AED',
};

function fmt(n: number) { return n.toLocaleString('en-US', { minimumFractionDigits: 2 }); }

// ─── Inline Picker ────────────────────────────────────────────────────────────

function InlinePicker<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: T[];
  onChange: (v: T) => void;
}) {
  return (
    <View style={pickerStyles.wrap}>
      <Text style={pickerStyles.label}>{label}</Text>
      <View style={pickerStyles.row}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[pickerStyles.chip, value === opt && pickerStyles.chipActive]}
            onPress={() => onChange(opt)}
            activeOpacity={0.7}
          >
            <Text style={[pickerStyles.chipText, value === opt && pickerStyles.chipTextActive]}>
              {opt}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const pickerStyles = StyleSheet.create({
  wrap:           { marginBottom: spacing.md },
  label:          { ...typography.caption, marginBottom: 6 },
  row:            { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip:           { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  chipActive:     { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  chipText:       { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  chipTextActive: { color: colors.primary },
});

// ─── Workflow Card ────────────────────────────────────────────────────────────

function WorkflowCard({
  item,
  onEdit,
  onDelete,
}: {
  item: Workflow;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const status   = item.status ?? 'DRAFT';
  const meta     = STATUS_META[status] ?? STATUS_META.DRAFT;
  const priority = item.priority;
  const priColor = priority ? (PRIORITY_COLOR[priority] ?? colors.textMuted) : null;
  const name     = item.workflowName ?? item.title ?? item.requestType ?? `Workflow #${item.id}`;

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={[styles.iconWrap, { backgroundColor: `${meta.color}15` }]}>
          <Ionicons name={meta.icon as any} size={20} color={meta.color} />
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.title} numberOfLines={1}>{name}</Text>
          <Text style={styles.requester}>
            {item.requester?.fullName ?? item.requestedBy ?? 'No requester'}
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
      <View style={styles.footer}>
        {item.amount != null && (
          <Text style={styles.detail}>
            Amount: <Text style={styles.detailVal}>${fmt(item.amount)}</Text>
          </Text>
        )}
        {priColor && (
          <Text style={[styles.detail, { color: priColor, fontWeight: '700' }]}>
            {priority} priority
          </Text>
        )}
        <Text style={styles.detail}>
          {new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
        </Text>
      </View>
    </View>
  );
}

// ─── Form Modal ───────────────────────────────────────────────────────────────

function WorkflowFormModal({
  visible,
  initial,
  onClose,
  onSave,
  saving,
}: {
  visible: boolean;
  initial: FormState;
  onClose: () => void;
  onSave: (f: FormState) => Promise<void>;
  saving: boolean;
}) {
  const [form, setForm] = useState<FormState>(initial);

  useEffect(() => {
    if (visible) setForm(initial);
  }, [visible, initial]);

  const handleSave = async () => {
    if (!form.workflowName.trim())
      return Alert.alert('Validation', 'Workflow name is required.');
    await onSave(form);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.overlayBg} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>
            {initial.workflowName ? 'Edit Workflow' : 'New Workflow'}
          </Text>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.fieldLabel}>Workflow Name *</Text>
            <TextInput
              style={styles.input}
              value={form.workflowName}
              onChangeText={(v) => setForm((p) => ({ ...p, workflowName: v }))}
              placeholder="e.g. Purchase Approval"
              placeholderTextColor={colors.textMuted}
            />

            <InlinePicker
              label="Status"
              value={form.status}
              options={WF_STATUS_OPTIONS}
              onChange={(v) => setForm((p) => ({ ...p, status: v }))}
            />
          </ScrollView>

          <View style={styles.sheetActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator size="small" color={colors.textInverse} />
                : <Text style={styles.saveText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function ApprovalWorkflowsScreen() {
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
      Alert.alert('Error', e?.message ?? 'Failed to load workflows');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setModalVisible(true);
  };

  const openEdit = (item: Workflow) => {
    setEditing(item);
    setModalVisible(true);
  };

  const confirmDelete = (item: Workflow) => {
    const name = item.workflowName ?? item.title ?? `Workflow #${item.id}`;
    Alert.alert(
      'Delete Workflow',
      `Delete "${name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => void handleDelete(item.id) },
      ],
    );
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/approval-workflows/${id}`);
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
        workflowName: form.workflowName.trim(),
        status:       form.status,
      };
      if (editing) {
        await api.patch(`/approval-workflows/${editing.id}`, body);
      } else {
        await api.post('/approval-workflows', body);
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

  const initialForm: FormState = editing
    ? {
        workflowName: editing.workflowName ?? editing.title ?? '',
        status:       (editing.status as WFStatus) ?? 'ACTIVE',
      }
    : DEFAULT_FORM;

  const pending = workflows.filter(
    (w) => w.status === 'PENDING' || w.status === 'REVIEW',
  ).length;

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title="Approval Workflows"
        subtitle={pending > 0 ? `${pending} awaiting review` : `${workflows.length} total`}
        showBack
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={workflows}
          keyExtractor={(i) => String(i.id)}
          renderItem={({ item }) => (
            <WorkflowCard
              item={item}
              onEdit={() => openEdit(item)}
              onDelete={() => confirmDelete(item)}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); void load(); }}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="git-merge-outline" size={44} color={colors.textMuted} />
              <Text style={styles.emptyText}>No workflows yet</Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openCreate} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color={colors.textInverse} />
      </TouchableOpacity>

      <WorkflowFormModal
        visible={modalVisible}
        initial={initialForm}
        onClose={() => setModalVisible(false)}
        onSave={handleSave}
        saving={saving}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: colors.background },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:        { padding: spacing.md, paddingBottom: 100 },

  card:        { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardTop:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 8 },
  iconWrap:    { width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardContent: { flex: 1 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  title:       { ...typography.h4 },
  requester:   { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  badge:       { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  badgeText:   { fontSize: 10, fontWeight: '700' },
  actionBtn:   { padding: 4 },
  footer:      { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 },
  detail:      { ...typography.caption },
  detailVal:   { fontWeight: '700', color: colors.text },

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

  sheetActions:{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  cancelBtn:   { flex: 1, paddingVertical: 13, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center' },
  cancelText:  { ...typography.body, fontWeight: '600', color: colors.textSecondary },
  saveBtn:     { flex: 2, paddingVertical: 13, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  saveText:    { ...typography.body, fontWeight: '700', color: colors.textInverse },
});
