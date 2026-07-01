import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

interface WasteRecord {
  id: number;
  machine_label: string;
  machine_type?: string | null;
  material_type: string;
  waste_kg: number;
  reason: string;
  created_at: string;
}

export function MaterialWasteScreen() {
  const { colors } = useAppTheme();
  const today0 = new Date().toISOString().slice(0, 10);
  const month0 = new Date().toISOString().slice(0, 7) + '-01';
  const [fromDate, setFromDate] = useState(month0);
  const [toDate,   setToDate]   = useState(today0);
  const [records,    setRecords]    = useState<WasteRecord[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal,      setModal]      = useState(false);
  const [machineLabel, setMachineLabel] = useState('');
  const [machineType,  setMachineType]  = useState('');
  const [materialType, setMaterialType] = useState('');
  const [wasteKg,      setWasteKg]      = useState('');
  const [reason,       setReason]       = useState('');
  const [saving,       setSaving]       = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<WasteRecord[] | { data: WasteRecord[] }>('/worker-tools/material-waste/mine');
      setRecords(Array.isArray(res) ? res : ((res as any).data ?? []));
    } catch { setRecords([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const inRange = (d: string) => {
    const s = d.slice(0, 10);
    return (!fromDate || s >= fromDate) && (!toDate || s <= toDate);
  };

  const filteredRecords = useMemo(() => records.filter(r => inRange(r.created_at)), [records, fromDate, toDate]);

  const totalKg = records.reduce((acc, r) => acc + (Number(r.waste_kg) || 0), 0);

  const handleDelete = (rec: WasteRecord) => {
    Alert.alert(
      'حذف السجل',
      'هل أنت متأكد؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف', style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/worker-tools/entries/waste/${rec.id}`);
              setRecords((prev) => prev.filter((r) => r.id !== rec.id));
            } catch (e: any) {
              Alert.alert('خطأ', e.message ?? 'Failed');
            }
          },
        },
      ],
    );
  };

  const submit = async () => {
    if (!machineLabel.trim()) { Alert.alert('مطلوب', 'أدخل اسم الآلة.'); return; }
    if (!materialType.trim()) { Alert.alert('مطلوب', 'أدخل نوع المادة.'); return; }
    if (!wasteKg.trim() || isNaN(Number(wasteKg)) || Number(wasteKg) < 0) { Alert.alert('مطلوب', 'أدخل كمية هدر صالحة.'); return; }
    if (!reason.trim()) { Alert.alert('مطلوب', 'أدخل سبب الهدر.'); return; }
    setSaving(true);
    try {
      await api.post('/worker-tools/material-waste', {
        machineLabel: machineLabel.trim(),
        machineType:  machineType.trim() || undefined,
        materialType: materialType.trim(),
        wasteKg:      parseFloat(wasteKg),
        reason:       reason.trim(),
      });
      setModal(false);
      setMachineLabel(''); setMachineType(''); setMaterialType(''); setWasteKg(''); setReason('');
      setLoading(true); void load();
    } catch (e: any) {
      Alert.alert('خطأ', e.message ?? ('فشل تسجيل الهدر.'));
    } finally { setSaving(false); }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title={'هدر المواد'}
        subtitle={`${records.length} ${'مسجل'} · ${totalKg.toFixed(1)} kg ${'إجمالي'}`}
        showBack
      />
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.danger} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.danger} />}
        >
          {/* Date filter bar */}
          <View style={[styles.filterBar, { backgroundColor: colors.surface }]}>
            <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
            <TextInput
              style={[styles.filterInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
              value={fromDate}
              onChangeText={setFromDate}
              placeholder="From YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
            />
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>→</Text>
            <TextInput
              style={[styles.filterInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
              value={toDate}
              onChangeText={setToDate}
              placeholder="To YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
            />
            <TouchableOpacity onPress={() => { setFromDate(month0); setToDate(today0); }} style={[styles.filterReset, { borderColor: colors.border }]}>
              <Ionicons name="refresh-outline" size={13} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.danger }]} onPress={() => setModal(true)} activeOpacity={0.8}>
            <Ionicons name="add-circle" size={20} color="#fff" />
            <Text style={styles.addText}>{'تسجيل هدر مواد'}</Text>
          </TouchableOpacity>

          {filteredRecords.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="trash-outline" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>{'لا توجد سجلات هدر'}</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {filteredRecords.map((r, idx) => (
                <View key={`${r.id}-${idx}`} style={[styles.card, { backgroundColor: colors.surface }]}>
                  <View style={[styles.cardIcon, { backgroundColor: `${colors.danger}15` }]}>
                    <Ionicons name="trash" size={18} color={colors.danger} />
                  </View>
                  <View style={styles.cardBody}>
                    <Text style={[styles.cardName, { color: colors.text }]}>{r.material_type}</Text>
                    <Text style={[styles.cardMachine, { color: colors.primary }]}>{r.machine_label}{r.machine_type ? ` · ${r.machine_type}` : ''}</Text>
                    <Text style={[styles.cardReason, { color: colors.textMuted }]}>{r.reason}</Text>
                    <Text style={[styles.cardDate, { color: colors.textMuted }]}>{new Date(r.created_at).toLocaleDateString()}</Text>
                  </View>
                  <View style={styles.cardRight}>
                    <View style={styles.qtyBox}>
                      <Text style={[styles.qty, { color: colors.danger }]}>{Number(r.waste_kg).toFixed(1)}</Text>
                      <Text style={[styles.unit, { color: colors.textMuted }]}>kg</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleDelete(r)} hitSlop={8} style={{ marginTop: 6 }}>
                      <Ionicons name="trash-outline" size={16} color={colors.danger} />
                    </TouchableOpacity>
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
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={[styles.sheetTitle, { color: colors.text }]}>{'تسجيل هدر مواد'}</Text>

              <Text style={[styles.label, { color: colors.textMuted }]}>{'اسم الآلة *'}</Text>
              <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]} placeholder={'مثال: آلة بثق 1'} placeholderTextColor={colors.textMuted} value={machineLabel} onChangeText={setMachineLabel} />

              <Text style={[styles.label, { color: colors.textMuted }]}>{'نوع الآلة (اختياري)'}</Text>
              <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]} placeholder={'مثال: بثق'} placeholderTextColor={colors.textMuted} value={machineType} onChangeText={setMachineType} />

              <Text style={[styles.label, { color: colors.textMuted }]}>{'نوع المادة *'}</Text>
              <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]} placeholder={'مثال: راتنج PVC'} placeholderTextColor={colors.textMuted} value={materialType} onChangeText={setMaterialType} />

              <Text style={[styles.label, { color: colors.textMuted }]}>{'الكمية (كغ) *'}</Text>
              <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]} placeholder="e.g. 5.5" placeholderTextColor={colors.textMuted} value={wasteKg} onChangeText={setWasteKg} keyboardType="decimal-pad" />

              <Text style={[styles.label, { color: colors.textMuted }]}>{'السبب *'}</Text>
              <TextInput style={[styles.input, styles.inputMulti, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]} placeholder={'اشرح سبب الهدر…'} placeholderTextColor={colors.textMuted} value={reason} onChangeText={setReason} multiline numberOfLines={3} />

              <View style={styles.actions}>
                <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => setModal(false)}>
                  <Text style={[styles.cancelText, { color: colors.textMuted }]}>{'إلغاء'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.danger }]} onPress={submit} disabled={saving}>
                  {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitText}>{'تسجيل الهدر'}</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:       { flex: 1 },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content:    { padding: spacing.md, paddingBottom: 40 },
  addBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: radius.lg, paddingVertical: 12, marginBottom: spacing.md },
  addText:    { ...typography.bodySmall, fontWeight: '700', color: '#fff' },
  empty:      { alignItems: 'center', paddingVertical: 60, gap: spacing.sm },
  emptyText:  { ...typography.bodySmall },
  list:       { gap: spacing.sm },
  card:       { flexDirection: 'row', alignItems: 'center', borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm, ...shadow.sm },
  cardIcon:   { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  cardBody:   { flex: 1 },
  cardName:   { ...typography.h4 },
  cardMachine: { ...typography.caption, fontWeight: '600' },
  cardReason: { ...typography.caption },
  cardDate:   { ...typography.caption },
  cardRight:  { alignItems: 'flex-end' },
  qtyBox:     { alignItems: 'flex-end' },
  qty:        { fontSize: 18, fontWeight: '800' },
  unit:       { ...typography.caption },
  overlay:    { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:      { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: 40, maxHeight: '90%' },
  handle:     { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  sheetTitle: { ...typography.h2, marginBottom: spacing.md },
  label:      { ...typography.caption, marginBottom: 6 },
  input:      { borderWidth: 1.5, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: 15, marginBottom: spacing.md },
  inputMulti: { height: 80, textAlignVertical: 'top' },
  actions:    { flexDirection: 'row', gap: spacing.sm },
  cancelBtn:  { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: radius.md, borderWidth: 1.5 },
  cancelText: { fontWeight: '700' },
  submitBtn:  { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: radius.md },
  submitText: { fontWeight: '700', color: '#fff' },
  filterBar:   { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 10, marginBottom: 8 },
  filterInput: { flex: 1, borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, fontSize: 13 },
  filterReset: { width: 30, height: 30, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
