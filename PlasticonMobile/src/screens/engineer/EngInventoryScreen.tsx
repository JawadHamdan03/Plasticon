import React, { useCallback, useEffect, useState } from 'react';
import {
import { useLocale } from '../../context/LocaleContext';
  ActivityIndicator, Alert, FlatList, KeyboardAvoidingView,
  Modal, Platform, Pressable, RefreshControl, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { api, uploadForm } from '../../api/client';
import { ScreenHeader, StatCard } from '../../components';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';

interface InventoryItem {
  id: number;
  partName: string;
  quantity: number;
  imagePath?: string | null;
  unitPrice?: number | null;
}

interface InventoryReport {
  id: number;
  month: number;
  year: number;
  status: 'DRAFT' | 'SUBMITTED' | 'REVIEWED';
  notes?: string | null;
  submittedAt?: string | null;
  items: InventoryItem[];
}

const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

function StatusBadge({ status }: { status: InventoryReport['status'] }) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const meta: Record<string, { label: string; labelAr: string; color: string }> = {
    DRAFT:     { label: 'Draft',     labelAr: 'مسودة',    color: colors.textMuted },
    SUBMITTED: { label: 'Submitted', labelAr: 'مُرسل',    color: colors.warning },
    REVIEWED:  { label: 'Reviewed',  labelAr: 'مراجَع',   color: colors.success },
  };
  const m = meta[status] ?? meta.DRAFT;
  return (
    <View style={[styles.badge, { backgroundColor: `${m.color}18` }]}>
      <Text style={[styles.badgeText, { color: m.color }]}>{isAr ? m.labelAr : m.label}</Text>
    </View>
  );
}

