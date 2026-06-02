import React, { useCallback, useEffect, useState } from 'react';
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

interface Target {
  id: number;
  target_date: string;
  target_units: number;
  actual_units: number;
  note?: string | null;
  achieved?: boolean;
  achievementRatio?: number;
  created_at: string;
}

export function DailyTargetsScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const [targets,    setTargets]    = useState<Target[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal,      setModal]      = useState(false);
  const [targetDate, setTargetDate] = useState(new Date().toISOString().slice(0, 10));
  const [targetUnits, setTargetUnits] = useState('');
  const [actualUnits, setActualUnits] = useState('');
  const [note,       setNote]       = useState('');
  const [saving,     setSaving]     = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<Target[] | { data: Target[] }>('/worker-tools/daily-targets/mine');
      setTargets(Array.isArray(res) ? res : ((res as any).data ?? []));
    } catch { setTargets([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleDelete = (t: Target) => {
    Alert.alert(
      isAr ? 'حذف الهدف' : 'Delete Target',
      isAr ? 'هل أنت متأكد؟' : 'Are you sure?',
      [
        { text: isAr ? 'إلغاء' : 'Cancel', style: 'cancel' },
        {
          text: isAr ? 'حذف' : 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/worker-tools/entries/target/${t.id}`);
              setTargets((prev) => prev.filter((x) => x.id !== t.id));
            } catch (e: any) {
              Alert.alert(isAr ? 'خطأ' : 'Error', e.message ?? 'Failed');
            }
          },
        },
      ],
    );
  };

  const submit = async () => {
    if (!targetUnits.trim() || isNaN(Number(targetUnits)) || Number(targetUnits) < 0) {
      Alert.alert(isAr ? 'مطلوب' : 'Required', isAr ? 'أدخل هدف الوحدات.' : 'Enter target units.');
      return;
    }
    if (!actualUnits.trim() || isNaN(Number(actualUnits)) || Number(actualUnits) < 0) {
      Alert.alert(isAr ? 'مطلوب' : 'Required', isAr ? 'أدخل الوحدات الفعلية.' : 'Enter actual units.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/worker-tools/daily-targets', {
        targetDate:  targetDate,
        targetUnits: parseFloat(targetUnits),
        actualUnits: parseFloat(actualUnits),
        note:        note.trim() || undefined,
      });
      setModal(false);
      setTargetUnits(''); setActualUnits(''); setNote('');
      setTargetDate(new Date().toISOString().slice(0, 10));
      setLoading(true); void load();
    } catch (e: any) {
      Alert.alert(isAr ? 'خطأ' : 'Error', e.message ?? (isAr ? 'فشل تسجيل الهدف.' : 'Failed to save target.'));
    } finally { setSaving(false); }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title={isAr ? 'أهداف الإنتاج' : 'Daily Targets'}
        subtitle={isAr ? 'أهداف الإنتاج اليومية' : "Production goals"}
        showBack
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
      >
        {loading ? (
          <ActivityIndicator style={{ marginTop: 60 }} size="large" color={colors.primary} />
        ) : (
          <>
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={() => setModal(true)} activeOpacity={0.8}>
              <Ionicons name="flag" size={20} color="#fff" />
              <Text style={styles.addText}>{isAr ? 'تسجيل هدف يومي' : 'Log Daily Target'}</Text>
            </TouchableOpacity>

            {targets.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="flag-outline" size={48} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>{isAr ? 'لا توجد أهداف مسجلة' : 'No targets recorded'}</Text>
              </View>
            ) : (
              <View style={styles.list}>
                {targets.map((t, idx) => {
                  const target = Number(t.target_units) || 0;
                  const actual = Number(t.actual_units) || 0;
                  const pct = target > 0 ? (actual / target) * 100 : 0;
                  const done = pct >= 100;
                  const barColor = pct >= 100 ? colors.success : pct >= 60 ? colors.warning : colors.danger;
                  return (
                    <View key={`${t.id}-${idx}`} style={[styles.card, { backgroundColor: colors.surface }]}>
                      <View style={styles.cardHeader}>
                        <View style={styles.cardHeaderLeft}>
                          <View style={[styles.badge, { backgroundColor: done ? `${colors.success}20` : `${colors.primary}20` }]}>
                            <Ionicons name={done ? 'checkmark-circle' : 'flag'} size={14} color={done ? colors.success : colors.primary} />
                            <Text style={[styles.badgeText, { color: done ? colors.success : colors.primary }]}>
                              {done ? (isAr ? 'محقق' : 'Achieved') : (isAr ? 'جاري' : 'In Progress')}
                            </Text>
                          </View>
                          {t.target_date && (
                            <Text style={[styles.dateText, { color: colors.textMuted }]}>
                              {new Date(t.target_date).toLocaleDateString()}
                            </Text>
                          )}
                        </View>
                        <TouchableOpacity onPress={() => handleDelete(t)} hitSlop={8}>
                          <Ionicons name="trash-outline" size={16} color={colors.danger} />
                        </TouchableOpacity>
                      </View>

                      {t.note ? <Text style={[styles.note, { color: colors.text }]}>{t.note}</Text> : null}

                      <View style={styles.progress}>
                        <Text style={[styles.progressLabel, { color: colors.textMuted }]}>
                          {actual} / {target} {isAr ? 'وحدة' : 'units'}
                        </Text>
                        <Text style={[styles.progressPct, { color: colors.text }]}>{Math.round(pct)}%</Text>
                      </View>
                      <View style={[styles.track, { backgroundColor: colors.border }]}>
                        <View style={[styles.fill, { width: `${Math.min(pct, 100)}%` as any, backgroundColor: barColor }]} />
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>{isAr ? 'تسجيل هدف يومي' : 'Log Daily Target'}</Text>

            <Text style={[styles.label, { color: colors.textMuted }]}>{isAr ? 'التاريخ *' : 'Date *'}</Text>
            <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted} value={targetDate} onChangeText={setTargetDate} />

            <Text style={[styles.label, { color: colors.textMuted }]}>{isAr ? 'الهدف (وحدات) *' : 'Target Units *'}</Text>
            <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]} placeholder="e.g. 500" placeholderTextColor={colors.textMuted} value={targetUnits} onChangeText={setTargetUnits} keyboardType="decimal-pad" />

            <Text style={[styles.label, { color: colors.textMuted }]}>{isAr ? 'الوحدات الفعلية *' : 'Actual Units *'}</Text>
            <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]} placeholder="e.g. 480" placeholderTextColor={colors.textMuted} value={actualUnits} onChangeText={setActualUnits} keyboardType="decimal-pad" />

            <Text style={[styles.label, { color: colors.textMuted }]}>{isAr ? 'ملاحظة (اختياري)' : 'Note (optional)'}</Text>
            <TextInput style={[styles.input, styles.inputMulti, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]} placeholder={isAr ? 'أي ملاحظات…' : 'Any notes…'} placeholderTextColor={colors.textMuted} value={note} onChangeText={setNote} multiline numberOfLines={3} />

            <View style={styles.actions}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => setModal(false)}>
                <Text style={[styles.cancelText, { color: colors.textMuted }]}>{isAr ? 'إلغاء' : 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary }]} onPress={submit} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitText}>{isAr ? 'حفظ' : 'Save'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1 },
  content: { padding: spacing.md, paddingBottom: 40 },
  addBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: radius.lg, paddingVertical: 12, marginBottom: spacing.md },
  addText: { ...typography.bodySmall, fontWeight: '700', color: '#fff' },
  empty:   { alignItems: 'center', paddingVertical: 80, gap: spacing.sm },
  emptyText: { ...typography.bodySmall },
  list:    { gap: spacing.sm },
  card:    { borderRadius: radius.lg, padding: spacing.md, ...shadow.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  badge:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm },
  badgeText: { fontSize: 11, fontWeight: '700' },
  dateText: { ...typography.caption },
  note:    { ...typography.bodySmall, marginBottom: spacing.sm },
  progress: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { ...typography.caption },
  progressPct:   { ...typography.caption, fontWeight: '700' },
  track:   { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 6 },
  fill:    { height: '100%', borderRadius: 3 },
  overlay:    { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:      { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: 40 },
  handle:     { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  sheetTitle: { ...typography.h2, marginBottom: spacing.md },
  label:      { ...typography.caption, marginBottom: 6 },
  input:      { borderWidth: 1.5, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: 15, marginBottom: spacing.md },
  inputMulti: { height: 72, textAlignVertical: 'top' },
  actions:    { flexDirection: 'row', gap: spacing.sm },
  cancelBtn:  { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: radius.md, borderWidth: 1.5 },
  cancelText: { fontWeight: '700' },
  submitBtn:  { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: radius.md },
  submitText: { fontWeight: '700', color: '#fff' },
});
