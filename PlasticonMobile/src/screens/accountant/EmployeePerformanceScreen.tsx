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

interface PerfRecord {
  id: number;
  periodType: string;
  periodDate: string;
  productionScore: number;
  qualityScore: number;
  attendanceScore: number;
  kaizenScore: number;
  totalScore: number;
  notes?: string | null;
  user: { id: number; fullName: string; username: string; role: string };
  calculatedBy?: { id: number; fullName: string };
}

interface UserOption { id: number; fullName: string; username: string; role: string; }

const PERIOD_TYPES = ['DAILY', 'WEEKLY'] as const;

function gradeInfo(score: number, colors: any) {
  if (score >= 90) return { label: 'Excellent', labelAr: 'ممتاز',   color: colors.success };
  if (score >= 75) return { label: 'Good',      labelAr: 'جيد',     color: colors.primary };
  if (score >= 60) return { label: 'Average',   labelAr: 'متوسط',   color: colors.warning };
  return               { label: 'Poor',      labelAr: 'ضعيف',    color: colors.danger };
}

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={{ marginBottom: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={[scoreStyles.barLabel, { color: colors.textMuted }]}>{label}</Text>
        <Text style={[scoreStyles.barVal, { color: colors.text }]}>{value}</Text>
      </View>
      <View style={[scoreStyles.track, { backgroundColor: colors.border }]}>
        <View style={[scoreStyles.fill, { width: `${Math.min(value, 100)}%` as any, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const scoreStyles = StyleSheet.create({
  barLabel: { fontSize: 11, fontWeight: '500' as const },
  barVal:   { fontSize: 11, fontWeight: '700' as const },
  track:    { height: 5, borderRadius: 3, overflow: 'hidden', marginTop: 3 },
  fill:     { height: '100%', borderRadius: 3 },
});

interface FormState {
  userId: string; periodType: string; periodDate: string;
  productionScore: string; qualityScore: string; attendanceScore: string; kaizenScore: string; notes: string;
}
const EMPTY: FormState = {
  userId: '', periodType: 'DAILY', periodDate: new Date().toISOString().slice(0, 10),
  productionScore: '', qualityScore: '', attendanceScore: '', kaizenScore: '', notes: '',
};

export function EmployeePerformanceScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const [records,    setRecords]    = useState<PerfRecord[]>([]);
  const [users,      setUsers]      = useState<UserOption[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal,      setModal]      = useState(false);
  const [form,       setForm]       = useState<FormState>(EMPTY);
  const [saving,     setSaving]     = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [expanded,   setExpanded]   = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    try {
      const [recs, us] = await Promise.allSettled([
        api.get<PerfRecord[] | { data: PerfRecord[] }>('/performance?limit=50'),
        api.get<UserOption[] | { data: UserOption[] }>('/users/all'),
      ]);
      if (recs.status === 'fulfilled') {
        const r = recs.value;
        setRecords(Array.isArray(r) ? r : ((r as any).data ?? []));
      }
      if (us.status === 'fulfilled') {
        const u = us.value;
        setUsers(Array.isArray(u) ? u : ((u as any).data ?? []));
      }
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleDelete = (r: PerfRecord) => {
    Alert.alert(isAr ? 'حذف' : 'Delete', isAr ? 'هل أنت متأكد؟' : 'Are you sure?', [
      { text: isAr ? 'إلغاء' : 'Cancel', style: 'cancel' },
      { text: isAr ? 'حذف' : 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/performance/${r.id}`);
          setRecords((p) => p.filter((x) => x.id !== r.id));
        } catch (e: any) { Alert.alert('Error', e.message ?? 'Failed'); }
      }},
    ]);
  };

  const handleCalculate = async () => {
    setCalculating(true);
    try {
      await api.post('/performance/calculate', {});
      setRefreshing(true);
      await load();
      Alert.alert(isAr ? 'تم' : 'Done', isAr ? 'تم حساب الأداء بنجاح' : 'Performance calculated successfully');
    } catch (e: any) {
      Alert.alert(isAr ? 'خطأ' : 'Error', e.message ?? 'Failed to calculate');
    } finally { setCalculating(false); }
  };

  const submit = async () => {
    if (!form.userId) {
      Alert.alert(isAr ? 'مطلوب' : 'Required', isAr ? 'اختر الموظف' : 'Select employee'); return;
    }
    const scores = [form.productionScore, form.qualityScore, form.attendanceScore, form.kaizenScore];
    if (scores.some((s) => !s || isNaN(Number(s)) || Number(s) < 0 || Number(s) > 100)) {
      Alert.alert(isAr ? 'مطلوب' : 'Required', isAr ? 'أدخل درجات صحيحة (0-100)' : 'Enter valid scores (0-100)'); return;
    }
    if (!form.periodDate) {
      Alert.alert(isAr ? 'مطلوب' : 'Required', isAr ? 'أدخل تاريخ الفترة' : 'Enter period date'); return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        userId:          parseInt(form.userId, 10),
        periodType:      form.periodType,
        periodDate:      form.periodDate,
        productionScore: parseFloat(form.productionScore),
        qualityScore:    parseFloat(form.qualityScore),
        attendanceScore: parseFloat(form.attendanceScore),
        kaizenScore:     parseFloat(form.kaizenScore),
      };
      if (form.notes.trim()) body.notes = form.notes.trim();
      const cr = await api.post<PerfRecord>('/performance', body);
      setRecords((p) => [cr, ...p]);
      setModal(false);
      setForm(EMPTY);
    } catch (e: any) { Alert.alert(isAr ? 'خطأ' : 'Error', e.message ?? 'Failed'); }
    finally { setSaving(false); }
  };

  const avgScore  = records.length > 0 ? records.reduce((s, r) => s + (Number(r.totalScore) || 0), 0) / records.length : 0;
  const excellent = records.filter((r) => Number(r.totalScore) >= 90).length;

  const leaderMap = new Map<number, { name: string; total: number; count: number }>();
  records.forEach((r) => {
    const uid = r.user?.id;
    if (!uid) return;
    const existing = leaderMap.get(uid);
    if (existing) { existing.total += Number(r.totalScore) || 0; existing.count++; }
    else { leaderMap.set(uid, { name: r.user.fullName, total: Number(r.totalScore) || 0, count: 1 }); }
  });
  const leaderboard = [...leaderMap.values()]
    .map((v) => ({ name: v.name, avg: v.count > 0 ? v.total / v.count : 0 }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 3);

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={isAr ? 'أداء الموظفين' : 'Employee Performance'} showBack />

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(i) => String(i.id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListHeaderComponent={
            <View>
              <View style={styles.kpiRow}>
                <StatCard label={isAr ? 'التقييمات' : 'Assessments'} value={String(records.length)} icon="bar-chart" color={colors.primary} style={styles.kpi} />
                <StatCard label={isAr ? 'متوسط' : 'Avg Score'} value={avgScore.toFixed(1)} icon="trending-up" color={colors.info} style={styles.kpi} />
                <StatCard label={isAr ? 'ممتاز' : 'Excellent'} value={String(excellent)} icon="star" color={colors.success} style={styles.kpi} />
              </View>

              {leaderboard.length > 0 && (
                <View style={[styles.leaderCard, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.leaderTitle, { color: colors.text }]}>{isAr ? '🏆 المتصدرون' : '🏆 Top Performers'}</Text>
                  {leaderboard.map((l, idx) => (
                    <View key={l.name} style={styles.leaderRow}>
                      <Text style={[styles.leaderRank, { color: idx === 0 ? '#F59E0B' : colors.textMuted }]}>#{idx + 1}</Text>
                      <Text style={[styles.leaderName, { color: colors.text }]} numberOfLines={1}>{l.name}</Text>
                      <Text style={[styles.leaderScore, { color: colors.primary }]}>{l.avg.toFixed(1)}</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.headerActions}>
                <TouchableOpacity
                  style={[styles.calcBtn, { borderColor: colors.info }, calculating && { opacity: 0.6 }]}
                  onPress={handleCalculate} disabled={calculating}>
                  {calculating
                    ? <ActivityIndicator size="small" color={colors.info} />
                    : <><Ionicons name="calculator" size={16} color={colors.info} /><Text style={[styles.calcText, { color: colors.info }]}>{isAr ? 'احتساب تلقائي' : 'Auto-Calculate'}</Text></>}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary, flex: 1 }]} onPress={() => { setForm(EMPTY); setModal(true); }} activeOpacity={0.8}>
                  <Ionicons name="add-circle" size={20} color="#fff" />
                  <Text style={styles.addText}>{isAr ? 'إضافة تقييم' : 'Add Assessment'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          }
          renderItem={({ item: r }) => {
            const score = Number(r.totalScore) || 0;
            const grade = gradeInfo(score, colors);
            const isOpen = expanded.has(r.id);
            return (
              <View style={[styles.card, { backgroundColor: colors.surface }]}>
                <TouchableOpacity style={styles.cardTop} onPress={() => toggleExpand(r.id)} activeOpacity={0.7}>
                  <View style={[styles.scoreCircle, { borderColor: grade.color }]}>
                    <Text style={[styles.scoreNum, { color: grade.color }]}>{score.toFixed(0)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardName, { color: colors.text }]}>{r.user?.fullName ?? '—'}</Text>
                    <Text style={[styles.cardSub, { color: colors.textMuted }]}>
                      {r.periodType} · {r.periodDate ? new Date(r.periodDate).toLocaleDateString() : ''}
                    </Text>
                  </View>
                  <View style={styles.cardRight}>
                    <View style={[styles.badge, { backgroundColor: `${grade.color}18` }]}>
                      <Text style={[styles.badgeText, { color: grade.color }]}>{isAr ? grade.labelAr : grade.label}</Text>
                    </View>
                    <View style={styles.actionRow}>
                      <TouchableOpacity onPress={() => handleDelete(r)} hitSlop={8}>
                        <Ionicons name="trash-outline" size={16} color={colors.danger} />
                      </TouchableOpacity>
                      <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
                    </View>
                  </View>
                </TouchableOpacity>

                {isOpen && (
                  <View style={[styles.expandedBody, { borderTopColor: colors.border }]}>
                    <ScoreBar label={isAr ? 'الإنتاج (40%)' : 'Production (40%)'} value={Number(r.productionScore)} color={colors.primary} />
                    <ScoreBar label={isAr ? 'الجودة (30%)'  : 'Quality (30%)'}    value={Number(r.qualityScore)}    color={colors.success} />
                    <ScoreBar label={isAr ? 'الحضور (20%)' : 'Attendance (20%)'} value={Number(r.attendanceScore)} color={colors.info} />
                    <ScoreBar label={isAr ? 'كايزن (10%)'  : 'Kaizen (10%)'}     value={Number(r.kaizenScore)}     color={colors.accent} />
                    {r.notes ? <Text style={[styles.cardSub, { color: colors.textMuted, marginTop: 6 }]}>{r.notes}</Text> : null}
                  </View>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>{isAr ? 'لا توجد تقييمات' : 'No assessments yet'}</Text>
            </View>
          }
        />
      )}

      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={styles.overlayBg} onPress={() => setModal(false)} />
          <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>{isAr ? 'تقييم جديد' : 'New Assessment'}</Text>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={[styles.label, { color: colors.textMuted }]}>{isAr ? 'الموظف *' : 'Employee *'}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
                <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                  {users.map((u) => (
                    <TouchableOpacity key={u.id}
                      style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.surfaceAlt },
                        form.userId === String(u.id) && { borderColor: colors.primary, backgroundColor: `${colors.primary}18` }]}
                      onPress={() => setForm((p) => ({ ...p, userId: String(u.id) }))}>
                      <Text style={[styles.chipText, { color: form.userId === String(u.id) ? colors.primary : colors.textSecondary }]}>
                        {u.fullName}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <Text style={[styles.label, { color: colors.textMuted }]}>{isAr ? 'نوع الفترة *' : 'Period Type *'}</Text>
              <View style={[styles.chipGroup, { marginBottom: spacing.sm }]}>
                {PERIOD_TYPES.map((t) => (
                  <TouchableOpacity key={t}
                    style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.surfaceAlt },
                      form.periodType === t && { borderColor: colors.primary, backgroundColor: `${colors.primary}18` }]}
                    onPress={() => setForm((p) => ({ ...p, periodType: t }))}>
                    <Text style={[styles.chipText, { color: form.periodType === t ? colors.primary : colors.textSecondary }]}>
                      {isAr ? (t === 'DAILY' ? 'يومي' : 'أسبوعي') : t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, { color: colors.textMuted }]}>{isAr ? 'تاريخ الفترة *' : 'Period Date *'}</Text>
              <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted}
                value={form.periodDate} onChangeText={(v) => setForm((p) => ({ ...p, periodDate: v }))} />

              {[
                { key: 'productionScore', labelEn: 'Production Score (0-100) *', labelAr: 'درجة الإنتاج (0-100) *' },
                { key: 'qualityScore',    labelEn: 'Quality Score (0-100) *',    labelAr: 'درجة الجودة (0-100) *' },
                { key: 'attendanceScore', labelEn: 'Attendance Score (0-100) *', labelAr: 'درجة الحضور (0-100) *' },
                { key: 'kaizenScore',     labelEn: 'Kaizen Score (0-100) *',     labelAr: 'درجة كايزن (0-100) *' },
              ].map(({ key, labelEn, labelAr }) => (
                <View key={key}>
                  <Text style={[styles.label, { color: colors.textMuted }]}>{isAr ? labelAr : labelEn}</Text>
                  <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                    placeholder="0 – 100" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad"
                    value={(form as any)[key]} onChangeText={(v) => setForm((p) => ({ ...p, [key]: v }))} />
                </View>
              ))}

              <Text style={[styles.label, { color: colors.textMuted }]}>{isAr ? 'ملاحظات' : 'Notes'}</Text>
              <TextInput style={[styles.input, styles.inputMulti, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                placeholder={isAr ? 'ملاحظات اختيارية…' : 'Optional notes…'}
                placeholderTextColor={colors.textMuted} multiline numberOfLines={3}
                value={form.notes} onChangeText={(v) => setForm((p) => ({ ...p, notes: v }))} />
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
  safe:          { flex: 1 },
  center:        { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:          { padding: spacing.md, paddingBottom: 40 },
  kpiRow:        { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md },
  kpi:           { flex: 1 },
  leaderCard:    { borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  leaderTitle:   { ...typography.h4, marginBottom: spacing.sm },
  leaderRow:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 4 },
  leaderRank:    { fontSize: 16, fontWeight: '800' as const, width: 28 },
  leaderName:    { flex: 1, ...typography.bodySmall },
  leaderScore:   { fontSize: 15, fontWeight: '700' as const },
  headerActions: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  calcBtn:       { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingVertical: 12, borderRadius: radius.lg, borderWidth: 1.5 },
  calcText:      { fontWeight: '700' as const, fontSize: 13 },
  addBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: radius.lg, paddingVertical: 12 },
  addText:       { ...typography.bodySmall, fontWeight: '700' as const, color: '#fff' },
  card:          { borderRadius: radius.lg, marginBottom: spacing.sm, ...shadow.sm, overflow: 'hidden' },
  cardTop:       { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  scoreCircle:   { width: 50, height: 50, borderRadius: 25, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  scoreNum:      { fontSize: 16, fontWeight: '800' as const },
  cardName:      { ...typography.h4 },
  cardSub:       { ...typography.caption, marginTop: 2 },
  cardRight:     { alignItems: 'flex-end', gap: spacing.xs },
  actionRow:     { flexDirection: 'row', gap: spacing.sm, marginTop: 4, alignItems: 'center' },
  badge:         { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  badgeText:     { fontSize: 10, fontWeight: '700' as const },
  expandedBody:  { padding: spacing.md, borderTopWidth: 1 },
  empty:         { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText:     { ...typography.bodySmall },
  overlay:       { flex: 1, justifyContent: 'flex-end' },
  overlayBg:     { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:         { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: spacing.xl, maxHeight: '92%' },
  handle:        { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  sheetTitle:    { ...typography.h3, textAlign: 'center', marginBottom: spacing.lg },
  label:         { ...typography.caption, marginBottom: 6, marginTop: spacing.sm },
  input:         { borderRadius: radius.md, borderWidth: 1.5, paddingHorizontal: spacing.md, paddingVertical: 11, fontSize: 15, marginBottom: 4 },
  inputMulti:    { height: 80, textAlignVertical: 'top' },
  chipGroup:     { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip:          { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1.5 },
  chipText:      { fontSize: 12, fontWeight: '600' as const },
  actions:       { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  cancelBtn:     { flex: 1, paddingVertical: 13, borderRadius: radius.md, borderWidth: 1.5, alignItems: 'center' },
  cancelText:    { fontWeight: '600' as const },
  saveBtn:       { flex: 2, paddingVertical: 13, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  saveText:      { fontWeight: '700' as const, color: '#fff' },
});