function AddItemModal({ visible, reportId, onClose, onAdded }: {
  visible: boolean; reportId: number; onClose: () => void; onAdded: () => void;
}) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const [partName, setPartName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (visible) { setPartName(''); setQuantity('1'); setImageUri(null); } }, [visible]);

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', allowsEditing: true, quality: 0.8 });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const submit = async () => {
    if (!partName.trim()) { Alert.alert('مطلوب', 'اسم القطعة مطلوب.'); return; }
    if (!quantity || Number(quantity) < 1) { Alert.alert('مطلوب', 'الكمية يجب أن تكون 1 على الأقل.'); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('partName', partName.trim());
      fd.append('quantity', String(Number(quantity)));
      if (imageUri) fd.append('image', { uri: imageUri, type: 'image/jpeg', name: 'part.jpg' } as any);
      await uploadForm(`/engineer-inventory/${reportId}/items`, fd);
      onAdded();
    } catch (e: any) {
      Alert.alert('خطأ', e?.message ?? ('فشل إضافة القطعة.'));
    } finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={styles.overlayBg} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <Text style={[styles.sheetTitle, { color: colors.text }]}>{'إضافة قطعة'}</Text>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{'اسم القطعة *'}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }]}
              value={partName} onChangeText={setPartName}
              placeholder={'مثال: Bearing 6205'}
              placeholderTextColor={colors.textMuted}
            />
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{'الكمية *'}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }]}
              value={quantity} onChangeText={setQuantity}
              placeholder="1" placeholderTextColor={colors.textMuted} keyboardType="numeric"
            />
            <TouchableOpacity style={[styles.photoBtn, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]} onPress={pickPhoto}>
              <Ionicons name={imageUri ? 'image' : 'camera-outline'} size={18} color={imageUri ? colors.success : colors.primary} />
              <Text style={[styles.photoBtnText, { color: imageUri ? colors.success : colors.primary }]}>
                {imageUri ? ('صورة محددة ✓') : ('إضافة صورة (اختياري)')}
              </Text>
            </TouchableOpacity>
          </ScrollView>
          <View style={styles.sheetActions}>
            <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={onClose}>
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>{'إلغاء'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]} onPress={submit} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>{'إضافة'}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function NewReportModal({ visible, onClose, onCreated }: {
  visible: boolean; onClose: () => void; onCreated: () => void;
}) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear]   = useState(now.getFullYear());
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (visible) { setMonth(now.getMonth() + 1); setYear(now.getFullYear()); setNotes(''); } }, [visible]);

  const submit = async () => {
    setSaving(true);
    try {
      await api.post('/engineer-inventory', { month, year, notes: notes.trim() || undefined });
      onCreated();
    } catch (e: any) {
      Alert.alert('خطأ', e?.message ?? ('فشل الإنشاء.'));
    } finally { setSaving(false); }
  };

  const months = isAr ? MONTHS_AR : MONTHS_EN;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={styles.overlayBg} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <Text style={[styles.sheetTitle, { color: colors.text }]}>{'تقرير جرد جديد'}</Text>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{'الشهر *'}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
              {months.map((m, i) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.monthChip, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }, month === i + 1 && { borderColor: colors.primary, backgroundColor: `${colors.primary}18` }]}
                  onPress={() => setMonth(i + 1)}
                >
                  <Text style={[styles.monthChipText, { color: colors.textSecondary }, month === i + 1 && { color: colors.primary }]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{'السنة *'}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }]}
              value={String(year)} onChangeText={(v) => setYear(Number(v) || now.getFullYear())}
              keyboardType="numeric" placeholderTextColor={colors.textMuted}
            />
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{'ملاحظات'}</Text>
            <TextInput
              style={[styles.input, styles.inputMulti, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }]}
              value={notes} onChangeText={setNotes}
              placeholder={'ملاحظات اختيارية'}
              placeholderTextColor={colors.textMuted} multiline textAlignVertical="top"
            />
          </ScrollView>
          <View style={styles.sheetActions}>
            <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={onClose}>
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>{'إلغاء'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]} onPress={submit} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>{'إنشاء'}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ReportCard({ report, onReload }: { report: InventoryReport; onReload: () => void }) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const [expanded, setExpanded]   = useState(false);
  const [addItem, setAddItem]     = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const months = isAr ? MONTHS_AR : MONTHS_EN;
  const isDraft = report.status === 'DRAFT';

  const handleSubmit = () => {
    if (report.items.length === 0) {
      Alert.alert('تنبيه', 'أضف قطعة واحدة على الأقل قبل الإرسال.');
      return;
    }
    Alert.alert(
      'إرسال التقرير',
      isAr ? 'هل أنت متأكد؟ لا يمكن التراجع.' : `Submit inventory for ${months[report.month - 1]} ${report.year}? This cannot be undone.`,
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'إرسال', style: 'destructive', onPress: () => void doSubmit() },
      ],
    );
  };

  const doSubmit = async () => {
    setSubmitting(true);
    try {
      await api.patch(`/engineer-inventory/${report.id}/submit`, {});
      onReload();
    } catch (e: any) {
      Alert.alert('خطأ', e?.message ?? ('فشل الإرسال.'));
    } finally { setSubmitting(false); }
  };

  const deleteItem = (item: InventoryItem) => {
    Alert.alert(
      'حذف القطعة',
      `"${item.partName}"?`,
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'حذف', style: 'destructive', onPress: () => void doDeleteItem(item.id) },
      ],
    );
  };

  const doDeleteItem = async (id: number) => {
    try {
      await api.delete(`/engineer-inventory/items/${id}`);
      onReload();
    } catch (e: any) {
      Alert.alert('خطأ', e?.message ?? ('فشل الحذف.'));
    }
  };

  return (
    <View style={[styles.reportCard, { backgroundColor: colors.surface }]}>
      <TouchableOpacity style={styles.reportHeader} onPress={() => setExpanded((v) => !v)} activeOpacity={0.75}>
        <View style={styles.reportHeaderLeft}>
          <Text style={[styles.reportMonth, { color: colors.text }]}>{months[report.month - 1]} {report.year}</Text>
          <Text style={[styles.reportSub, { color: colors.textMuted }]}>{report.items.length} {'قطعة'}</Text>
        </View>
        <View style={styles.reportHeaderRight}>
          <StatusBadge status={report.status} />
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={[styles.reportBody, { borderTopColor: colors.border }]}>
          {report.notes ? <Text style={[styles.reportNotes, { color: colors.textMuted }]}>{report.notes}</Text> : null}

          {report.items.map((item) => (
            <View key={item.id} style={[styles.itemRow, { borderBottomColor: colors.border }]}>
              <View style={[styles.itemIcon, { backgroundColor: `${colors.primary}15` }]}>
                <Ionicons name="cube-outline" size={16} color={colors.primary} />
              </View>
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, { color: colors.text }]}>{item.partName}</Text>
                {item.unitPrice ? <Text style={[styles.itemSub, { color: colors.textMuted }]}>${item.unitPrice}</Text> : null}
              </View>
              <Text style={[styles.itemQty, { color: colors.primary }]}>×{item.quantity}</Text>
              {isDraft && (
                <TouchableOpacity onPress={() => deleteItem(item)} hitSlop={8} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={16} color={colors.danger} />
                </TouchableOpacity>
              )}
            </View>
          ))}

          {isDraft && (
            <View style={styles.reportActions}>
              <TouchableOpacity style={[styles.addItemBtn, { borderColor: colors.primary }]} onPress={() => setAddItem(true)}>
                <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
                <Text style={[styles.addItemText, { color: colors.primary }]}>{'إضافة قطعة'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: colors.success }, submitting && { opacity: 0.6 }]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <>
                      <Ionicons name="send" size={14} color="#fff" />
                      <Text style={styles.submitBtnText}>{'إرسال'}</Text>
                    </>}
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      <AddItemModal
        visible={addItem}
        reportId={report.id}
        onClose={() => setAddItem(false)}
        onAdded={() => { setAddItem(false); onReload(); }}
      />
    </View>
  );
}

