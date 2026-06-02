import React, { useCallback, useEffect, useState } from 'react';
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
import { useLocale } from '../../context/LocaleContext';

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
  const { isAr } = useLocale();
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

  const totalKg = records.reduce((acc, r) => acc + (Number(r.waste_kg) || 0), 0);

  const handleDelete = (rec: WasteRecord) => {
    Alert.alert(
      isAr ? 'حذف السجل' : 'Delete Record',
      isAr ? 'هل أنت متأكد؟' : 'Are you sure?',
      [
        { text: isAr ? 'إلغاء' : 'Cancel', style: 'cancel' },
        {
          text: isAr ? 'حذف' : 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/worker-tools/entries/waste/${rec.id}`);
              setRecords((prev) => prev.filter((r) => r.id !== rec.id));
            } catch (e: any) {
              Alert.alert(isAr ? 'خطأ' : 'Error', e.message ?? 'Failed');
            }
          },
        },
      ],
    );
  };

  const submit = async () => {
    if (!machineLabel.trim()) { Alert.alert(isAr ? 'مطلوب' : 'Required', isAr ? 'أدخل اسم الآلة.' : 'Enter machine label.'); return; }
    if (!materialType.trim()) { Alert.alert(isAr ? 'مطلوب' : 'Required', isAr ? 'أدخل نوع المادة.' : 'Enter material type.'); return; }
    if (!wasteKg.trim() || isNaN(Number(wasteKg)) || Number(wasteKg) < 0) { Alert.alert(isAr ? 'مطلوب' : 'Required', isAr ? 'أدخل كمية هدر صالحة.' : 'Enter a valid waste amount.'); return; }
    if (!reason.trim()) { Alert.alert(isAr ? 'مطلوب' : 'Required', isAr ? 'أدخل سبب الهدر.' : 'Enter waste reason.'); return; }
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
      Alert.alert(isAr ? 'خطأ' : 'Error', e.message ?? (isAr ? 'فشل تسجيل الهدر.' : 'Failed to log waste.'));
    } finally { setSaving(false); }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title={isAr ? 'هدر المواد' : 'Material Waste'}
        subtitle={`${records.length} ${isAr ? 'مسجل' : 'logged'} · ${totalKg.toFixed(1)} kg ${isAr ? 'إجمالي' : 'total'}`}
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
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.danger }]} onPress={() => setModal(true)} activeOpacity={0.8}>
            <Ionicons name="add-circle" size={20} color="#fff" />
            <Text style={styles.addText}>{isAr ? 'تسجيل هدر مواد' : 'Log Material Waste'}</Text>
          </TouchableOpacity>

          {records.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="trash-outline" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>{isAr ? 'لا توجد سجلات هدر' : 'No waste records logged'}</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {records.map((r, idx) => (
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
              <Text style={[styles.sheetTitle, { color: colors.text }]}>{isAr ? 'تسجيل هدر مواد' : 'Log Material Waste'}</Text>

              <Text style={[styles.label, { color: colors.textMuted }]}>{isAr ? 'اسم الآلة *' : 'Machine Label *'}</Text>
              <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]} placeholder={isAr ? 'مثال: آلة بثق 1' : 'e.g. Extruder 1'} placeholderTextColor={colors.textMuted} value={machineLabel} onChangeText={setMachineLabel} />

              <Text style={[styles.label, { color: colors.textMuted }]}>{isAr ? 'نوع الآلة (اختياري)' : 'Machine Type (optional)'}</Text>
              <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]} placeholder={isAr ? 'مثال: بثق' : 'e.g. Extruder'} placeholderTextColor={colors.textMuted} value={machineType} onChangeText={setMachineType} />

              <Text style={[styles.label, { color: colors.textMuted }]}>{isAr ? 'نوع المادة *' : 'Material Type *'}</Text>
              <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]} placeholder={isAr ? 'مثال: راتنج PVC' : 'e.g. PVC Resin'} placeholderTextColor={colors.textMuted} value={materialType} onChangeText={setMaterialType} />

              <Text style={[styles.label, { color: colors.textMuted }]}>{isAr ? 'الكمية (كغ) *' : 'Waste Amount (kg) *'}</Text>
              <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]} placeholder="e.g. 5.5" placeholderTextColor={colors.textMuted} value={wasteKg} onChangeText={setWasteKg} keyboardType="decimal-pad" />

              <Text style={[styles.label, { color: colors.textMuted }]}>{isAr ? 'السبب *' : 'Reason *'}</Text>
              <TextInput style={[styles.input, styles.inputMulti, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]} placeholder={isAr ? 'اشرح سبب الهدر…' : 'Describe the cause of waste…'} placeholderTextColor={colors.textMuted} value={reason} onChangeText={setReason} multiline numberOfLines={3} />

              <View style={styles.actions}>
                <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => setModal(false)}>
                  <Text style={[styles.cancelText, { color: colors.textMuted }]}>{isAr ? 'إلغاء' : 'Cancel'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.danger }]} onPress={submit} disabled={saving}>
                  {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitText}>{isAr ? 'تسجيل الهدر' : 'Log Waste'}</Text>}
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
});
