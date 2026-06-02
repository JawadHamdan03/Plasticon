import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal,
  Platform, Pressable, RefreshControl, ScrollView,
  StyleSheet, Switch, Text, TextInput, TouchableOpacity, View,
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

interface BankReconciliation {
  id: number;
  accountName: string;
  bankBalance: number;
  bookBalance: number;
  reconciled: boolean;
  notes?: string | null;
  reconciledBy?: { id: number; fullName: string };
  createdAt: string;
}

const FILTERS = ['ALL', 'RECONCILED', 'PENDING'] as const;

interface FormState { accountName: string; bankBalance: string; bookBalance: string; reconciled: boolean; notes: string; }
const EMPTY: FormState = { accountName: '', bankBalance: '', bookBalance: '', reconciled: false, notes: '' };

export function BankReconciliationScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const [records,    setRecords]    = useState<BankReconciliation[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter,     setFilter]     = useState<string>('ALL');
  const [modal,      setModal]      = useState(false);
  const [editing,    setEditing]    = useState<BankReconciliation | null>(null);
  const [form,       setForm]       = useState<FormState>(EMPTY);
  const [saving,     setSaving]     = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<BankReconciliation[] | { data: BankReconciliation[] }>('/bank-reconciliations?limit=50');
      setRecords(Array.isArray(res) ? res : ((res as any).data ?? []));
    } catch { setRecords([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit   = (r: BankReconciliation) => {
    setEditing(r);
    setForm({ accountName: r.accountName, bankBalance: String(r.bankBalance), bookBalance: String(r.bookBalance), reconciled: r.reconciled, notes: r.notes ?? '' });
    setModal(true);
  };

  const handleDelete = (r: BankReconciliation) => {
    Alert.alert(isAr ? 'حذف' : 'Delete', isAr ? 'هل أنت متأكد؟' : 'Are you sure?', [
      { text: isAr ? 'إلغاء' : 'Cancel', style: 'cancel' },
      { text: isAr ? 'حذف' : 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/bank-reconciliations/${r.id}`);
          setRecords((p) => p.filter((x) => x.id !== r.id));
        } catch (e: any) { Alert.alert('Error', e.message ?? 'Failed'); }
      }},
    ]);
  };

  const submit = async () => {
    if (!form.accountName.trim()) {
      Alert.alert(isAr ? 'مطلوب' : 'Required', isAr ? 'أدخل اسم الحساب' : 'Enter account name'); return;
    }
    if (!form.bankBalance || isNaN(Number(form.bankBalance))) {
      Alert.alert(isAr ? 'مطلوب' : 'Required', isAr ? 'أدخل رصيد البنك' : 'Enter bank balance'); return;
    }
    if (!form.bookBalance || isNaN(Number(form.bookBalance))) {
      Alert.alert(isAr ? 'مطلوب' : 'Required', isAr ? 'أدخل رصيد الدفاتر' : 'Enter book balance'); return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        accountName: form.accountName.trim(),
        bankBalance: parseFloat(form.bankBalance),
        bookBalance: parseFloat(form.bookBalance),
        reconciled: form.reconciled,
      };
      if (form.notes.trim()) body.notes = form.notes.trim();
      if (editing) {
        const up = await api.patch<BankReconciliation>(`/bank-reconciliations/${editing.id}`, body);
        setRecords((p) => p.map((x) => x.id === editing.id ? up : x));
      } else {
        const cr = await api.post<BankReconciliation>('/bank-reconciliations', body);
        setRecords((p) => [cr, ...p]);
      }
      setModal(false);
    } catch (e: any) { Alert.alert(isAr ? 'خطأ' : 'Error', e.message ?? 'Failed'); }
    finally { setSaving(false); }
  };

  const visible    = filter === 'ALL' ? records
    : filter === 'RECONCILED' ? records.filter((r) => r.reconciled)
    : records.filter((r) => !r.reconciled);
  const reconciled = records.filter((r) => r.reconciled).length;
  const pending    = records.filter((r) => !r.reconciled).length;
  const totalBank  = records.reduce((s, r) => s + (Number(r.bankBalance) || 0), 0);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={isAr ? 'مطابقة البنك' : 'Bank Reconciliation'} showBack />

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
                <StatCard label={isAr ? 'مطابق' : 'Reconciled'} value={String(reconciled)} icon="checkmark-circle" color={colors.success} style={styles.kpi} />
                <StatCard label={isAr ? 'معلق' : 'Pending'} value={String(pending)} icon="time" color={colors.warning} style={styles.kpi} />
                <StatCard label={isAr ? 'إجمالي البنك' : 'Total Bank'} value={`$${fmt(totalBank)}`} icon="business" color={colors.primary} style={styles.kpi} />
              </View>
              <View style={[styles.filterRow, { marginBottom: spacing.sm }]}>
                {FILTERS.map((f) => (
                  <TouchableOpacity key={f}
                    style={[styles.filterChip, filter === f && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                    onPress={() => setFilter(f)}>
                    <Text style={[styles.filterText, { color: filter === f ? '#fff' : colors.textMuted }]}>
                      {isAr
                        ? f === 'ALL' ? 'الكل' : f === 'RECONCILED' ? 'مطابق' : 'معلق'
                        : f === 'ALL' ? 'All' : f}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={openCreate} activeOpacity={0.8}>
                <Ionicons name="add-circle" size={20} color="#fff" />
                <Text style={styles.addText}>{isAr ? 'إضافة مطابقة' : 'Add Reconciliation'}</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item: r }) => {
            const diff = Number(r.bankBalance) - Number(r.bookBalance);
            const balanced = Math.abs(diff) < 0.01;
            return (
              <View style={[styles.card, { backgroundColor: colors.surface },
                !r.reconciled && { borderLeftWidth: 3, borderLeftColor: colors.warning }]}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>{r.accountName}</Text>
                    <View style={styles.balRow}>
                      <Text style={[styles.balLabel, { color: colors.textMuted }]}>{isAr ? 'بنك:' : 'Bank:'}</Text>
                      <Text style={[styles.balVal, { color: colors.text }]}>${fmt(Number(r.bankBalance))}</Text>
                      <Text style={[styles.balLabel, { color: colors.textMuted }]}>{isAr ? 'دفاتر:' : 'Book:'}</Text>
                      <Text style={[styles.balVal, { color: colors.text }]}>${fmt(Number(r.bookBalance))}</Text>
                    </View>
                    <Text style={[styles.diffText, { color: balanced ? colors.success : colors.danger }]}>
                      {balanced
                        ? (isAr ? '✓ متوازن' : '✓ Balanced')
                        : `${isAr ? 'فرق: ' : 'Diff: '}$${fmt(Math.abs(diff))}`}
                    </Text>
                    {r.notes ? <Text style={[styles.cardSub, { color: colors.textMuted }]}>{r.notes}</Text> : null}
                    {r.reconciledBy ? (
                      <Text style={[styles.cardSub, { color: colors.textMuted }]}>
                        {isAr ? 'بواسطة: ' : 'By: '}{r.reconciledBy.fullName}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.cardRight}>
                    <View style={[styles.badge, { backgroundColor: r.reconciled ? colors.successLight : colors.warningLight }]}>
                      <Text style={[styles.badgeText, { color: r.reconciled ? colors.success : colors.warning }]}>
                        {r.reconciled ? (isAr ? 'مطابق' : 'Done') : (isAr ? 'معلق' : 'Pending')}
                      </Text>
                    </View>
                    <View style={styles.actionRow}>
                      <TouchableOpacity onPress={() => openEdit(r)} hitSlop={8}>
                        <Ionicons name="pencil" size={16} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDelete(r)} hitSlop={8}>
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
              <Ionicons name="git-compare-outline" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>{isAr ? 'لا توجد مطابقات' : 'No reconciliations'}</Text>
            </View>
          }
        />
      )}

      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={styles.overlayBg} onPress={() => setModal(false)} />
          <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>
              {editing ? (isAr ? 'تعديل المطابقة' : 'Edit Reconciliation') : (isAr ? 'مطابقة جديدة' : 'New Reconciliation')}
            </Text>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={[styles.label, { color: colors.textMuted }]}>{isAr ? 'اسم الحساب *' : 'Account Name *'}</Text>
              <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                placeholder={isAr ? 'مثال: بنك الأهلي' : 'e.g. Main Bank Account'}
                placeholderTextColor={colors.textMuted}
                value={form.accountName} onChangeText={(v) => setForm((p) => ({ ...p, accountName: v }))} />

              <Text style={[styles.label, { color: colors.textMuted }]}>{isAr ? 'رصيد البنك *' : 'Bank Balance *'}</Text>
              <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                placeholder="0.00" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad"
                value={form.bankBalance} onChangeText={(v) => setForm((p) => ({ ...p, bankBalance: v }))} />

              <Text style={[styles.label, { color: colors.textMuted }]}>{isAr ? 'رصيد الدفاتر *' : 'Book Balance *'}</Text>
              <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                placeholder="0.00" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad"
                value={form.bookBalance} onChangeText={(v) => setForm((p) => ({ ...p, bookBalance: v }))} />

              <Text style={[styles.label, { color: colors.textMuted }]}>{isAr ? 'ملاحظات' : 'Notes'}</Text>
              <TextInput style={[styles.input, styles.inputMulti, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                placeholder={isAr ? 'ملاحظات اختيارية…' : 'Optional notes…'}
                placeholderTextColor={colors.textMuted} multiline numberOfLines={3}
                value={form.notes} onChangeText={(v) => setForm((p) => ({ ...p, notes: v }))} />

              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: colors.text }]}>{isAr ? 'مطابق؟' : 'Reconciled?'}</Text>
                <Switch
                  value={form.reconciled}
                  onValueChange={(v) => setForm((p) => ({ ...p, reconciled: v }))}
                  trackColor={{ false: colors.border, true: colors.success }}
                />
              </View>
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
  cardTitle:  { ...typography.h4, marginBottom: spacing.xs },
  balRow:     { flexDirection: 'row', gap: spacing.xs, alignItems: 'center', flexWrap: 'wrap', marginBottom: 2 },
  balLabel:   { ...typography.caption },
  balVal:     { ...typography.caption, fontWeight: '700' as const },
  diffText:   { ...typography.caption, fontWeight: '700' as const, marginTop: 2 },
  cardSub:    { ...typography.caption, marginTop: 2 },
  cardRight:  { alignItems: 'flex-end', gap: spacing.xs },
  actionRow:  { flexDirection: 'row', gap: spacing.sm, marginTop: 4 },
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
  switchRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md, marginBottom: spacing.sm },
  switchLabel:{ ...typography.body, fontWeight: '600' as const },
  actions:    { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  cancelBtn:  { flex: 1, paddingVertical: 13, borderRadius: radius.md, borderWidth: 1.5, alignItems: 'center' },
  cancelText: { fontWeight: '600' as const },
  saveBtn:    { flex: 2, paddingVertical: 13, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  saveText:   { fontWeight: '700' as const, color: '#fff' },
});
