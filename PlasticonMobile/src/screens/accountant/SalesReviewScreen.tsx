import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Modal, RefreshControl,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
import { useAuth } from '../../auth/AuthContext';

interface QuotationItem {
  productType: string;
  size: string;
  quantity: number;
  pricePerUnit: number;
}

interface Quotation {
  id: number;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  totalAmount: number;
  notes: string | null;
  rejectionNote: string | null;
  validUntil: string | null;
  createdAt: string;
  customer: { id: number; name: string };
  createdBy: { id: number; fullName: string };
  items: QuotationItem[];
}

const STATUS_COLOR: Record<string, string> = {
  DRAFT:    '#6b7280',
  SENT:     '#3b82f6',
  ACCEPTED: '#10b981',
  REJECTED: '#ef4444',
  EXPIRED:  '#f59e0b',
};

const STATUS_FILTERS = ['ALL', 'SENT', 'ACCEPTED', 'REJECTED', 'DRAFT', 'EXPIRED'];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export function SalesReviewScreen() {
  const { colors } = useAppTheme();
  const { isAr }   = useLocale();
  const { user }   = useAuth();
  const isAccountant = user?.role === 'ACCOUNTANT';

  const [quotations,   setQuotations]   = useState<Quotation[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [expanded,     setExpanded]     = useState<number | null>(null);

  // Reject modal state
  const [rejectId,     setRejectId]     = useState<number | null>(null);
  const [rejectNote,   setRejectNote]   = useState('');
  const [rejectSaving, setRejectSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<any>('/sales-rep/quotations');
      setQuotations(Array.isArray(res) ? res : (res?.data ?? res?.items ?? res?.quotations ?? []));
    } catch {
      setQuotations([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const [changingId, setChangingId] = useState<number | null>(null);

  const changeStatus = async (id: number, status: string, note?: string) => {
    setChangingId(id);
    try {
      await api.patch(`/sales-rep/quotations/${id}/status`, {
        status,
        ...(note ? { rejectionNote: note } : {}),
      });
      void load();
    } catch (err: any) {
      Alert.alert(isAr ? 'خطأ' : 'Error', err.message ?? 'Failed to update');
    } finally {
      setChangingId(null);
    }
  };

  const handleAccept = (id: number) => {
    Alert.alert(
      isAr ? 'تأكيد القبول' : 'Confirm Accept',
      isAr ? 'هل تريد قبول هذا العرض؟' : 'Accept this quotation?',
      [
        { text: isAr ? 'إلغاء' : 'Cancel', style: 'cancel' },
        { text: isAr ? 'قبول' : 'Accept', onPress: () => void changeStatus(id, 'ACCEPTED') },
      ],
    );
  };

  const handleReject = async () => {
    if (rejectId === null) return;
    setRejectSaving(true);
    try {
      await changeStatus(rejectId, 'REJECTED', rejectNote.trim() || undefined);
      setRejectId(null);
      setRejectNote('');
    } finally {
      setRejectSaving(false);
    }
  };

  const visibleQuotations = statusFilter === 'ALL'
    ? quotations
    : quotations.filter((q) => q.status === statusFilter);

  const pendingCount = quotations.filter((q) => q.status === 'SENT').length;

  const renderQuotation = ({ item: q }: { item: Quotation }) => {
    const color      = STATUS_COLOR[q.status] ?? '#6b7280';
    const isExpanded = expanded === q.id;

    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderLeftColor: color }]}>
        {/* Header row */}
        <TouchableOpacity
          style={styles.cardHeader}
          onPress={() => setExpanded(isExpanded ? null : q.id)}
          activeOpacity={0.8}
        >
          <View style={styles.cardHeaderLeft}>
            <Text style={[styles.customerName, { color: colors.text }]}>{q.customer.name}</Text>
            <Text style={[styles.repName, { color: colors.textMuted }]}>
              <Ionicons name="person-outline" size={11} /> {q.createdBy.fullName}
            </Text>
          </View>
          <View style={styles.cardHeaderRight}>
            <View style={[styles.statusBadge, { backgroundColor: `${color}18`, borderColor: `${color}44` }]}>
              <Text style={[styles.statusText, { color }]}>{q.status}</Text>
            </View>
            <Text style={[styles.amount, { color: colors.primary }]}>
              ₪{q.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 0 })}
            </Text>
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={colors.textMuted}
            />
          </View>
        </TouchableOpacity>

        {/* Expanded content */}
        {isExpanded && (
          <View style={styles.cardBody}>
            {/* Items table */}
            {q.items.length > 0 && (
              <View style={[styles.itemsTable, { borderColor: colors.border }]}>
                <View style={[styles.tableHeader, { backgroundColor: colors.surfaceAlt }]}>
                  <Text style={[styles.tableCell, styles.tableCellFlex2, { color: colors.textMuted }]}>{isAr ? 'المنتج' : 'Product'}</Text>
                  <Text style={[styles.tableCell, { color: colors.textMuted }]}>{isAr ? 'الحجم' : 'Size'}</Text>
                  <Text style={[styles.tableCell, styles.tableCellRight, { color: colors.textMuted }]}>{isAr ? 'الكمية' : 'Qty'}</Text>
                  <Text style={[styles.tableCell, styles.tableCellRight, { color: colors.textMuted }]}>{isAr ? 'السعر' : '₪/unit'}</Text>
                </View>
                {q.items.map((item, idx) => (
                  <View key={idx} style={[styles.tableRow, { borderTopColor: colors.border }]}>
                    <Text style={[styles.tableCell, styles.tableCellFlex2, { color: colors.text }]}>{item.productType}</Text>
                    <Text style={[styles.tableCell, { color: colors.text }]}>{item.size}</Text>
                    <Text style={[styles.tableCell, styles.tableCellRight, { color: colors.text }]}>{item.quantity}</Text>
                    <Text style={[styles.tableCell, styles.tableCellRight, { color: colors.text }]}>{item.pricePerUnit}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Notes */}
            {q.notes ? (
              <Text style={[styles.noteLine, { color: colors.textMuted }]}>
                {isAr ? 'ملاحظات: ' : 'Notes: '}{q.notes}
              </Text>
            ) : null}

            {/* Rejection note */}
            {q.rejectionNote ? (
              <View style={[styles.rejectionNote, { backgroundColor: '#ef444410', borderColor: '#ef444430' }]}>
                <Ionicons name="alert-circle-outline" size={13} color="#ef4444" />
                <Text style={[styles.rejectionNoteText, { color: '#dc2626' }]}>
                  {isAr ? 'سبب الرفض: ' : 'Rejection note: '}{q.rejectionNote}
                </Text>
              </View>
            ) : null}

            {q.validUntil ? (
              <Text style={[styles.noteLine, { color: colors.textMuted }]}>
                {isAr ? 'صالح حتى: ' : 'Valid until: '}{fmtDate(q.validUntil)}
              </Text>
            ) : null}
            <Text style={[styles.noteLine, { color: colors.textMuted }]}>{fmtDate(q.createdAt)}</Text>

            {/* Actions — ACCOUNTANT only */}
            {isAccountant && (
              <View style={styles.actions}>
                {q.status !== 'ACCEPTED' && (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#10b981' }]}
                    onPress={() => handleAccept(q.id)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="checkmark-circle-outline" size={15} color="#fff" />
                    <Text style={styles.actionBtnText}>{isAr ? 'قبول' : 'Accept'}</Text>
                  </TouchableOpacity>
                )}
                {q.status !== 'REJECTED' && (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#ef4444' }]}
                    onPress={() => { setRejectId(q.id); setRejectNote(''); }}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="close-circle-outline" size={15} color="#ef4444" />
                    <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>{isAr ? 'رفض' : 'Reject'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title={isAr ? 'مراجعة المندوبين' : 'Sales Review'}
        subtitle={pendingCount > 0 ? `${pendingCount} ${isAr ? 'بانتظار' : 'pending'}` : undefined}
        showBack
      />

      {/* Status filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
        style={[styles.filtersWrap, { borderBottomColor: colors.border }]}
      >
        {STATUS_FILTERS.map((f) => {
          const active = statusFilter === f;
          const color  = f === 'ALL' ? colors.primary : (STATUS_COLOR[f] ?? colors.primary);
          return (
            <TouchableOpacity
              key={f}
              style={[styles.chip, active && { backgroundColor: `${color}18`, borderColor: color }]}
              onPress={() => setStatusFilter(f)}
              activeOpacity={0.75}
            >
              <Text style={[styles.chipText, { color: active ? color : colors.textMuted }]}>
                {f === 'ALL' ? (isAr ? 'الكل' : 'All') : f}
              </Text>
              {f === 'SENT' && pendingCount > 0 && (
                <View style={[styles.chipBadge, { backgroundColor: STATUS_COLOR.SENT }]}>
                  <Text style={styles.chipBadgeText}>{pendingCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={visibleQuotations}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderQuotation}
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
              <Ionicons name="document-text-outline" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {isAr ? 'لا توجد عروض أسعار' : 'No quotations'}
              </Text>
            </View>
          }
        />
      )}

      {/* Reject with note modal */}
      <Modal
        visible={rejectId !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setRejectId(null)}
      >
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <View style={styles.sheetHeader}>
              <Ionicons name="close-circle" size={22} color="#ef4444" />
              <Text style={[styles.sheetTitle, { color: colors.text }]}>
                {isAr ? 'رفض العرض' : 'Reject Quotation'}
              </Text>
            </View>
            <Text style={[styles.sheetSub, { color: colors.textMuted }]}>
              {isAr ? 'أضف ملاحظة للمندوب (اختياري)' : 'Add a note for the sales rep (optional)'}
            </Text>
            <TextInput
              style={[styles.noteInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
              value={rejectNote}
              onChangeText={setRejectNote}
              placeholder={isAr ? 'سبب الرفض...' : 'Reason for rejection...'}
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
            />
            <View style={styles.sheetActions}>
              <TouchableOpacity
                style={[styles.sheetBtn, { borderWidth: 1.5, borderColor: colors.border }]}
                onPress={() => setRejectId(null)}
              >
                <Text style={{ color: colors.textMuted, fontWeight: '600' }}>{isAr ? 'إلغاء' : 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sheetBtn, { flex: 2, backgroundColor: '#ef4444' }]}
                onPress={() => void handleReject()}
                disabled={rejectSaving}
              >
                {rejectSaving
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={{ color: '#fff', fontWeight: '700' }}>{isAr ? 'تأكيد الرفض' : 'Confirm Reject'}</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:   { padding: spacing.md, paddingBottom: 80 },

  filtersWrap: { borderBottomWidth: 1 },
  filters:     { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.xs },
  chip:        { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1, borderColor: 'transparent', flexDirection: 'row', alignItems: 'center', gap: 4 },
  chipText:    { fontSize: 12, fontWeight: '600' },
  chipBadge:   { minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  chipBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  card:       { borderRadius: radius.lg, marginBottom: spacing.sm, ...shadow.sm, borderLeftWidth: 4, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  cardHeaderLeft:  { flex: 1 },
  cardHeaderRight: { alignItems: 'flex-end', gap: 4 },
  customerName: { ...typography.h4 },
  repName:      { ...typography.caption, marginTop: 2 },
  statusBadge:  { borderWidth: 1, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  statusText:   { fontSize: 11, fontWeight: '700' },
  amount:       { fontSize: 15, fontWeight: '800' },

  cardBody: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: spacing.sm },

  itemsTable:      { borderRadius: radius.sm, borderWidth: 1, overflow: 'hidden', marginBottom: spacing.xs },
  tableHeader:     { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: spacing.sm },
  tableRow:        { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: spacing.sm, borderTopWidth: 1 },
  tableCell:       { flex: 1, fontSize: 11, fontWeight: '600' },
  tableCellFlex2:  { flex: 2 },
  tableCellRight:  { textAlign: 'right' },

  noteLine:       { fontSize: 12, fontStyle: 'italic' },
  rejectionNote:  { flexDirection: 'row', alignItems: 'flex-start', gap: 5, borderWidth: 1, borderRadius: radius.sm, padding: spacing.sm },
  rejectionNoteText: { flex: 1, fontSize: 12, fontWeight: '500' },

  actions:    { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  actionBtn:  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9, borderRadius: radius.md },
  actionBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  empty:     { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText: { ...typography.bodySmall },

  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:        { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.md, paddingBottom: 36 },
  sheetHandle:  { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  sheetHeader:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 6 },
  sheetTitle:   { ...typography.h3 },
  sheetSub:     { ...typography.bodySmall, marginBottom: spacing.md },
  noteInput:    { borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, minHeight: 80, textAlignVertical: 'top', marginBottom: spacing.md },
  sheetActions: { flexDirection: 'row', gap: spacing.sm },
  sheetBtn:     { flex: 1, paddingVertical: 12, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
