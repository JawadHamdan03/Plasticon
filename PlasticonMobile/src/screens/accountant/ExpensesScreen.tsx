import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal,
  Platform, Pressable, RefreshControl, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader, StatCard } from '../../components';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface Expense {
  id: number;
  category: string;
  amount: number;
  description?: string | null;
  paymentStatus: string;
  submittedAt: string;
  approvedAt?: string | null;
  submittedBy?: { id: number; fullName: string };
  approvedBy?: { id: number; fullName: string };
}

const CATEGORIES = [
  'RAW_MATERIALS', 'UTILITIES', 'MAINTENANCE', 'SALARIES',
  'TRANSPORT', 'PACKAGING', 'SUPPLIES', 'ADMIN', 'OTHER',
];
const CAT_AR: Record<string, string> = {
  RAW_MATERIALS: 'مواد خام', UTILITIES: 'مرافق', MAINTENANCE: 'صيانة',
  SALARIES: 'رواتب', TRANSPORT: 'نقل', PACKAGING: 'تغليف',
  SUPPLIES: 'مستلزمات', ADMIN: 'إدارة', OTHER: 'أخرى',
};
const FILTERS = ['ALL', 'APPROVED', 'PENDING'] as const;

interface FormState { category: string; amount: string; description: string; }
const EMPTY: FormState = { category: 'RAW_MATERIALS', amount: '', description: '' };

