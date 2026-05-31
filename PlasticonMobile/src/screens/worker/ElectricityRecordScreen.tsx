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

interface Reading {
  id:        number;
  value:     number;
  unit?:     string;
  notes?:    string;
  createdAt: string;
  user?:     { fullName: string };
}

export function ElectricityRecordScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const [readings,   setReadings]   = useState<Reading[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm,   setShowForm]   = useState(false);
  const [value,      setValue]      = useState('');
  const [notes,      setNotes]      = useState('');
  const [saving,     setSaving]     = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<Reading[] | { data: Reading[] }>('/electricity/readings');
      setReadings(Array.isArray(res) ? res : (res.data ?? []));
    } catch { setReadings([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const latest = readings[0];
  const prev   = readings[1];
  const delta  = latest && prev ? latest.value - prev.value : null;

  const submit = async () => {
    if (!value.trim() || isNaN(Number(value))) {
      Alert.alert(isAr ? 'مطلوب' : 'Required', isAr ? 'يرجى إدخال قراءة عداد صالحة.' : 'Please enter a valid meter reading.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/electricity/readings', {
        value: parseFloat(value),
        notes: notes.trim() || undefined,
      });
      setValue(''); setNotes(''); setShowForm(false);
      setLoading(true); void load();
    } catch (e: any) {
      Alert.alert(isAr ? 'خطأ' : 'Error', e.message ?? (isAr ? 'فشل حفظ القراءة.' : 'Failed to save reading.'));
    } finally { setSaving(false); }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={isAr ? 'سجل الكهرباء' : 'Electricity Record'} subtitle={isAr ? 'سجل قراءات العداد' : 'Meter readings log'} showBack />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.warning} />}
      >
        {/* Latest reading summary */}
        {latest && (
          <View style={[styles.summary, { backgroundColor: colors.surface }]}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>{isAr ? 'آخر قراءة' : 'Latest Reading'}</Text>
                <Text style={[styles.summaryValue, { color: colors.warning }]}>{latest.value} <Text style={[styles.summaryUnit, { color: colors.textMuted }]}>{latest.unit ?? 'kWh'}</Text></Text>
              </View>
              {delta !== null && (
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>{isAr ? 'مقارنة بالسابق' : 'vs Previous'}</Text>
                  <Text style={[styles.summaryValue, { color: delta > 0 ? colors.danger : colors.success }]}>
                    {delta > 0 ? '+' : ''}{delta.toFixed(1)} {latest.unit ?? 'kWh'}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.summaryDate, { color: colors.textMuted }]}>{new Date(latest.createdAt).toLocaleString()}</Text>
          </View>
        )}

        {/* Log form */}
        {showForm ? (
          <View style={[styles.form, { backgroundColor: colors.surface }]}>
            <Text style={[styles.formTitle, { color: colors.text }]}>{isAr ? 'تسجيل قراءة جديدة' : 'Log New Reading'}</Text>
            <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]} placeholder={isAr ? 'قيمة العداد (kWh)' : 'Meter value (kWh)'} placeholderTextColor={colors.textMuted} value={value} onChangeText={setValue} keyboardType="numeric" />
            <TextInput style={[styles.input, styles.inputMulti, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]} placeholder={isAr ? 'ملاحظات (اختياري)' : 'Notes (optional)'} placeholderTextColor={colors.textMuted} value={notes} onChangeText={setNotes} multiline numberOfLines={2} />
            <View style={styles.formRow}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => setShowForm(false)}>
                <Text style={[styles.cancelText, { color: colors.textMuted }]}>{isAr ? 'إلغاء' : 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.warning }]} onPress={submit} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>{isAr ? 'حفظ' : 'Save'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.warning }]} onPress={() => setShowForm(true)} activeOpacity={0.8}>
            <Ionicons name="add-circle" size={20} color="#fff" />
            <Text style={styles.addText}>{isAr ? 'تسجيل قراءة' : 'Log Reading'}</Text>
          </TouchableOpacity>
        )}

        {loading ? <ActivityIndicator style={{ marginTop: 40 }} color={colors.warning} /> : (
          readings.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="flash-outline" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>{isAr ? 'لا توجد قراءات مسجلة' : 'No readings logged'}</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {readings.map((r, idx) => (
                <View key={`${r.id}-${idx}`} style={[styles.card, { backgroundColor: colors.surface }]}>
                  <View style={[styles.cardIcon, { backgroundColor: `${colors.warning}15` }]}><Ionicons name="flash" size={20} color={colors.warning} /></View>
                  <View style={styles.cardBody}>
                    <Text style={[styles.cardValue, { color: colors.text }]}>{r.value} {r.unit ?? 'kWh'}</Text>
                    {r.notes ? <Text style={[styles.cardNotes, { color: colors.textMuted }]}>{r.notes}</Text> : null}
                    <Text style={[styles.cardDate, { color: colors.textMuted }]}>{new Date(r.createdAt).toLocaleString()}</Text>
                  </View>
                </View>
              ))}
            </View>
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1 },
  content:     { padding: spacing.md, paddingBottom: 40 },
  summary:     { borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, ...shadow.sm },
  summaryRow:  { flexDirection: 'row', gap: spacing.lg, marginBottom: 6 },
  summaryItem: { flex: 1 },
  summaryLabel:{ ...typography.caption, marginBottom: 2 },
  summaryValue:{ fontSize: 22, fontWeight: '800' },
  summaryUnit: { fontSize: 14, fontWeight: '400' },
  summaryDate: { ...typography.caption },
  form:        { borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, ...shadow.sm },
  formTitle:   { ...typography.h4, marginBottom: spacing.sm },
  input:       { borderWidth: 1.5, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: 15, marginBottom: spacing.sm },
  inputMulti:  { height: 64, textAlignVertical: 'top' },
  formRow:     { flexDirection: 'row', gap: spacing.sm },
  cancelBtn:   { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: radius.md, borderWidth: 1.5 },
  cancelText:  { ...typography.bodySmall, fontWeight: '700' },
  saveBtn:     { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: radius.md },
  saveText:    { ...typography.bodySmall, fontWeight: '700', color: '#fff' },
  addBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: radius.lg, paddingVertical: 12, marginBottom: spacing.md },
  addText:     { ...typography.bodySmall, fontWeight: '700', color: '#fff' },
  empty:       { alignItems: 'center', paddingVertical: 60, gap: spacing.sm },
  emptyText:   { ...typography.bodySmall },
  list:        { gap: spacing.sm },
  card:        { flexDirection: 'row', alignItems: 'center', borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm, ...shadow.sm },
  cardIcon:    { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  cardBody:    { flex: 1 },
  cardValue:   { ...typography.h4 },
  cardNotes:   { ...typography.caption },
  cardDate:    { ...typography.caption },
});
