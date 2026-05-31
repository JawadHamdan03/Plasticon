import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, RefreshControl, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

interface ChecklistItem {
  id:         number;
  shiftId?:   number;
  notes?:     string;
  completed:  boolean;
  createdAt:  string;
  shift?:     { name: string };
}

export function DailyChecklistScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();

  const DEFAULT_CHECKS = isAr ? [
    'فحص معدات السلامة',
    'فحص الآلة قبل التشغيل',
    'التحقق من مخزون المواد',
    'مراجعة معايير الجودة',
    'فحص النظافة',
  ] : [
    'Safety equipment check',
    'Machine pre-start inspection',
    'Material stock verification',
    'Quality standards review',
    'Cleanliness check',
  ];

  const [checklists, setChecklists] = useState<ChecklistItem[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checks,     setChecks]     = useState<Record<string, boolean>>({});
  const [notes,      setNotes]      = useState('');
  const [saving,     setSaving]     = useState(false);
  const [submitted,  setSubmitted]  = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<ChecklistItem[] | { data: ChecklistItem[] }>('/worker-tools/shift-checklists/mine');
      const list = Array.isArray(res) ? res : (res.data ?? []);
      setChecklists(list);
      if (list.length > 0) setSubmitted(true);
    } catch { setChecklists([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const toggle = (key: string) => setChecks((prev) => ({ ...prev, [key]: !prev[key] }));

  const submit = async () => {
    const allChecked = DEFAULT_CHECKS.every((c) => checks[c]);
    if (!allChecked) {
      Alert.alert(isAr ? 'غير مكتمل' : 'Incomplete', isAr ? 'يرجى إكمال جميع عناصر القائمة قبل الإرسال.' : 'Please complete all checklist items before submitting.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/worker-tools/shift-checklists', {
        completed: true,
        notes:     notes.trim() || undefined,
      });
      setSubmitted(true);
      setLoading(true); void load();
    } catch (e: any) {
      Alert.alert(isAr ? 'خطأ' : 'Error', e.message ?? (isAr ? 'فشل إرسال القائمة.' : 'Failed to submit checklist.'));
    } finally { setSaving(false); }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={isAr ? 'قائمة اليومية' : 'Daily Checklist'} subtitle={isAr ? 'فحوصات السلامة' : 'Shift safety and pre-start checks'} showBack />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
      >
        {/* Today's checklist */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{isAr ? 'قائمة اليوم' : "Today's Checklist"}</Text>
          {DEFAULT_CHECKS.map((item) => (
            <TouchableOpacity key={item} style={[styles.checkRow, { borderBottomColor: colors.border }]} onPress={() => toggle(item)} activeOpacity={0.75}>
              <View style={[styles.checkbox, { borderColor: checks[item] ? colors.success : colors.border }, checks[item] && { backgroundColor: colors.success, borderColor: colors.success }]}>
                {checks[item] && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={[styles.checkLabel, { color: checks[item] ? colors.textMuted : colors.text }, checks[item] && { textDecorationLine: 'line-through' }]}>{item}</Text>
            </TouchableOpacity>
          ))}
          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{isAr ? 'ملاحظات (اختياري)' : 'Notes (optional)'}</Text>
          <TextInput
            style={[styles.input, styles.inputMulti, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
            placeholder={isAr ? 'أي ملاحظات أو مشكلات…' : 'Any observations or issues…'}
            placeholderTextColor={colors.textMuted}
            value={notes}
            onChangeText={setNotes}
            multiline numberOfLines={3}
          />
          <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.success }]} onPress={submit} disabled={saving || submitted} activeOpacity={0.85}>
            {saving ? <ActivityIndicator size="small" color="#fff" /> : (
              <>
                <Ionicons name={submitted ? 'checkmark-circle' : 'send'} size={18} color="#fff" />
                <Text style={styles.submitText}>{submitted ? (isAr ? 'تم الإرسال اليوم' : 'Submitted Today') : (isAr ? 'إرسال القائمة' : 'Submit Checklist')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* History */}
        {checklists.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{isAr ? 'الإرسالات الأخيرة' : 'Recent Submissions'}</Text>
            {loading ? <ActivityIndicator color={colors.primary} /> : (
              <View style={styles.list}>
                {checklists.slice(0, 10).map((c, idx) => (
                  <View key={`${c.id}-${idx}`} style={[styles.histCard, { borderBottomColor: colors.border }]}>
                    <View style={[styles.histDot, { backgroundColor: c.completed ? colors.success : colors.warning }]} />
                    <View style={styles.histBody}>
                      <Text style={[styles.histDate, { color: colors.text }]}>{new Date(c.createdAt).toLocaleDateString()}</Text>
                      {c.notes ? <Text style={[styles.histNotes, { color: colors.textMuted }]}>{c.notes}</Text> : null}
                    </View>
                    <View style={[styles.badge, { backgroundColor: c.completed ? `${colors.success}15` : `${colors.warning}15` }]}>
                      <Text style={[styles.badgeText, { color: c.completed ? colors.success : colors.warning }]}>
                        {c.completed ? (isAr ? 'مكتمل' : 'Done') : (isAr ? 'جزئي' : 'Partial')}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:          { flex: 1 },
  content:       { padding: spacing.md, paddingBottom: 40 },
  section:       { borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, ...shadow.sm },
  sectionTitle:  { ...typography.h4, marginBottom: spacing.md },
  checkRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, gap: spacing.sm },
  checkbox:      { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  checkLabel:    { ...typography.bodySmall, flex: 1 },
  fieldLabel:    { ...typography.caption, marginTop: spacing.md, marginBottom: 6 },
  input:         { borderWidth: 1.5, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: 15 },
  inputMulti:    { height: 72, textAlignVertical: 'top', marginBottom: spacing.md },
  submitBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: radius.md, paddingVertical: 13 },
  submitText:    { fontWeight: '700', color: '#fff', fontSize: 15 },
  list:          { gap: spacing.sm },
  histCard:      { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 8, borderBottomWidth: 1 },
  histDot:       { width: 8, height: 8, borderRadius: 4 },
  histBody:      { flex: 1 },
  histDate:      { ...typography.bodySmall, fontWeight: '600' },
  histNotes:     { ...typography.caption },
  badge:         { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm },
  badgeText:     { fontSize: 11, fontWeight: '700' },
});