export function EngInventoryScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const [reports, setReports]       = useState<InventoryReport[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newModal, setNewModal]     = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<InventoryReport[]>('/engineer-inventory/mine');
      setReports(Array.isArray(res) ? res : []);
    } catch (e: any) {
      Alert.alert('خطأ', e?.message ?? ('فشل التحميل.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAr]);

  useEffect(() => { void load(); }, [load]);

  const draftCount     = reports.filter((r) => r.status === 'DRAFT').length;
  const submittedCount = reports.filter((r) => r.status === 'SUBMITTED').length;
  const reviewedCount  = reports.filter((r) => r.status === 'REVIEWED').length;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={'جرد المهندس'} subtitle={`${reports.length} ${'تقرير'}`} showBack />
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(r) => String(r.id)}
          renderItem={({ item }) => <ReportCard report={item} onReload={() => { setRefreshing(true); void load(); }} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListHeaderComponent={
            <View style={styles.statsRow}>
              <StatCard label={'مسودة'}     value={String(draftCount)}     icon="create-outline"         color={colors.textMuted} style={styles.stat} />
              <StatCard label={'مُرسل'} value={String(submittedCount)} icon="send-outline"           color={colors.warning}   style={styles.stat} />
              <StatCard label={'مراجَع'} value={String(reviewedCount)}  icon="checkmark-circle-outline" color={colors.success} style={styles.stat} />
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="folder-open-outline" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>{'لا توجد تقارير جرد'}</Text>
              <Text style={[styles.emptyHint, { color: colors.textMuted }]}>{'اضغط + لإنشاء تقرير'}</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity style={[styles.fab, { backgroundColor: colors.primary }]} onPress={() => setNewModal(true)} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <NewReportModal visible={newModal} onClose={() => setNewModal(false)} onCreated={() => { setNewModal(false); setLoading(true); void load(); }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:     { flex: 1 },
  center:   { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:     { padding: spacing.md, paddingBottom: 100 },
  statsRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md },
  stat:     { flex: 1 },

  reportCard:        { borderRadius: radius.lg, marginBottom: spacing.sm, overflow: 'hidden', ...shadow.sm },
  reportHeader:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  reportHeaderLeft:  { flex: 1 },
  reportHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  reportMonth:       { ...typography.h4 },
  reportSub:         { ...typography.caption, marginTop: 2 },
  badge:             { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  badgeText:         { fontSize: 10, fontWeight: '700' },
  reportBody:        { borderTopWidth: 1, padding: spacing.md },
  reportNotes:       { ...typography.bodySmall, fontStyle: 'italic', marginBottom: spacing.sm },

  itemRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: spacing.sm },
  itemIcon:   { width: 32, height: 32, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  itemInfo:   { flex: 1 },
  itemName:   { ...typography.body, fontWeight: '600' },
  itemSub:    { ...typography.caption, marginTop: 1 },
  itemQty:    { fontSize: 16, fontWeight: '800', minWidth: 32, textAlign: 'right' },
  deleteBtn:  { padding: 4 },

  reportActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, alignItems: 'center' },
  addItemBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderRadius: radius.md, paddingVertical: 10 },
  addItemText:   { fontSize: 13, fontWeight: '700' },
  submitBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: radius.md, paddingVertical: 10 },
  submitBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  empty:     { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText: { ...typography.body, fontWeight: '600' },
  emptyHint: { ...typography.caption },

  fab: { position: 'absolute', bottom: 28, right: 24, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', ...shadow.lg },

  overlay:   { flex: 1, justifyContent: 'flex-end' },
  overlayBg: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:     { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: 40, maxHeight: '85%' },
  handle:    { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  sheetTitle: { ...typography.h3, textAlign: 'center', marginBottom: spacing.lg },
  fieldLabel: { ...typography.caption, marginBottom: 6, marginTop: spacing.sm },
  input:      { borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: 11, ...typography.body, marginBottom: 4 },
  inputMulti: { height: 72, textAlignVertical: 'top' },
  photoBtn:   { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 11, marginVertical: spacing.sm },
  photoBtnText: { fontSize: 14, fontWeight: '600' },
  monthChip:  { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1.5, marginRight: spacing.sm },
  monthChipText: { fontSize: 12, fontWeight: '600' },
  sheetActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: radius.md, borderWidth: 1.5, alignItems: 'center' },
  cancelText: { ...typography.body, fontWeight: '600' },
  saveBtn:   { flex: 2, paddingVertical: 13, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  saveText:  { ...typography.body, fontWeight: '700', color: '#fff' },
});
