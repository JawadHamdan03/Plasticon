import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Image, KeyboardAvoidingView,
  Modal, Platform, RefreshControl, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { Button, ScreenHeader } from '../../components';
import { radius, shadow, spacing, typography } from '../../theme';
import { API_BASE } from '../../config';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

interface WorkerSnapshot {
  id: number;
  createdAt: string;
  machineLabel: string;
  machineCounter: number;
  electricityKwh: number;
  notes: string | null;
  machineCounterImage?: string | null;
  electricityImage?: string | null;
}

function toImageUri(stored?: string | null): string | null {
  if (!stored) return null;
  return `${API_BASE}/${stored.replace(/^prisma\//, '')}`;
}

function fmtDT(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} · ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function SnapCard({ item, colors }: { item: WorkerSnapshot; colors: any }) {
  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.cardTop}>
        <View style={[styles.machinePill, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="hardware-chip-outline" size={13} color={colors.primary} />
          <Text style={[styles.machineText, { color: colors.primary }]}>{item.machineLabel}</Text>
        </View>
        <Text style={[styles.cardTime, { color: colors.textMuted }]}>{fmtDT(item.createdAt)}</Text>
      </View>
      <View style={styles.metrics}>
        <View style={styles.metric}>
          <Text style={[styles.metricVal, { color: colors.primary }]}>{(item.machineCounter ?? 0).toLocaleString()}</Text>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Counter</Text>
        </View>
        <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />
        <View style={styles.metric}>
          <Text style={[styles.metricVal, { color: colors.accent }]}>{item.electricityKwh}</Text>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>kWh</Text>
        </View>
      </View>
      {item.notes ? <Text style={[styles.notes, { color: colors.textMuted }]}>{item.notes}</Text> : null}
      {(item.machineCounterImage || item.electricityImage) && (
        <View style={styles.photoRow}>
          {toImageUri(item.machineCounterImage) ? (
            <Image source={{ uri: toImageUri(item.machineCounterImage)! }} style={[styles.photo, { backgroundColor: colors.border }]} resizeMode="cover" />
          ) : null}
          {toImageUri(item.electricityImage) ? (
            <Image source={{ uri: toImageUri(item.electricityImage)! }} style={[styles.photo, { backgroundColor: colors.border }]} resizeMode="cover" />
          ) : null}
        </View>
      )}
    </View>
  );
}

interface SnapForm { machineLabel: string; machineCounter: string; electricityKwh: string; notes: string; }

function LogModal({
  visible, onClose, onSuccess, colors, isAr,
}: {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  colors: any;
  isAr: boolean;
}) {
  const [form, setForm] = useState<SnapForm>({ machineLabel: '', machineCounter: '', electricityKwh: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const reset = () => setForm({ machineLabel: '', machineCounter: '', electricityKwh: '', notes: '' });

  const submit = async () => {
    if (!form.machineLabel.trim()) { Alert.alert('Required', 'Machine label is required.'); return; }
    const counter = parseFloat(form.machineCounter);
    const kwh     = parseFloat(form.electricityKwh);
    if (isNaN(counter) || isNaN(kwh)) { Alert.alert('Required', 'Enter valid counter and kWh values.'); return; }

    setSaving(true);
    try {
      await api.post('/settings/snapshots', {
        machineLabel:   form.machineLabel.trim(),
        machineCounter: counter,
        electricityKwh: kwh,
        notes:          form.notes.trim() || null,
      });
      reset();
      onSuccess();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to save snapshot.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { reset(); onClose(); }}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <Text style={[styles.sheetTitle, { color: colors.text }]}>New Snapshot</Text>

          {[
            { label: 'Machine Label *', key: 'machineLabel', placeholder: 'e.g. Extruder A3' },
            { label: 'Machine Counter *', key: 'machineCounter', placeholder: 'e.g. 45230', keyboard: 'numeric' as const },
            { label: 'Electricity (kWh) *', key: 'electricityKwh', placeholder: 'e.g. 12.5', keyboard: 'decimal-pad' as const },
            { label: 'Notes', key: 'notes', placeholder: 'Optional remarks...' },
          ].map((f) => (
            <View key={f.key} style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{f.label}</Text>
              <TextInput
                style={[
                  styles.input,
                  f.key === 'notes' && styles.inputMulti,
                  { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt },
                ]}
                placeholder={f.placeholder}
                placeholderTextColor={colors.textMuted}
                keyboardType={f.keyboard ?? 'default'}
                multiline={f.key === 'notes'}
                numberOfLines={f.key === 'notes' ? 3 : 1}
                value={(form as any)[f.key]}
                onChangeText={(t) => setForm((p) => ({ ...p, [f.key]: t }))}
              />
            </View>
          ))}

          <View style={styles.actions}>
            <Button variant="ghost" onPress={() => { reset(); onClose(); }} style={styles.actionBtn}>
              Cancel
            </Button>
            <Button onPress={submit} loading={saving} style={styles.actionBtn}>
              {isAr ? 'حفظ' : 'Save'}
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function SnapshotsScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();

  const [snaps, setSnaps]       = useState<WorkerSnapshot[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal]       = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<WorkerSnapshot[]>('/settings/snapshots/mine?limit=30');
      setSnaps(Array.isArray(res) ? res : []);
    } catch { setSnaps([]); }
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Snapshots" subtitle="Machine & electricity readings" showBack />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={snaps}
          keyExtractor={(i, idx) => `${String(i.id)}-${idx}`}
          renderItem={({ item }) => <SnapCard item={item} colors={colors} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); void load(); }}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="camera-outline" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {isAr ? 'لا توجد بيانات' : 'No snapshots yet'}
              </Text>
            </View>
          }
        />
      )}

      <TouchableOpacity style={[styles.fab, { backgroundColor: colors.primary }]} onPress={() => setModal(true)} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <LogModal
        visible={modal}
        onClose={() => setModal(false)}
        onSuccess={() => { setModal(false); setLoading(true); void load(); }}
        colors={colors}
        isAr={isAr}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:   { padding: spacing.md, paddingBottom: 100 },

  card: {
    borderRadius: radius.lg,
    padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm,
  },
  cardTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  machinePill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  machineText: { fontSize: 12, fontWeight: '700' },
  cardTime:    { ...typography.caption },

  metrics:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingVertical: spacing.sm },
  metric:        { alignItems: 'center' },
  metricVal:     { fontSize: 22, fontWeight: '800' },
  metricLabel:   { ...typography.caption, marginTop: 2 },
  metricDivider: { width: 1, height: 36 },
  notes:         { ...typography.bodySmall, marginTop: spacing.sm, fontStyle: 'italic' },
  photoRow:      { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  photo:         { width: '48%', aspectRatio: 4 / 3, borderRadius: radius.sm },

  empty:     { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText: { ...typography.bodySmall },

  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    ...shadow.lg,
  },

  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: spacing.lg, paddingBottom: 40,
  },
  handle:     { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  sheetTitle: { ...typography.h2, marginBottom: spacing.md },
  field:      { marginBottom: spacing.md },
  fieldLabel: { ...typography.caption, marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderRadius: radius.sm,
    paddingHorizontal: spacing.md, paddingVertical: 11,
    fontSize: 15,
  },
  inputMulti: { height: 80, textAlignVertical: 'top' },
  actions:    { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  actionBtn:  { flex: 1 },
});
