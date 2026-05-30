import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { colors, radius, shadow, spacing, typography } from '../../theme';

interface HealthRecord {
  id: number;
  machine?: { id: number; name: string };
  machineId?: number;
  operationalStatus: string;
  efficiencyRating: number;
  maintenanceHours: number;
  downtimePercentage?: number;
  notes?: string | null;
  recordedAt: string;
}

interface Machine {
  id: number;
  name: string;
}

type OpsStatus = 'OPERATIONAL' | 'MAINTENANCE' | 'OFFLINE' | 'DEGRADED';
const OPS_OPTIONS: OpsStatus[] = ['OPERATIONAL', 'MAINTENANCE', 'OFFLINE', 'DEGRADED'];

interface FormState {
  machineId: string;
  operationalStatus: OpsStatus;
  efficiencyRating: string;
  maintenanceHours: string;
  downtimePercentage: string;
  notes: string;
}

const DEFAULT_FORM: FormState = {
  machineId: '', operationalStatus: 'OPERATIONAL', efficiencyRating: '100',
  maintenanceHours: '0', downtimePercentage: '0', notes: '',
};

const OPS_COLOR: Record<string, string> = {
  OPERATIONAL: colors.success, MAINTENANCE: colors.warning,
  OFFLINE: colors.danger,      DEGRADED: colors.info,
};

