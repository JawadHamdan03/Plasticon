import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, KeyboardAvoidingView,
  Modal, Platform, RefreshControl, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { Button, ScreenHeader } from '../../components';
import { QualityCheck } from '../../api/types';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

function CheckCard({ item }: { item: QualityCheck }) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();

  const RESULT_META: Record<string, { color: string; icon: string }> = {
    PASS:    { color: colors.success, icon: 'checkmark-circle' },
    FAIL:    { color: colors.danger,  icon: 'close-circle' },
    PARTIAL: { color: colors.warning, icon: 'alert-circle' },
  };

  const meta = RESULT_META[item.result] ?? RESULT_META.PARTIAL;
  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <Text style={[styles.batch, { color: colors.text }]} numberOfLines={1}>{item.batchCode}</Text>
          <Text style={[styles.machine, { color: colors.textMuted }]}>{item.machine?.name ?? '—'} · {item.checkType}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: `${meta.color}18` }]}>
          <Ionicons name={meta.icon as any} size={14} color={meta.color} />
          <Text style={[styles.badgeText, { color: meta.color }]}>{item.result}</Text>
        </View>
      </View>
      <View style={styles.footer}>
        <Text style={[styles.date, { color: colors.textMuted }]}>{new Date(item.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</Text>
        {item.createdBy && <Text style={[styles.by, { color: colors.textMuted }]}>{isAr ? 'بواسطة' : 'by'} {item.createdBy.fullName}</Text>}
      </View>
      {item.notes ? <Text style={[styles.notes, { color: colors.textSecondary }]} numberOfLines={2}>{item.notes}</Text> : null}
    </View>
  );
}

