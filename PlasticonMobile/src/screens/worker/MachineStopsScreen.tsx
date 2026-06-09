import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, KeyboardAvoidingView,
  Modal, Platform, RefreshControl, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

type Priority = 'CRITICAL' | 'HIGH' | 'NORMAL';

interface StopAlert {
  id: number;
  machine_label: string;
  priority: Priority;
  reason: string;
  started_at: string;
  resolved_at?: string | null;
  response_minutes?: number | null;
  created_at: string;
}

interface Machine { id: number; name: string; }

const PRIORITY_COLOR: Record<Priority, string> = {
  CRITICAL: '#EF4444',
  HIGH:     '#F97316',
  NORMAL:   '#EAB308',
};

const PRIORITY_ICON: Record<Priority, string> = {
  CRITICAL: 'alert-circle',
  HIGH:     'warning',
  NORMAL:   'information-circle',
};

function elapsedLabel(isoStart: string, isAr: boolean) {
  const mins = Math.floor((Date.now() - new Date(isoStart).getTime()) / 60000);
  if (mins < 60) return `${mins} ${isAr ? 'د' : 'min'}`;
  const hrs = Math.floor(mins / 60);
  return `${hrs} ${isAr ? 'س' : 'h'} ${mins % 60} ${isAr ? 'د' : 'm'}`;
}

