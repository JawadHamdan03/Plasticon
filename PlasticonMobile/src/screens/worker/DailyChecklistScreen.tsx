import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, RefreshControl, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { colors, radius, shadow, spacing, typography } from '../../theme';

interface ChecklistItem {
  id:         number;
  shiftId?:   number;
  notes?:     string;
  completed:  boolean;
  createdAt:  string;
  shift?:     { name: string };
}

const DEFAULT_CHECKS = [
  'Safety equipment check',
  'Machine pre-start inspection',
  'Material stock verification',
  'Quality standards review',
  'Cleanliness check',
];

export function DailyChecklistScreen() {
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
    if (!allChecked) { Alert.alert('Incomplete', 'Please complete all checklist items before submitting.'); return; }
    setSaving(true);
    try {
      await api.post('/worker-tools/shift-checklists', {
        completed: true,
        notes:     notes.trim() || undefined,
      });
      setSubmitted(true);
      setLoading(true); void load();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to submit checklist.');
    } finally { setSaving(false); }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Daily Checklist" subtitle="Shift safety and pre-start checks" showBack />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
      >
        {/* Today's checklist */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Checklist</Text>
          {DEFAULT_CHECKS.map((item) => (
            <TouchableOpacity key={item} style={styles.checkRow} onPress={() => toggle(item)} activeOpacity={0.75}>
              <View style={[styles.checkbox, checks[item] && styles.checkboxDone]}>
                {checks[item] && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={[styles.checkLabel, checks[item] && styles.checkLabelDone]}>{item}</Text>
            </TouchableOpacity>
          ))}
          <Text style={styles.fieldLabel}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, styles.inputMulti]}
            placeholder="Any observations or issues…"
            placeholderTextColor={colors.textMuted}
            value={notes}
            onChangeText={setNotes}
            multiline numberOfLines={3}
          />
          <TouchableOpacity style={styles.submitBtn} onPress={submit} disabled={saving || submitted} activeOpacity={0.85}>
            {saving ? <ActivityIndicator size="small" color="#fff" /> : (
              <>
                <Ionicons name={submitted ? 'checkmark-circle' : 'send'} size={18} color="#fff" />
                <Text style={styles.submitText}>{submitted ? 'Submitted Today' : 'Submit Checklist'}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* History */}
        {checklists.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Submissions</Text>
            {loading ? <ActivityIndicator color={colors.primary} /> : (
              <View style={styles.list}>
                {checklists.slice(0, 10).map((c, idx) => (
                  <View key={`${c.id}-${idx}`} style={styles.histCard}>
                    <View style={[styles.histDot, { backgroundColor: c.completed ? colors.success : colors.warning }]} />
                    <View style={styles.histBody}>
                      <Text style={styles.histDate}>{new Date(c.createdAt).toLocaleDateString()}</Text>
                      {c.notes ? <Text style={styles.histNotes}>{c.notes}</Text> : null}
                    </View>
                    <View style={[styles.badge, { backgroundColor: c.completed ? `${colors.success}15` : `${colors.warning}15` }]}>
                      <Text style={[styles.badgeText, { color: c.completed ? colors.success : colors.warning }]}>
                        {c.completed ? 'Done' : 'Partial'}
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
  safe:          { flex: 1, backgroundColor: colors.background },
  content:       { padding: spacing.md, paddingBottom: 40 },
  section:       { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, ...shadow.sm },
  sectionTitle:  { ...typography.h4, marginBottom: spacing.md },
  checkRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.sm },
  checkbox:      { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxDone:  { backgroundColor: colors.success, borderColor: colors.success },
  checkLabel:    { ...typography.bodySmall, flex: 1 },
  checkLabelDone: { textDecorationLine: 'line-through', color: colors.textMuted },
  fieldLabel:    { ...typography.caption, marginTop: spacing.md, marginBottom: 6 },
  input:         { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: 15, color: colors.text, backgroundColor: colors.surfaceAlt },
  inputMulti:    { height: 72, textAlignVertical: 'top', marginBottom: spacing.md },
  submitBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.success, borderRadius: radius.md, paddingVertical: 13 },
  submitText:    { fontWeight: '700', color: '#fff', fontSize: 15 },
  list:          { gap: spacing.sm },
  histCard:      { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  histDot:       { width: 8, height: 8, borderRadius: 4 },
  histBody:      { flex: 1 },
  histDate:      { ...typography.bodySmall, fontWeight: '600' },
  histNotes:     { ...typography.caption, color: colors.textMuted },
  badge:         { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm },
  badgeText:     { fontSize: 11, fontWeight: '700' },
});
