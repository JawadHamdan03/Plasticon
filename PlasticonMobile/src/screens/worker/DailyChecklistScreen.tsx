import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal,
  Platform, RefreshControl, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';

interface ChecklistEntry {
  id: number;
  shift_phase: string;
  tasks_json: { label: string; done: boolean }[];
  digital_signature: string;
  created_at: string;
}

const SHIFT_PHASES = ['START', 'END'] as const;

export function DailyChecklistScreen() {
  const { colors } = useAppTheme();

  const DEFAULT_TASKS = 'فحص بصري للماكينة\nفحص معدات السلامة\nتجهيز المواد';

  const today0 = new Date().toISOString().slice(0, 10);
  const month0 = new Date().toISOString().slice(0, 7) + '-01';
  const [entries,    setEntries]    = useState<ChecklistEntry[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fromDate, setFromDate] = useState(month0);
  const [toDate,   setToDate]   = useState(today0);
  const [modal,      setModal]      = useState(false);
  const [shiftPhase, setShiftPhase] = useState<'START' | 'END'>('START');
  const [tasksText,  setTasksText]  = useState(DEFAULT_TASKS);
  const [signature,  setSignature]  = useState('');
  const [saving,     setSaving]     = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<ChecklistEntry[] | { data: ChecklistEntry[] }>('/worker-tools/shift-checklists/mine');
      const list = Array.isArray(res) ? res : ((res as any).data ?? []);
      setEntries(list);
    } catch { setEntries([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleDelete = (entry: ChecklistEntry) => {
    Alert.alert(
      'حذف القائمة',
      'هل أنت متأكد؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف', style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/worker-tools/entries/checklist/${entry.id}`);
              setEntries((prev) => prev.filter((e) => e.id !== entry.id));
            } catch (e: any) {
              Alert.alert('خطأ', e.message ?? 'Failed');
            }
          },
        },
      ],
    );
  };

  const openModal = () => {
    setTasksText(DEFAULT_TASKS);
    setShiftPhase('START');
    setSignature('');
    setModal(true);
  };

  const submit = async () => {
    const tasks = tasksText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((label) => ({ label, done: true }));
    if (tasks.length === 0) {
      Alert.alert('مطلوب', 'أدخل مهمة واحدة على الأقل.');
      return;
    }
    if (!signature.trim()) {
      Alert.alert('مطلوب', 'التوقيع الرقمي مطلوب.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/worker-tools/shift-checklists', {
        shiftPhase,
        tasks,
        digitalSignature: signature.trim(),
      });
      setModal(false);
      setLoading(true);
      void load();
    } catch (e: any) {
      Alert.alert('خطأ', e.message ?? ('فشل الإرسال'));
    } finally { setSaving(false); }
  };

  const inRange = (d: string) => { const s = d.slice(0, 10); return (!fromDate || s >= fromDate) && (!toDate || s <= toDate); };
  const filteredEntries = useMemo(() => entries.filter(e => inRange(e.created_at)), [entries, fromDate, toDate]); // eslint-disable-line

  const phaseLabel = (p: string) =>
    p === 'START'
      ? ('بداية الوردية')
      : ('نهاية الوردية');

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title={'قائمة الوردية'}
        subtitle={`${filteredEntries.length} ${'مسجل'}`}
        showBack
      />

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
        >
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={openModal} activeOpacity={0.8}>
            <Ionicons name="clipboard" size={20} color="#fff" />
            <Text style={styles.addText}>{'تسجيل قائمة وردية'}</Text>
          </TouchableOpacity>

          <View style={[styles.filterBar, { backgroundColor: colors.surface }]}>
            <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
            <TextInput
              style={[styles.filterInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
              value={fromDate} onChangeText={setFromDate}
              placeholder="From YYYY-MM-DD" placeholderTextColor={colors.textMuted}
            />
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>→</Text>
            <TextInput
              style={[styles.filterInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
              value={toDate} onChangeText={setToDate}
              placeholder="To YYYY-MM-DD" placeholderTextColor={colors.textMuted}
            />
            <TouchableOpacity onPress={() => { setFromDate(month0); setToDate(today0); }} style={[styles.filterReset, { borderColor: colors.border }]}>
              <Ionicons name="refresh-outline" size={13} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {filteredEntries.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="clipboard-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>{'لا توجد قوائم مسجلة'}</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {filteredEntries.map((entry, idx) => {
                const isStart = entry.shift_phase === 'START';
                const phaseColor = isStart ? colors.success : colors.primary;
                const tasks: { label: string; done: boolean }[] = Array.isArray(entry.tasks_json) ? entry.tasks_json : [];
                return (
                  <View key={`${entry.id}-${idx}`} style={[styles.card, { backgroundColor: colors.surface, borderLeftColor: phaseColor }]}>
                    <View style={styles.cardTop}>
                      <View style={[styles.phaseBadge, { backgroundColor: `${phaseColor}20` }]}>
                        <Ionicons name={isStart ? 'play-circle' : 'stop-circle'} size={13} color={phaseColor} />
                        <Text style={[styles.phaseText, { color: phaseColor }]}>{phaseLabel(entry.shift_phase)}</Text>
                      </View>
                      <Text style={[styles.dateText, { color: colors.textMuted }]}>{new Date(entry.created_at).toLocaleDateString()}</Text>
                      <TouchableOpacity onPress={() => handleDelete(entry)} hitSlop={8}>
                        <Ionicons name="trash-outline" size={17} color={colors.danger} />
                      </TouchableOpacity>
                    </View>

                    {tasks.length > 0 && (
                      <View style={styles.taskList}>
                        {tasks.map((t, ti) => (
                          <View key={ti} style={styles.taskRow}>
                            <Ionicons
                              name={t.done ? 'checkmark-circle' : 'ellipse-outline'}
                              size={14}
                              color={t.done ? colors.success : colors.textMuted}
                            />
                            <Text style={[styles.taskLabel, { color: colors.text }]}>{t.label}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {entry.digital_signature ? (
                      <Text style={[styles.sig, { color: colors.textMuted }]}>
                        {'التوقيع: '}{entry.digital_signature}
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
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={[styles.sheetTitle, { color: colors.text }]}>
                {'قائمة وردية جديدة'}
              </Text>

              <Text style={[styles.label, { color: colors.textMuted }]}>{'مرحلة الوردية *'}</Text>
              <View style={styles.phaseRow}>
                {SHIFT_PHASES.map((p) => {
                  const pColor = p === 'START' ? colors.success : colors.primary;
                  return (
                    <TouchableOpacity
                      key={p}
                      style={[styles.phaseChip, { borderColor: pColor }, shiftPhase === p && { backgroundColor: pColor }]}
                      onPress={() => setShiftPhase(p)}
                    >
                      <Text style={[styles.phaseChipText, { color: shiftPhase === p ? '#fff' : pColor }]}>
                        {phaseLabel(p)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.label, { color: colors.textMuted }]}>
                {'المهام * (كل مهمة في سطر)'}
              </Text>
              <TextInput
                style={[styles.input, styles.inputMulti, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                placeholder={'أدخل المهام، كل مهمة في سطر...'}
                placeholderTextColor={colors.textMuted}
                value={tasksText}
                onChangeText={setTasksText}
                multiline
                numberOfLines={5}
              />

              <Text style={[styles.label, { color: colors.textMuted }]}>{'التوقيع الرقمي *'}</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                placeholder={'اسمك أو رمزك'}
                placeholderTextColor={colors.textMuted}
                value={signature}
                onChangeText={setSignature}
              />

              <View style={styles.actions}>
                <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => setModal(false)}>
                  <Text style={[styles.cancelText, { color: colors.textMuted }]}>{'إلغاء'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary }]} onPress={submit} disabled={saving}>
                  {saving
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={styles.submitText}>{'إرسال'}</Text>
                  }
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1 },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.md, paddingBottom: 40 },

  addBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: radius.lg, paddingVertical: 12, marginBottom: spacing.md },
  addText: { ...typography.bodySmall, fontWeight: '700', color: '#fff' },

  filterBar:   { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.sm, paddingVertical: 8, borderRadius: radius.md, marginBottom: spacing.sm },
  filterInput: { flex: 1, borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, fontSize: 13 },
  filterReset: { width: 30, height: 30, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },

  empty:     { alignItems: 'center', paddingVertical: 60, gap: spacing.sm },
  emptyText: { ...typography.bodySmall },

  list: { gap: spacing.sm },
  card: { borderRadius: radius.lg, padding: spacing.md, borderLeftWidth: 3, ...shadow.sm },

  cardTop:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.sm },
  phaseBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm, flex: 1 },
  phaseText:  { fontSize: 11, fontWeight: '700' },
  dateText:   { ...typography.caption },

  taskList: { gap: 4, marginBottom: 6 },
  taskRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  taskLabel: { ...typography.bodySmall, flex: 1 },
  sig:      { ...typography.caption, fontStyle: 'italic', marginTop: 4 },

  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:   { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: 40, maxHeight: '88%' },
  handle:  { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  sheetTitle: { ...typography.h2, marginBottom: spacing.md },
  label:   { ...typography.caption, marginBottom: 6, marginTop: 4 },

  phaseRow:      { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  phaseChip:     { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: radius.md, borderWidth: 1.5 },
  phaseChipText: { fontSize: 12, fontWeight: '700' },

  input:      { borderWidth: 1.5, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: 15, marginBottom: spacing.md },
  inputMulti: { height: 110, textAlignVertical: 'top' },

  actions:    { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  cancelBtn:  { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: radius.md, borderWidth: 1.5 },
  cancelText: { fontWeight: '700' },
  submitBtn:  { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: radius.md },
  submitText: { fontWeight: '700', color: '#fff' },
});
