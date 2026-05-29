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
interface HealthRecord {
  id: number;
  machine?: { id: number; name: string };
  operationalStatus: string;
  efficiencyRating: number;
  maintenanceHours: number;
  downtimePercentage: number;
  notes?: string | null;
  recordedAt: string;
}

const STATUS_META: Record<string, { color: string; label: string }> = {
  OPERATIONAL:       { color: colors.success, label: 'Operational' },
  MAINTENANCE:       { color: colors.warning, label: 'Maintenance' },
  UNDER_MAINTENANCE: { color: colors.warning, label: 'Under Maintenance' },
  BROKEN:            { color: colors.danger,  label: 'Broken' },
  OFFLINE:           { color: colors.textMuted, label: 'Offline' },
};

function HealthCard({ item }: { item: HealthRecord }) {
  const meta = STATUS_META[item.operationalStatus] ?? STATUS_META.OFFLINE;
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.machineName} numberOfLines={1}>{item.machine?.name ?? `Record #${item.id}`}</Text>
        <View style={[styles.badge, { backgroundColor: `${meta.color}18` }]}>
          <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
        </View>
      </View>
      <View style={styles.metrics}>
        <View style={styles.metric}><Text style={[styles.metricVal, { color: colors.primary }]}>{item.efficiencyRating}%</Text><Text style={styles.metricLabel}>Efficiency</Text></View>
        <View style={styles.metricDivider} />
        <View style={styles.metric}><Text style={[styles.metricVal, { color: item.downtimePercentage > 10 ? colors.danger : colors.text }]}>{item.downtimePercentage}%</Text><Text style={styles.metricLabel}>Downtime</Text></View>
        <View style={styles.metricDivider} />
        <View style={styles.metric}><Text style={styles.metricVal}>{item.maintenanceHours}h</Text><Text style={styles.metricLabel}>Maint. Hrs</Text></View>
      </View>
      {item.notes ? <Text style={styles.notes} numberOfLines={2}>{item.notes}</Text> : null}
    </View>
  );
}

function CreateModal({ visible, machines, onClose, onSuccess }: {
  visible: boolean; machines: Machine[]; onClose: () => void; onSuccess: () => void;
}) {
  const [machineId, setMachineId]   = useState('');
  const [status, setStatus]         = useState('OPERATIONAL');
  const [efficiency, setEfficiency] = useState('100');
  const [maintHours, setMaintHours] = useState('0');
  const [downtime, setDowntime]     = useState('0');
  const [notes, setNotes]           = useState('');
  const [saving, setSaving]         = useState(false);

  const submit = async () => {
    if (!machineId) { Alert.alert('Required', 'Select a machine.'); return; }
    setSaving(true);
    try {
      await api.post('/machine-health', {
        machineId:          parseInt(machineId, 10),
        operationalStatus:  status,
        efficiencyRating:   parseFloat(efficiency) || 100,
        maintenanceHours:   parseFloat(maintHours) || 0,
        downtimePercentage: parseFloat(downtime)   || 0,
        notes:              notes.trim() || undefined,
      });
      onSuccess();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>Log Health Record</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.fieldLabel}>Machine *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
              {machines.map((m) => (
                <TouchableOpacity key={m.id} style={[styles.pill, machineId === String(m.id) && styles.pillActive]} onPress={() => setMachineId(String(m.id))}>
                  <Text style={[styles.pillText, machineId === String(m.id) && styles.pillTextActive]}>{m.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.fieldLabel}>Status *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
              {['OPERATIONAL', 'MAINTENANCE', 'BROKEN', 'OFFLINE'].map((s) => (
                <TouchableOpacity key={s} style={[styles.pill, status === s && styles.pillActive]} onPress={() => setStatus(s)}>
                  <Text style={[styles.pillText, status === s && styles.pillTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {[
              { label: 'Efficiency Rating (%)', val: efficiency, set: setEfficiency },
              { label: 'Maintenance Hours', val: maintHours, set: setMaintHours },
              { label: 'Downtime (%)', val: downtime, set: setDowntime },
              { label: 'Notes', val: notes, set: setNotes, multi: true },
            ].map((f) => (
              <View key={f.label} style={styles.field}>
                <Text style={styles.fieldLabel}>{f.label}</Text>
                <TextInput
                  style={[styles.input, f.multi && styles.inputMulti]}
                  placeholderTextColor={colors.textMuted}
                  keyboardType={f.multi ? 'default' : 'decimal-pad'}
                  multiline={f.multi}
                  value={f.val}
                  onChangeText={f.set}
                />
              </View>
            ))}
            <View style={styles.actions}>
              <Button variant="ghost" onPress={onClose} style={styles.actionBtn}>Cancel</Button>
              <Button onPress={submit} loading={saving} style={styles.actionBtn}>Save</Button>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function MachineHealthScreen() {
  const [records, setRecords]   = useState<HealthRecord[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal]       = useState(false);

  const load = useCallback(async () => {
    try {
      const [rec, mach] = await Promise.allSettled([
        api.get<{ records: HealthRecord[] }>('/machine-health?limit=40'),
        api.get<{ machines: Machine[] }>('/machines'),
      ]);
      if (rec.status  === 'fulfilled') setRecords(rec.value.records    ?? []);
      if (mach.status === 'fulfilled') setMachines(mach.value.machines ?? []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Machine Health" showBack />
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(i) => String(i.id)}
          renderItem={({ item }) => <HealthCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="pulse-outline" size={44} color={colors.textMuted} /><Text style={styles.emptyText}>No health records</Text></View>}
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
  card:   { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  machineName: { ...typography.h3, flex: 1, marginRight: spacing.sm },
  badge:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  badgeText: { fontSize: 11, fontWeight: '700' },
  metrics:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  metric:    { alignItems: 'center' },
  metricVal: { fontSize: 20, fontWeight: '800', color: colors.text },
  metricLabel: { ...typography.caption, marginTop: 2 },
  metricDivider: { width: 1, height: 36, backgroundColor: colors.border },
  notes:     { ...typography.bodySmall, color: colors.textMuted, marginTop: spacing.sm, fontStyle: 'italic' },
  empty:     { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText: { ...typography.bodySmall, color: colors.textMuted },
  fab:       { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', ...shadow.lg },
  overlay:   { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:     { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: 40, maxHeight: '90%' },
  handle:    { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.md },
  sheetTitle: { ...typography.h2, marginBottom: spacing.md },
  field:     { marginBottom: spacing.md },
  fieldLabel: { ...typography.caption, marginBottom: 6 },
  input:     { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 11, fontSize: 15, color: colors.text, backgroundColor: colors.surfaceAlt },
  inputMulti: { height: 80, textAlignVertical: 'top' },
  pill:      { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full, backgroundColor: colors.surfaceAlt, borderWidth: 1.5, borderColor: colors.border, marginRight: spacing.sm },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText:  { fontSize: 13, fontWeight: '600', color: colors.text },
  pillTextActive: { color: '#fff' },
  actions:   { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  actionBtn: { flex: 1 },
});
