import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { Button, ScreenHeader } from '../../components';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

interface ProductionRecord {
  id: number;
  productName: string;
  quantity: number;
  notes?: string;
  createdAt: string;
  status?: string;
}

interface LogForm { productName: string; quantity: string; notes: string; }

export function ProductionScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const [records, setRecords]   = useState<ProductionRecord[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm]     = useState<LogForm>({ productName: '', quantity: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ records: ProductionRecord[]; total: number }>('/production/me?limit=30');
      setRecords(res.records ?? []);
      setTotal(res.total ?? 0);
    } catch {
      // keep last state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); void load(); };

  const handleClose = () => { setForm({ productName: '', quantity: '', notes: '' }); setModalOpen(false); };

  const handleSubmit = async () => {
    if (!form.productName.trim()) { Alert.alert(isAr ? 'مطلوب' : 'Required', isAr ? 'اسم المنتج مطلوب.' : 'Product name is required.'); return; }
    const qty = parseInt(form.quantity, 10);
    if (!qty || qty <= 0) { Alert.alert(isAr ? 'مطلوب' : 'Required', isAr ? 'أدخل كمية صالحة.' : 'Enter a valid quantity.'); return; }

    setSaving(true);
    try {
      await api.post('/production', {
        productName: form.productName.trim(),
        quantity:    qty,
        notes:       form.notes.trim() || undefined,
      });
      setForm({ productName: '', quantity: '', notes: '' });
      setModalOpen(false);
      setLoading(true);
      void load();
    } catch (err: any) {
      Alert.alert(isAr ? 'خطأ' : 'Error', err.message ?? (isAr ? 'فشل حفظ السجل.' : 'Failed to save log.'));
    } finally {
      setSaving(false);
    }
  };

  const renderItem = ({ item }: { item: ProductionRecord }) => {
    const date = new Date(item.createdAt);
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    return (
      <View style={[styles.item, { backgroundColor: colors.surface }]}>
        <View style={styles.itemLeft}>
          <View style={[styles.itemIconBg, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="cube" size={18} color={colors.primary} />
          </View>
          <View style={styles.itemMeta}>
            <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>{item.productName}</Text>
            {item.notes ? <Text style={[styles.itemNotes, { color: colors.textMuted }]} numberOfLines={1}>{item.notes}</Text> : null}
            <Text style={[styles.itemTime, { color: colors.textMuted }]}>{dateStr} · {timeStr}</Text>
          </View>
        </View>
        <View style={styles.itemRight}>
          <Text style={[styles.itemQty, { color: colors.primary }]}>{item.quantity}</Text>
          <Text style={[styles.itemUnit, { color: colors.textMuted }]}>{isAr ? 'وحدة' : 'units'}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={isAr ? 'الإنتاج' : 'Production'} subtitle={`${total} ${isAr ? 'سجل' : 'total records'}`} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(i, idx) => `${String(i.id)}-${idx}`}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="cube-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>{isAr ? 'لا توجد سجلات إنتاج بعد' : 'No production logs yet'}</Text>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>{isAr ? 'اضغط على الزر أدناه لتسجيل أول إدخال.' : 'Tap the button below to log your first entry.'}</Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={[styles.fab, { backgroundColor: colors.primary }]} onPress={() => setModalOpen(true)} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color={colors.textInverse} />
      </TouchableOpacity>

      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={handleClose}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>{isAr ? 'تسجيل الإنتاج' : 'Log Production'}</Text>

            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{isAr ? 'اسم المنتج *' : 'Product Name *'}</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                placeholder={isAr ? 'مثال: أنبوب PVC 50mm' : 'e.g. PVC Pipe 50mm'}
                placeholderTextColor={colors.textMuted}
                value={form.productName}
                onChangeText={(t) => setForm((p) => ({ ...p, productName: t }))}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{isAr ? 'الكمية (وحدات) *' : 'Quantity (units) *'}</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                placeholder="e.g. 120"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={form.quantity}
                onChangeText={(t) => setForm((p) => ({ ...p, quantity: t }))}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{isAr ? 'ملاحظات (اختياري)' : 'Notes (optional)'}</Text>
              <TextInput
                style={[styles.input, styles.inputMulti, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                placeholder={isAr ? 'أي ملاحظات...' : 'Any remarks...'}
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                value={form.notes}
                onChangeText={(t) => setForm((p) => ({ ...p, notes: t }))}
              />
            </View>

            <View style={styles.modalActions}>
              <Button variant="ghost" onPress={handleClose} style={styles.actionBtn}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
              <Button onPress={handleSubmit} loading={saving} style={styles.actionBtn}>{isAr ? 'حفظ السجل' : 'Save Log'}</Button>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:   { padding: spacing.md, paddingBottom: 100 },

  item: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.sm,
  },
  itemLeft:  { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: spacing.sm },
  itemIconBg: {
    width: 38, height: 38, borderRadius: radius.sm,
    alignItems: 'center', justifyContent: 'center',
    marginRight: spacing.sm,
  },
  itemMeta:  { flex: 1 },
  itemName:  { ...typography.h4 },
  itemNotes: { ...typography.caption, marginTop: 1 },
  itemTime:  { ...typography.caption, marginTop: 2 },
  itemRight: { alignItems: 'flex-end' },
  itemQty:   { fontSize: 20, fontWeight: '800' },
  itemUnit:  { ...typography.caption },

  empty:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: spacing.sm },
  emptyTitle: { ...typography.h3 },
  emptyText:  { ...typography.bodySmall, textAlign: 'center' },

  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    ...shadow.lg,
  },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  modalSheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: 40,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    alignSelf: 'center', marginBottom: spacing.md,
  },
  modalTitle: { ...typography.h2, marginBottom: spacing.md },

  field:       { marginBottom: spacing.md },
  fieldLabel:  { ...typography.caption, marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderRadius: radius.sm,
    paddingHorizontal: spacing.md, paddingVertical: 11,
    fontSize: 15,
  },
  inputMulti: { height: 80, textAlignVertical: 'top' },

  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  actionBtn:    { flex: 1 },
});