function CreateModal({ visible, onClose, onSuccess }: { visible: boolean; onClose: () => void; onSuccess: () => void }) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();

  const RESULT_META: Record<string, { color: string }> = {
    PASS:    { color: colors.success },
    FAIL:    { color: colors.danger },
    PARTIAL: { color: colors.warning },
  };

  const [machines, setMachines] = useState<{ id: number; name: string }[]>([]);
  const [machineId, setMachineId] = useState('');
  const [batchCode, setBatchCode] = useState('');
  const [checkType, setCheckType] = useState('');
  const [result, setResult]       = useState<'PASS' | 'FAIL' | 'PARTIAL'>('PASS');
  const [notes, setNotes]         = useState('');
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    if (visible) api.get<{ machines: { id: number; name: string }[] }>('/machines').then((r) => setMachines(r.machines ?? [])).catch(() => {});
  }, [visible]);

  const submit = async () => {
    if (!batchCode.trim() || !checkType.trim()) { Alert.alert(isAr ? 'مطلوب' : 'Required', isAr ? 'رمز الدفعة ونوع الفحص مطلوبان.' : 'Batch code and check type are required.'); return; }
    setSaving(true);
    try {
      await api.post('/quality-checks', {
        machineId: machineId ? parseInt(machineId, 10) : undefined,
        batchCode: batchCode.trim(),
        checkType: checkType.trim(),
        result,
        notes:     notes.trim() || undefined,
        date:      new Date().toISOString(),
      });
      onSuccess();
    } catch (err: any) {
      Alert.alert(isAr ? 'خطأ' : 'Error', err.message ?? (isAr ? 'فشل الحفظ.' : 'Failed to save.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <Text style={[styles.sheetTitle, { color: colors.text }]}>{isAr ? 'تسجيل فحص جودة' : 'Log Quality Check'}</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {machines.length > 0 && (
              <>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{isAr ? 'الآلة' : 'Machine'}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
                  {machines.map((m, idx) => (
                    <TouchableOpacity
                      key={`${m.id}-${idx}`}
                      style={[styles.pill,
                        { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
                        machineId === String(m.id) && { backgroundColor: colors.primary, borderColor: colors.primary },
                      ]}
                      onPress={() => setMachineId(String(m.id))}
                    >
                      <Text style={[styles.pillText, { color: colors.text }, machineId === String(m.id) && styles.pillTextActive]}>{m.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}
            {[
              { label: isAr ? 'رمز الدفعة *' : 'Batch Code *', val: batchCode, set: setBatchCode, placeholder: '' },
              { label: isAr ? 'نوع الفحص *' : 'Check Type *', val: checkType, set: setCheckType, placeholder: isAr ? 'مثال: أبعاد، بصري' : 'e.g. Dimensional, Visual' },
            ].map((f) => (
              <View key={f.label} style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{f.label}</Text>
                <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]} placeholder={f.placeholder} placeholderTextColor={colors.textMuted} value={f.val} onChangeText={f.set} />
              </View>
            ))}
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{isAr ? 'النتيجة *' : 'Result *'}</Text>
            <View style={styles.resultRow}>
              {(['PASS', 'FAIL', 'PARTIAL'] as const).map((r) => {
                const m = RESULT_META[r];
                return (
                  <TouchableOpacity
                    key={r}
                    style={[styles.resultBtn,
                      { borderColor: colors.border, backgroundColor: colors.surfaceAlt },
                      result === r && { backgroundColor: m.color, borderColor: m.color },
                    ]}
                    onPress={() => setResult(r)}
                  >
                    <Text style={[styles.resultText, { color: colors.text }, result === r && { color: '#fff' }]}>{r}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{isAr ? 'ملاحظات' : 'Notes'}</Text>
              <TextInput style={[styles.input, styles.inputMulti, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]} multiline numberOfLines={3} placeholderTextColor={colors.textMuted} value={notes} onChangeText={setNotes} />
            </View>
            <View style={styles.actions}>
              <Button variant="ghost" onPress={onClose} style={styles.actionBtn}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
              <Button onPress={submit} loading={saving} style={styles.actionBtn}>{isAr ? 'حفظ' : 'Save'}</Button>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function QualityChecksScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const [checks, setChecks]     = useState<QualityCheck[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal]       = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ checks: QualityCheck[] }>('/quality-checks?limit=40');
      setChecks(res.checks ?? []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={isAr ? 'فحوصات الجودة' : 'Quality Checks'} subtitle={`${checks.length} ${isAr ? 'سجل' : 'records'}`} showBack />
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View> : (
        <FlatList
          data={checks}
          keyExtractor={(i, idx) => `${String(i.id)}-${idx}`}
          renderItem={({ item }) => <CheckCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="shield-checkmark-outline" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>{isAr ? 'لا توجد فحوصات جودة' : 'No quality checks'}</Text>
            </View>
          }
        />
      )}
      <TouchableOpacity style={[styles.fab, { backgroundColor: colors.success }]} onPress={() => setModal(true)} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
      <CreateModal visible={modal} onClose={() => setModal(false)} onSuccess={() => { setModal(false); setLoading(true); void load(); }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1 },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:    { padding: spacing.md, paddingBottom: 100 },
  card:    { borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardLeft: { flex: 1, marginRight: spacing.sm },
  batch:   { ...typography.h4 },
  machine: { ...typography.caption, marginTop: 2 },
  badge:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  badgeText: { fontSize: 11, fontWeight: '700' },
  footer:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  date:    { ...typography.caption },
  by:      { ...typography.caption },
  notes:   { ...typography.bodySmall },
  empty:   { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText: { ...typography.bodySmall },
  fab:     { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', ...shadow.lg },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:   { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: 40, maxHeight: '90%' },
  handle:  { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  sheetTitle: { ...typography.h2, marginBottom: spacing.md },
  field:   { marginBottom: spacing.md },
  fieldLabel: { ...typography.caption, marginBottom: 6 },
  input:   { borderWidth: 1.5, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 11, fontSize: 15 },
  inputMulti: { height: 80, textAlignVertical: 'top' },
  pill:    { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1.5, marginRight: spacing.sm },
  pillText:  { fontSize: 13, fontWeight: '600' },
  pillTextActive: { color: '#fff' },
  resultRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  resultBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.sm, borderWidth: 1.5 },
  resultText: { fontWeight: '700', fontSize: 13 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: { flex: 1 },
});
