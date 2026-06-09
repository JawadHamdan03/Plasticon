import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, KeyboardAvoidingView,
  Modal, Platform, RefreshControl, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader, StatCard } from '../../components';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MaintenanceRecord {
  id: number;
  machine?: { name: string } | null;
  reportText?: string | null;
  downtimeReason?: string | null;
  createdAt: string;
}

interface CostRecord {
  id: number;
  maintenanceId?: number | null;
  maintenance?: { machine?: { name: string } | null } | null;
  laborHours?: number | null;
  laborCostPerHour?: number | null;
  laborTotal?: number | null;
  sparesTotal?: number | null;
  totalCost?: number | null;
  notes?: string | null;
  createdAt: string;
  createdBy?: { fullName: string } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) { return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtDate(d: string) { return new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }); }

// ─── Card ─────────────────────────────────────────────────────────────────────

function CostCard({ item, onEdit, onDelete }: { item: CostRecord; onEdit: (i: CostRecord) => void; onDelete: (id: number) => void }) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const total = item.totalCost ?? 0;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <Text style={[styles.machine, { color: colors.text }]} numberOfLines={1}>
            {item.maintenance?.machine?.name ?? `Record #${item.id}`}
          </Text>
          <Text style={[styles.date, { color: colors.textMuted }]}>{fmtDate(item.createdAt)}</Text>
        </View>
        <Text style={[styles.amount, { color: colors.danger }]}>${fmt(total)}</Text>
        <View style={styles.cardActions}>
          <TouchableOpacity onPress={() => onEdit(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="pencil-outline" size={17} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onDelete(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="trash-outline" size={17} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </View>

      {(item.laborHours != null || item.sparesTotal != null) && (
        <View style={[styles.breakdown, { borderTopColor: colors.border }]}>
          {item.laborHours != null && (
            <View style={styles.bItem}>
              <Text style={[styles.bLabel, { color: colors.textMuted }]}>{isAr ? 'عمل' : 'Labor'}</Text>
              <Text style={[styles.bVal, { color: colors.text }]}>${fmt(item.laborTotal ?? 0)}</Text>
            </View>
          )}
          {item.sparesTotal != null && (
            <View style={styles.bItem}>
              <Text style={[styles.bLabel, { color: colors.textMuted }]}>{isAr ? 'قطع غيار' : 'Spares'}</Text>
              <Text style={[styles.bVal, { color: colors.text }]}>${fmt(item.sparesTotal)}</Text>
            </View>
          )}
          {item.laborHours != null && (
            <View style={styles.bItem}>
              <Text style={[styles.bLabel, { color: colors.textMuted }]}>{isAr ? 'ساعات' : 'Hours'}</Text>
              <Text style={[styles.bVal, { color: colors.text }]}>{item.laborHours}h</Text>
            </View>
          )}
        </View>
      )}

      {item.notes ? <Text style={[styles.notes, { color: colors.textMuted }]} numberOfLines={2}>{item.notes}</Text> : null}
    </View>
  );
}

// ─── Cost Modal (create + edit) ───────────────────────────────────────────────

function CreateModal({
  visible, onClose, onSuccess, editing,
}: {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editing?: CostRecord | null;
}) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();

  const [records, setRecords]       = useState<MaintenanceRecord[]>([]);
  const [maintenanceId, setMaintenanceId] = useState('');
  const [laborHours, setLaborHours] = useState('');
  const [laborRate, setLaborRate]   = useState('');
  const [sparesTotal, setSparesTotal] = useState('');
  const [notes, setNotes]           = useState('');
  const [saving, setSaving]         = useState(false);

  useEffect(() => {
    if (visible) {
      api.get<any>('/maintenance/all')
        .then(r => setRecords(Array.isArray(r) ? r : (r.records ?? [])))
        .catch(() => {});
      if (editing) {
        setMaintenanceId(editing.maintenanceId ? String(editing.maintenanceId) : '');
        setLaborHours(editing.laborHours != null ? String(editing.laborHours) : '');
        setLaborRate(editing.laborCostPerHour != null ? String(editing.laborCostPerHour) : '');
        setSparesTotal(editing.sparesTotal != null ? String(editing.sparesTotal) : '');
        setNotes(editing.notes ?? '');
      } else {
        setMaintenanceId(''); setLaborHours(''); setLaborRate(''); setSparesTotal(''); setNotes('');
      }
    }
  }, [visible, editing]);

  const laborTotal = (parseFloat(laborHours) || 0) * (parseFloat(laborRate) || 0);
  const totalCost  = laborTotal + (parseFloat(sparesTotal) || 0);

  const reset = () => { setMaintenanceId(''); setLaborHours(''); setLaborRate(''); setSparesTotal(''); setNotes(''); };

  const submit = async () => {
    if (!editing && !maintenanceId) {
      Alert.alert(isAr ? 'مطلوب' : 'Required', isAr ? 'اختر سجل صيانة.' : 'Select a maintenance record.');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/maintenance-costs/${editing.id}`, {
          laborHours:        parseFloat(laborHours)    || 0,
          laborCostPerHour:  parseFloat(laborRate)     || 0,
          sparesTotal:       parseFloat(sparesTotal)   || 0,
          notes: notes.trim() || undefined,
        });
      } else {
        await api.post('/maintenance-costs', {
          maintenanceId: parseInt(maintenanceId, 10),
          laborHours:        parseFloat(laborHours)    || 0,
          laborCostPerHour:  parseFloat(laborRate)     || 0,
          sparesTotal:       parseFloat(sparesTotal)   || 0,
          notes: notes.trim() || undefined,
        });
      }
      reset();
      onSuccess();
    } catch (err: any) {
      Alert.alert(isAr ? 'خطأ' : 'Error', err.message ?? 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <Text style={[styles.sheetTitle, { color: colors.text }]}>
            {editing ? (isAr ? 'تعديل التكلفة' : 'Edit Cost') : (isAr ? 'إضافة تكلفة صيانة' : 'Add Maintenance Cost')}
          </Text>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* Maintenance record selector — only when creating */}
            {!editing && (
              <>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{isAr ? 'سجل الصيانة *' : 'Maintenance Record *'}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
                  {records.slice(0, 20).map(r => (
                    <TouchableOpacity
                      key={r.id}
                      style={[styles.pill, { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
                        maintenanceId === String(r.id) && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                      onPress={() => setMaintenanceId(String(r.id))}
                    >
                      <Text style={[styles.pillText, { color: colors.text }, maintenanceId === String(r.id) && styles.pillTextActive]} numberOfLines={1}>
                        {r.machine?.name ?? `#${r.id}`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            {[
              { label: isAr ? 'ساعات العمل' : 'Labor Hours', val: laborHours, set: setLaborHours },
              { label: isAr ? 'تكلفة الساعة ($)' : 'Cost per Hour ($)', val: laborRate, set: setLaborRate },
              { label: isAr ? 'تكلفة قطع الغيار ($)' : 'Spares Cost ($)', val: sparesTotal, set: setSparesTotal },
            ].map(f => (
              <View key={f.label} style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{f.label}</Text>
                <TextInput
                  style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                  value={f.val} onChangeText={f.set}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            ))}

            {/* Live cost preview */}
            {totalCost > 0 && (
              <View style={[styles.preview, { backgroundColor: `${colors.danger}10`, borderColor: `${colors.danger}30` }]}>
                <View style={styles.previewRow}>
                  <Text style={[styles.previewLabel, { color: colors.textMuted }]}>{isAr ? 'تكلفة العمل' : 'Labor Total'}</Text>
                  <Text style={[styles.previewVal, { color: colors.text }]}>${fmt(laborTotal)}</Text>
                </View>
                <View style={styles.previewRow}>
                  <Text style={[styles.previewLabel, { color: colors.textMuted }]}>{isAr ? 'قطع الغيار' : 'Spares'}</Text>
                  <Text style={[styles.previewVal, { color: colors.text }]}>${fmt(parseFloat(sparesTotal) || 0)}</Text>
                </View>
                <View style={[styles.previewRow, styles.previewTotal]}>
                  <Text style={[styles.previewLabel, { color: colors.danger, fontWeight: '700' }]}>{isAr ? 'الإجمالي' : 'Total'}</Text>
                  <Text style={[styles.previewVal, { color: colors.danger, fontWeight: '800', fontSize: 16 }]}>${fmt(totalCost)}</Text>
                </View>
              </View>
            )}

            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{isAr ? 'ملاحظات' : 'Notes'}</Text>
              <TextInput
                style={[styles.input, styles.inputMulti, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                multiline numberOfLines={3}
                placeholderTextColor={colors.textMuted}
                value={notes} onChangeText={setNotes}
              />
            </View>

            <View style={styles.actions}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={onClose}>
                <Text style={[styles.cancelText, { color: colors.textMuted }]}>{isAr ? 'إلغاء' : 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]}
                onPress={submit} disabled={saving}
              >
                {saving
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.saveBtnText}>{isAr ? 'حفظ' : 'Save'}</Text>
                }
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function MaintCostsScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();

  const today0 = new Date().toISOString().slice(0, 10);
  const month0 = new Date().toISOString().slice(0, 7) + '-01';
  const [costs, setCosts]           = useState<CostRecord[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal]           = useState(false);
  const [editTarget, setEditTarget] = useState<CostRecord | null>(null);
  const [fromDate, setFromDate]     = useState(month0);
  const [toDate,   setToDate]       = useState(today0);

  const inRange = (d: string) => { const s = d.slice(0, 10); return (!fromDate || s >= fromDate) && (!toDate || s <= toDate); };
  const filteredCosts = useMemo(() => costs.filter(c => inRange(c.createdAt)), [costs, fromDate, toDate]); // eslint-disable-line
  const filteredTotal = useMemo(() => filteredCosts.reduce((s, r) => s + (r.totalCost ?? 0), 0), [filteredCosts]);

  const load = useCallback(async () => {
    try {
      const res = await api.get<any>('/maintenance-costs');
      const records: CostRecord[] = Array.isArray(res) ? res : (res.costs ?? res.data ?? res.items ?? []);
      setCosts(records);
    } catch {
      setCosts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleDelete = (id: number) => {
    Alert.alert(
      isAr ? 'حذف السجل' : 'Delete Record',
      isAr ? 'هل أنت متأكد؟ لا يمكن التراجع.' : 'Delete this cost record? This cannot be undone.',
      [
        { text: isAr ? 'إلغاء' : 'Cancel', style: 'cancel' },
        {
          text: isAr ? 'حذف' : 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/maintenance-costs/${id}`);
              setCosts(prev => prev.filter(c => c.id !== id));
            } catch (e: any) {
              Alert.alert(isAr ? 'خطأ' : 'Error', e.message ?? 'Failed to delete.');
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={isAr ? 'تكاليف الصيانة' : 'Maintenance Costs'} showBack />
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={filteredCosts}
          keyExtractor={(i) => String(i.id)}
          renderItem={({ item }) => (
            <CostCard
              item={item}
              onEdit={(r) => { setEditTarget(r); setModal(true); }}
              onDelete={handleDelete}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListHeaderComponent={
            <>
              <StatCard
                label={isAr ? 'إجمالي تكاليف الصيانة' : 'Total Maintenance Cost'}
                value={`$${fmt(filteredTotal)}`}
                icon="cash"
                color={colors.danger}
                style={styles.totalCard}
              />
              <View style={[styles.filterBar, { backgroundColor: colors.surface }]}>
                <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
                <TextInput
                  style={[styles.filterInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                  value={fromDate} onChangeText={setFromDate}
                  placeholder="From YYYY-MM-DD" placeholderTextColor={colors.textMuted}
                />
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>→</Text>
                <TextInput
                  style={[styles.filterInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                  value={toDate} onChangeText={setToDate}
                  placeholder="To YYYY-MM-DD" placeholderTextColor={colors.textMuted}
                />
                <TouchableOpacity onPress={() => { setFromDate(month0); setToDate(today0); }} style={[styles.filterReset, { borderColor: colors.border }]}>
                  <Ionicons name="refresh-outline" size={13} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="cash-outline" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>{isAr ? 'لا توجد سجلات تكاليف' : 'No cost records'}</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity style={[styles.fab, { backgroundColor: colors.primary }]} onPress={() => { setEditTarget(null); setModal(true); }} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
      <CreateModal
        visible={modal}
        editing={editTarget}
        onClose={() => { setModal(false); setEditTarget(null); }}
        onSuccess={() => { setModal(false); setEditTarget(null); void load(); }}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:      { flex: 1 },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:      { padding: spacing.md, paddingBottom: 100 },
  totalCard: { marginBottom: spacing.md },

  card:        { borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardLeft:    { flex: 1, marginRight: spacing.sm },
  cardActions: { flexDirection: 'row', gap: 10, alignItems: 'center', marginLeft: spacing.sm },
  machine: { ...typography.h4 },
  date:    { ...typography.caption, marginTop: 2 },
  amount:  { fontSize: 20, fontWeight: '800' },
  breakdown: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: spacing.sm, borderTopWidth: 1, marginBottom: spacing.sm },
  bItem:   { alignItems: 'center' },
  bLabel:  { ...typography.caption },
  bVal:    { ...typography.h4 },
  notes:   { ...typography.bodySmall, fontStyle: 'italic' },

  filterBar:   { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.sm, paddingVertical: 8, borderRadius: radius.md, marginBottom: spacing.sm },
  filterInput: { flex: 1, borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, fontSize: 13 },
  filterReset: { width: 30, height: 30, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },

  empty:    { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText:{ ...typography.bodySmall },
  fab:      { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', ...shadow.lg },

  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:   { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: 40, maxHeight: '92%' },
  handle:  { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  sheetTitle: { ...typography.h2, marginBottom: spacing.md },
  field:   { marginBottom: spacing.md },
  fieldLabel: { ...typography.caption, marginBottom: 6 },
  input:   { borderWidth: 1.5, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 11, fontSize: 15 },
  inputMulti: { height: 80, textAlignVertical: 'top' },
  pill:    { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1.5, marginRight: spacing.sm },
  pillText: { fontSize: 13, fontWeight: '600' },
  pillTextActive: { color: '#fff' },
  preview: { borderRadius: radius.md, borderWidth: 1, padding: spacing.md, marginBottom: spacing.md },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  previewTotal: { borderTopWidth: 1, marginTop: 4, paddingTop: 8 },
  previewLabel: { ...typography.body },
  previewVal:   { ...typography.body, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: radius.md, borderWidth: 1.5, alignItems: 'center' },
  cancelText: { ...typography.body, fontWeight: '600' },
  saveBtn:   { flex: 2, paddingVertical: 13, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { ...typography.body, fontWeight: '700', color: '#fff' },
});