export function MachineStopsScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const today0 = new Date().toISOString().slice(0, 10);
  const month0 = new Date().toISOString().slice(0, 7) + '-01';
  const [fromDate, setFromDate] = useState(month0);
  const [toDate,   setToDate]   = useState(today0);
  const [stops, setStops]         = useState<StopAlert[]>([]);
  const [machines, setMachines]   = useState<Machine[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal]         = useState(false);
  const [machineId, setMachineId] = useState('');
  const [priority, setPriority]   = useState<Priority>('NORMAL');
  const [reason, setReason]       = useState('');
  const [saving, setSaving]       = useState(false);

  const load = useCallback(async () => {
    try {
      const [stopsRes, machRes] = await Promise.allSettled([
        api.get<StopAlert[]>('/worker-tools/machine-stop-alerts/mine'),
        api.get<Machine[]>('/machines'),
      ]);
      if (stopsRes.status === 'fulfilled') {
        const d = stopsRes.value;
        setStops(Array.isArray(d) ? d : []);
      }
      if (machRes.status === 'fulfilled') {
        const d = machRes.value;
        setMachines(Array.isArray(d) ? d : []);
      }
    } catch { /* keep */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleClose = () => {
    setModal(false); setReason(''); setMachineId(''); setPriority('NORMAL');
  };

  const submit = async () => {
    if (!reason.trim()) {
      Alert.alert(isAr ? 'مطلوب' : 'Required', isAr ? 'اشرح سبب التوقف' : 'Describe the stop reason');
      return;
    }
    const selectedMachine = machines.find(m => String(m.id) === machineId);
    const label = selectedMachine?.name ?? (isAr ? 'آلة غير محددة' : 'Unspecified Machine');

    setSaving(true);
    try {
      await api.post('/worker-tools/machine-stop-alerts', {
        machineLabel: label,
        priority,
        reason: reason.trim(),
      });
      handleClose();
      setLoading(true);
      void load();
    } catch (e: any) {
      Alert.alert(isAr ? 'خطأ' : 'Error', e.message ?? (isAr ? 'فشل الإبلاغ' : 'Failed to report'));
    } finally {
      setSaving(false);
    }
  };

  const handleResolve = (stop: StopAlert) => {
    Alert.alert(
      isAr ? 'تأكيد الحل' : 'Confirm Resolve',
      isAr ? 'هل تم حل مشكلة هذه الآلة؟' : 'Has this machine stop been resolved?',
      [
        { text: isAr ? 'إلغاء' : 'Cancel', style: 'cancel' },
        {
          text: isAr ? 'نعم، تم الحل' : 'Yes, Resolved',
          onPress: async () => {
            try {
              await api.patch(`/worker-tools/machine-stop-alerts/${stop.id}/resolve`, {});
              void load();
            } catch (e: any) {
              Alert.alert(isAr ? 'خطأ' : 'Error', e.message ?? 'Failed');
            }
          },
        },
      ],
    );
  };

  const handleDelete = (stop: StopAlert) => {
    Alert.alert(
      isAr ? 'حذف التنبيه' : 'Delete Alert',
      isAr ? 'هل أنت متأكد من الحذف؟' : 'Are you sure you want to delete this alert?',
      [
        { text: isAr ? 'إلغاء' : 'Cancel', style: 'cancel' },
        {
          text: isAr ? 'حذف' : 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/worker-tools/entries/stops/${stop.id}`);
              setStops((prev) => prev.filter((s) => s.id !== stop.id));
            } catch (e: any) {
              Alert.alert(isAr ? 'خطأ' : 'Error', e.message ?? 'Failed');
            }
          },
        },
      ],
    );
  };

  const inRange = (d: string) => {
    const s = d.slice(0, 10);
    return (!fromDate || s >= fromDate) && (!toDate || s <= toDate);
  };

  const filteredStops = useMemo(() => stops.filter(s => inRange(s.created_at)), [stops, fromDate, toDate]);

  const openCount = stops.filter(s => !s.resolved_at).length;

  const renderStop = ({ item }: { item: StopAlert }) => {
    const pColor = PRIORITY_COLOR[item.priority] ?? colors.warning;
    const resolved = !!item.resolved_at;
    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderLeftColor: pColor }]}>
        <View style={styles.cardTop}>
          <View style={[styles.priorityBadge, { backgroundColor: pColor + '20' }]}>
            <Ionicons name={PRIORITY_ICON[item.priority] as any} size={13} color={pColor} />
            <Text style={[styles.priorityText, { color: pColor }]}>{item.priority}</Text>
          </View>
          {resolved ? (
            <View style={[styles.resolvedBadge, { backgroundColor: colors.success + '20' }]}>
              <Ionicons name="checkmark-circle" size={13} color={colors.success} />
              <Text style={[styles.resolvedText, { color: colors.success }]}>
                {isAr ? 'تم الحل' : 'Resolved'}
                {item.response_minutes != null ? ` (${Math.round(item.response_minutes)} ${isAr ? 'د' : 'min'})` : ''}
              </Text>
            </View>
          ) : (
            <View style={[styles.openBadge, { backgroundColor: pColor + '15' }]}>
              <Ionicons name="time-outline" size={12} color={pColor} />
              <Text style={[styles.openText, { color: pColor }]}>{elapsedLabel(item.started_at, isAr)}</Text>
            </View>
          )}
        </View>

        <Text style={[styles.machineLabel, { color: colors.text }]}>{item.machine_label}</Text>
        <Text style={[styles.reasonText, { color: colors.textMuted }]}>{item.reason}</Text>

        <View style={styles.cardFooter}>
          <Text style={[styles.timeText, { color: colors.textMuted }]}>
            {new Date(item.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            {!resolved && (
              <TouchableOpacity
                style={[styles.resolveBtn, { backgroundColor: colors.success + '15', borderColor: colors.success }]}
                onPress={() => handleResolve(item)}
                activeOpacity={0.7}
              >
                <Ionicons name="checkmark" size={14} color={colors.success} />
                <Text style={[styles.resolveBtnText, { color: colors.success }]}>{isAr ? 'حُل' : 'Resolve'}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={8}>
              <Ionicons name="trash-outline" size={16} color={colors.danger} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title={isAr ? 'توقفات الآلات' : 'Machine Stops'}
        subtitle={`${openCount} ${isAr ? 'مفتوح' : 'open'}`}
        showBack
      />

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.danger} /></View>
      ) : (
        <FlatList
          data={filteredStops}
          keyExtractor={(item, idx) => `${item.id}-${idx}`}
          renderItem={renderStop}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.danger} />
          }
          ListHeaderComponent={
            <>
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
              <TouchableOpacity
                style={[styles.reportBtn, { backgroundColor: colors.danger }]}
                onPress={() => setModal(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="warning" size={18} color="#fff" />
                <Text style={styles.reportBtnText}>{isAr ? 'الإبلاغ عن توقف آلة' : 'Report Machine Stop'}</Text>
              </TouchableOpacity>
            </>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="checkmark-circle-outline" size={44} color={colors.success} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {isAr ? 'لا توجد توقفات مسجلة' : 'No stops reported'}
              </Text>
            </View>
          }
        />
      )}

      {/* ── Report Modal ── */}
      <Modal visible={modal} transparent animationType="slide" onRequestClose={handleClose}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={[styles.sheetTitle, { color: colors.text }]}>
                {isAr ? 'الإبلاغ عن توقف آلة' : 'Report Machine Stop'}
              </Text>

              {/* Priority */}
              <Text style={[styles.label, { color: colors.textMuted }]}>{isAr ? 'الأولوية *' : 'Priority *'}</Text>
              <View style={styles.priorityRow}>
                {(['CRITICAL', 'HIGH', 'NORMAL'] as Priority[]).map(p => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.priorityChip,
                      { borderColor: PRIORITY_COLOR[p] },
                      priority === p && { backgroundColor: PRIORITY_COLOR[p] },
                    ]}
                    onPress={() => setPriority(p)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.priorityChipText, { color: priority === p ? '#fff' : PRIORITY_COLOR[p] }]}>
                      {p === 'CRITICAL' ? (isAr ? 'حرج' : 'Critical') : p === 'HIGH' ? (isAr ? 'عالٍ' : 'High') : (isAr ? 'عادي' : 'Normal')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Machine picker */}
              {machines.length > 0 && (
                <>
                  <Text style={[styles.label, { color: colors.textMuted }]}>{isAr ? 'الآلة' : 'Machine'}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
                    <TouchableOpacity
                      style={[styles.chip, { borderColor: colors.border }, machineId === '' && { backgroundColor: colors.border }]}
                      onPress={() => setMachineId('')}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.chipText, { color: colors.textMuted }]}>{isAr ? 'غير محدد' : 'Unspecified'}</Text>
                    </TouchableOpacity>
                    {machines.map(m => (
                      <TouchableOpacity
                        key={m.id}
                        style={[styles.chip, { borderColor: colors.border }, machineId === String(m.id) && { backgroundColor: colors.danger, borderColor: colors.danger }]}
                        onPress={() => setMachineId(String(m.id))}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.chipText, { color: machineId === String(m.id) ? '#fff' : colors.text }]}>{m.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}

              {/* Reason */}
              <Text style={[styles.label, { color: colors.textMuted }]}>{isAr ? 'سبب التوقف *' : 'Stop Reason *'}</Text>
              <TextInput
                style={[styles.input, styles.inputMulti, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                placeholder={isAr ? 'اشرح بالتفصيل سبب توقف الآلة…' : 'Describe in detail why the machine stopped…'}
                placeholderTextColor={colors.textMuted}
                value={reason}
                onChangeText={setReason}
                multiline
                numberOfLines={4}
              />

            </ScrollView>
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: colors.border }]}
                onPress={handleClose}
              >
                <Text style={[styles.cancelText, { color: colors.textMuted }]}>{isAr ? 'إلغاء' : 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: colors.danger }]}
                onPress={submit}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.submitText}>{isAr ? 'إبلاغ' : 'Report'}</Text>
                }
              </TouchableOpacity>
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
  list:   { padding: spacing.md, paddingBottom: 40 },

  reportBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: radius.lg, paddingVertical: 13, marginBottom: spacing.md },
  reportBtnText: { ...typography.bodySmall, fontWeight: '700', color: '#fff' },

  empty:     { alignItems: 'center', paddingVertical: 60, gap: spacing.sm },
  emptyText: { ...typography.bodySmall },

  card:        { borderRadius: radius.lg, padding: spacing.md, borderLeftWidth: 3, marginBottom: spacing.sm, ...shadow.sm },
  cardTop:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  priorityBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  priorityText:  { fontSize: 10, fontWeight: '800' },
  resolvedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  resolvedText:  { fontSize: 10, fontWeight: '700' },
  openBadge:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  openText:      { fontSize: 10, fontWeight: '700' },

  machineLabel: { ...typography.h4, marginBottom: 3 },
  reasonText:   { ...typography.bodySmall, marginBottom: 6 },
  cardFooter:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timeText:     { ...typography.caption },
  resolveBtn:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, borderWidth: 1 },
  resolveBtnText: { fontSize: 11, fontWeight: '700' },

  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: spacing.lg, paddingBottom: spacing.md, maxHeight: '90%', flexShrink: 1,
  },
  handle:     { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  sheetTitle: { ...typography.h2, marginBottom: spacing.md },
  label:      { ...typography.caption, marginBottom: 6, marginTop: 4 },

  priorityRow:  { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  priorityChip: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: radius.md, borderWidth: 1.5 },
  priorityChipText: { fontSize: 12, fontWeight: '700' },

  chipScroll: { flexDirection: 'row', gap: spacing.sm, paddingBottom: spacing.md },
  chip:       { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 99, borderWidth: 1.5 },
  chipText:   { fontSize: 13, fontWeight: '600' },

  input:      { borderWidth: 1.5, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 11, fontSize: 15, marginBottom: spacing.md },
  inputMulti: { height: 100, textAlignVertical: 'top' },
  actions:    { flexDirection: 'row', gap: spacing.sm },
  cancelBtn:  { flex: 1, alignItems: 'center', paddingVertical: 13, borderRadius: radius.md, borderWidth: 1.5 },
  cancelText: { fontWeight: '700' },
  submitBtn:  { flex: 1, alignItems: 'center', paddingVertical: 13, borderRadius: radius.md },
  submitText: { fontWeight: '700', color: '#fff' },
  filterBar:   { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 10, marginBottom: 8 },
  filterInput: { flex: 1, borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, fontSize: 13 },
  filterReset: { width: 30, height: 30, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
