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
  id:           number;
  materialName: string;
  quantity:     number;
  unit?:        string;
  reason?:      string;
  createdAt:    string;
}

export function MaterialWasteScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
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
    if (!matName.trim()) { Alert.alert(isAr ? 'مطلوب' : 'Required', isAr ? 'أدخل اسم المادة.' : 'Enter material name.'); return; }
    if (!quantity.trim() || isNaN(Number(quantity))) { Alert.alert(isAr ? 'مطلوب' : 'Required', isAr ? 'أدخل كمية صالحة.' : 'Enter a valid quantity.'); return; }
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
      Alert.alert(isAr ? 'خطأ' : 'Error', e.message ?? (isAr ? 'فشل تسجيل الهدر.' : 'Failed to log waste.'));
    } finally { setSaving(false); }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={isAr ? 'هدر المواد' : 'Material Waste'} subtitle={`${records.length} ${isAr ? 'مسجل' : 'logged'}`} showBack />
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.danger} /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
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
                    <Text style={[styles.cardName, { color: colors.text }]}>{r.materialName}</Text>
                    {r.reason ? <Text style={[styles.cardReason, { color: colors.textMuted }]}>{r.reason}</Text> : null}
                    <Text style={[styles.cardDate, { color: colors.textMuted }]}>{new Date(r.createdAt).toLocaleDateString()}</Text>
                  </View>
                  <View style={styles.qtyBox}>
                    <Text style={[styles.qty, { color: colors.danger }]}>{r.quantity}</Text>
                    <Text style={[styles.unit, { color: colors.textMuted }]}>{r.unit ?? 'kg'}</Text>
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
            <Text style={[styles.sheetTitle, { color: colors.text }]}>{isAr ? 'تسجيل هدر مواد' : 'Log Material Waste'}</Text>
            <Text style={[styles.label, { color: colors.textMuted }]}>{isAr ? 'اسم المادة *' : 'Material Name *'}</Text>
            <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]} placeholder={isAr ? 'مثال: راتنج PVC' : 'e.g. PVC Resin'} placeholderTextColor={colors.textMuted} value={matName} onChangeText={setMatName} />
            <Text style={[styles.label, { color: colors.textMuted }]}>{isAr ? 'الكمية (كغ) *' : 'Quantity (kg) *'}</Text>
            <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]} placeholder="e.g. 5.5" placeholderTextColor={colors.textMuted} value={quantity} onChangeText={setQuantity} keyboardType="numeric" />
            <Text style={[styles.label, { color: colors.textMuted }]}>{isAr ? 'السبب (اختياري)' : 'Reason (optional)'}</Text>
            <TextInput style={[styles.input, styles.inputMulti, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]} placeholder={isAr ? 'اشرح سبب الهدر…' : 'Describe the cause of waste…'} placeholderTextColor={colors.textMuted} value={reason} onChangeText={setReason} multiline numberOfLines={3} />
            <View style={styles.actions}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => setModal(false)}>
                <Text style={[styles.cancelText, { color: colors.textMuted }]}>{isAr ? 'إلغاء' : 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.danger }]} onPress={submit} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitText}>{isAr ? 'تسجيل الهدر' : 'Log Waste'}</Text>}
              </TouchableOpacity>
            </View>
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
  cardReason: { ...typography.caption },
  cardDate:   { ...typography.caption },
  qtyBox:     { alignItems: 'flex-end' },
  qty:        { fontSize: 18, fontWeight: '800' },
  unit:       { ...typography.caption },
  overlay:    { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:      { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: 40 },
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
