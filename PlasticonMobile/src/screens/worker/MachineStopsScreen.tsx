import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Modal, RefreshControl, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { colors, radius, shadow, spacing, typography } from '../../theme';

interface MachineStop {
  id:          number;
  machineName?: string;
  reason:      string;
  duration?:   number;
  reportedAt:  string;
  status?:     string;
}

export function MachineStopsScreen() {
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
    if (!reason.trim()) { Alert.alert('Required', 'Please describe the stop reason.'); return; }
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
      Alert.alert('Error', e.message ?? 'Failed to report stop.');
    } finally { setSaving(false); }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Machine Stops" subtitle={`${stops.length} reports`} showBack />
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.danger} /></View> : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.danger} />}
        >
          <TouchableOpacity style={styles.reportBtn} onPress={() => setModal(true)} activeOpacity={0.8}>
            <Ionicons name="warning" size={18} color="#fff" />
            <Text style={styles.reportText}>Report Machine Stop</Text>
          </TouchableOpacity>

          {stops.length === 0 ? (
            <View style={styles.empty}><Ionicons name="checkmark-circle-outline" size={44} color={colors.success} /><Text style={styles.emptyText}>No machine stops reported</Text></View>
          ) : (
            <View style={styles.list}>
              {stops.map((s, idx) => (
                <View key={`${s.id}-${idx}`} style={[styles.card, { borderLeftColor: colors.danger }]}>
                  <Text style={styles.cardMachine}>{s.machineName ?? 'Machine'}</Text>
                  <Text style={styles.cardReason}>{s.reason}</Text>
                  <View style={styles.cardFooter}>
                    {s.duration ? <Text style={styles.cardMeta}>{s.duration} min</Text> : null}
                    <Text style={styles.cardMeta}>{new Date(s.reportedAt).toLocaleString()}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Report Machine Stop</Text>
            {machines.length > 0 && (
              <>
                <Text style={styles.label}>Machine</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
                  {machines.map((m, idx) => (
                    <TouchableOpacity key={`${m.id}-${idx}`} style={[styles.pill, machineId === String(m.id) && styles.pillActive]} onPress={() => setMachineId(String(m.id))}>
                      <Text style={[styles.pillText, machineId === String(m.id) && styles.pillTextActive]}>{m.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}
            <Text style={styles.label}>Stop Reason *</Text>
            <TextInput style={[styles.input, styles.inputMulti]} placeholder="Describe why the machine stopped…" placeholderTextColor={colors.textMuted} value={reason} onChangeText={setReason} multiline numberOfLines={3} />
            <Text style={styles.label}>Duration (minutes)</Text>
            <TextInput style={styles.input} placeholder="e.g. 30" placeholderTextColor={colors.textMuted} value={duration} onChangeText={setDuration} keyboardType="numeric" />
            <View style={styles.actions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={submit} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitText}>Report</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: colors.background },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content:     { padding: spacing.md, paddingBottom: 40 },
  reportBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.danger, borderRadius: radius.lg, paddingVertical: 12, marginBottom: spacing.md },
  reportText:  { ...typography.bodySmall, fontWeight: '700', color: '#fff' },
  empty:       { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.sm },
  emptyText:   { ...typography.bodySmall, color: colors.textMuted },
  list:        { gap: spacing.sm },
  card:        { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderLeftWidth: 3, ...shadow.sm },
  cardMachine: { ...typography.h4, color: colors.danger },
  cardReason:  { ...typography.bodySmall, marginTop: 4 },
  cardFooter:  { flexDirection: 'row', gap: spacing.md, marginTop: 6 },
  cardMeta:    { ...typography.caption, color: colors.textMuted },
  overlay:     { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:       { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: 40 },
  handle:      { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.md },
  sheetTitle:  { ...typography.h2, marginBottom: spacing.md },
  label:       { ...typography.caption, marginBottom: 6 },
  input:       { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: 15, color: colors.text, backgroundColor: colors.surfaceAlt, marginBottom: spacing.md },
  inputMulti:  { height: 80, textAlignVertical: 'top' },
  pill:        { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full, backgroundColor: colors.surfaceAlt, borderWidth: 1.5, borderColor: colors.border, marginRight: spacing.sm },
  pillActive:  { backgroundColor: colors.danger, borderColor: colors.danger },
  pillText:    { fontSize: 13, fontWeight: '600', color: colors.text },
  pillTextActive: { color: '#fff' },
  actions:     { flexDirection: 'row', gap: spacing.sm },
  cancelBtn:   { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border },
  cancelText:  { fontWeight: '700', color: colors.textMuted },
  submitBtn:   { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: radius.md, backgroundColor: colors.danger },
  submitText:  { fontWeight: '700', color: '#fff' },
});
