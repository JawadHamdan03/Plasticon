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

interface CostAnalysis {
  id: number;
  category: string;
  cost: number;
  percentage: number;
  period: string;
  notes?: string | null;
}

const CATEGORIES = [
  'Raw Materials', 'Production Labor', 'Machine Maintenance',
  'Electricity', 'Packaging & Logistics', 'Quality Control', 'Admin & Office', 'Other',
];

const CAT_AR: Record<string, string> = {
  'Raw Materials': 'مواد خام',
  'Production Labor': 'عمالة إنتاج',
  'Machine Maintenance': 'صيانة آلات',
  'Electricity': 'كهرباء',
  'Packaging & Logistics': 'تغليف ولوجستيات',
  'Quality Control': 'ضبط الجودة',
  'Admin & Office': 'إدارة ومكتب',
  'Other': 'أخرى',
};

interface FormState { category: string; cost: string; percentage: string; period: string; notes: string; }
const EMPTY: FormState = { category: 'Raw Materials', cost: '', percentage: '', period: '', notes: '' };

export function CostAnalysisScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const [costs,      setCosts]      = useState<CostAnalysis[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apiError,   setApiError]   = useState<string | null>(null);
  const [periodFilter, setPeriodFilter] = useState('');
  const [modal,      setModal]      = useState(false);
  const [editing,    setEditing]    = useState<CostAnalysis | null>(null);
  const [form,       setForm]       = useState<FormState>(EMPTY);
  const [saving,     setSaving]     = useState(false);

  const load = useCallback(async () => {
    setApiError(null);
    try {
      const res = await api.get<CostAnalysis[] | { data: CostAnalysis[] }>('/cost-analysis?limit=50');
      setCosts(Array.isArray(res) ? res : ((res as any).data ?? []));
    } catch (e: any) { setApiError(e?.message ?? 'فشل التحميل'); setCosts([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit   = (c: CostAnalysis) => {
    setEditing(c);
    setForm({ category: c.category, cost: String(c.cost), percentage: String(c.percentage ?? ''), period: c.period ?? '', notes: c.notes ?? '' });
    setModal(true);
  };

  const handleDelete = (c: CostAnalysis) => {
    Alert.alert('حذف', 'هل أنت متأكد؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/cost-analysis/${c.id}`);
          setCosts((p) => p.filter((x) => x.id !== c.id));
        } catch (e: any) { Alert.alert('خطأ', e.message ?? 'فشلت العملية'); }
      }},
    ]);
  };

  const submit = async () => {
    if (!form.cost || isNaN(Number(form.cost))) {
      Alert.alert('مطلوب', 'أدخل التكلفة'); return;
    }
    if (!form.period.trim()) {
      Alert.alert('مطلوب', 'أدخل الفترة'); return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        category: form.category,
        cost: parseFloat(form.cost),
        percentage: form.percentage ? parseFloat(form.percentage) : 0,
        period: form.period.trim(),
      };
      if (form.notes.trim()) body.notes = form.notes.trim();
      if (editing) {
        const up = await api.patch<CostAnalysis>(`/cost-analysis/${editing.id}`, body);
        setCosts((p) => p.map((x) => x.id === editing.id ? up : x));
      } else {
        const cr = await api.post<CostAnalysis>('/cost-analysis', body);
        setCosts((p) => [cr, ...p]);
      }
      setModal(false);
    } catch (e: any) { Alert.alert('خطأ', e.message ?? 'فشلت العملية'); }
    finally { setSaving(false); }
  };

  const periods  = [...new Set(costs.map((c) => c.period).filter(Boolean))].sort().reverse();
  const visible  = periodFilter ? costs.filter((c) => c.period === periodFilter) : costs;
  const totalCost = visible.reduce((s, c) => s + (Number(c.cost) || 0), 0);
  const topCat   = costs.length > 0
    ? costs.reduce((a, b) => (Number(a.cost) > Number(b.cost) ? a : b)).category
    : '—';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={'تحليل التكاليف'} showBack />

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
                <StatCard label={'إجمالي التكاليف'} value={`$${fmt(totalCost)}`} icon="analytics" color={colors.primary} style={styles.kpi} />
                <StatCard label={'أعلى فئة'} value={isAr ? (CAT_AR[topCat] ?? topCat) : topCat} icon="podium" color={colors.accent} style={styles.kpi} />
              </View>

              {periods.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
                  <View style={styles.filterRow}>
                    <TouchableOpacity
                      style={[styles.filterChip, !periodFilter && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                      onPress={() => setPeriodFilter('')}>
                      <Text style={[styles.filterText, { color: !periodFilter ? '#fff' : colors.textMuted }]}>
                        {'الكل'}
                      </Text>
                    </TouchableOpacity>
                    {periods.map((p) => (
                      <TouchableOpacity key={p}
                        style={[styles.filterChip, periodFilter === p && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                        onPress={() => setPeriodFilter(p)}>
                        <Text style={[styles.filterText, { color: periodFilter === p ? '#fff' : colors.textMuted }]}>{p}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              )}

              <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={openCreate} activeOpacity={0.8}>
                <Ionicons name="add-circle" size={20} color="#fff" />
                <Text style={styles.addText}>{'إضافة تحليل'}</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item: c }) => (
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>{isAr ? (CAT_AR[c.category] ?? c.category) : c.category}</Text>
                  <Text style={[styles.cardAmt, { color: colors.primary }]}>${fmt(Number(c.cost))}</Text>
                  <Text style={[styles.cardSub, { color: colors.textMuted }]}>{c.period}</Text>
                  {c.notes ? <Text style={[styles.cardSub, { color: colors.textMuted }]}>{c.notes}</Text> : null}
                </View>
                <View style={styles.cardRight}>
                  {c.percentage ? (
                    <Text style={[styles.pctText, { color: colors.textSecondary }]}>{Number(c.percentage).toFixed(1)}%</Text>
                  ) : null}
                  <View style={styles.actionRow}>
                    <TouchableOpacity onPress={() => openEdit(c)} hitSlop={8}>
                      <Ionicons name="pencil" size={16} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(c)} hitSlop={8}>
                      <Ionicons name="trash-outline" size={16} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              {c.percentage ? (
                <View style={{ marginTop: spacing.sm }}>
                  <View style={[styles.track, { backgroundColor: colors.border }]}>
                    <View style={[styles.fill, { width: `${Math.min(Number(c.percentage), 100)}%` as any, backgroundColor: colors.primary }]} />
                  </View>
                </View>
              ) : null}
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="analytics-outline" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>{'لا توجد تحليلات'}</Text>
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
              {editing ? ('تعديل التحليل') : ('تحليل تكاليف جديد')}
            </Text>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={[styles.label, { color: colors.textMuted }]}>{'الفئة *'}</Text>
              <View style={styles.chipGroup}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity key={cat}
                    style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.surfaceAlt },
                      form.category === cat && { borderColor: colors.primary, backgroundColor: `${colors.primary}18` }]}
                    onPress={() => setForm((p) => ({ ...p, category: cat }))}>
                    <Text style={[styles.chipText, { color: form.category === cat ? colors.primary : colors.textSecondary }]}>
                      {isAr ? (CAT_AR[cat] ?? cat) : cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, { color: colors.textMuted }]}>{'التكلفة *'}</Text>
              <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                placeholder="0.00" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad"
                value={form.cost} onChangeText={(v) => setForm((p) => ({ ...p, cost: v }))} />

              <Text style={[styles.label, { color: colors.textMuted }]}>{'النسبة المئوية'}</Text>
              <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                placeholder="0.0" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad"
                value={form.percentage} onChangeText={(v) => setForm((p) => ({ ...p, percentage: v }))} />

              <Text style={[styles.label, { color: colors.textMuted }]}>{'الفترة *'}</Text>
              <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                placeholder={'مثال: يناير 2025'}
                placeholderTextColor={colors.textMuted}
                value={form.period} onChangeText={(v) => setForm((p) => ({ ...p, period: v }))} />

              <Text style={[styles.label, { color: colors.textMuted }]}>{'ملاحظات'}</Text>
              <TextInput style={[styles.input, styles.inputMulti, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                placeholder={'ملاحظات اختيارية…'}
                placeholderTextColor={colors.textMuted} multiline numberOfLines={3}
                value={form.notes} onChangeText={(v) => setForm((p) => ({ ...p, notes: v }))} />
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
  kpiRow:     { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  kpi:        { flex: 1 },
  filterRow:  { flexDirection: 'row', gap: spacing.xs, paddingRight: spacing.md },
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
  pctText:    { fontSize: 16, fontWeight: '700' as const },
  actionRow:  { flexDirection: 'row', gap: spacing.sm, marginTop: 4 },
  track:      { height: 5, borderRadius: 3, overflow: 'hidden' },
  fill:       { height: '100%', borderRadius: 3 },
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
