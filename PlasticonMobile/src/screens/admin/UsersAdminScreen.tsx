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
  ScrollView,
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

interface User {
  id: number;
  fullName: string;
  email: string;
  role?: string;
  isActive?: boolean;
  department?: string;
  shiftId?: number | null;
  createdAt: string;
}

interface Shift {
  id: number;
  name?: string;
  shiftType?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLES = ['WORKER', 'ENGINEER', 'ACCOUNTANT', 'ADMIN'] as const;
type Role = typeof ROLES[number];

const ROLE_COLOR: Record<string, string> = {
  ADMIN:      '#7C3AED',
  ENGINEER:   colors.info,
  ACCOUNTANT: colors.success,
  WORKER:     colors.accent,
};

// ─── Edit Modal ───────────────────────────────────────────────────────────────

interface EditModalProps {
  user: User | null;
  shifts: Shift[];
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function EditModal({ user, shifts, visible, onClose, onSaved }: EditModalProps) {
  const [role, setRole]       = useState<Role>('WORKER');
  const [shiftId, setShiftId] = useState('');
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    if (user) {
      setRole((user.role as Role) ?? 'WORKER');
      setShiftId(user.shiftId != null ? String(user.shiftId) : '');
    }
  }, [user]);

  const needsShift = role === 'WORKER' || role === 'ENGINEER';

  async function save() {
    if (!user) return;
    setSaving(true);
    try {
      const body: { role: string; shiftId?: number | null } = { role };
      if (needsShift) {
        body.shiftId = shiftId.trim() ? Number(shiftId) : null;
      } else {
        body.shiftId = null;
      }
      await api.put(`/users/${user.id}`, body);
      onSaved();
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to update user');
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
          {/* Handle */}
          <View style={styles.handle} />

          <Text style={styles.sheetTitle}>Edit User</Text>
          {user && (
            <Text style={styles.sheetSub}>{user.fullName} · {user.email}</Text>
          )}

          {/* Role picker */}
          <Text style={styles.label}>Role</Text>
          <View style={styles.roleRow}>
            {ROLES.map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.roleChip, role === r && { backgroundColor: ROLE_COLOR[r] ?? colors.primary, borderColor: ROLE_COLOR[r] ?? colors.primary }]}
                onPress={() => setRole(r)}
                activeOpacity={0.75}
              >
                <Text style={[styles.roleChipText, role === r && styles.roleChipTextActive]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Shift input — only for WORKER / ENGINEER */}
          {needsShift && (
            <>
              <Text style={styles.label}>
                Shift{shifts.length > 0 ? ` (${shifts.map((s) => `${s.id}: ${s.name ?? s.shiftType}`).join(', ')})` : ' ID'}
              </Text>
              <TextInput
                style={styles.input}
                value={shiftId}
                onChangeText={setShiftId}
                placeholder="Enter shift ID"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
              />
            </>
          )}

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

// ─── User Card ────────────────────────────────────────────────────────────────

interface UserCardProps {
  item: User;
  onEdit: (u: User) => void;
}

function UserCard({ item, onEdit }: UserCardProps) {
  const roleColor = ROLE_COLOR[item.role ?? ''] ?? colors.textMuted;
  const initials  = item.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <View style={[styles.card, !item.isActive && styles.cardInactive]}>
      <View style={[styles.avatar, { backgroundColor: `${roleColor}20` }]}>
        <Text style={[styles.avatarText, { color: roleColor }]}>{initials}</Text>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.name}>{item.fullName}</Text>
        <Text style={styles.email} numberOfLines={1}>{item.email}</Text>
        {item.department && <Text style={styles.dept}>{item.department}</Text>}
      </View>
      <View style={styles.right}>
        {item.role && (
          <View style={[styles.roleBadge, { backgroundColor: `${roleColor}15` }]}>
            <Text style={[styles.roleText, { color: roleColor }]}>{item.role}</Text>
          </View>
        )}
        {item.isActive === false && (
          <View style={styles.inactiveBadge}>
            <Text style={styles.inactiveText}>Inactive</Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => onEdit(item)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="pencil-outline" size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function UsersAdminScreen() {
  const [users, setUsers]         = useState<User[]>([]);
  const [shifts, setShifts]       = useState<Shift[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const load = useCallback(async () => {
    try {
      const [usersRes, shiftsRes] = await Promise.all([
        api.get<User[]>('/users/all'),
        api.get<Shift[]>('/shifts').catch(() => [] as Shift[]),
      ]);
      setUsers(Array.isArray(usersRes) ? usersRes : []);
      setShifts(Array.isArray(shiftsRes) ? shiftsRes : []);
    } catch (e: any) {
      console.warn('UsersAdminScreen load error:', e?.message ?? e);
      Alert.alert('Error', e?.message ?? 'Failed to load users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function openEdit(user: User) {
    setEditTarget(user);
    setModalVisible(true);
  }

  function closeModal() {
    setModalVisible(false);
    setEditTarget(null);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Users" subtitle={`${users.length} accounts`} showBack />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(i) => String(i.id)}
          renderItem={({ item }) => <UserCard item={item} onEdit={openEdit} />}
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
              <Ionicons name="people-outline" size={44} color={colors.textMuted} />
              <Text style={styles.emptyText}>No users found</Text>
            </View>
          }
        />
      )}

      <EditModal
        user={editTarget}
        shifts={shifts}
        visible={modalVisible}
        onClose={closeModal}
        onSaved={() => { void load(); }}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: colors.background },
  center:          { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:            { padding: spacing.md, paddingBottom: 40 },

  // Card
  card:            { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, gap: spacing.md, ...shadow.sm },
  cardInactive:    { opacity: 0.55 },
  avatar:          { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText:      { fontSize: 16, fontWeight: '700' },
  cardContent:     { flex: 1 },
  name:            { ...typography.h4 },
  email:           { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  dept:            { ...typography.caption, color: colors.textSecondary, marginTop: 1 },
  right:           { alignItems: 'flex-end', gap: 4 },
  roleBadge:       { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  roleText:        { fontSize: 10, fontWeight: '700' },
  inactiveBadge:   { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full, backgroundColor: `${colors.textMuted}20` },
  inactiveText:    { fontSize: 9, fontWeight: '700', color: colors.textMuted },
  editBtn:         { padding: 4, borderRadius: radius.sm, backgroundColor: `${colors.primary}10` },
  empty:           { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText:       { ...typography.bodySmall, color: colors.textMuted },

  // Modal sheet
  backdrop:        { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheetWrap:       { flex: 1, justifyContent: 'flex-end' },
  sheet:           { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: spacing.xxl, ...shadow.lg },
  handle:          { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.md },
  sheetTitle:      { ...typography.h2, marginBottom: 4 },
  sheetSub:        { ...typography.bodySmall, color: colors.textMuted, marginBottom: spacing.lg },

  // Form
  label:           { ...typography.sectionLabel, marginBottom: spacing.xs, marginTop: spacing.md },
  input:           { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: Platform.OS === 'ios' ? 12 : 8, fontSize: 15, color: colors.text },
  roleRow:         { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: 2 },
  roleChip:        { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surfaceAlt },
  roleChipText:    { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  roleChipTextActive: { color: colors.textInverse },

  // Buttons
  saveBtn:         { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', marginTop: spacing.lg },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText:     { color: colors.textInverse, fontSize: 15, fontWeight: '700' },
  cancelBtn:       { alignItems: 'center', paddingVertical: 12, marginTop: spacing.sm },
  cancelText:      { ...typography.body, color: colors.textMuted },
});
