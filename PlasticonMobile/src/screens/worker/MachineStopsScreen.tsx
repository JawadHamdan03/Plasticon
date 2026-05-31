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

interface MachineStop {
  id:          number;
  machineName?: string;
  reason:      string;
  duration?:   number;
  reportedAt:  string;
  status?:     string;
}

export function MachineStopsScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const [stops,      setStops]      = useState<MachineStop[]>([]);
  const [machines,   setMachines]   = useState<{ id: number; name: string }[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal,      setModal]      = useState(false);
  const [machineId,  setMachineId]  = useState('');
  const [reason,     setReason]     = useState('');
  const [duration,   setDuration]   = useState('');
  const [saving,     setSaving]     = useState(false);

  const load = useCallback(async () => {
    try {
      const [stopsRes, machinesRes] = await Promise.allSettled([
        api.get<MachineStop[] | { data: MachineStop[] }>('/worker-tools/machine-stop-alerts'),
        api.get<any>('/machines'),
      ]);
      const rawStops = stopsRes.status === 'fulfilled' ? stopsRes.value : [];
      setStops(Array.isArray(rawStops) ? rawStops : (rawStops.data ?? []));
      const rawMach = machinesRes.status === 'fulfilled' ? machinesRes.value : [];
      setMachines(Array.isArray(rawMach) ? rawMach : (rawMach.machines ?? rawMach.data ?? []));
    } catch { setStops([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const submit = async () => {
    if (!reason.trim()) { Alert.alert(isAr ? 'مطلوب' : 'Required', isAr ? 'يرجى وصف سبب التوقف.' : 'Please describe the stop reason.'); return; }
    setSaving(true);
    try {
      await api.post('/worker-tools/machine-stop-alerts', {
        machineId: machineId ? parseInt(machineId, 10) : undefined,
        reason:    reason.trim(),
        duration:  duration ? parseInt(duration, 10) : undefined,
      });
      setModal(false); setReason(''); setDuration(''); setMachineId('');
      setLoading(true); void load();
    } catch (e: any) {
      Alert.alert(isAr ? 'خطأ' : 'Error', e.message ?? (isAr ? 'فشل الإبلاغ عن التوقف.' : 'Failed to report stop.'));
    } finally { setSaving(false); }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={isAr ? 'توقفات الآلات' : 'Machine Stops'} subtitle={`${stops.length} ${isAr ? 'تقرير' : 'reports'}`} showBack />
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.danger} /></View> : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.danger} />}
        >
          <TouchableOpacity style={[styles.reportBtn, { backgroundColor: colors.danger }]} onPress={() => setModal(true)} activeOpacity={0.8}>
            <Ionicons name="warning" size={18} color="#fff" />
            <Text style={styles.reportText}>{isAr ? 'الإبلاغ عن توقف آلة' : 'Report Machine Stop'}</Text>
          </TouchableOpacity>

          {stops.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="checkmark-circle-outline" size={44} color={colors.success} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>{isAr ? 'لم يتم الإبلاغ عن توقفات' : 'No machine stops reported'}</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {stops.map((s, idx) => (
                <View key={`${s.id}-${idx}`} style={[styles.card, { backgroundColor: colors.surface, borderLeftColor: colors.danger }]}>
                  <Text style={[styles.cardMachine, { color: colors.danger }]}>{s.machineName ?? (isAr ? 'آلة' : 'Machine')}</Text>
                  <Text style={[styles.cardReason, { color: colors.text }]}>{s.reason}</Text>
                  <View style={styles.cardFooter}>
                    {s.duration ? <Text style={[styles.cardMeta, { color: colors.textMuted }]}>{s.duration} {isAr ? 'دقيقة' : 'min'}</Text> : null}
                    <Text style={[styles.cardMeta, { color: colors.textMuted }]}>{new Date(s.reportedAt).toLocaleString()}</Text>
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
            <Text style={[styles.sheetTitle, { color: colors.text }]}>{isAr ? 'الإبلاغ عن توقف آلة' : 'Report Machine Stop'}</Text>
            {machines.length > 0 && (
              <>
                <Text style={[styles.label, { color: colors.textMuted }]}>{isAr ? 'الآلة' : 'Machine'}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
                  {machines.map((m, idx) => (
                    <TouchableOpacity key={`${m.id}-${idx}`} style={[styles.pill, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }, machineId === String(m.id) && { backgroundColor: colors.danger, borderColor: colors.danger }]} onPress={() => setMachineId(String(m.id))}>
                      <Text style={[styles.pillText, { color: colors.text }, machineId === String(m.id) && { color: '#fff' }]}>{m.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}
            <Text style={[styles.label, { color: colors.textMuted }]}>{isAr ? 'سبب التوقف *' : 'Stop Reason *'}</Text>
            <TextInput style={[styles.input, styles.inputMulti, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]} placeholder={isAr ? 'اشرح سبب توقف الآلة…' : 'Describe why the machine stopped…'} placeholderTextColor={colors.textMuted} value={reason} onChangeText={setReason} multiline numberOfLines={3} />
            <Text style={[styles.label, { color: colors.textMuted }]}>{isAr ? 'المدة (بالدقائق)' : 'Duration (minutes)'}</Text>
            <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]} placeholder={isAr ? 'مثال: 30' : 'e.g. 30'} placeholderTextColor={colors.textMuted} value={duration} onChangeText={setDuration} keyboardType="numeric" />
            <View style={styles.actions}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => setModal(false)}>
                <Text style={[styles.cancelText, { color: colors.textMuted }]}>{isAr ? 'إلغاء' : 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.danger }]} onPress={submit} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitText}>{isAr ? 'إبلاغ' : 'Report'}</Text>}
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
  reportBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: radius.lg, paddingVertical: 12, marginBottom: spacing.md },
  reportText:  { ...typography.bodySmall, fontWeight: '700', color: '#fff' },
  empty:       { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.sm },
  emptyText:   { ...typography.bodySmall },
  list:        { gap: spacing.sm },
  card:        { borderRadius: radius.lg, padding: spacing.md, borderLeftWidth: 3, ...shadow.sm },
  cardMachine: { ...typography.h4 },
  cardReason:  { ...typography.bodySmall, marginTop: 4 },
  cardFooter:  { flexDirection: 'row', gap: spacing.md, marginTop: 6 },
  cardMeta:    { ...typography.caption },
  overlay:     { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:       { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: 40 },
  handle:      { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  sheetTitle:  { ...typography.h2, marginBottom: spacing.md },
  label:       { ...typography.caption, marginBottom: 6 },
  input:       { borderWidth: 1.5, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: 15, marginBottom: spacing.md },
  inputMulti:  { height: 80, textAlignVertical: 'top' },
  pill:        { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1.5, marginRight: spacing.sm },
  pillText:    { fontSize: 13, fontWeight: '600' },
  actions:     { flexDirection: 'row', gap: spacing.sm },
  cancelBtn:   { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: radius.md, borderWidth: 1.5 },
  cancelText:  { fontWeight: '700' },
  submitBtn:   { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: radius.md },
  submitText:  { fontWeight: '700', color: '#fff' },
});
