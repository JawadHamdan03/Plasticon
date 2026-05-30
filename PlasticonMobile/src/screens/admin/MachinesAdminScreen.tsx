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
import { ScreenHeader, StatCard } from '../../components';
import { colors, radius, shadow, spacing, typography } from '../../theme';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface Machine {
  id: number;
  name: string;
  type?: string;
  status?: string;
  location?: string;
  serialNumber?: string;
  lastMaintenance?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUSES = ['OPERATIONAL', 'UNDER_MAINTENANCE', 'BROKEN', 'OFFLINE', 'DECOMMISSIONED'] as const;
type MachineStatus = typeof STATUSES[number];

const STATUS_META: Record<string, { color: string; icon: string }> = {
  OPERATIONAL:      { color: colors.success, icon: 'checkmark-circle' },
  UNDER_MAINTENANCE: { color: colors.warning, icon: 'construct' },
  BROKEN:           { color: colors.danger,  icon: 'close-circle' },
  OFFLINE:          { color: colors.textMuted, icon: 'pause-circle' },
  DECOMMISSIONED:   { color: '#6B7280', icon: 'archive' },
};

const STATUS_LABELS: Record<string, string> = {
  OPERATIONAL:       'Operational',
  UNDER_MAINTENANCE: 'Maintenance',
  BROKEN:            'Broken',
  OFFLINE:           'Offline',
  DECOMMISSIONED:    'Decommissioned',
};

// ─── Machine Form Modal ───────────────────────────────────────────────────────

interface FormModalProps {
  machine: Machine | null; // null = create mode
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function FormModal({ machine, visible, onClose, onSaved }: FormModalProps) {
  const isEdit = machine !== null;

  const [name, setName]     = useState('');
  const [type, setType]     = useState('');
  const [status, setStatus] = useState<MachineStatus>('OPERATIONAL');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (machine) {
      setName(machine.name ?? '');
      setType(machine.type ?? '');
      setStatus((machine.status as MachineStatus) ?? 'OPERATIONAL');
    } else {
      setName('');
      setType('');
      setStatus('OPERATIONAL');
    }
  }, [machine, visible]);

  async function save() {
    if (!name.trim()) {
      Alert.alert('Validation', 'Machine name is required.');
      return;
    }
    setSaving(true);
    try {
      const body = { name: name.trim(), type: type.trim() || undefined, status };
      if (isEdit && machine) {
        await api.put(`/machines/${machine.id}`, body);
      } else {
        await api.post('/machines', body);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to save machine');
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

          <Text style={styles.sheetTitle}>{isEdit ? 'Edit Machine' : 'New Machine'}</Text>

          {/* Name */}
          <Text style={styles.label}>Name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Extruder A"
            placeholderTextColor={colors.textMuted}
          />

          {/* Type */}
          <Text style={styles.label}>Type</Text>
          <TextInput
            style={styles.input}
            value={type}
            onChangeText={setType}
            placeholder="e.g. Injection Molder"
            placeholderTextColor={colors.textMuted}
          />

          {/* Status picker */}
          <Text style={styles.label}>Status</Text>
          <View style={styles.statusGrid}>
            {STATUSES.map((s) => {
              const meta = STATUS_META[s];
              const active = status === s;
              return (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.statusChip,
                    active && { backgroundColor: `${meta.color}20`, borderColor: meta.color },
                  ]}
                  onPress={() => setStatus(s)}
                  activeOpacity={0.75}
                >
                  <Ionicons name={meta.icon as any} size={13} color={active ? meta.color : colors.textMuted} />
                  <Text style={[styles.statusChipText, active && { color: meta.color }]}>
                    {STATUS_LABELS[s]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={save}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving
              ? <ActivityIndicator size="small" color={colors.textInverse} />
              : <Text style={styles.saveBtnText}>{isEdit ? 'Save Changes' : 'Create Machine'}</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Machine Card ─────────────────────────────────────────────────────────────

interface MachineCardProps {
  item: Machine;
  onEdit: (m: Machine) => void;
  onDelete: (m: Machine) => void;
}

function MachineCard({ item, onEdit, onDelete }: MachineCardProps) {
  const status = item.status ?? 'OPERATIONAL';
  const meta   = STATUS_META[status] ?? STATUS_META.OPERATIONAL;

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={[styles.iconWrap, { backgroundColor: `${meta.color}15` }]}>
          <Ionicons name={meta.icon as any} size={20} color={meta.color} />
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.type}>
            {item.type ?? 'Machine'}{item.location ? ` · ${item.location}` : ''}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: `${meta.color}15` }]}>
          <Text style={[styles.badgeText, { color: meta.color }]}>{STATUS_LABELS[status] ?? status}</Text>
        </View>
      </View>

      {(item.serialNumber || item.lastMaintenance) && (
        <View style={styles.detailRow}>
          {item.serialNumber && (
            <Text style={styles.detail}>SN: <Text style={styles.detailVal}>{item.serialNumber}</Text></Text>
          )}
          {item.lastMaintenance && (
            <Text style={styles.detail}>
              Last maint: <Text style={styles.detailVal}>
                {new Date(item.lastMaintenance).toLocaleDateString([], { month: 'short', day: 'numeric' })}
              </Text>
            </Text>
          )}
        </View>
      )}

      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onEdit(item)} activeOpacity={0.75}>
          <Ionicons name="pencil-outline" size={14} color={colors.primary} />
          <Text style={[styles.actionText, { color: colors.primary }]}>Edit</Text>
        </TouchableOpacity>
        <View style={styles.actionDivider} />
        <TouchableOpacity style={styles.actionBtn} onPress={() => onDelete(item)} activeOpacity={0.75}>
          <Ionicons name="trash-outline" size={14} color={colors.danger} />
          <Text style={[styles.actionText, { color: colors.danger }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function MachinesAdminScreen() {
  const [machines, setMachines]     = useState<Machine[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editTarget, setEditTarget] = useState<Machine | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ machines: Machine[] }>('/machines');
      setMachines(res.machines ?? []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function openCreate() {
    setEditTarget(null);
    setModalVisible(true);
  }

  function openEdit(m: Machine) {
    setEditTarget(m);
    setModalVisible(true);
  }

  function closeModal() {
    setModalVisible(false);
    setEditTarget(null);
  }

  function confirmDelete(m: Machine) {
    Alert.alert(
      'Delete Machine',
      `Are you sure you want to delete "${m.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/machines/${m.id}`);
              void load();
            } catch (err: any) {
              Alert.alert('Error', err?.message ?? 'Failed to delete machine');
            }
          },
        },
      ],
    );
  }

  const operational = machines.filter((m) => m.status === 'OPERATIONAL').length;
  const maintenance = machines.filter((m) => m.status === 'UNDER_MAINTENANCE').length;

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Machines" subtitle={`${machines.length} total`} showBack />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={machines}
          keyExtractor={(i) => String(i.id)}
          renderItem={({ item }) => (
            <MachineCard item={item} onEdit={openEdit} onDelete={confirmDelete} />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); void load(); }}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={
            <View style={styles.statsRow}>
              <StatCard label="Operational" value={String(operational)} icon="checkmark-circle" color={colors.success} style={styles.stat} />
              <StatCard label="Maintenance"  value={String(maintenance)}  icon="construct"        color={colors.warning} style={styles.stat} />
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="hardware-chip-outline" size={44} color={colors.textMuted} />
              <Text style={styles.emptyText}>No machines</Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openCreate} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color={colors.textInverse} />
      </TouchableOpacity>

      <FormModal
        machine={editTarget}
        visible={modalVisible}
        onClose={closeModal}
        onSaved={() => { void load(); }}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: colors.background },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:        { padding: spacing.md, paddingBottom: 100 },
  statsRow:    { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  stat:        { flex: 1 },

  // Card
  card:        { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardTop:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4 },
  iconWrap:    { width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardContent: { flex: 1 },
  name:        { ...typography.h4 },
  type:        { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  badge:       { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  badgeText:   { fontSize: 10, fontWeight: '700' },
  detailRow:   { flexDirection: 'row', gap: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 6, marginTop: 4 },
  detail:      { ...typography.caption },
  detailVal:   { fontWeight: '700', color: colors.text },
  cardActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.sm, paddingTop: spacing.sm },
  actionBtn:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 4 },
  actionText:  { fontSize: 13, fontWeight: '600' },
  actionDivider: { width: 1, backgroundColor: colors.border },

  // FAB
  fab:         { position: 'absolute', bottom: 32, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', ...shadow.md },

  // Modal sheet
  backdrop:    { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheetWrap:   { flex: 1, justifyContent: 'flex-end' },
  sheet:       { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: spacing.xxl, ...shadow.lg },
  handle:      { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.md },
  sheetTitle:  { ...typography.h2, marginBottom: spacing.lg },

  // Form
  label:       { ...typography.sectionLabel, marginBottom: spacing.xs, marginTop: spacing.md },
  input:       { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: Platform.OS === 'ios' ? 12 : 8, fontSize: 15, color: colors.text },
  statusGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: 4 },
  statusChip:  { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surfaceAlt },
  statusChipText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },

  // Buttons
  saveBtn:         { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', marginTop: spacing.lg },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText:     { color: colors.textInverse, fontSize: 15, fontWeight: '700' },
  cancelBtn:       { alignItems: 'center', paddingVertical: 12, marginTop: spacing.sm },
  cancelText:      { ...typography.body, color: colors.textMuted },

  // Empty
  empty:       { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText:   { ...typography.bodySmall, color: colors.textMuted },
});
