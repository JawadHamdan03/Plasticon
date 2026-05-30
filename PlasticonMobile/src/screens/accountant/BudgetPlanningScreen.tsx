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

interface BudgetPlan {
  id: number;
  title?: string;
  period?: string;
  totalBudget: number;
  totalSpent?: number;
  status?: string;
  department?: string;
  createdAt: string;
}

type StatusOption = 'ACTIVE' | 'DRAFT' | 'CLOSED';
const STATUS_OPTIONS: StatusOption[] = ['ACTIVE', 'DRAFT', 'CLOSED'];

interface FormState {
  title: string;
  department: string;
  totalBudget: string;
  period: string;
  status: StatusOption;
}

const DEFAULT_FORM: FormState = {
  title: '',
  department: '',
  totalBudget: '',
  period: '',
  status: 'ACTIVE',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0 });
}

const STATUS_COLOR: Record<string, string> = {
  ACTIVE:   colors.success,
  DRAFT:    colors.textMuted,
  CLOSED:   colors.primary,
  EXCEEDED: colors.danger,
};

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
  wrap:          { marginBottom: spacing.md },
  label:         { ...typography.caption, marginBottom: 6 },
  row:           { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip:          { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  chipActive:    { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  chipText:      { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  chipTextActive:{ color: colors.primary },
});

// ─── Budget Card ─────────────────────────────────────────────────────────────

function BudgetCard({
  item,
  onEdit,
  onDelete,
}: {
  item: BudgetPlan;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const spent    = item.totalSpent ?? 0;
  const pct      = item.totalBudget > 0 ? Math.min((spent / item.totalBudget) * 100, 100) : 0;
  const barColor = pct >= 90 ? colors.danger : pct >= 70 ? colors.warning : colors.success;
  const status   = item.status ?? 'ACTIVE';
  const statusColor = STATUS_COLOR[status] ?? colors.textMuted;

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <Text style={styles.title} numberOfLines={1}>{item.title ?? `Budget #${item.id}`}</Text>
          <Text style={styles.sub}>{item.department ?? item.period ?? '—'}</Text>
        </View>
        <View style={styles.cardActions}>
          <View style={[styles.badge, { backgroundColor: `${statusColor}15` }]}>
            <Text style={[styles.badgeText, { color: statusColor }]}>{status}</Text>
          </View>
          <TouchableOpacity onPress={onEdit} style={styles.actionBtn} hitSlop={6}>
            <Ionicons name="pencil-outline" size={16} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={styles.actionBtn} hitSlop={6}>
            <Ionicons name="trash-outline" size={16} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` as any, backgroundColor: barColor }]} />
      </View>
      <View style={styles.nums}>
        <Text style={styles.numLabel}>Spent: <Text style={styles.numVal}>${fmt(spent)}</Text></Text>
        <Text style={styles.numLabel}>Budget: <Text style={styles.numVal}>${fmt(item.totalBudget)}</Text></Text>
        <Text style={[styles.numLabel, { color: barColor }]}>{Math.round(pct)}%</Text>
      </View>
    </View>
  );
}

// ─── Form Modal ───────────────────────────────────────────────────────────────

function BudgetFormModal({
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

  const set = (k: keyof FormState) => (v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.title.trim()) return Alert.alert('Validation', 'Title is required.');
    if (!form.totalBudget.trim() || isNaN(Number(form.totalBudget)))
      return Alert.alert('Validation', 'Total budget must be a number.');
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
          <Text style={styles.sheetTitle}>{initial.title ? 'Edit Budget' : 'New Budget'}</Text>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.fieldLabel}>Title *</Text>
            <TextInput
              style={styles.input}
              value={form.title}
              onChangeText={set('title')}
              placeholder="e.g. Q1 Operations"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.fieldLabel}>Department</Text>
            <TextInput
              style={styles.input}
              value={form.department}
              onChangeText={set('department')}
              placeholder="e.g. Production"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.fieldLabel}>Total Budget *</Text>
            <TextInput
              style={styles.input}
              value={form.totalBudget}
              onChangeText={set('totalBudget')}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
            />

            <Text style={styles.fieldLabel}>Period</Text>
            <TextInput
              style={styles.input}
              value={form.period}
              onChangeText={set('period')}
              placeholder="e.g. 2025-Q1"
              placeholderTextColor={colors.textMuted}
            />

            <InlinePicker
              label="Status"
              value={form.status}
              options={STATUS_OPTIONS}
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

export function BudgetPlanningScreen() {
  const [plans, setPlans]           = useState<BudgetPlan[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing]       = useState<BudgetPlan | null>(null);
  const [saving, setSaving]         = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ budgets?: BudgetPlan[]; plans?: BudgetPlan[] }>('/budgets?limit=20');
      setPlans(res.budgets ?? res.plans ?? []);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to load budgets');
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

  const openEdit = (item: BudgetPlan) => {
    setEditing(item);
    setModalVisible(true);
  };

  const confirmDelete = (item: BudgetPlan) => {
    Alert.alert(
      'Delete Budget',
      `Delete "${item.title ?? `Budget #${item.id}`}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => void handleDelete(item.id) },
      ],
    );
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/budgets/${id}`);
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
        title:       form.title.trim(),
        department:  form.department.trim() || undefined,
        totalBudget: Number(form.totalBudget),
        period:      form.period.trim() || undefined,
        status:      form.status,
      };
      if (editing) {
        await api.patch(`/budgets/${editing.id}`, body);
      } else {
        await api.post('/budgets', body);
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
        title:       editing.title ?? '',
        department:  editing.department ?? '',
        totalBudget: String(editing.totalBudget ?? ''),
        period:      editing.period ?? '',
        status:      (editing.status as StatusOption) ?? 'ACTIVE',
      }
    : DEFAULT_FORM;

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Budget Planning" subtitle={`${plans.length} plans`} showBack />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={plans}
          keyExtractor={(i) => String(i.id)}
          renderItem={({ item }) => (
            <BudgetCard
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
              <Ionicons name="wallet-outline" size={44} color={colors.textMuted} />
              <Text style={styles.emptyText}>No budget plans</Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openCreate} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color={colors.textInverse} />
      </TouchableOpacity>

      <BudgetFormModal
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
  cardTop:     { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm },
  cardLeft:    { flex: 1, marginRight: spacing.sm },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title:       { ...typography.h4 },
  sub:         { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  badge:       { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  badgeText:   { fontSize: 10, fontWeight: '700' },
  actionBtn:   { padding: 4 },
  track:       { height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden', marginBottom: spacing.sm },
  fill:        { height: '100%', borderRadius: 4 },
  nums:        { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  numLabel:    { ...typography.caption, flex: 1 },
  numVal:      { fontWeight: '700', color: colors.text },

  empty:       { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText:   { ...typography.bodySmall, color: colors.textMuted },

  fab:         { position: 'absolute', bottom: 28, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', ...shadow.lg },

  // Modal / Sheet
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
