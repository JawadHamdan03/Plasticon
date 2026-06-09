import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Modal, RefreshControl,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { ScreenHeader } from '../../components';
import { radius, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

type Customer  = { id: number; name: string };
type QuoteItem = { productType: string; size: string; quantity: number; pricePerUnit: number };
type Quotation = {
  id: number; status: string; totalAmount: number; notes: string | null;
  createdAt: string; validUntil: string | null; customer: { id: number; name: string };
};

const STATUS_COLOR: Record<string, string> = {
  DRAFT: '#6b7280', SENT: '#3b82f6', ACCEPTED: '#10b981', REJECTED: '#ef4444', EXPIRED: '#f59e0b',
};
const PRODUCT_TYPES = ['CAPS', 'PREFORM', 'PIPES'];

export function QuotationsScreen() {
  const { colors } = useAppTheme();
  const { isAr }   = useLocale();
  const { user }   = useAuth();
  const isSalesRep = user?.role === 'SALES_REP';
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [customers, setCustomers]   = useState<Customer[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal]   = useState(false);
  const [saving, setSaving]         = useState(false);

  // Form state
  const [customerId, setCustomerId] = useState('');
  const [notes, setNotes]           = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [items, setItems]           = useState<QuoteItem[]>([
    { productType: 'CAPS', size: '', quantity: 1, pricePerUnit: 0 },
  ]);

  const load = useCallback(async () => {
    try {
      const [q, c] = await Promise.all([
        api.get<Quotation[]>('/sales-rep/quotations'),
        api.get<Customer[]>('/sales-rep/customers'),
      ]);
      setQuotations(q);
      setCustomers(c);
    } catch { setQuotations([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const resetForm = () => {
    setCustomerId(''); setNotes(''); setValidUntil('');
    setItems([{ productType: 'CAPS', size: '', quantity: 1, pricePerUnit: 0 }]);
  };

  const addItem = () => setItems((prev) => [...prev, { productType: 'CAPS', size: '', quantity: 1, pricePerUnit: 0 }]);
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));
  const updateItem = <K extends keyof QuoteItem>(idx: number, key: K, value: QuoteItem[K]) =>
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [key]: value } : item)));

  const total = items.reduce((s, i) => s + i.quantity * i.pricePerUnit, 0);

  const handleCreate = async () => {
    if (!customerId) { Alert.alert(isAr ? 'اختر عميلاً' : 'Select a customer'); return; }
    setSaving(true);
    try {
      await api.post('/sales-rep/quotations', {
        customerId: Number(customerId),
        notes:      notes || undefined,
        validUntil: validUntil || undefined,
        items,
      });
      setShowModal(false);
      resetForm();
      void load();
    } catch (e: any) {
      Alert.alert(isAr ? 'خطأ' : 'Error', e?.message ?? 'Error');
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = (id: number, status: string) => {
    Alert.alert(
      isAr ? 'تغيير الحالة' : 'Change Status', `→ ${status}`,
      [
        { text: isAr ? 'إلغاء' : 'Cancel', style: 'cancel' },
        { text: isAr ? 'تأكيد' : 'Confirm', onPress: async () => {
          try { await api.patch(`/sales-rep/quotations/${id}/status`, { status }); void load(); }
          catch { Alert.alert('Error'); }
        }},
      ],
    );
  };

  const deleteQ = (id: number) => {
    Alert.alert(
      isAr ? 'حذف' : 'Delete', isAr ? 'هل أنت متأكد؟' : 'Are you sure?',
      [
        { text: isAr ? 'إلغاء' : 'Cancel', style: 'cancel' },
        { text: isAr ? 'حذف' : 'Delete', style: 'destructive', onPress: async () => {
          try { await api.delete(`/sales-rep/quotations/${id}`); void load(); } catch { Alert.alert('Error'); }
        }},
      ],
    );
  };

  const renderItem = ({ item }: { item: Quotation }) => (
    <View style={[styles.card, { backgroundColor: colors.surface, borderLeftColor: STATUS_COLOR[item.status] }]}>
      <View style={styles.cardTop}>
        <Text style={[styles.customer, { color: colors.text }]}>{item.customer.name}</Text>
        <View style={[styles.badge, { backgroundColor: STATUS_COLOR[item.status] + '22' }]}>
          <Text style={[styles.badgeText, { color: STATUS_COLOR[item.status] }]}>{item.status}</Text>
        </View>
      </View>
      <Text style={[styles.amount, { color: colors.accent }]}>₪{item.totalAmount.toFixed(0)}</Text>
      {item.notes ? <Text style={[styles.notes, { color: colors.textSecondary }]}>{item.notes}</Text> : null}
      <Text style={[styles.date, { color: colors.textSecondary }]}>{new Date(item.createdAt).toLocaleDateString()}{item.validUntil ? ` · ${isAr ? 'صالح حتى' : 'valid until'} ${new Date(item.validUntil).toLocaleDateString()}` : ''}</Text>
      <View style={styles.actions}>
        {['SENT', 'ACCEPTED', 'REJECTED'].filter((s) => s !== item.status).map((s) => (
          <TouchableOpacity key={s} style={[styles.actionBtn, { borderColor: STATUS_COLOR[s] }]} onPress={() => updateStatus(item.id, s)}>
            <Text style={[styles.actionText, { color: STATUS_COLOR[s] }]}>→ {s}</Text>
          </TouchableOpacity>
        ))}
        {isSalesRep && (
          <TouchableOpacity style={[styles.actionBtn, { borderColor: '#ef4444' }]} onPress={() => deleteQ(item.id)}>
            <Ionicons name="trash-outline" size={13} color="#ef4444" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScreenHeader title={isAr ? 'عروض الأسعار' : 'Quotations'} />
      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={quotations}
          keyExtractor={(q) => String(q.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="document-text-outline" size={40} color={colors.textSecondary} />
              <Text style={[styles.empty, { color: colors.textSecondary }]}>{isAr ? 'لا توجد عروض' : 'No quotations'}</Text>
              {isSalesRep && (
                <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: colors.accent }]} onPress={() => setShowModal(true)}>
                  <Text style={styles.emptyBtnText}>{isAr ? 'إنشاء عرض' : 'Create Quotation'}</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* FAB — SALES_REP only */}
      {isSalesRep && (
        <TouchableOpacity style={[styles.fab, { backgroundColor: colors.accent }]} onPress={() => setShowModal(true)}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Create Modal */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{isAr ? 'عرض جديد' : 'New Quotation'}</Text>
              <TouchableOpacity onPress={() => { setShowModal(false); resetForm(); }}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 500 }} showsVerticalScrollIndicator={false}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{isAr ? 'العميل' : 'Customer'}</Text>
              <View style={[styles.pickerWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
                {customers.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.pickerItem, customerId === String(c.id) && { backgroundColor: colors.accent + '22' }]}
                    onPress={() => setCustomerId(String(c.id))}
                  >
                    <Text style={{ color: customerId === String(c.id) ? colors.accent : colors.text, fontWeight: customerId === String(c.id) ? '700' : '400' }}>{c.name}</Text>
                    {customerId === String(c.id) && <Ionicons name="checkmark" size={16} color={colors.accent} />}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Items */}
              <View style={styles.itemsHeader}>
                <Text style={[styles.label, { color: colors.textSecondary, marginTop: 0 }]}>{isAr ? 'البنود' : 'Items'}</Text>
                <TouchableOpacity onPress={addItem} style={[styles.addItemBtn, { borderColor: colors.accent }]}>
                  <Ionicons name="add" size={14} color={colors.accent} />
                  <Text style={{ color: colors.accent, fontSize: 12, fontWeight: '700' }}>{isAr ? 'إضافة' : 'Add'}</Text>
                </TouchableOpacity>
              </View>

              {items.map((item, idx) => (
                <View key={idx} style={[styles.itemRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <View style={styles.itemRowTop}>
                    {PRODUCT_TYPES.map((pt) => (
                      <TouchableOpacity
                        key={pt}
                        style={[styles.typeBtn, { borderColor: item.productType === pt ? colors.accent : colors.border, backgroundColor: item.productType === pt ? colors.accent + '22' : 'transparent' }]}
                        onPress={() => updateItem(idx, 'productType', pt)}
                      >
                        <Text style={{ color: item.productType === pt ? colors.accent : colors.textSecondary, fontSize: 12, fontWeight: '700' }}>{pt}</Text>
                      </TouchableOpacity>
                    ))}
                    {items.length > 1 && (
                      <TouchableOpacity onPress={() => removeItem(idx)} style={{ marginLeft: 'auto' as any }}>
                        <Ionicons name="trash-outline" size={14} color="#ef4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={styles.itemRowBottom}>
                    <TextInput
                      style={[styles.itemInput, { color: colors.text, borderColor: colors.border, flex: 2 }]}
                      placeholder={isAr ? 'الحجم' : 'Size'}
                      placeholderTextColor={colors.textSecondary}
                      value={item.size}
                      onChangeText={(v) => updateItem(idx, 'size', v)}
                    />
                    <TextInput
                      style={[styles.itemInput, { color: colors.text, borderColor: colors.border, flex: 1 }]}
                      placeholder={isAr ? 'الكمية' : 'Qty'}
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="numeric"
                      value={String(item.quantity)}
                      onChangeText={(v) => updateItem(idx, 'quantity', Number(v) || 0)}
                    />
                    <TextInput
                      style={[styles.itemInput, { color: colors.text, borderColor: colors.border, flex: 2 }]}
                      placeholder={isAr ? 'السعر ₪' : 'Price ₪'}
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="decimal-pad"
                      value={item.pricePerUnit > 0 ? String(item.pricePerUnit) : ''}
                      onChangeText={(v) => updateItem(idx, 'pricePerUnit', Number(v) || 0)}
                    />
                  </View>
                </View>
              ))}

              <View style={[styles.totalRow, { borderColor: colors.accent + '44', backgroundColor: colors.accent + '11' }]}>
                <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>{isAr ? 'الإجمالي:' : 'Total:'}</Text>
                <Text style={{ color: colors.accent, fontWeight: '800', fontSize: 18 }}>₪{total.toFixed(2)}</Text>
              </View>

              <Text style={[styles.label, { color: colors.textSecondary }]}>{isAr ? 'صالح حتى' : 'Valid Until'}</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
                value={validUntil}
                onChangeText={setValidUntil}
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>{isAr ? 'ملاحظات' : 'Notes'}</Text>
              <TextInput
                style={[styles.input, styles.textarea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                placeholder={isAr ? 'ملاحظات...' : 'Notes...'}
                placeholderTextColor={colors.textSecondary}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
              />
            </ScrollView>

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: saving ? colors.textSecondary : colors.accent }]}
              onPress={handleCreate}
              disabled={saving}
            >
              <Text style={styles.submitText}>{saving ? (isAr ? 'جارٍ الحفظ...' : 'Saving...') : (isAr ? 'إنشاء العرض' : 'Create Quotation')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1 },
  list:        { padding: spacing.md, gap: spacing.sm, paddingBottom: 90 },
  card:        { borderRadius: radius.md, padding: spacing.md, gap: 6, borderLeftWidth: 3 },
  cardTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  customer:    { ...typography.body, fontWeight: '700', flex: 1 },
  badge:       { paddingHorizontal: 10, paddingVertical: 2, borderRadius: 20 },
  badgeText:   { ...typography.caption, fontWeight: '700' },
  amount:      { ...typography.h3, fontWeight: '800' },
  notes:       { ...typography.caption },
  date:        { ...typography.caption, fontSize: 11 },
  actions:     { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 4 },
  actionBtn:   { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  actionText:  { ...typography.caption, fontWeight: '600' },
  emptyBox:    { alignItems: 'center', marginTop: 60, gap: 12 },
  empty:       { ...typography.body },
  emptyBtn:    { paddingHorizontal: 20, paddingVertical: 10, borderRadius: radius.md },
  emptyBtnText:{ color: '#fff', fontWeight: '700' },
  fab:         { position: 'absolute', bottom: 24, right: 20, width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
  modalOverlay:{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet:  { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.md, paddingBottom: spacing.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  modalTitle:  { ...typography.h3, fontWeight: '700' },
  label:       { ...typography.caption, fontWeight: '600', marginBottom: 4, marginTop: spacing.sm },
  input:       { borderWidth: 1, borderRadius: radius.sm, padding: 10, ...typography.body },
  textarea:    { height: 70, textAlignVertical: 'top' },
  pickerWrap:  { borderWidth: 1, borderRadius: radius.sm, maxHeight: 140 },
  pickerItem:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.08)' },
  itemsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
  addItemBtn:  { flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  itemRow:     { borderWidth: 1, borderRadius: radius.sm, padding: 8, gap: 6, marginBottom: 6 },
  itemRowTop:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  typeBtn:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  itemRowBottom:{ flexDirection: 'row', gap: 6 },
  itemInput:   { borderWidth: 1, borderRadius: 6, padding: 7, ...typography.caption },
  totalRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, borderRadius: radius.sm, borderWidth: 1, marginVertical: spacing.sm },
  submitBtn:   { borderRadius: radius.md, padding: 14, alignItems: 'center', marginTop: spacing.sm },
  submitText:  { color: '#fff', fontWeight: '700', fontSize: 15 },
});
