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
import { colors, radius, shadow, spacing, typography } from '../../theme';

interface Machine { id: number; name: string; type?: string }
interface MaintenanceRecord {
  id: number;
  machine?: { id: number; name: string };
  partsUsed?: string;
  downtimeMinutes?: number | null;
  downtimeReason?: string;
  reportText?: string | null;
  createdAt: string;
}

const STATUS_COLOR: Record<string, string> = {
  BREAKDOWN: colors.danger, SCHEDULED: colors.primary, PREVENTIVE: colors.success,
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function RecordCard({ item }: { item: MaintenanceRecord }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.machineName} numberOfLines={1}>{item.machine?.name ?? `Record #${item.id}`}</Text>
        <Text style={styles.cardDate}>{fmtDate(item.createdAt)}</Text>
      </View>
      {item.downtimeMinutes != null && (
        <View style={styles.downtimeRow}>
          <Ionicons name="time-outline" size={13} color={colors.warning} />
          <Text style={styles.downtime}>{item.downtimeMinutes} min downtime</Text>
        </View>
      )}
      {item.downtimeReason ? <Text style={styles.reason} numberOfLines={2}>{item.downtimeReason}</Text> : null}
      {item.partsUsed ? (
        <View style={styles.partsRow}>
          <Ionicons name="construct-outline" size={12} color={colors.textMuted} />
          <Text style={styles.parts} numberOfLines={1}>{item.partsUsed}</Text>
        </View>
      ) : null}
    </View>
  );
}

function CreateModal({ visible, machines, onClose, onSuccess }: {
  visible: boolean; machines: Machine[]; onClose: () => void; onSuccess: () => void;
}) {
  const [machineId, setMachineId] = useState('');
  const [downtime, setDowntime]   = useState('');
  const [reason, setReason]       = useState('');
  const [parts, setParts]         = useState('');
  const [report, setReport]       = useState('');
  const [saving, setSaving]       = useState(false);

  const reset = () => { setMachineId(''); setDowntime(''); setReason(''); setParts(''); setReport(''); };

  const submit = async () => {
    if (!machineId) { Alert.alert('Required', 'Select a machine.'); return; }
    setSaving(true);
    try {
      await api.post('/maintenance', {
        machineId:       parseInt(machineId, 10),
        downtimeMinutes: downtime ? parseInt(downtime, 10) : null,
        downtimeReason:  reason.trim() || undefined,
        partsUsed:       parts.trim()  || undefined,
        reportText:      report.trim() || undefined,
      });
      reset();
      onSuccess();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { reset(); onClose(); }}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>Log Maintenance</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.fieldLabel}>Machine *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
              {machines.map((m, idx) => (
                <TouchableOpacity
                  key={`${m.id}-${idx}`}
                  style={[styles.machinePill, machineId === String(m.id) && styles.machinePillActive]}
                  onPress={() => setMachineId(String(m.id))}
                >
                  <Text style={[styles.machinePillText, machineId === String(m.id) && styles.machinePillTextActive]}>
                    {m.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {[
              { label: 'Downtime (minutes)', val: downtime, set: setDowntime, keyboard: 'numeric' as const },
              { label: 'Reason / Description', val: reason, set: setReason, multi: true },
              { label: 'Parts Used', val: parts, set: setParts },
              { label: 'Report Notes', val: report, set: setReport, multi: true },
            ].map((f) => (
              <View key={f.label} style={styles.field}>
                <Text style={styles.fieldLabel}>{f.label}</Text>
                <TextInput
                  style={[styles.input, f.multi && styles.inputMulti]}
                  placeholderTextColor={colors.textMuted}
                  keyboardType={f.keyboard ?? 'default'}
                  multiline={f.multi}
                  numberOfLines={f.multi ? 3 : 1}
                  value={f.val}
                  onChangeText={f.set}
                />
              </View>
            ))}
            <View style={styles.actions}>
              <Button variant="ghost" onPress={() => { reset(); onClose(); }} style={styles.actionBtn}>Cancel</Button>
              <Button onPress={submit} loading={saving} style={styles.actionBtn}>Save</Button>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function MaintenancePage() {
  const [records, setRecords]     = useState<MaintenanceRecord[]>([]);
  const [machines, setMachines]   = useState<Machine[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal]         = useState(false);

  const load = useCallback(async () => {
    try {
      const [rec, mach] = await Promise.allSettled([
        api.get<{ records: MaintenanceRecord[] }>('/maintenance?limit=40'),
        api.get<{ machines: Machine[] }>('/machines'),
      ]);
      if (rec.status   === 'fulfilled') setRecords(rec.value.records   ?? []);
      if (mach.status  === 'fulfilled') setMachines(mach.value.machines ?? []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Maintenance Records" showBack />
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(i, idx) => `${String(i.id)}-${idx}`}
          renderItem={({ item }) => <RecordCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="construct-outline" size={44} color={colors.textMuted} /><Text style={styles.emptyText}>No records yet</Text></View>}
        />
      )}
      <TouchableOpacity style={styles.fab} onPress={() => setModal(true)} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
      <CreateModal visible={modal} machines={machines} onClose={() => setModal(false)} onSuccess={() => { setModal(false); setLoading(true); void load(); }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:   { padding: spacing.md, paddingBottom: 100 },
  card:   { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  machineName: { ...typography.h4, flex: 1, marginRight: spacing.sm },
  cardDate:    { ...typography.caption },
  downtimeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  downtime:    { ...typography.caption, color: colors.warning, fontWeight: '600' },
  reason:      { ...typography.bodySmall, color: colors.textSecondary, marginBottom: 4 },
  partsRow:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  parts:       { ...typography.caption, flex: 1 },
  empty:       { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText:   { ...typography.bodySmall, color: colors.textMuted },
  fab:         { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', ...shadow.lg },
  overlay:     { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:       { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: 40, maxHeight: '90%' },
  handle:      { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.md },
  sheetTitle:  { ...typography.h2, marginBottom: spacing.md },
  field:       { marginBottom: spacing.md },
  fieldLabel:  { ...typography.caption, marginBottom: 6 },
  input:       { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 11, fontSize: 15, color: colors.text, backgroundColor: colors.surfaceAlt },
  inputMulti:  { height: 80, textAlignVertical: 'top' },
  machinePill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full, backgroundColor: colors.surfaceAlt, borderWidth: 1.5, borderColor: colors.border, marginRight: spacing.sm },
  machinePillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  machinePillText:   { fontSize: 13, fontWeight: '600', color: colors.text },
  machinePillTextActive: { color: '#fff' },
  actions:     { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  actionBtn:   { flex: 1 },
});
