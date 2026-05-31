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

interface MicroStop {
  id:          number;
  reason:      string;
  duration:    number;
  machineName?: string;
  createdAt:   string;
}

export function MicroStopsScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const [stops,      setStops]      = useState<MicroStop[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal,      setModal]      = useState(false);
  const [reason,     setReason]     = useState('');
  const [duration,   setDuration]   = useState('');
  const [machine,    setMachine]    = useState('');
  const [saving,     setSaving]     = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<MicroStop[] | { data: MicroStop[] }>('/worker-tools/micro-stops/mine');
      setStops(Array.isArray(res) ? res : (res.data ?? []));
    } catch { setStops([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const totalMin = stops.reduce((acc, s) => acc + (s.duration ?? 0), 0);

  const submit = async () => {
    if (!reason.trim()) { Alert.alert(isAr ? 'مطلوب' : 'Required', isAr ? 'اشرح سبب التوقف.' : 'Describe the stop reason.'); return; }
    if (!duration.trim() || isNaN(Number(duration))) { Alert.alert(isAr ? 'مطلوب' : 'Required', isAr ? 'أدخل مدة صالحة.' : 'Enter a valid duration.'); return; }
    setSaving(true);
    try {
      await api.post('/worker-tools/micro-stops', {
        reason:      reason.trim(),
        duration:    parseInt(duration, 10),
        machineName: machine.trim() || undefined,
      });
      setModal(false); setReason(''); setDuration(''); setMachine('');
      setLoading(true); void load();
    } catch (e: any) {
      Alert.alert(isAr ? 'خطأ' : 'Error', e.message ?? (isAr ? 'فشل تسجيل التوقف الصغير.' : 'Failed to log micro-stop.'));
    } finally { setSaving(false); }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={isAr ? 'التوقفات الصغيرة' : 'Micro Stops'} subtitle={`${stops.length} ${isAr ? 'مسجل' : 'logged'} · ${totalMin} ${isAr ? 'دقيقة' : 'min total'}`} showBack />
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.info} /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.info} />}
        >
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.info }]} onPress={() => setModal(true)} activeOpacity={0.8}>
            <Ionicons name="pause-circle" size={20} color="#fff" />
            <Text style={styles.addText}>{isAr ? 'تسجيل توقف صغير' : 'Log Micro Stop'}</Text>
          </TouchableOpacity>

          {stops.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="checkmark-circle-outline" size={48} color={colors.success} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>{isAr ? 'لا توجد توقفات صغيرة اليوم' : 'No micro stops logged today'}</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {stops.map((s, idx) => (
                <View key={`${s.id}-${idx}`} style={[styles.card, { backgroundColor: colors.surface }]}>
                  <View style={styles.durationBox}>
                    <Text style={[styles.durationNum, { color: colors.info }]}>{s.duration}</Text>
                    <Text style={[styles.durationUnit, { color: colors.textMuted }]}>{isAr ? 'دق' : 'min'}</Text>
                  </View>
                  <View style={styles.cardBody}>
                    <Text style={[styles.cardReason, { color: colors.text }]}>{s.reason}</Text>
                    {s.machineName && <Text style={[styles.cardMachine, { color: colors.primary }]}>{s.machineName}</Text>}
                    <Text style={[styles.cardDate, { color: colors.textMuted }]}>{new Date(s.createdAt).toLocaleString()}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>{isAr ? 'تسجيل توقف صغير' : 'Log Micro Stop'}</Text>
            <Text style={[styles.label, { color: colors.textMuted }]}>{isAr ? 'سبب التوقف *' : 'Stop Reason *'}</Text>
            <TextInput style={[styles.input, styles.inputMulti, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]} placeholder={isAr ? 'اشرح ما سبب التوقف…' : 'Describe what caused the stop…'} placeholderTextColor={colors.textMuted} value={reason} onChangeText={setReason} multiline numberOfLines={3} />
            <Text style={[styles.label, { color: colors.textMuted }]}>{isAr ? 'المدة (بالدقائق) *' : 'Duration (minutes) *'}</Text>
            <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]} placeholder="e.g. 5" placeholderTextColor={colors.textMuted} value={duration} onChangeText={setDuration} keyboardType="numeric" />
            <Text style={[styles.label, { color: colors.textMuted }]}>{isAr ? 'الآلة / الخط (اختياري)' : 'Machine / Line (optional)'}</Text>
            <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]} placeholder={isAr ? 'مثال: خط 3، بثق A' : 'e.g. Line 3, Extruder A'} placeholderTextColor={colors.textMuted} value={machine} onChangeText={setMachine} />
            <View style={styles.actions}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => setModal(false)}>
                <Text style={[styles.cancelText, { color: colors.textMuted }]}>{isAr ? 'إلغاء' : 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.info }]} onPress={submit} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitText}>{isAr ? 'تسجيل التوقف' : 'Log Stop'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1 },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content:     { padding: spacing.md, paddingBottom: 40 },
  addBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: radius.lg, paddingVertical: 12, marginBottom: spacing.md },
  addText:     { ...typography.bodySmall, fontWeight: '700', color: '#fff' },
  empty:       { alignItems: 'center', paddingVertical: 60, gap: spacing.sm },
  emptyText:   { ...typography.bodySmall },
  list:        { gap: spacing.sm },
  card:        { flexDirection: 'row', alignItems: 'center', borderRadius: radius.lg, padding: spacing.md, gap: spacing.md, ...shadow.sm },
  durationBox: { alignItems: 'center', width: 50 },
  durationNum: { fontSize: 22, fontWeight: '800' },
  durationUnit:{ ...typography.caption },
  cardBody:    { flex: 1 },
  cardReason:  { ...typography.bodySmall, fontWeight: '600' },
  cardMachine: { ...typography.caption },
  cardDate:    { ...typography.caption },
  overlay:     { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:       { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: 40 },
  handle:      { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  sheetTitle:  { ...typography.h2, marginBottom: spacing.md },
  label:       { ...typography.caption, marginBottom: 6 },
  input:       { borderWidth: 1.5, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: 15, marginBottom: spacing.md },
  inputMulti:  { height: 80, textAlignVertical: 'top' },
  actions:     { flexDirection: 'row', gap: spacing.sm },
  cancelBtn:   { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: radius.md, borderWidth: 1.5 },
  cancelText:  { fontWeight: '700' },
  submitBtn:   { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: radius.md },
  submitText:  { fontWeight: '700', color: '#fff' },
});
