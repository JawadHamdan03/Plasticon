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

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function RecordCard({ item }: { item: MaintenanceRecord }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.cardTop}>
        <Text style={[styles.machineName, { color: colors.text }]} numberOfLines={1}>{item.machine?.name ?? `Record #${item.id}`}</Text>
        <Text style={[styles.cardDate, { color: colors.textMuted }]}>{fmtDate(item.createdAt)}</Text>
      </View>
      {item.downtimeMinutes != null && (
        <View style={styles.downtimeRow}>
          <Ionicons name="time-outline" size={13} color={colors.warning} />
          <Text style={[styles.downtime, { color: colors.warning }]}>{item.downtimeMinutes} {'دقيقة توقف'}</Text>
        </View>
      )}
      {item.downtimeReason ? <Text style={[styles.reason, { color: colors.textSecondary }]} numberOfLines={2}>{item.downtimeReason}</Text> : null}
      {item.partsUsed ? (
        <View style={styles.partsRow}>
          <Ionicons name="construct-outline" size={12} color={colors.textMuted} />
          <Text style={[styles.parts, { color: colors.textMuted }]} numberOfLines={1}>{item.partsUsed}</Text>
        </View>
      ) : null}
    </View>
  );
}

function CreateModal({ visible, machines, onClose, onSuccess }: {
  visible: boolean; machines: Machine[]; onClose: () => void; onSuccess: () => void;
}) {
  const { colors } = useAppTheme();
  const [machineId, setMachineId] = useState('');
  const [downtime, setDowntime]   = useState('');
  const [reason, setReason]       = useState('');
  const [parts, setParts]         = useState('');
  const [report, setReport]       = useState('');
  const [saving, setSaving]       = useState(false);

  const reset = () => { setMachineId(''); setDowntime(''); setReason(''); setParts(''); setReport(''); };

  const submit = async () => {
    if (!machineId) { Alert.alert('مطلوب', 'اختر آلة.'); return; }
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
      Alert.alert('خطأ', err.message ?? ('فشل الحفظ.'));
    } finally {
      setSaving(false);
    }
  };

  const FIELDS = [
    { label: 'وقت التوقف (دقائق)', val: downtime, set: setDowntime, keyboard: 'numeric' as const },
    { label: 'السبب / الوصف', val: reason, set: setReason, multi: true },
    { label: 'القطع المستخدمة', val: parts, set: setParts },
    { label: 'ملاحظات التقرير', val: report, set: setReport, multi: true },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { reset(); onClose(); }}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <Text style={[styles.sheetTitle, { color: colors.text }]}>{'تسجيل صيانة'}</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{'الآلة *'}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
              {machines.map((m, idx) => (
                <TouchableOpacity
                  key={`${m.id}-${idx}`}
                  style={[styles.machinePill,
                    { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
                    machineId === String(m.id) && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                  onPress={() => setMachineId(String(m.id))}
                >
                  <Text style={[styles.machinePillText, { color: colors.text }, machineId === String(m.id) && styles.machinePillTextActive]}>
                    {m.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {FIELDS.map((f) => (
              <View key={f.label} style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{f.label}</Text>
                <TextInput
                  style={[styles.input, f.multi && styles.inputMulti, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
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
              <Button variant="ghost" onPress={() => { reset(); onClose(); }} style={styles.actionBtn}>{'إلغاء'}</Button>
              <Button onPress={submit} loading={saving} style={styles.actionBtn}>{'حفظ'}</Button>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function MaintenancePage() {
  const { colors } = useAppTheme();
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
      if (rec.status  === 'fulfilled') setRecords(rec.value.records   ?? []);
      if (mach.status === 'fulfilled') setMachines(mach.value.machines ?? []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={'سجلات الصيانة'} showBack />
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
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="construct-outline" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>{'لا توجد سجلات بعد'}</Text>
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
  card:   { borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  machineName: { ...typography.h4, flex: 1, marginRight: spacing.sm },
  cardDate:    { ...typography.caption },
  downtimeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  downtime:    { ...typography.caption, fontWeight: '600' },
  reason:      { ...typography.bodySmall, marginBottom: 4 },
  partsRow:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  parts:       { ...typography.caption, flex: 1 },
  empty:       { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText:   { ...typography.bodySmall },
  fab:         { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', ...shadow.lg },
  overlay:     { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:       { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: 40, maxHeight: '90%' },
  handle:      { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  sheetTitle:  { ...typography.h2, marginBottom: spacing.md },
  field:       { marginBottom: spacing.md },
  fieldLabel:  { ...typography.caption, marginBottom: 6 },
  input:       { borderWidth: 1.5, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 11, fontSize: 15 },
  inputMulti:  { height: 80, textAlignVertical: 'top' },
  machinePill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1.5, marginRight: spacing.sm },
  machinePillText:       { fontSize: 13, fontWeight: '600' },
  machinePillTextActive: { color: '#fff' },
  actions:     { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  actionBtn:   { flex: 1 },
});
