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

type Customer = { id: number; name: string };
type Visit = {
  id: number;
  visitDate: string;
  outcome: string | null;
  notes: string | null;
  nextVisitAt: string | null;
  customer: { id: number; name: string };
  loggedBy?: { id: number; fullName: string };
};

export function VisitsScreen() {
  const { colors } = useAppTheme();
  const { isAr }   = useLocale();
  const { user }   = useAuth();
  const isSalesRep = user?.role === 'SALES_REP';
  const [visits, setVisits]         = useState<Visit[]>([]);
  const [customers, setCustomers]   = useState<Customer[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal]   = useState(false);
  const [saving, setSaving]         = useState(false);

  // Form state
  const [customerId, setCustomerId]   = useState('');
  const [visitDate, setVisitDate]     = useState(new Date().toISOString().slice(0, 10));
  const [outcome, setOutcome]         = useState('');
  const [notes, setNotes]             = useState('');
  const [nextVisitAt, setNextVisitAt] = useState('');

  const load = useCallback(async () => {
    try {
      const [v, c] = await Promise.all([
        api.get<Visit[]>('/sales-rep/visits'),
        api.get<Customer[]>('/sales-rep/customers'),
      ]);
      setVisits(v);
      setCustomers(c);
    } catch { setVisits([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const resetForm = () => {
    setCustomerId(''); setVisitDate(new Date().toISOString().slice(0, 10));
    setOutcome(''); setNotes(''); setNextVisitAt('');
  };

  const handleCreate = async () => {
    if (!customerId) { Alert.alert(isAr ? 'اختر عميلاً' : 'Select a customer'); return; }
    setSaving(true);
    try {
      await api.post('/sales-rep/visits', {
        customerId: Number(customerId),
        visitDate,
        outcome:     outcome || undefined,
        notes:       notes   || undefined,
        nextVisitAt: nextVisitAt || undefined,
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


  const renderItem = ({ item }: { item: Visit }) => (
    <View style={[styles.card, { backgroundColor: colors.surface, borderLeftColor: colors.accent }]}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.customerName, { color: colors.text }]}>{item.customer.name}</Text>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>{new Date(item.visitDate).toLocaleDateString()}</Text>
          </View>
        </View>
      </View>
      {item.outcome ? (
        <View style={[styles.outcomeBadge, { backgroundColor: colors.accent + '22' }]}>
          <Text style={[styles.outcomeText, { color: colors.accent }]}>{item.outcome}</Text>
        </View>
      ) : null}
      {item.notes ? <Text style={[styles.notes, { color: colors.textSecondary }]}>{item.notes}</Text> : null}
      {item.nextVisitAt ? (
        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            {isAr ? 'الزيارة القادمة:' : 'Next:'} {new Date(item.nextVisitAt).toLocaleDateString()}
          </Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScreenHeader title={isAr ? 'سجل الزيارات' : 'Visit Log'} />
      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={visits}
          keyExtractor={(v) => String(v.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="location-outline" size={40} color={colors.textSecondary} />
              <Text style={[styles.empty, { color: colors.textSecondary }]}>{isAr ? 'لا توجد زيارات' : 'No visits logged'}</Text>
              {isSalesRep && (
                <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: colors.accent }]} onPress={() => setShowModal(true)}>
                  <Text style={styles.emptyBtnText}>{isAr ? 'سجّل زيارة' : 'Log a Visit'}</Text>
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
              <Text style={[styles.modalTitle, { color: colors.text }]}>{isAr ? 'زيارة جديدة' : 'New Visit'}</Text>
              <TouchableOpacity onPress={() => { setShowModal(false); resetForm(); }}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{isAr ? 'العميل' : 'Customer'}</Text>
              <View style={[styles.pickerWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
                {customers.length === 0 ? (
                  <Text style={{ color: colors.textSecondary, padding: 8 }}>{isAr ? 'لا يوجد عملاء' : 'No customers'}</Text>
                ) : customers.map((c) => (
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

              <Text style={[styles.label, { color: colors.textSecondary }]}>{isAr ? 'تاريخ الزيارة' : 'Visit Date'}</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
                value={visitDate}
                onChangeText={setVisitDate}
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>{isAr ? 'النتيجة' : 'Outcome'}</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                placeholder={isAr ? 'تم الاتفاق، قيد النظر...' : 'Agreed, Pending...'}
                placeholderTextColor={colors.textSecondary}
                value={outcome}
                onChangeText={setOutcome}
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>{isAr ? 'الزيارة القادمة' : 'Next Visit Date'}</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
                value={nextVisitAt}
                onChangeText={setNextVisitAt}
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
              <Text style={styles.submitText}>{saving ? (isAr ? 'جارٍ الحفظ...' : 'Saving...') : (isAr ? 'تسجيل الزيارة' : 'Log Visit')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1 },
  list:         { padding: spacing.md, gap: spacing.sm, paddingBottom: 90 },
  card:         { borderRadius: radius.md, padding: spacing.md, gap: 6, borderLeftWidth: 3 },
  cardTop:      { flexDirection: 'row', alignItems: 'flex-start' },
  customerName: { ...typography.body, fontWeight: '700' },
  infoRow:      { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  infoText:     { ...typography.caption },
  deleteBtn:    { padding: 4 },
  outcomeBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  outcomeText:  { ...typography.caption, fontWeight: '700' },
  notes:        { ...typography.caption },
  emptyBox:     { alignItems: 'center', marginTop: 60, gap: 12 },
  empty:        { ...typography.body },
  emptyBtn:     { paddingHorizontal: 20, paddingVertical: 10, borderRadius: radius.md },
  emptyBtnText: { color: '#fff', fontWeight: '700' },
  fab:          { position: 'absolute', bottom: 24, right: 20, width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet:   { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.md, paddingBottom: spacing.lg },
  modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  modalTitle:   { ...typography.h3, fontWeight: '700' },
  label:        { ...typography.caption, fontWeight: '600', marginBottom: 4, marginTop: spacing.sm },
  input:        { borderWidth: 1, borderRadius: radius.sm, padding: 10, ...typography.body },
  textarea:     { height: 80, textAlignVertical: 'top' },
  pickerWrap:   { borderWidth: 1, borderRadius: radius.sm, marginBottom: 4, maxHeight: 150 },
  pickerItem:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.08)' },
  submitBtn:    { borderRadius: radius.md, padding: 14, alignItems: 'center', marginTop: spacing.md },
  submitText:   { color: '#fff', fontWeight: '700', fontSize: 15 },
});
