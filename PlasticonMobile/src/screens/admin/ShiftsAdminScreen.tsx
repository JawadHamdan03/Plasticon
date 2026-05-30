import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
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
import { ScreenHeader } from '../../components';
import { colors, radius, shadow, spacing, typography } from '../../theme';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface Shift {
  id: number;
  name?: string;
  shiftType?: string;
  startTime?: string;
  endTime?: string;
  workers?: { fullName: string }[];
  workerCount?: number;
  date?: string;
  createdAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SHIFT_COLORS: Record<string, string> = {
  MORNING:   colors.warning,
  AFTERNOON: colors.info,
  NIGHT:     '#7C3AED',
  DAY:       colors.success,
};

// ─── Edit Modal ───────────────────────────────────────────────────────────────

interface EditModalProps {
  shift: Shift | null;
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function EditModal({ shift, visible, onClose, onSaved }: EditModalProps) {
  const [name, setName]           = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime]     = useState('');
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    if (shift) {
      setName(shift.name ?? shift.shiftType ?? '');
      setStartTime(shift.startTime ?? '');
      setEndTime(shift.endTime ?? '');
    }
  }, [shift]);

  function validateTime(val: string): boolean {
    return /^\d{2}:\d{2}$/.test(val);
  }

  async function save() {
    if (!name.trim()) {
      Alert.alert('Validation', 'Shift name is required.');
      return;
    }
    if (startTime && !validateTime(startTime)) {
      Alert.alert('Validation', 'Start time must be in HH:MM format (e.g. 06:00).');
      return;
    }
    if (endTime && !validateTime(endTime)) {
      Alert.alert('Validation', 'End time must be in HH:MM format (e.g. 14:00).');
      return;
    }
    if (!shift) return;
    setSaving(true);
    try {
      await api.put(`/shifts/${shift.id}`, {
        name: name.trim(),
        startTime: startTime.trim() || undefined,
        endTime: endTime.trim() || undefined,
      });
      onSaved();
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to update shift');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.sheetWrap}
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <Text style={styles.sheetTitle}>Edit Shift</Text>
          {shift && (
            <Text style={styles.sheetSub}>ID #{shift.id}</Text>
          )}

          {/* Name */}
          <Text style={styles.label}>Name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Morning Shift"
            placeholderTextColor={colors.textMuted}
          />

          {/* Start Time */}
          <Text style={styles.label}>Start Time (HH:MM)</Text>
          <TextInput
            style={styles.input}
            value={startTime}
            onChangeText={setStartTime}
            placeholder="06:00"
            placeholderTextColor={colors.textMuted}
            keyboardType="numbers-and-punctuation"
            maxLength={5}
          />

          {/* End Time */}
          <Text style={styles.label}>End Time (HH:MM)</Text>
          <TextInput
            style={styles.input}
            value={endTime}
            onChangeText={setEndTime}
            placeholder="14:00"
            placeholderTextColor={colors.textMuted}
            keyboardType="numbers-and-punctuation"
            maxLength={5}
          />

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={save}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving
              ? <ActivityIndicator size="small" color={colors.textInverse} />
              : <Text style={styles.saveBtnText}>Save Changes</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Shift Card ───────────────────────────────────────────────────────────────

interface ShiftCardProps {
  item: Shift;
  onEdit: (s: Shift) => void;
}

function ShiftCard({ item, onEdit }: ShiftCardProps) {
  const type  = item.shiftType ?? item.name ?? 'Shift';
  const color = SHIFT_COLORS[type.toUpperCase().split(' ')[0]] ?? colors.primary;
  const count = item.workerCount ?? item.workers?.length ?? 0;

  return (
    <View style={styles.card}>
      <View style={[styles.colorBar, { backgroundColor: color }]} />
      <View style={styles.cardContent}>
        <View style={styles.cardTop}>
          <View style={styles.cardLeft}>
            <Text style={styles.name}>{item.name ?? type}</Text>
            <Text style={styles.time}>
              {item.startTime ?? '—'} – {item.endTime ?? '—'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => onEdit(item)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="pencil-outline" size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.footer}>
          {item.date && (
            <Text style={styles.date}>
              {new Date(item.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
            </Text>
          )}
          {count > 0 && (
            <View style={styles.workers}>
              <Ionicons name="people-outline" size={13} color={colors.textMuted} />
              <Text style={styles.workerCount}>{count} workers</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function ShiftsAdminScreen() {
  const [shifts, setShifts]         = useState<Shift[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editTarget, setEditTarget] = useState<Shift | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<Shift[]>('/shifts?limit=40');
      setShifts(Array.isArray(res) ? res : []);
    } catch (e: any) {
      console.warn('ShiftsAdminScreen load error:', e?.message ?? e);
      Alert.alert('Error', e?.message ?? 'Failed to load shifts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function openEdit(shift: Shift) {
    setEditTarget(shift);
    setModalVisible(true);
  }

  function closeModal() {
    setModalVisible(false);
    setEditTarget(null);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Shifts" subtitle={`${shifts.length} shifts`} showBack />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={shifts}
          keyExtractor={(i) => String(i.id)}
          renderItem={({ item }) => <ShiftCard item={item} onEdit={openEdit} />}
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
              <Ionicons name="time-outline" size={44} color={colors.textMuted} />
              <Text style={styles.emptyText}>No shifts configured</Text>
            </View>
          }
        />
      )}

      <EditModal
        shift={editTarget}
        visible={modalVisible}
        onClose={closeModal}
        onSaved={() => { void load(); }}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: colors.background },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:         { padding: spacing.md, paddingBottom: 40 },

  // Card
  card:         { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.md, marginBottom: spacing.sm, overflow: 'hidden', ...shadow.sm },
  colorBar:     { width: 5 },
  cardContent:  { flex: 1, padding: spacing.md },
  cardTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  cardLeft:     { flex: 1 },
  name:         { ...typography.h4 },
  time:         { ...typography.caption, fontWeight: '700', color: colors.primary, marginTop: 2 },
  footer:       { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  date:         { ...typography.caption, color: colors.textMuted },
  workers:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  workerCount:  { ...typography.caption },
  editBtn:      { padding: 6, borderRadius: radius.sm, backgroundColor: `${colors.primary}10`, marginLeft: spacing.sm },

  // Empty
  empty:        { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText:    { ...typography.bodySmall, color: colors.textMuted },

  // Modal sheet
  backdrop:     { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheetWrap:    { flex: 1, justifyContent: 'flex-end' },
  sheet:        { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: spacing.xxl, ...shadow.lg },
  handle:       { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.md },
  sheetTitle:   { ...typography.h2, marginBottom: 4 },
  sheetSub:     { ...typography.bodySmall, color: colors.textMuted, marginBottom: spacing.lg },

  // Form
  label:        { ...typography.sectionLabel, marginBottom: spacing.xs, marginTop: spacing.md },
  input:        { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: Platform.OS === 'ios' ? 12 : 8, fontSize: 15, color: colors.text },

  // Buttons
  saveBtn:         { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', marginTop: spacing.lg },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText:     { color: colors.textInverse, fontSize: 15, fontWeight: '700' },
  cancelBtn:       { alignItems: 'center', paddingVertical: 12, marginTop: spacing.sm },
  cancelText:      { ...typography.body, color: colors.textMuted },
});