export function ExpensesScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const [expenses,   setExpenses]   = useState<Expense[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [catFilter,  setCatFilter]  = useState('ALL');
  const [modal,      setModal]      = useState(false);
  const [form,       setForm]       = useState<FormState>(EMPTY);
  const [saving,     setSaving]     = useState(false);
  const [approving,  setApproving]  = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get<Expense[] | { data: Expense[] }>('/expenses?limit=50');
      setExpenses(Array.isArray(res) ? res : ((res as any).data ?? []));
    } catch { setExpenses([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleDelete = (e: Expense) => {
    Alert.alert(isAr ? 'حذف' : 'Delete', isAr ? 'هل أنت متأكد؟' : 'Are you sure?', [
      { text: isAr ? 'إلغاء' : 'Cancel', style: 'cancel' },
      { text: isAr ? 'حذف' : 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/expenses/${e.id}`);
          setExpenses((p) => p.filter((x) => x.id !== e.id));
        } catch (err: any) { Alert.alert('خطأ', err.message ?? 'فشلت العملية'); }
      }},
    ]);
  };

  const handleApprove = async (e: Expense) => {
    setApproving(e.id);
    try {
      const up = await api.patch<Expense>(`/expenses/${e.id}/approve`, {});
      setExpenses((p) => p.map((x) => x.id === e.id ? up : x));
    } catch (err: any) {
      Alert.alert('خطأ', err.message ?? 'فشلت العملية');
    } finally { setApproving(null); }
  };

  const submit = async () => {
    if (!form.amount || isNaN(Number(form.amount))) {
      Alert.alert(isAr ? 'مطلوب' : 'Required', isAr ? 'أدخل المبلغ' : 'Enter amount'); return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = { category: form.category, amount: parseFloat(form.amount) };
      if (form.description.trim()) body.description = form.description.trim();
      const cr = await api.post<Expense>('/expenses', body);
      setExpenses((p) => [cr, ...p]);
      setModal(false);
      setForm(EMPTY);
    } catch (e: any) { Alert.alert('خطأ', e.message ?? 'فشلت العملية'); }
    finally { setSaving(false); }
  };

  const visible  = catFilter === 'ALL' ? expenses
    : catFilter === 'APPROVED' ? expenses.filter((e) => e.approvedAt)
    : expenses.filter((e) => !e.approvedAt);
  const approved = expenses.filter((e) => e.approvedAt);
  const pending  = expenses.filter((e) => !e.approvedAt);
  const totalAmt = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={isAr ? 'تتبع المصروفات' : 'Expense Tracking'} showBack />

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(i) => String(i.id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListHeaderComponent={
            <View>
              <View style={styles.kpiRow}>
                <StatCard label={isAr ? 'إجمالي' : 'Total'} value={`$${fmt(totalAmt)}`} icon="receipt" color={colors.primary} style={styles.kpi} />
                <StatCard label={isAr ? 'معتمد' : 'Approved'} value={String(approved.length)} icon="checkmark-circle" color={colors.success} style={styles.kpi} />
                <StatCard label={isAr ? 'معلق' : 'Pending'} value={String(pending.length)} icon="time" color={colors.warning} style={styles.kpi} />
              </View>
              <View style={[styles.filterRow, { marginBottom: spacing.sm }]}>
                {FILTERS.map((f) => (
                  <TouchableOpacity key={f}
                    style={[styles.filterChip, catFilter === f && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                    onPress={() => setCatFilter(f)}>
                    <Text style={[styles.filterText, { color: catFilter === f ? '#fff' : colors.textMuted }]}>
                      {isAr ? (f === 'ALL' ? 'الكل' : f === 'APPROVED' ? 'معتمد' : 'معلق') : (f === 'ALL' ? 'All' : f)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={() => { setForm(EMPTY); setModal(true); }} activeOpacity={0.8}>
                <Ionicons name="add-circle" size={20} color="#fff" />
                <Text style={styles.addText}>{isAr ? 'إضافة مصروف' : 'Add Expense'}</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item: e }) => {
            const isApproved = !!e.approvedAt;
            return (
              <View style={[styles.card, { backgroundColor: colors.surface },
                !isApproved && { borderLeftWidth: 3, borderLeftColor: colors.warning }]}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.catRow}>
                      <View style={[styles.catBadge, { backgroundColor: `${colors.primary}15` }]}>
                        <Text style={[styles.catText, { color: colors.primary }]}>
                          {isAr ? (CAT_AR[e.category] ?? e.category) : e.category.replace('_', ' ')}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.cardAmt, { color: colors.text }]}>${fmt(Number(e.amount))}</Text>
                    {e.description ? <Text style={[styles.cardSub, { color: colors.textMuted }]}>{e.description}</Text> : null}
                    {e.submittedBy ? (
                      <Text style={[styles.cardSub, { color: colors.textMuted }]}>
                        {isAr ? 'بواسطة: ' : 'By: '}{e.submittedBy.fullName}
                      </Text>
                    ) : null}
                    {e.approvedBy ? (
                      <Text style={[styles.cardSub, { color: colors.success }]}>
                        {isAr ? 'اعتمد من: ' : 'Approved by: '}{e.approvedBy.fullName}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.cardRight}>
                    <View style={[styles.badge, { backgroundColor: isApproved ? colors.successLight : colors.warningLight }]}>
                      <Text style={[styles.badgeText, { color: isApproved ? colors.success : colors.warning }]}>
                        {isApproved ? (isAr ? 'معتمد' : 'Approved') : (isAr ? 'معلق' : 'Pending')}
                      </Text>
                    </View>
                    <View style={styles.actionRow}>
                      {!isApproved && (
                        <TouchableOpacity
                          onPress={() => handleApprove(e)}
                          hitSlop={8}
                          disabled={approving === e.id}
                        >
                          {approving === e.id
                            ? <ActivityIndicator size="small" color={colors.success} />
                            : <Ionicons name="checkmark-circle" size={18} color={colors.success} />}
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity onPress={() => handleDelete(e)} hitSlop={8}>
                        <Ionicons name="trash-outline" size={16} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>{isAr ? 'لا توجد مصروفات' : 'No expenses'}</Text>
            </View>
          }
        />
      )}

      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={styles.overlayBg} onPress={() => setModal(false)} />
          <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>{isAr ? 'مصروف جديد' : 'New Expense'}</Text>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={[styles.label, { color: colors.textMuted }]}>{isAr ? 'الفئة *' : 'Category *'}</Text>
              <View style={styles.chipGroup}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity key={cat}
                    style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.surfaceAlt },
                      form.category === cat && { borderColor: colors.primary, backgroundColor: `${colors.primary}18` }]}
                    onPress={() => setForm((p) => ({ ...p, category: cat }))}>
                    <Text style={[styles.chipText, { color: form.category === cat ? colors.primary : colors.textSecondary }]}>
                      {isAr ? (CAT_AR[cat] ?? cat) : cat.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, { color: colors.textMuted }]}>{isAr ? 'المبلغ *' : 'Amount *'}</Text>
              <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                placeholder="0.00" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad"
                value={form.amount} onChangeText={(v) => setForm((p) => ({ ...p, amount: v }))} />

              <Text style={[styles.label, { color: colors.textMuted }]}>{isAr ? 'الوصف' : 'Description'}</Text>
              <TextInput style={[styles.input, styles.inputMulti, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                placeholder={isAr ? 'وصف اختياري…' : 'Optional description…'}
                placeholderTextColor={colors.textMuted} multiline numberOfLines={3}
                value={form.description} onChangeText={(v) => setForm((p) => ({ ...p, description: v }))} />
            </ScrollView>

            <View style={styles.actions}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => setModal(false)}>
                <Text style={[styles.cancelText, { color: colors.textSecondary }]}>{isAr ? 'إلغاء' : 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]} onPress={submit} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>{isAr ? 'حفظ' : 'Save'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:       { flex: 1 },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:       { padding: spacing.md, paddingBottom: 40 },
  kpiRow:     { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md },
  kpi:        { flex: 1 },
  filterRow:  { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1.5, borderColor: '#E2E8F0' },
  filterText: { fontSize: 12, fontWeight: '600' as const },
  addBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: radius.lg, paddingVertical: 12, marginBottom: spacing.md },
  addText:    { ...typography.bodySmall, fontWeight: '700' as const, color: '#fff' },
  card:       { borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardTop:    { flexDirection: 'row', alignItems: 'flex-start' },
  catRow:     { flexDirection: 'row', marginBottom: 4 },
  catBadge:   { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm },
  catText:    { fontSize: 11, fontWeight: '700' as const },
  cardAmt:    { fontSize: 20, fontWeight: '800' as const, marginBottom: 2 },
  cardSub:    { ...typography.caption, marginTop: 2 },
  cardRight:  { alignItems: 'flex-end', gap: spacing.xs },
  actionRow:  { flexDirection: 'row', gap: spacing.sm, marginTop: 4, alignItems: 'center' },
  badge:      { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  badgeText:  { fontSize: 10, fontWeight: '700' as const },
  empty:      { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText:  { ...typography.bodySmall },
  overlay:    { flex: 1, justifyContent: 'flex-end' },
  overlayBg:  { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:      { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: spacing.xl, maxHeight: '90%' },
  handle:     { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  sheetTitle: { ...typography.h3, textAlign: 'center', marginBottom: spacing.lg },
  label:      { ...typography.caption, marginBottom: 6, marginTop: spacing.sm },
  input:      { borderRadius: radius.md, borderWidth: 1.5, paddingHorizontal: spacing.md, paddingVertical: 11, fontSize: 15, marginBottom: 4 },
  inputMulti: { height: 80, textAlignVertical: 'top' },
  chipGroup:  { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm },
  chip:       { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1.5 },
  chipText:   { fontSize: 12, fontWeight: '600' as const },
  actions:    { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  cancelBtn:  { flex: 1, paddingVertical: 13, borderRadius: radius.md, borderWidth: 1.5, alignItems: 'center' },
  cancelText: { fontWeight: '600' as const },
  saveBtn:    { flex: 2, paddingVertical: 13, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  saveText:   { fontWeight: '700' as const, color: '#fff' },
});
