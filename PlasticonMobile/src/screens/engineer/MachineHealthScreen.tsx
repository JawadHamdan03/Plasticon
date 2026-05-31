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
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

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

function HealthCard({ item }: { item: HealthRecord }) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();

  const STATUS_META: Record<string, { color: string; label: string; labelAr: string }> = {
    OPERATIONAL:       { color: colors.success,   label: 'Operational',       labelAr: 'تشغيلي' },
    MAINTENANCE:       { color: colors.warning,   label: 'Maintenance',       labelAr: 'صيانة' },
    UNDER_MAINTENANCE: { color: colors.warning,   label: 'Under Maintenance', labelAr: 'تحت الصيانة' },
    BROKEN:            { color: colors.danger,    label: 'Broken',            labelAr: 'معطل' },
    OFFLINE:           { color: colors.textMuted, label: 'Offline',           labelAr: 'غير متصل' },
  };

  const meta = STATUS_META[item.operationalStatus] ?? STATUS_META.OFFLINE;
  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.cardTop}>
        <Text style={[styles.machineName, { color: colors.text }]} numberOfLines={1}>{item.machine?.name ?? `Record #${item.id}`}</Text>
        <View style={[styles.badge, { backgroundColor: `${meta.color}18` }]}>
          <Text style={[styles.badgeText, { color: meta.color }]}>{isAr ? meta.labelAr : meta.label}</Text>
        </View>
      </View>
      <View style={[styles.metrics, { borderTopColor: colors.border }]}>
        <View style={styles.metric}>
          <Text style={[styles.metricVal, { color: colors.primary }]}>{item.efficiencyRating}%</Text>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>{isAr ? 'الكفاءة' : 'Efficiency'}</Text>
        </View>
        <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />
        <View style={styles.metric}>
          <Text style={[styles.metricVal, { color: item.downtimePercentage > 10 ? colors.danger : colors.text }]}>{item.downtimePercentage}%</Text>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>{isAr ? 'التوقف' : 'Downtime'}</Text>
        </View>
        <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />
        <View style={styles.metric}>
          <Text style={[styles.metricVal, { color: colors.text }]}>{item.maintenanceHours}h</Text>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>{isAr ? 'ساعات الصيانة' : 'Maint. Hrs'}</Text>
        </View>
      </View>
      {item.notes ? <Text style={[styles.notes, { color: colors.textMuted }]} numberOfLines={2}>{item.notes}</Text> : null}
    </View>
  );
}

function CreateModal({ visible, machines, onClose, onSuccess }: {
  visible: boolean; machines: Machine[]; onClose: () => void; onSuccess: () => void;
}) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const [machineId, setMachineId]   = useState('');
  const [status, setStatus]         = useState('OPERATIONAL');
  const [efficiency, setEfficiency] = useState('100');
  const [maintHours, setMaintHours] = useState('0');
  const [downtime, setDowntime]     = useState('0');
  const [notes, setNotes]           = useState('');
  const [saving, setSaving]         = useState(false);

  const submit = async () => {
    if (!machineId) { Alert.alert(isAr ? 'مطلوب' : 'Required', isAr ? 'اختر آلة.' : 'Select a machine.'); return; }
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
      Alert.alert(isAr ? 'خطأ' : 'Error', err.message ?? (isAr ? 'فشل الحفظ.' : 'Failed to save.'));
    } finally {
      setSaving(false);
    }
  };

  const FIELDS = [
    { label: isAr ? 'معدل الكفاءة (%)' : 'Efficiency Rating (%)', val: efficiency, set: setEfficiency },
    { label: isAr ? 'ساعات الصيانة' : 'Maintenance Hours', val: maintHours, set: setMaintHours },
    { label: isAr ? 'نسبة التوقف (%)' : 'Downtime (%)', val: downtime, set: setDowntime },
    { label: isAr ? 'ملاحظات' : 'Notes', val: notes, set: setNotes, multi: true },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <Text style={[styles.sheetTitle, { color: colors.text }]}>{isAr ? 'تسجيل سجل صحة' : 'Log Health Record'}</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{isAr ? 'الآلة *' : 'Machine *'}</Text>
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
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{isAr ? 'الحالة *' : 'Status *'}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
              {['OPERATIONAL', 'MAINTENANCE', 'BROKEN', 'OFFLINE'].map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.pill,
                    { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
                    status === s && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                  onPress={() => setStatus(s)}
                >
                  <Text style={[styles.pillText, { color: colors.text }, status === s && styles.pillTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {FIELDS.map((f) => (
              <View key={f.label} style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{f.label}</Text>
                <TextInput
                  style={[styles.input, f.multi && styles.inputMulti, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                  placeholderTextColor={colors.textMuted}
                  keyboardType={f.multi ? 'default' : 'decimal-pad'}
                  multiline={f.multi}
                  value={f.val}
                  onChangeText={f.set}
                />
              </View>
            ))}
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

export function MachineHealthScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
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
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={isAr ? 'صحة الآلات' : 'Machine Health'} showBack />
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(i, idx) => `${String(i.id)}-${idx}`}
          renderItem={({ item }) => <HealthCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="pulse-outline" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>{isAr ? 'لا توجد سجلات صحة' : 'No health records'}</Text>
            </View>
          }
        />
      )}
      <TouchableOpacity style={[styles.fab, { backgroundColor: colors.primary }]} onPress={() => setModal(true)} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
      <CreateModal visible={modal} machines={machines} onClose={() => setModal(false)} onSuccess={() => { setModal(false); setLoading(true); void load(); }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:   { padding: spacing.md, paddingBottom: 100 },
  card:   { borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  machineName: { ...typography.h3, flex: 1, marginRight: spacing.sm },
  badge:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  badgeText: { fontSize: 11, fontWeight: '700' },
  metrics:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingVertical: spacing.sm, borderTopWidth: 1 },
  metric:    { alignItems: 'center' },
  metricVal: { fontSize: 20, fontWeight: '800' },
  metricLabel: { ...typography.caption, marginTop: 2 },
  metricDivider: { width: 1, height: 36 },
  notes:     { ...typography.bodySmall, marginTop: spacing.sm, fontStyle: 'italic' },
  empty:     { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText: { ...typography.bodySmall },
  fab:       { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', ...shadow.lg },
  overlay:   { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:     { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: 40, maxHeight: '90%' },
  handle:    { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  sheetTitle: { ...typography.h2, marginBottom: spacing.md },
  field:     { marginBottom: spacing.md },
  fieldLabel: { ...typography.caption, marginBottom: 6 },
  input:     { borderWidth: 1.5, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 11, fontSize: 15 },
  inputMulti: { height: 80, textAlignVertical: 'top' },
  pill:      { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1.5, marginRight: spacing.sm },
  pillText:  { fontSize: 13, fontWeight: '600' },
  pillTextActive: { color: '#fff' },
  actions:   { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  actionBtn: { flex: 1 },
});
