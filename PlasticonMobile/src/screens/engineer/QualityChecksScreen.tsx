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
import { QualityCheck } from '../../api/types';
import { colors, radius, shadow, spacing, typography } from '../../theme';

const RESULT_META: Record<string, { color: string; icon: string }> = {
  PASS:    { color: colors.success, icon: 'checkmark-circle' },
  FAIL:    { color: colors.danger,  icon: 'close-circle' },
  PARTIAL: { color: colors.warning, icon: 'alert-circle' },
};

function CheckCard({ item }: { item: QualityCheck }) {
  const meta = RESULT_META[item.result] ?? RESULT_META.PARTIAL;
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <Text style={styles.batch} numberOfLines={1}>{item.batchCode}</Text>
          <Text style={styles.machine}>{item.machine?.name ?? '—'} · {item.checkType}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: `${meta.color}18` }]}>
          <Ionicons name={meta.icon as any} size={14} color={meta.color} />
          <Text style={[styles.badgeText, { color: meta.color }]}>{item.result}</Text>
        </View>
      </View>
      <View style={styles.footer}>
        <Text style={styles.date}>{new Date(item.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</Text>
        {item.createdBy && <Text style={styles.by}>by {item.createdBy.fullName}</Text>}
      </View>
      {item.notes ? <Text style={styles.notes} numberOfLines={2}>{item.notes}</Text> : null}
    </View>
  );
}

function CreateModal({ visible, onClose, onSuccess }: { visible: boolean; onClose: () => void; onSuccess: () => void }) {
  const [machines, setMachines] = useState<{ id: number; name: string }[]>([]);
  const [machineId, setMachineId] = useState('');
  const [batchCode, setBatchCode] = useState('');
  const [checkType, setCheckType] = useState('');
  const [result, setResult]       = useState<'PASS' | 'FAIL' | 'PARTIAL'>('PASS');
  const [notes, setNotes]         = useState('');
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    if (visible) api.get<{ machines: { id: number; name: string }[] }>('/machines').then((r) => setMachines(r.machines ?? [])).catch(() => {});
  }, [visible]);

  const submit = async () => {
    if (!batchCode.trim() || !checkType.trim()) { Alert.alert('Required', 'Batch code and check type are required.'); return; }
    setSaving(true);
    try {
      await api.post('/quality-checks', {
        machineId: machineId ? parseInt(machineId, 10) : undefined,
        batchCode: batchCode.trim(),
        checkType: checkType.trim(),
        result,
        notes:     notes.trim() || undefined,
        date:      new Date().toISOString(),
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
          <Text style={styles.sheetTitle}>Log Quality Check</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {machines.length > 0 && (
              <>
                <Text style={styles.fieldLabel}>Machine</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
                  {machines.map((m) => (
                    <TouchableOpacity key={m.id} style={[styles.pill, machineId === String(m.id) && styles.pillActive]} onPress={() => setMachineId(String(m.id))}>
                      <Text style={[styles.pillText, machineId === String(m.id) && styles.pillTextActive]}>{m.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}
            {[
              { label: 'Batch Code *', val: batchCode, set: setBatchCode },
              { label: 'Check Type *', val: checkType, set: setCheckType, placeholder: 'e.g. Dimensional, Visual' },
            ].map((f) => (
              <View key={f.label} style={styles.field}>
                <Text style={styles.fieldLabel}>{f.label}</Text>
                <TextInput style={styles.input} placeholder={f.placeholder} placeholderTextColor={colors.textMuted} value={f.val} onChangeText={f.set} />
              </View>
            ))}
            <Text style={styles.fieldLabel}>Result *</Text>
            <View style={styles.resultRow}>
              {(['PASS', 'FAIL', 'PARTIAL'] as const).map((r) => {
                const m = RESULT_META[r];
                return (
                  <TouchableOpacity key={r} style={[styles.resultBtn, result === r && { backgroundColor: m.color, borderColor: m.color }]} onPress={() => setResult(r)}>
                    <Text style={[styles.resultText, result === r && { color: '#fff' }]}>{r}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Notes</Text>
              <TextInput style={[styles.input, styles.inputMulti]} multiline numberOfLines={3} placeholderTextColor={colors.textMuted} value={notes} onChangeText={setNotes} />
            </View>
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

export function QualityChecksScreen() {
  const [checks, setChecks]     = useState<QualityCheck[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal]       = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ checks: QualityCheck[] }>('/quality-checks?limit=40');
      setChecks(res.checks ?? []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Quality Checks" subtitle={`${checks.length} records`} showBack />
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View> : (
        <FlatList
          data={checks}
          keyExtractor={(i) => String(i.id)}
          renderItem={({ item }) => <CheckCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="shield-checkmark-outline" size={44} color={colors.textMuted} /><Text style={styles.emptyText}>No quality checks</Text></View>}
        />
      )}
      <TouchableOpacity style={styles.fab} onPress={() => setModal(true)} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
      <CreateModal visible={modal} onClose={() => setModal(false)} onSuccess={() => { setModal(false); setLoading(true); void load(); }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: colors.background },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:    { padding: spacing.md, paddingBottom: 100 },
  card:    { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardLeft: { flex: 1, marginRight: spacing.sm },
  batch:   { ...typography.h4 },
  machine: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  badge:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  badgeText: { fontSize: 11, fontWeight: '700' },
  footer:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  date:    { ...typography.caption },
  by:      { ...typography.caption },
  notes:   { ...typography.bodySmall, color: colors.textSecondary },
  empty:   { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText: { ...typography.bodySmall, color: colors.textMuted },
  fab:     { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center', ...shadow.lg },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:   { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: 40, maxHeight: '90%' },
  handle:  { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.md },
  sheetTitle: { ...typography.h2, marginBottom: spacing.md },
  field:   { marginBottom: spacing.md },
  fieldLabel: { ...typography.caption, marginBottom: 6 },
  input:   { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 11, fontSize: 15, color: colors.text, backgroundColor: colors.surfaceAlt },
  inputMulti: { height: 80, textAlignVertical: 'top' },
  pill:    { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full, backgroundColor: colors.surfaceAlt, borderWidth: 1.5, borderColor: colors.border, marginRight: spacing.sm },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText:  { fontSize: 13, fontWeight: '600', color: colors.text },
  pillTextActive: { color: '#fff' },
  resultRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  resultBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.sm, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surfaceAlt },
  resultText: { fontWeight: '700', fontSize: 13, color: colors.text },
  actions: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: { flex: 1 },
});
