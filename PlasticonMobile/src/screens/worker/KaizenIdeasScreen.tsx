import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, Modal, RefreshControl, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

interface KaizenIdea {
  id: number;
  title: string;
  details: string;
  estimated_impact?: string | null;
  review_status?: string;
  review_note?: string | null;
  reward_points?: number;
  score?: number;
  created_at: string;
}

export function KaizenIdeasScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const today0 = new Date().toISOString().slice(0, 10);
  const month0 = new Date().toISOString().slice(0, 7) + '-01';
  const [fromDate, setFromDate] = useState(month0);
  const [toDate,   setToDate]   = useState(today0);
  const [ideas,      setIdeas]      = useState<KaizenIdea[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal,      setModal]      = useState(false);
  const [title,      setTitle]      = useState('');
  const [details,    setDetails]    = useState('');
  const [impact,     setImpact]     = useState('');
  const [saving,     setSaving]     = useState(false);

  const STATUS_COLOR: Record<string, string> = {
    PENDING:     colors.warning,
    APPROVED:    colors.success,
    REJECTED:    colors.danger,
    pending:     colors.warning,
    approved:    colors.success,
    rejected:    colors.danger,
  };

  const statusLabel = (s: string) => {
    if (isAr) {
      if (s.toUpperCase() === 'PENDING') return 'قيد المراجعة';
      if (s.toUpperCase() === 'APPROVED') return 'مقبول';
      if (s.toUpperCase() === 'REJECTED') return 'مرفوض';
    }
    return s;
  };

  const load = useCallback(async () => {
    try {
      const res = await api.get<KaizenIdea[] | { data: KaizenIdea[] }>('/worker-tools/kaizen/mine');
      setIdeas(Array.isArray(res) ? res : ((res as any).data ?? []));
    } catch { setIdeas([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const inRange = (d: string) => {
    const s = d.slice(0, 10);
    return (!fromDate || s >= fromDate) && (!toDate || s <= toDate);
  };

  const filteredIdeas = useMemo(() => ideas.filter(i => inRange(i.created_at)), [ideas, fromDate, toDate]);

  const handleDelete = (idea: KaizenIdea) => {
    Alert.alert(
      isAr ? 'حذف الفكرة' : 'Delete Idea',
      isAr ? 'هل أنت متأكد؟' : 'Are you sure?',
      [
        { text: isAr ? 'إلغاء' : 'Cancel', style: 'cancel' },
        {
          text: isAr ? 'حذف' : 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/worker-tools/entries/kaizen/${idea.id}`);
              setIdeas((prev) => prev.filter((i) => i.id !== idea.id));
            } catch (e: any) {
              Alert.alert(isAr ? 'خطأ' : 'Error', e.message ?? 'Failed');
            }
          },
        },
      ],
    );
  };

  const submit = async () => {
    if (!title.trim()) { Alert.alert(isAr ? 'مطلوب' : 'Required', isAr ? 'أدخل عنوان الفكرة.' : 'Enter an idea title.'); return; }
    if (!details.trim()) { Alert.alert(isAr ? 'مطلوب' : 'Required', isAr ? 'اشرح فكرتك.' : 'Describe your idea.'); return; }
    setSaving(true);
    try {
      await api.post('/worker-tools/kaizen', {
        title:           title.trim(),
        details:         details.trim(),
        estimatedImpact: impact.trim() || undefined,
      });
      setModal(false); setTitle(''); setDetails(''); setImpact('');
      setLoading(true); void load();
    } catch (e: any) {
      Alert.alert(isAr ? 'خطأ' : 'Error', e.message ?? (isAr ? 'فشل إرسال الفكرة.' : 'Failed to submit idea.'));
    } finally { setSaving(false); }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={isAr ? 'أفكار كايزن' : 'Kaizen Ideas'} subtitle={`${ideas.length} ${isAr ? 'مقدمة' : 'submitted'}`} showBack />
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.success} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.success} />}
        >
          {/* Date filter bar */}
          <View style={[styles.filterBar, { backgroundColor: colors.surface }]}>
            <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
            <TextInput
              style={[styles.filterInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
              value={fromDate}
              onChangeText={setFromDate}
              placeholder="From YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
            />
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>→</Text>
            <TextInput
              style={[styles.filterInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
              value={toDate}
              onChangeText={setToDate}
              placeholder="To YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
            />
            <TouchableOpacity onPress={() => { setFromDate(month0); setToDate(today0); }} style={[styles.filterReset, { borderColor: colors.border }]}>
              <Ionicons name="refresh-outline" size={13} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.success }]} onPress={() => setModal(true)} activeOpacity={0.8}>
            <Ionicons name="bulb" size={20} color="#fff" />
            <Text style={styles.addText}>{isAr ? 'تقديم فكرة تحسين' : 'Submit Improvement Idea'}</Text>
          </TouchableOpacity>

          {filteredIdeas.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="bulb-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.text }]}>{isAr ? 'لم يتم تقديم أفكار بعد' : 'No ideas submitted yet'}</Text>
              <Text style={[styles.emptyHint, { color: colors.textMuted }]}>{isAr ? 'شارك أفكار التحسين للمصنع' : 'Share improvement ideas for the factory'}</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {filteredIdeas.map((idea, idx) => {
                const statusColor = STATUS_COLOR[idea.review_status ?? ''] ?? colors.textMuted;
                return (
                  <View key={`${idea.id}-${idx}`} style={[styles.card, { backgroundColor: colors.surface }]}>
                    <View style={styles.cardTop}>
                      <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>{idea.title}</Text>
                      <View style={styles.cardTopRight}>
                        {idea.review_status && (
                          <View style={[styles.badge, { backgroundColor: `${statusColor}20` }]}>
                            <Text style={[styles.badgeText, { color: statusColor }]}>{statusLabel(idea.review_status)}</Text>
                          </View>
                        )}
                        <TouchableOpacity onPress={() => handleDelete(idea)} hitSlop={8}>
                          <Ionicons name="trash-outline" size={16} color={colors.danger} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <Text style={[styles.cardDesc, { color: colors.textMuted }]} numberOfLines={3}>{idea.details}</Text>

                    {idea.estimated_impact ? (
                      <Text style={[styles.impact, { color: colors.primary }]}>
                        {isAr ? 'التأثير: ' : 'Impact: '}{idea.estimated_impact}
                      </Text>
                    ) : null}

                    <View style={styles.cardFooter}>
                      <Text style={[styles.dateText, { color: colors.textMuted }]}>{new Date(idea.created_at).toLocaleDateString()}</Text>
                      {(idea.reward_points ?? 0) > 0 && (
                        <View style={[styles.pointsBadge, { backgroundColor: `${colors.accent}20` }]}>
                          <Ionicons name="star" size={11} color={colors.accent} />
                          <Text style={[styles.pointsText, { color: colors.accent }]}>+{idea.reward_points} pts</Text>
                        </View>
                      )}
                    </View>

                    {idea.review_note ? (
                      <Text style={[styles.reviewNote, { color: colors.textMuted, borderTopColor: colors.border }]}>
                        {isAr ? 'ملاحظة المراجع: ' : 'Reviewer note: '}{idea.review_note}
                      </Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}

      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>{isAr ? 'فكرة كايزن جديدة' : 'New Kaizen Idea'}</Text>

            <Text style={[styles.label, { color: colors.textMuted }]}>{isAr ? 'العنوان *' : 'Title *'}</Text>
            <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]} placeholder={isAr ? 'عنوان الفكرة' : 'Brief idea title'} placeholderTextColor={colors.textMuted} value={title} onChangeText={setTitle} />

            <Text style={[styles.label, { color: colors.textMuted }]}>{isAr ? 'التفاصيل *' : 'Details *'}</Text>
            <TextInput style={[styles.input, styles.inputMulti, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]} placeholder={isAr ? 'اشرح الفكرة بالتفصيل…' : 'Describe the improvement in detail…'} placeholderTextColor={colors.textMuted} value={details} onChangeText={setDetails} multiline numberOfLines={4} />

            <Text style={[styles.label, { color: colors.textMuted }]}>{isAr ? 'التأثير المتوقع (اختياري)' : 'Estimated Impact (optional)'}</Text>
            <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]} placeholder={isAr ? 'مثال: تقليل الهدر 20%' : 'e.g. Reduce waste by 20%'} placeholderTextColor={colors.textMuted} value={impact} onChangeText={setImpact} />

            <View style={styles.actions}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => setModal(false)}>
                <Text style={[styles.cancelText, { color: colors.textMuted }]}>{isAr ? 'إلغاء' : 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.success }]} onPress={submit} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitText}>{isAr ? 'إرسال' : 'Submit'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:       { flex: 1 },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content:    { padding: spacing.md, paddingBottom: 40 },
  addBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: radius.lg, paddingVertical: 12, marginBottom: spacing.md },
  addText:    { ...typography.bodySmall, fontWeight: '700', color: '#fff' },
  empty:      { alignItems: 'center', paddingVertical: 60, gap: spacing.xs },
  emptyText:  { ...typography.h4 },
  emptyHint:  { ...typography.bodySmall },
  list:       { gap: spacing.sm },
  card:       { borderRadius: radius.lg, padding: spacing.md, ...shadow.sm },
  cardTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, gap: spacing.sm },
  cardTitle:  { ...typography.h4, flex: 1 },
  cardTopRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge:      { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm },
  badgeText:  { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  cardDesc:   { ...typography.bodySmall, marginBottom: spacing.sm },
  impact:     { ...typography.caption, fontWeight: '600', marginBottom: spacing.xs },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateText:   { ...typography.caption },
  pointsBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.sm },
  pointsText:  { fontSize: 11, fontWeight: '700' },
  reviewNote: { ...typography.caption, marginTop: spacing.xs, paddingTop: spacing.xs, borderTopWidth: 1, fontStyle: 'italic' },
  overlay:    { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:      { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: 40 },
  handle:     { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  sheetTitle: { ...typography.h2, marginBottom: spacing.md },
  label:      { ...typography.caption, marginBottom: 6 },
  input:      { borderWidth: 1.5, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: 15, marginBottom: spacing.md },
  inputMulti: { height: 96, textAlignVertical: 'top' },
  actions:    { flexDirection: 'row', gap: spacing.sm },
  cancelBtn:  { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: radius.md, borderWidth: 1.5 },
  cancelText: { fontWeight: '700' },
  submitBtn:  { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: radius.md },
  submitText: { fontWeight: '700', color: '#fff' },
  filterBar:   { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 10, marginBottom: 8 },
  filterInput: { flex: 1, borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, fontSize: 13 },
  filterReset: { width: 30, height: 30, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