function InlinePicker<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: T[]; onChange: (v: T) => void }) {
  return (
    <View style={ps.wrap}>
      <Text style={ps.label}>{label}</Text>
      <View style={ps.row}>
        {options.map((opt) => (
          <TouchableOpacity key={opt} style={[ps.chip, value === opt && ps.chipActive]} onPress={() => onChange(opt)} activeOpacity={0.7}>
            <Text style={[ps.chipText, value === opt && ps.chipTextActive]}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
const ps = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  label: { ...typography.caption, marginBottom: 6 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  chipTextActive: { color: colors.primary },
});

function CalModal({ visible, machines, onClose, onSave, saving }: {
  visible: boolean; machines: Machine[]; onClose: () => void; onSave: (f: FormState) => Promise<void>; saving: boolean;
}) {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  useEffect(() => { if (visible) setForm(DEFAULT_FORM); }, [visible]);
  const set = (k: keyof FormState) => (v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.machineId.trim()) return Alert.alert('Validation', 'Machine ID is required.');
    if (isNaN(Number(form.efficiencyRating))) return Alert.alert('Validation', 'Efficiency must be a number 0–100.');
    await onSave(form);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.overlayBg} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>New Calibration Record</Text>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.fieldLabel}>Machine *</Text>
            {machines.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  {machines.map((m) => (
                    <TouchableOpacity
                      key={m.id}
                      style={[ps.chip, form.machineId === String(m.id) && ps.chipActive]}
                      onPress={() => setForm((p) => ({ ...p, machineId: String(m.id) }))}
                    >
                      <Text style={[ps.chipText, form.machineId === String(m.id) && ps.chipTextActive]}>{m.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            ) : (
              <TextInput style={styles.input} value={form.machineId} onChangeText={set('machineId')} placeholder="Machine ID" placeholderTextColor={colors.textMuted} keyboardType="numeric" />
            )}

            <InlinePicker label="Operational Status" value={form.operationalStatus} options={OPS_OPTIONS} onChange={(v) => setForm((p) => ({ ...p, operationalStatus: v }))} />

            <Text style={styles.fieldLabel}>Efficiency Rating (0–100)</Text>
            <TextInput style={styles.input} value={form.efficiencyRating} onChangeText={set('efficiencyRating')} placeholder="100" placeholderTextColor={colors.textMuted} keyboardType="numeric" />

            <Text style={styles.fieldLabel}>Maintenance Hours</Text>
            <TextInput style={styles.input} value={form.maintenanceHours} onChangeText={set('maintenanceHours')} placeholder="0" placeholderTextColor={colors.textMuted} keyboardType="numeric" />

            <Text style={styles.fieldLabel}>Downtime %</Text>
            <TextInput style={styles.input} value={form.downtimePercentage} onChangeText={set('downtimePercentage')} placeholder="0" placeholderTextColor={colors.textMuted} keyboardType="numeric" />

            <Text style={styles.fieldLabel}>Notes</Text>
            <TextInput style={[styles.input, styles.multiline]} value={form.notes} onChangeText={set('notes')} placeholder="Optional notes" placeholderTextColor={colors.textMuted} multiline numberOfLines={3} textAlignVertical="top" />
          </ScrollView>
          <View style={styles.sheetActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color={colors.textInverse} /> : <Text style={styles.saveText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function calStatus(eff: number) {
  if (eff >= 90) return { label: 'Valid',    color: colors.success, icon: 'checkmark-circle' as const };
  if (eff >= 75) return { label: 'Due Soon', color: colors.warning, icon: 'time' as const };
  return                 { label: 'Expired', color: colors.danger,  icon: 'alert-circle' as const };
}

function nextDue(dateStr: string) {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + 6);
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function CalCard({ item }: { item: HealthRecord }) {
  const { label, color, icon } = calStatus(item.efficiencyRating);
  const opsColor = OPS_COLOR[item.operationalStatus] ?? colors.textMuted;

  return (
    <View style={[styles.card, { borderLeftColor: color, borderLeftWidth: 3 }]}>
      <View style={styles.cardTop}>
        <Text style={styles.machineName} numberOfLines={1}>{item.machine?.name ?? `Record #${item.id}`}</Text>
        <View style={styles.badges}>
          <View style={[styles.badge, { backgroundColor: `${opsColor}15` }]}>
            <Text style={[styles.badgeText, { color: opsColor }]}>{item.operationalStatus}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: `${color}18` }]}>
            <Ionicons name={icon} size={11} color={color} />
            <Text style={[styles.badgeText, { color }]}>{label}</Text>
          </View>
        </View>
      </View>
      <View style={styles.details}>
        <View style={styles.detailBlock}>
          <Text style={styles.detailLabel}>Efficiency</Text>
          <Text style={[styles.detailValue, { color }]}>{item.efficiencyRating}%</Text>
        </View>
        <View style={styles.detailBlock}>
          <Text style={styles.detailLabel}>Last Calibrated</Text>
          <Text style={styles.detailValue}>{new Date(item.recordedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</Text>
        </View>
        <View style={styles.detailBlock}>
          <Text style={styles.detailLabel}>Next Due</Text>
          <Text style={[styles.detailValue, { color: label === 'Expired' ? colors.danger : colors.text }]}>{nextDue(item.recordedAt)}</Text>
        </View>
      </View>
      {item.notes ? <Text style={styles.notes} numberOfLines={1}>{item.notes}</Text> : null}
    </View>
  );
}

export function CalibrationScreen() {
  const [records, setRecords]       = useState<HealthRecord[]>([]);
  const [machines, setMachines]     = useState<Machine[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving]         = useState(false);

  const load = useCallback(async () => {
    try {
      const [healthRes, machinesRes] = await Promise.all([
        api.get<{ records?: HealthRecord[]; healthRecords?: HealthRecord[] }>('/machine-health?limit=40'),
        api.get<{ machines?: Machine[] }>('/machines').catch(() => ({ machines: [] })),
      ]);
      setRecords(healthRes.records ?? healthRes.healthRecords ?? []);
      setMachines((machinesRes as any).machines ?? []);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to load calibration data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleSave = async (form: FormState) => {
    setSaving(true);
    try {
      const body: Record<string, any> = {
        machineId: Number(form.machineId),
        operationalStatus: form.operationalStatus,
        efficiencyRating: Number(form.efficiencyRating),
        maintenanceHours: Number(form.maintenanceHours),
      };
      if (form.downtimePercentage.trim()) body.downtimePercentage = Number(form.downtimePercentage);
      if (form.notes.trim()) body.notes = form.notes.trim();
      await api.post('/machine-health', body);
      setModalVisible(false);
      setRefreshing(true);
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to save record');
    } finally {
      setSaving(false);
    }
  };

  const expiredCount = records.filter((r) => r.efficiencyRating < 75).length;

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title="Calibration"
        subtitle={expiredCount ? `${expiredCount} need attention` : 'All calibrated'}
        showBack
      />
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(i) => String(i.id)}
          renderItem={({ item }) => <CalCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="checkmark-circle-outline" size={44} color={colors.textMuted} /><Text style={styles.emptyText}>No calibration records</Text></View>}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color={colors.textInverse} />
      </TouchableOpacity>

      <CalModal visible={modalVisible} machines={machines} onClose={() => setModalVisible(false)} onSave={handleSave} saving={saving} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: colors.background },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:    { padding: spacing.md, paddingBottom: 100 },

  card:        { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  machineName: { ...typography.h4, flex: 1, marginRight: spacing.sm },
  badges:      { flexDirection: 'column', alignItems: 'flex-end', gap: 4 },
  badge:       { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  badgeText:   { fontSize: 10, fontWeight: '700' },
  details:     { flexDirection: 'row', justifyContent: 'space-between' },
  detailBlock: { alignItems: 'center' },
  detailLabel: { ...typography.caption, marginBottom: 2 },
  detailValue: { ...typography.h4 },
  notes:       { ...typography.caption, color: colors.textMuted, marginTop: spacing.sm, fontStyle: 'italic' },

  empty:   { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText: { ...typography.bodySmall, color: colors.textMuted },

  fab:         { position: 'absolute', bottom: 28, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', ...shadow.lg },

  overlay:     { flex: 1, justifyContent: 'flex-end' },
  overlayBg:   { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:       { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: spacing.xl, maxHeight: '90%' },
  sheetHandle: { width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  sheetTitle:  { ...typography.h3, textAlign: 'center', marginBottom: spacing.lg },
  fieldLabel:  { ...typography.caption, marginBottom: 6, marginTop: spacing.sm },
  input:       { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: 11, ...typography.body, marginBottom: 4 },
  multiline:   { height: 80, paddingTop: 10 },
  sheetActions:{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  cancelBtn:   { flex: 1, paddingVertical: 13, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center' },
  cancelText:  { ...typography.body, fontWeight: '600', color: colors.textSecondary },
  saveBtn:     { flex: 2, paddingVertical: 13, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  saveText:    { ...typography.body, fontWeight: '700', color: colors.textInverse },
});
