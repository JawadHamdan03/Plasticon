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

interface WasteRecord {
  id:           number;
  materialName: string;
  quantity:     number;
  unit?:        string;
  reason?:      string;
  createdAt:    string;
}

export function MaterialWasteScreen() {
  const [records,    setRecords]    = useState<WasteRecord[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal,      setModal]      = useState(false);
  const [matName,    setMatName]    = useState('');
  const [quantity,   setQuantity]   = useState('');
  const [reason,     setReason]     = useState('');
  const [saving,     setSaving]     = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<WasteRecord[] | { data: WasteRecord[] }>('/worker-tools/material-waste/mine');
      setRecords(Array.isArray(res) ? res : (res.data ?? []));
    } catch { setRecords([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const submit = async () => {
    if (!matName.trim()) { Alert.alert('Required', 'Enter material name.'); return; }
    if (!quantity.trim() || isNaN(Number(quantity))) { Alert.alert('Required', 'Enter a valid quantity.'); return; }
    setSaving(true);
    try {
      await api.post('/worker-tools/material-waste', {
        materialName: matName.trim(),
        quantity:     parseFloat(quantity),
        reason:       reason.trim() || undefined,
      });
      setModal(false); setMatName(''); setQuantity(''); setReason('');
      setLoading(true); void load();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to log waste.');
    } finally { setSaving(false); }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Material Waste" subtitle={`${records.length} logged`} showBack />
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.danger} /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.danger} />}
        >
          <TouchableOpacity style={styles.addBtn} onPress={() => setModal(true)} activeOpacity={0.8}>
            <Ionicons name="add-circle" size={20} color="#fff" />
            <Text style={styles.addText}>Log Material Waste</Text>
          </TouchableOpacity>

          {records.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="trash-outline" size={44} color={colors.textMuted} />
              <Text style={styles.emptyText}>No waste records logged</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {records.map((r, idx) => (
                <View key={`${r.id}-${idx}`} style={styles.card}>
                  <View style={styles.cardIcon}>
                    <Ionicons name="trash" size={18} color={colors.danger} />
                  </View>
                  <View style={styles.cardBody}>
                    <Text style={styles.cardName}>{r.materialName}</Text>
                    {r.reason ? <Text style={styles.cardReason}>{r.reason}</Text> : null}
                    <Text style={styles.cardDate}>{new Date(r.createdAt).toLocaleDateString()}</Text>
                  </View>
                  <View style={styles.qtyBox}>
                    <Text style={styles.qty}>{r.quantity}</Text>
                    <Text style={styles.unit}>{r.unit ?? 'kg'}</Text>
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
            <Text style={styles.sheetTitle}>Log Material Waste</Text>
            <Text style={styles.label}>Material Name *</Text>
            <TextInput style={styles.input} placeholder="e.g. PVC Resin" placeholderTextColor={colors.textMuted} value={matName} onChangeText={setMatName} />
            <Text style={styles.label}>Quantity (kg) *</Text>
            <TextInput style={styles.input} placeholder="e.g. 5.5" placeholderTextColor={colors.textMuted} value={quantity} onChangeText={setQuantity} keyboardType="numeric" />
            <Text style={styles.label}>Reason (optional)</Text>
            <TextInput style={[styles.input, styles.inputMulti]} placeholder="Describe the cause of waste…" placeholderTextColor={colors.textMuted} value={reason} onChangeText={setReason} multiline numberOfLines={3} />
            <View style={styles.actions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={submit} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitText}>Log Waste</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: colors.background },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content:    { padding: spacing.md, paddingBottom: 40 },
  addBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.danger, borderRadius: radius.lg, paddingVertical: 12, marginBottom: spacing.md },
  addText:    { ...typography.bodySmall, fontWeight: '700', color: '#fff' },
  empty:      { alignItems: 'center', paddingVertical: 60, gap: spacing.sm },
  emptyText:  { ...typography.bodySmall, color: colors.textMuted },
  list:       { gap: spacing.sm },
  card:       { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm, ...shadow.sm },
  cardIcon:   { width: 38, height: 38, borderRadius: radius.md, backgroundColor: `${colors.danger}15`, alignItems: 'center', justifyContent: 'center' },
  cardBody:   { flex: 1 },
  cardName:   { ...typography.h4 },
  cardReason: { ...typography.caption, color: colors.textMuted },
  cardDate:   { ...typography.caption, color: colors.textMuted },
  qtyBox:     { alignItems: 'flex-end' },
  qty:        { fontSize: 18, fontWeight: '800', color: colors.danger },
  unit:       { ...typography.caption, color: colors.textMuted },
  overlay:    { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:      { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: 40 },
  handle:     { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.md },
  sheetTitle: { ...typography.h2, marginBottom: spacing.md },
  label:      { ...typography.caption, marginBottom: 6 },
  input:      { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: 15, color: colors.text, backgroundColor: colors.surfaceAlt, marginBottom: spacing.md },
  inputMulti: { height: 80, textAlignVertical: 'top' },
  actions:    { flexDirection: 'row', gap: spacing.sm },
  cancelBtn:  { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border },
  cancelText: { fontWeight: '700', color: colors.textMuted },
  submitBtn:  { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: radius.md, backgroundColor: colors.danger },
  submitText: { fontWeight: '700', color: '#fff' },
});
