import React, { useCallback, useEffect, useState } from 'react';
import {
import { useLocale } from '../../context/LocaleContext';
  ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Linking, Modal,
  Platform, Pressable, RefreshControl, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader, StatCard } from '../../components';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';

interface FinancialReport {
  id: number;
  title: string;
  reportType: string;
  period: string;
  pdfPath?: string | null;
  generatedBy?: { id: number; fullName: string };
  createdAt: string;
}

const REPORT_TYPES = ['MONTHLY', 'QUARTERLY', 'ANNUAL'] as const;
const FILTERS      = ['ALL', 'MONTHLY', 'QUARTERLY', 'ANNUAL'] as const;
const TYPE_AR: Record<string, string> = { ALL: 'الكل', MONTHLY: 'شهري', QUARTERLY: 'ربعي', ANNUAL: 'سنوي' };

interface FormState { title: string; reportType: string; period: string; pdfPath: string; }
const EMPTY: FormState = { title: '', reportType: 'MONTHLY', period: '', pdfPath: '' };

export function FinancialReportsScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const [reports,    setReports]    = useState<FinancialReport[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apiError,   setApiError]   = useState<string | null>(null);
  const [filter,     setFilter]     = useState<string>('ALL');
  const [modal,      setModal]      = useState(false);
  const [editing,    setEditing]    = useState<FinancialReport | null>(null);
  const [form,       setForm]       = useState<FormState>(EMPTY);
  const [saving,     setSaving]     = useState(false);

  const load = useCallback(async () => {
    setApiError(null);
    try {
      const res = await api.get<FinancialReport[] | { data: FinancialReport[] }>('/financial-reports?limit=50');
      setReports(Array.isArray(res) ? res : ((res as any).data ?? []));
    } catch (e: any) { setApiError(e?.message ?? 'فشل التحميل'); setReports([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit   = (r: FinancialReport) => {
    setEditing(r);
    setForm({ title: r.title, reportType: r.reportType, period: r.period ?? '', pdfPath: r.pdfPath ?? '' });
    setModal(true);
  };

  const handleDelete = (r: FinancialReport) => {
    Alert.alert('حذف', 'هل أنت متأكد؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/financial-reports/${r.id}`);
          setReports((p) => p.filter((x) => x.id !== r.id));
        } catch (e: any) { Alert.alert('خطأ', e.message ?? 'فشلت العملية'); }
      }},
    ]);
  };

  const submit = async () => {
    if (!form.title.trim()) {
      Alert.alert('مطلوب', 'أدخل عنوان التقرير'); return;
    }
    if (!form.period.trim()) {
      Alert.alert('مطلوب', 'أدخل الفترة'); return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = { title: form.title.trim(), reportType: form.reportType, period: form.period.trim() };
      if (form.pdfPath.trim()) body.pdfPath = form.pdfPath.trim();
      if (editing) {
        const up = await api.patch<FinancialReport>(`/financial-reports/${editing.id}`, body);
        setReports((p) => p.map((x) => x.id === editing.id ? up : x));
      } else {
        const cr = await api.post<FinancialReport>('/financial-reports', body);
        setReports((p) => [cr, ...p]);
      }
      setModal(false);
    } catch (e: any) { Alert.alert('خطأ', e.message ?? 'فشلت العملية'); }
    finally { setSaving(false); }
  };

  const visible   = filter === 'ALL' ? reports : reports.filter((r) => r.reportType === filter);
  const monthly   = reports.filter((r) => r.reportType === 'MONTHLY').length;
  const quarterly = reports.filter((r) => r.reportType === 'QUARTERLY').length;
  const annual    = reports.filter((r) => r.reportType === 'ANNUAL').length;

  const typeColor = (t: string) => {
    if (t === 'MONTHLY')   return colors.primary;
    if (t === 'QUARTERLY') return colors.accent;
    return colors.success;
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={'التقارير المالية'} showBack />

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
              <View style={[styles.kpiRow, { marginBottom: spacing.md }]}>
                <StatCard label={'شهري'} value={String(monthly)} icon="calendar" color={colors.primary} style={styles.kpi} />
                <StatCard label={'ربعي'} value={String(quarterly)} icon="stats-chart" color={colors.accent} style={styles.kpi} />
                <StatCard label={'سنوي'} value={String(annual)} icon="trending-up" color={colors.success} style={styles.kpi} />
              </View>
              <View style={styles.filterRow}>
                {FILTERS.map((f) => (
                  <TouchableOpacity key={f}
                    style={[styles.filterChip, filter === f && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                    onPress={() => setFilter(f)}>
                    <Text style={[styles.filterText, { color: filter === f ? '#fff' : colors.textMuted }]}>
                      {isAr ? TYPE_AR[f] : f === 'ALL' ? 'All' : f}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={openCreate} activeOpacity={0.8}>
                <Ionicons name="add-circle" size={20} color="#fff" />
                <Text style={styles.addText}>{'إضافة تقرير'}</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item: r }) => (
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <View style={styles.cardTop}>
                <View style={[styles.typeIcon, { backgroundColor: `${typeColor(r.reportType)}15` }]}>
                  <Ionicons name="document-text" size={20} color={typeColor(r.reportType)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>{r.title}</Text>
                  <Text style={[styles.cardSub, { color: colors.textMuted }]}>{r.period}</Text>
                  {r.generatedBy ? (
                    <Text style={[styles.cardSub, { color: colors.textMuted }]}>{'بواسطة: '}{r.generatedBy.fullName}</Text>
                  ) : null}
                </View>
                <View style={styles.cardRight}>
                  <View style={[styles.badge, { backgroundColor: `${typeColor(r.reportType)}15` }]}>
                    <Text style={[styles.badgeText, { color: typeColor(r.reportType) }]}>{r.reportType}</Text>
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
              {r.pdfPath ? (
                <TouchableOpacity
                  style={[styles.pdfBtn, { borderColor: colors.border }]}
                  onPress={() => void Linking.openURL(r.pdfPath!)}
                >
                  <Ionicons name="document-attach" size={14} color={colors.info} />
                  <Text style={[styles.pdfText, { color: colors.info }]}>{'عرض PDF'}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="bar-chart-outline" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>{'لا توجد تقارير'}</Text>
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
              {editing ? ('تعديل التقرير') : ('تقرير جديد')}
            </Text>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={[styles.label, { color: colors.textMuted }]}>{'العنوان *'}</Text>
              <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                placeholder={'مثال: تقرير يناير 2025'}
                placeholderTextColor={colors.textMuted}
                value={form.title} onChangeText={(v) => setForm((p) => ({ ...p, title: v }))} />

              <Text style={[styles.label, { color: colors.textMuted }]}>{'نوع التقرير *'}</Text>
              <View style={styles.chipGroup}>
                {REPORT_TYPES.map((t) => (
                  <TouchableOpacity key={t}
                    style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.surfaceAlt },
                      form.reportType === t && { borderColor: colors.primary, backgroundColor: `${colors.primary}18` }]}
                    onPress={() => setForm((p) => ({ ...p, reportType: t }))}>
                    <Text style={[styles.chipText, { color: form.reportType === t ? colors.primary : colors.textSecondary }]}>
                      {isAr ? TYPE_AR[t] : t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, { color: colors.textMuted }]}>{'الفترة *'}</Text>
              <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                placeholder={'مثال: يناير 2025'}
                placeholderTextColor={colors.textMuted}
                value={form.period} onChangeText={(v) => setForm((p) => ({ ...p, period: v }))} />

              <Text style={[styles.label, { color: colors.textMuted }]}>{'رابط PDF (اختياري)'}</Text>
              <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                placeholder="https://..." placeholderTextColor={colors.textMuted}
                value={form.pdfPath} onChangeText={(v) => setForm((p) => ({ ...p, pdfPath: v }))}
                autoCapitalize="none" keyboardType="url" />
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
  kpiRow:     { flexDirection: 'row', gap: spacing.sm },
  kpi:        { flex: 1 },
  filterRow:  { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.sm, flexWrap: 'wrap' },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1.5, borderColor: '#E2E8F0' },
  filterText: { fontSize: 12, fontWeight: '600' as const },
  addBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: radius.lg, paddingVertical: 12, marginBottom: spacing.md },
  addText:    { ...typography.bodySmall, fontWeight: '700' as const, color: '#fff' },
  card:       { borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardTop:    { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  typeIcon:   { width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardTitle:  { ...typography.h4 },
  cardSub:    { ...typography.caption, marginTop: 2 },
  cardRight:  { alignItems: 'flex-end', gap: spacing.xs },
  actionRow:  { flexDirection: 'row', gap: spacing.sm, marginTop: 4 },
  badge:      { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  badgeText:  { fontSize: 10, fontWeight: '700' as const },
  pdfBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1 },
  pdfText:    { fontSize: 13, fontWeight: '600' as const },
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
