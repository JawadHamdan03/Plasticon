import React, { useCallback, useEffect, useState } from 'react';
import {
import { useLocale } from '../../context/LocaleContext';
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

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface TaxFiling {
  id: number;
  filingType: string;
  amount: number;
  dueDate: string;
  status: string;
  filedBy?: { id: number; fullName: string };
}

const TAX_TYPES = ['VAT', 'INCOME_TAX', 'PAYROLL_TAX', 'CORPORATE_TAX', 'WITHHOLDING_TAX'];
const STATUSES  = ['PENDING', 'COMPLETED', 'OVERDUE'] as const;
const FILTERS   = ['ALL', 'PENDING', 'COMPLETED', 'OVERDUE'] as const;

function taxLabel(t: string, isAr: boolean) {
  const m: Record<string, [string, string]> = {
    VAT:             ['ضريبة القيمة المضافة', 'VAT'],
    INCOME_TAX:      ['ضريبة الدخل',          'Income Tax'],
    PAYROLL_TAX:     ['ضريبة الرواتب',         'Payroll Tax'],
    CORPORATE_TAX:   ['ضريبة الشركات',         'Corporate Tax'],
    WITHHOLDING_TAX: ['ضريبة الاستقطاع',       'Withholding Tax'],
  };
  return (m[t] ?? [t, t])[isAr ? 0 : 1];
}

const FILTER_AR: Record<string, string> = { ALL: 'الكل', PENDING: 'معلق', COMPLETED: 'مكتمل', OVERDUE: 'متأخر' };

interface FormState { filingType: string; amount: string; dueDate: string; status: string; }
const EMPTY: FormState = { filingType: 'VAT', amount: '', dueDate: '', status: 'PENDING' };

export function TaxComplianceScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const [filings,    setFilings]    = useState<TaxFiling[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apiError,   setApiError]   = useState<string | null>(null);
  const [filter,     setFilter]     = useState<string>('ALL');
  const [modal,      setModal]      = useState(false);
  const [editing,    setEditing]    = useState<TaxFiling | null>(null);
  const [form,       setForm]       = useState<FormState>(EMPTY);
  const [saving,     setSaving]     = useState(false);

  const load = useCallback(async () => {
    setApiError(null);
    try {
      const res = await api.get<TaxFiling[] | { data: TaxFiling[] }>('/tax-filings');
      setFilings(Array.isArray(res) ? res : ((res as any).data ?? []));
    } catch (e: any) { setApiError(e?.message ?? 'فشل التحميل'); setFilings([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit   = (f: TaxFiling) => {
    setEditing(f);
    setForm({ filingType: f.filingType, amount: String(f.amount), dueDate: f.dueDate?.slice(0, 10) ?? '', status: f.status });
    setModal(true);
  };

  const handleDelete = (f: TaxFiling) => {
    Alert.alert(
      'حذف', 'هل أنت متأكد؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'حذف', style: 'destructive', onPress: async () => {
          try {
            await api.delete(`/tax-filings/${f.id}`);
            setFilings((p) => p.filter((x) => x.id !== f.id));
          } catch (e: any) { Alert.alert('خطأ', e.message ?? 'فشلت العملية'); }
        }},
      ],
    );
  };

  const submit = async () => {
    if (!form.amount || isNaN(Number(form.amount))) {
      Alert.alert('مطلوب', 'أدخل المبلغ'); return;
    }
    if (!form.dueDate) {
      Alert.alert('مطلوب', 'أدخل تاريخ الاستحقاق'); return;
    }
    setSaving(true);
    try {
      const body = { filingType: form.filingType, amount: parseFloat(form.amount), dueDate: form.dueDate, status: form.status };
      if (editing) {
        const up = await api.patch<TaxFiling>(`/tax-filings/${editing.id}`, body);
        setFilings((p) => p.map((x) => x.id === editing.id ? up : x));
      } else {
        const cr = await api.post<TaxFiling>('/tax-filings', body);
        setFilings((p) => [cr, ...p]);
      }
      setModal(false);
    } catch (e: any) { Alert.alert('خطأ', e.message ?? 'فشلت العملية'); }
    finally { setSaving(false); }
  };

  const visible   = filter === 'ALL' ? filings : filings.filter((f) => f.status === filter);
  const completed = filings.filter((f) => f.status === 'COMPLETED').length;
  const pending   = filings.filter((f) => f.status === 'PENDING').length;
  const overdue   = filings.filter((f) => f.status === 'OVERDUE').length;
  const totalAmt  = filings.reduce((s, f) => s + (Number(f.amount) || 0), 0);

  const sc = (s: string) => {
    if (s === 'COMPLETED') return { bg: colors.successLight, fg: colors.success };
    if (s === 'OVERDUE')   return { bg: `${colors.danger}20`,  fg: colors.danger };
    return                        { bg: colors.warningLight,   fg: colors.warning };
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={'الامتثال الضريبي'} showBack />

      {!!apiError && (
        <View style={[styles.errorBanner, { backgroundColor: '#fef2f2', borderColor: '#fca5a5' }]}>
          <Text style={styles.errorText}>{apiError}</Text>
        </View>
      )}

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
                <StatCard label={'الإجمالي'} value={`$${fmt(totalAmt)}`} icon="document-text" color={colors.primary} style={styles.kpi} />
                <StatCard label={'مكتمل'} value={String(completed)} icon="checkmark-circle" color={colors.success} style={styles.kpi} />
              </View>
              <View style={[styles.kpiRow, { marginBottom: spacing.md }]}>
                <StatCard label={'معلق'} value={String(pending)} icon="time" color={colors.warning} style={styles.kpi} />
                <StatCard label={'متأخر'} value={String(overdue)} icon="alert-circle" color={colors.danger} style={styles.kpi} />
              </View>
              <View style={styles.filterRow}>
                {FILTERS.map((f) => (
                  <TouchableOpacity key={f}
                    style={[styles.filterChip, filter === f && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                    onPress={() => setFilter(f)}>
                    <Text style={[styles.filterText, { color: filter === f ? '#fff' : colors.textMuted }]}>
                      {isAr ? FILTER_AR[f] : f === 'ALL' ? 'All' : f}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={openCreate} activeOpacity={0.8}>
                <Ionicons name="add-circle" size={20} color="#fff" />
                <Text style={styles.addText}>{'إضافة ملف ضريبي'}</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item: f }) => {
            const c = sc(f.status);
            return (
              <View style={[styles.card, { backgroundColor: colors.surface }]}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>{taxLabel(f.filingType, isAr)}</Text>
                    <Text style={[styles.cardAmt, { color: colors.primary }]}>${fmt(Number(f.amount))}</Text>
                    {f.dueDate ? (
                      <Text style={[styles.cardSub, { color: colors.textMuted }]}>
                        {'الاستحقاق: '}{new Date(f.dueDate).toLocaleDateString()}
                      </Text>
                    ) : null}
                    {f.filedBy ? (
                      <Text style={[styles.cardSub, { color: colors.textMuted }]}>
                        {'بواسطة: '}{f.filedBy.fullName}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.cardRight}>
                    <View style={[styles.badge, { backgroundColor: c.bg }]}>
                      <Text style={[styles.badgeText, { color: c.fg }]}>{f.status}</Text>
                    </View>
                    <View style={styles.actionRow}>
                      <TouchableOpacity onPress={() => openEdit(f)} hitSlop={8}>
                        <Ionicons name="pencil" size={16} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDelete(f)} hitSlop={8}>
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
              <Ionicons name="document-text-outline" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>{'لا توجد ملفات ضريبية'}</Text>
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
              {editing ? ('تعديل الملف') : ('ملف ضريبي جديد')}
            </Text>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={[styles.label, { color: colors.textMuted }]}>{'نوع الضريبة *'}</Text>
              <View style={styles.chipGroup}>
                {TAX_TYPES.map((t) => (
                  <TouchableOpacity key={t}
                    style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.surfaceAlt },
                      form.filingType === t && { borderColor: colors.primary, backgroundColor: `${colors.primary}18` }]}
                    onPress={() => setForm((p) => ({ ...p, filingType: t }))}>
                    <Text style={[styles.chipText, { color: form.filingType === t ? colors.primary : colors.textSecondary }]}>
                      {taxLabel(t, isAr)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, { color: colors.textMuted }]}>{'المبلغ *'}</Text>
              <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                placeholder="0.00" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad"
                value={form.amount} onChangeText={(v) => setForm((p) => ({ ...p, amount: v }))} />

              <Text style={[styles.label, { color: colors.textMuted }]}>{'تاريخ الاستحقاق *'}</Text>
              <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted}
                value={form.dueDate} onChangeText={(v) => setForm((p) => ({ ...p, dueDate: v }))} />

              <Text style={[styles.label, { color: colors.textMuted }]}>{'الحالة *'}</Text>
              <View style={styles.chipGroup}>
                {STATUSES.map((s) => (
                  <TouchableOpacity key={s}
                    style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.surfaceAlt },
                      form.status === s && { borderColor: colors.primary, backgroundColor: `${colors.primary}18` }]}
                    onPress={() => setForm((p) => ({ ...p, status: s }))}>
                    <Text style={[styles.chipText, { color: form.status === s ? colors.primary : colors.textSecondary }]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.actions}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => setModal(false)}>
                <Text style={[styles.cancelText, { color: colors.textSecondary }]}>{'إلغاء'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]} onPress={submit} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>{'حفظ'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1 },
  errorBanner: { marginHorizontal: spacing.md, marginTop: spacing.sm, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1 },
  errorText:   { color: '#dc2626', fontSize: 13, fontWeight: '600' },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:        { padding: spacing.md, paddingBottom: 40 },
  kpiRow:     { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  kpi:        { flex: 1 },
  filterRow:  { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.sm, flexWrap: 'wrap' },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1.5, borderColor: '#E2E8F0' },
  filterText: { fontSize: 12, fontWeight: '600' as const },
  addBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: radius.lg, paddingVertical: 12, marginBottom: spacing.md },
  addText:    { ...typography.bodySmall, fontWeight: '700' as const, color: '#fff' },
  card:       { borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardTop:    { flexDirection: 'row', alignItems: 'flex-start' },
  cardTitle:  { ...typography.h4, marginBottom: 2 },
  cardAmt:    { fontSize: 18, fontWeight: '800' as const, marginBottom: 2 },
  cardSub:    { ...typography.caption },
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
  chipGroup:  { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm },
  chip:       { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1.5 },
  chipText:   { fontSize: 12, fontWeight: '600' as const },
  actions:    { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  cancelBtn:  { flex: 1, paddingVertical: 13, borderRadius: radius.md, borderWidth: 1.5, alignItems: 'center' },
  cancelText: { fontWeight: '600' as const },
  saveBtn:    { flex: 2, paddingVertical: 13, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  saveText:   { fontWeight: '700' as const, color: '#fff' },
});
