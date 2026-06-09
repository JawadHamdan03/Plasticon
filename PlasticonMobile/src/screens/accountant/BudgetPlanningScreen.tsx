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

// ─── Types ────────────────────────────────────────────────────────────────────

interface BudgetPlan {
  id: number;
  // API fields
  month?: string;
  category?: string;
  allocated?: number;
  spent?: number;
  // Optional display/legacy fields
  title?: string;
  period?: string;
  totalBudget?: number;
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
  spent: string;
  period: string;
  status: StatusOption;
}

const DEFAULT_FORM: FormState = {
  title: '',
  department: '',
  totalBudget: '',
  spent: '',
  period: '',
  status: 'ACTIVE',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0 });
}

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
  const { colors } = useAppTheme();
  return (
    <View style={pickerStyles.wrap}>
      <Text style={[pickerStyles.label, { color: colors.text }]}>{label}</Text>
      <View style={pickerStyles.row}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[
              pickerStyles.chip,
              { borderColor: colors.border, backgroundColor: colors.surface },
              value === opt && { borderColor: colors.primary, backgroundColor: colors.primaryLight },
            ]}
            onPress={() => onChange(opt)}
            activeOpacity={0.7}
          >
            <Text style={[
              pickerStyles.chipText,
              { color: colors.textSecondary },
              value === opt && { color: colors.primary },
            ]}>
              {opt}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const pickerStyles = StyleSheet.create({
  wrap:  { marginBottom: spacing.md },
  label: { ...typography.caption, marginBottom: 6 },
  row:   { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip:  { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1.5 },
  chipText: { fontSize: 13, fontWeight: '600' },
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
  const { colors } = useAppTheme();
  const { isAr } = useLocale();

  const STATUS_COLOR: Record<string, string> = {
    ACTIVE:   colors.success,
    DRAFT:    colors.textMuted,
    CLOSED:   colors.primary,
    EXCEEDED: colors.danger,
  };

  const budget   = item.totalBudget ?? item.allocated ?? 0;
  const spent    = item.totalSpent ?? item.spent ?? 0;
  const pct      = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const barColor = pct >= 90 ? colors.danger : pct >= 70 ? colors.warning : colors.success;
  const status   = item.status ?? 'ACTIVE';
  const statusColor = STATUS_COLOR[status] ?? colors.textMuted;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{item.title ?? item.category ?? `${isAr ? 'ميزانية' : 'Budget'} #${item.id}`}</Text>
          <Text style={[styles.sub, { color: colors.textMuted }]}>{item.department ?? item.category ?? item.period ?? item.month ?? '—'}</Text>
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
      <View style={[styles.track, { backgroundColor: colors.border }]}>
        <View style={[styles.fill, { width: `${pct}%` as any, backgroundColor: barColor }]} />
      </View>
      <View style={styles.nums}>
        <Text style={[styles.numLabel, { color: colors.text }]}>{isAr ? 'المنفق:' : 'Spent:'} <Text style={[styles.numVal, { color: colors.text }]}>${fmt(spent)}</Text></Text>
        <Text style={[styles.numLabel, { color: colors.text }]}>{isAr ? 'الميزانية:' : 'Budget:'} <Text style={[styles.numVal, { color: colors.text }]}>${fmt(budget)}</Text></Text>
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
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const [form, setForm] = useState<FormState>(initial);

  useEffect(() => {
    if (visible) setForm(initial);
  }, [visible, initial]);

  const set = (k: keyof FormState) => (v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.title.trim()) return Alert.alert(isAr ? 'تحقق' : 'Validation', isAr ? 'العنوان مطلوب.' : 'Title is required.');
    if (!form.totalBudget.trim() || isNaN(Number(form.totalBudget)))
      return Alert.alert(isAr ? 'تحقق' : 'Validation', isAr ? 'يجب أن تكون الميزانية رقماً.' : 'Total budget must be a number.');
    await onSave(form);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.overlayBg} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.sheetTitle, { color: colors.text }]}>{initial.title ? (isAr ? 'تعديل الميزانية' : 'Edit Budget') : (isAr ? 'ميزانية جديدة' : 'New Budget')}</Text>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={[styles.fieldLabel, { color: colors.text }]}>{isAr ? 'العنوان *' : 'Title *'}</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
              value={form.title}
              onChangeText={set('title')}
              placeholder={isAr ? 'مثال: عمليات الربع الأول' : 'e.g. Q1 Operations'}
              placeholderTextColor={colors.textMuted}
            />

            <Text style={[styles.fieldLabel, { color: colors.text }]}>{isAr ? 'القسم' : 'Department'}</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
              value={form.department}
              onChangeText={set('department')}
              placeholder={isAr ? 'مثال: الإنتاج' : 'e.g. Production'}
              placeholderTextColor={colors.textMuted}
            />

            <Text style={[styles.fieldLabel, { color: colors.text }]}>{isAr ? 'إجمالي الميزانية *' : 'Total Budget *'}</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
              value={form.totalBudget}
              onChangeText={set('totalBudget')}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
            />

            <Text style={[styles.fieldLabel, { color: colors.text }]}>{isAr ? 'المنفق' : 'Amount Spent'}</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
              value={form.spent}
              onChangeText={set('spent')}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
            />

            <Text style={[styles.fieldLabel, { color: colors.text }]}>{isAr ? 'الفترة' : 'Period'}</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
              value={form.period}
              onChangeText={set('period')}
              placeholder={isAr ? 'مثال: 2025-Q1' : 'e.g. 2025-Q1'}
              placeholderTextColor={colors.textMuted}
            />

            <InlinePicker
              label={isAr ? 'الحالة' : 'Status'}
              value={form.status}
              options={STATUS_OPTIONS}
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
                ? <ActivityIndicator size="small" color={colors.textInverse} />
                : <Text style={[styles.saveText, { color: colors.textInverse }]}>{isAr ? 'حفظ' : 'Save'}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function BudgetPlanningScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();

  const [plans, setPlans]           = useState<BudgetPlan[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing]       = useState<BudgetPlan | null>(null);
  const [saving, setSaving]         = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<any>('/budgets?limit=20');
      setPlans(Array.isArray(res) ? res : (res?.data ?? res?.items ?? res?.budgets ?? []));
    } catch (e: any) {
      Alert.alert(isAr ? 'خطأ' : 'Error', e?.message ?? (isAr ? 'فشل تحميل الميزانيات' : 'Failed to load budgets'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAr]);

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
      isAr ? 'حذف الميزانية' : 'Delete Budget',
      `${isAr ? 'حذف' : 'Delete'} "${item.title ?? item.category ?? `${isAr ? 'ميزانية' : 'Budget'} #${item.id}`}"? ${isAr ? 'لا يمكن التراجع عن هذا.' : 'This cannot be undone.'}`,
      [
        { text: isAr ? 'إلغاء' : 'Cancel', style: 'cancel' },
        { text: isAr ? 'حذف' : 'Delete', style: 'destructive', onPress: () => void handleDelete(item.id) },
      ],
    );
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/budgets/${id}`);
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
        category:  form.title.trim() || form.department.trim() || undefined,
        month:     form.period.trim() || undefined,
        allocated: Number(form.totalBudget),
        spent:     form.spent ? Number(form.spent) : undefined,
        title:     form.title.trim() || undefined,
        department:form.department.trim() || undefined,
        period:    form.period.trim() || undefined,
        status:    form.status,
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
      Alert.alert(isAr ? 'خطأ' : 'Error', e?.message ?? (isAr ? 'فشل الحفظ' : 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  const totalAllocated = plans.reduce((s, p) => s + (Number(p.totalBudget ?? p.allocated) || 0), 0);
  const totalSpent     = plans.reduce((s, p) => s + (Number(p.totalSpent ?? p.spent) || 0), 0);
  const remaining      = totalAllocated - totalSpent;

  const initialForm: FormState = editing
    ? {
        title:       editing.title ?? editing.category ?? '',
        department:  editing.department ?? editing.category ?? '',
        totalBudget: String(editing.totalBudget ?? editing.allocated ?? ''),
        spent:       String(editing.totalSpent ?? editing.spent ?? ''),
        period:      editing.period ?? editing.month ?? '',
        status:      (editing.status as StatusOption) ?? 'ACTIVE',
      }
    : DEFAULT_FORM;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={isAr ? 'تخطيط الميزانية' : 'Budget Planning'} subtitle={`${plans.length} ${isAr ? 'خطط' : 'plans'}`} showBack />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={plans}
          keyExtractor={(i, idx) => `${String(i.id)}-${idx}`}
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
          ListHeaderComponent={
            <View style={styles.kpiRow}>
              <StatCard label={isAr ? 'المخصص' : 'Allocated'} value={`$${fmt(totalAllocated)}`} icon="wallet" color={colors.primary} style={styles.kpi} />
              <StatCard label={isAr ? 'المنفق' : 'Spent'} value={`$${fmt(totalSpent)}`} icon="cash" color={colors.warning} style={styles.kpi} />
              <StatCard label={isAr ? 'المتبقي' : 'Remaining'} value={`$${fmt(remaining)}`} icon="trending-up" color={remaining >= 0 ? colors.success : colors.danger} style={styles.kpi} />
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="wallet-outline" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>{isAr ? 'لا توجد خطط ميزانية' : 'No budget plans'}</Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={[styles.fab, { backgroundColor: colors.primary }]} onPress={openCreate} activeOpacity={0.85}>
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
  safe:        { flex: 1 },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:        { padding: spacing.md, paddingBottom: 100 },

  card:        { borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardTop:     { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm },
  cardLeft:    { flex: 1, marginRight: spacing.sm },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title:       { ...typography.h4 },
  sub:         { ...typography.caption, marginTop: 2 },
  badge:       { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  badgeText:   { fontSize: 10, fontWeight: '700' },
  actionBtn:   { padding: 4 },
  track:       { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: spacing.sm },
  fill:        { height: '100%', borderRadius: 4 },
  nums:        { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  numLabel:    { ...typography.caption, flex: 1 },
  numVal:      { fontWeight: '700' },

  kpiRow:      { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md },
  kpi:         { flex: 1 },
  empty:       { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText:   { ...typography.bodySmall },

  fab:         { position: 'absolute', bottom: 28, right: 24, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', ...shadow.lg },

  // Modal / Sheet
  overlay:     { flex: 1, justifyContent: 'flex-end' },
  overlayBg:   { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:       { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: spacing.xl, maxHeight: '90%' },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  sheetTitle:  { ...typography.h3, textAlign: 'center', marginBottom: spacing.lg },

  fieldLabel:  { ...typography.caption, marginBottom: 6, marginTop: spacing.sm },
  input:       { borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: 11, ...typography.body, marginBottom: 4 },

  sheetActions:{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  cancelBtn:   { flex: 1, paddingVertical: 13, borderRadius: radius.md, borderWidth: 1.5, alignItems: 'center' },
  cancelText:  { ...typography.body, fontWeight: '600' },
  saveBtn:     { flex: 2, paddingVertical: 13, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  saveText:    { ...typography.body, fontWeight: '700' },
});
