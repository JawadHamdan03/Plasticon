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
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface User {
  id: number;
  fullName: string;
  email: string;
  role?: string;
  isActive?: boolean;
  department?: string;
  phone?: string | null;
  shiftId?: number | null;
  createdAt: string;
}

interface Shift {
  id: number;
  name?: string;
  shiftType?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLES = ['WORKER', 'ENGINEER', 'ACCOUNTANT', 'ADMIN', 'SALES_REP'] as const;
type Role = typeof ROLES[number];

// ─── Edit Modal ───────────────────────────────────────────────────────────────

interface EditModalProps {
  user: User | null;
  shifts: Shift[];
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function EditModal({ user, shifts, visible, onClose, onSaved }: EditModalProps) {
  const { colors } = useAppTheme();

  const ROLE_COLOR: Record<string, string> = {
    ADMIN:      '#7C3AED',
    ENGINEER:   colors.info,
    ACCOUNTANT: colors.success,
    WORKER:     colors.accent,
    SALES_REP:  colors.primary,
  };

  const [role, setRole]           = useState<Role>('WORKER');
  const [shiftId, setShiftId]     = useState('');
  const [fullName, setFullName]   = useState('');
  const [phone, setPhone]         = useState('');
  const [department, setDepartment] = useState('');
  const [isActive, setIsActive]   = useState(true);
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    if (user) {
      setRole((user.role as Role) ?? 'WORKER');
      setShiftId(user.shiftId != null ? String(user.shiftId) : '');
      setFullName(user.fullName ?? '');
      setPhone(user.phone ?? '');
      setDepartment(user.department ?? '');
      setIsActive(user.isActive !== false);
    }
  }, [user]);

  const needsShift = role === 'WORKER' || role === 'ENGINEER';

  async function save() {
    if (!user) return;
    if (!fullName.trim()) {
      Alert.alert('تحقق', 'الاسم الكامل مطلوب');
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        role,
        fullName: fullName.trim(),
        phone:       phone.trim()      || null,
        department:  department.trim() || null,
        isActive,
      };
      if (needsShift) {
        body.shiftId = shiftId.trim() ? Number(shiftId) : null;
      } else {
        body.shiftId = null;
      }
      await api.put(`/users/${user.id}`, body);
      onSaved();
      onClose();
    } catch (err: any) {
      Alert.alert('خطأ', err?.message ?? 'Failed to update user');
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
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <Text style={[styles.sheetTitle, { color: colors.text }]}>{'تعديل المستخدم'}</Text>
          {user && (
            <Text style={[styles.sheetSub, { color: colors.textMuted }]}>{user.email}</Text>
          )}

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Full name */}
          <Text style={[styles.label, { color: colors.text }]}>{'الاسم الكامل'}</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
            value={fullName}
            onChangeText={setFullName}
            placeholder={'الاسم الكامل'}
            placeholderTextColor={colors.textMuted}
          />

          {/* Phone */}
          <Text style={[styles.label, { color: colors.text }]}>{'الهاتف'}</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
            value={phone}
            onChangeText={setPhone}
            placeholder={'رقم الهاتف'}
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
          />

          {/* Department */}
          <Text style={[styles.label, { color: colors.text }]}>{'القسم'}</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
            value={department}
            onChangeText={setDepartment}
            placeholder={'اسم القسم'}
            placeholderTextColor={colors.textMuted}
          />

          {/* Active status toggle */}
          <Text style={[styles.label, { color: colors.text }]}>{'الحالة'}</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, isActive && { backgroundColor: colors.success, borderColor: colors.success }]}
              onPress={() => setIsActive(true)}
              activeOpacity={0.75}
            >
              <Text style={[styles.toggleText, { color: isActive ? colors.textInverse : colors.textSecondary }]}>
                {'نشط'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, !isActive && { backgroundColor: colors.danger, borderColor: colors.danger }]}
              onPress={() => setIsActive(false)}
              activeOpacity={0.75}
            >
              <Text style={[styles.toggleText, { color: !isActive ? colors.textInverse : colors.textSecondary }]}>
                {'غير نشط'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Role picker */}
          <Text style={[styles.label, { color: colors.text }]}>{'الدور'}</Text>
          <View style={styles.roleRow}>
            {ROLES.map((r) => (
              <TouchableOpacity
                key={r}
                style={[
                  styles.roleChip,
                  { borderColor: colors.border, backgroundColor: colors.surfaceAlt },
                  role === r && { backgroundColor: ROLE_COLOR[r] ?? colors.primary, borderColor: ROLE_COLOR[r] ?? colors.primary },
                ]}
                onPress={() => setRole(r)}
                activeOpacity={0.75}
              >
                <Text style={[styles.roleChipText, { color: colors.textSecondary }, role === r && { color: colors.textInverse }]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Shift input — only for WORKER / ENGINEER */}
          {needsShift && (
            <>
              <Text style={[styles.label, { color: colors.text }]}>
                {'الوردية'}{shifts.length > 0 ? ` (${shifts.map((s) => `${s.id}: ${s.name ?? s.shiftType}`).join(', ')})` : ' ID'}
              </Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                value={shiftId}
                onChangeText={setShiftId}
                placeholder={'أدخل رقم الوردية'}
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
              />
            </>
          )}

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary }, saving && styles.saveBtnDisabled]}
            onPress={save}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving
              ? <ActivityIndicator size="small" color={colors.textInverse} />
              : <Text style={[styles.saveBtnText, { color: colors.textInverse }]}>{'حفظ التغييرات'}</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={[styles.cancelText, { color: colors.textMuted }]}>{'إلغاء'}</Text>
          </TouchableOpacity>
          </ScrollView>
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
  const { colors } = useAppTheme();

  const ROLE_COLOR: Record<string, string> = {
    ADMIN:      '#7C3AED',
    ENGINEER:   colors.info,
    ACCOUNTANT: colors.success,
    WORKER:     colors.accent,
    SALES_REP:  colors.primary,
  };

  const roleColor = ROLE_COLOR[item.role ?? ''] ?? colors.textMuted;
  const initials  = item.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }, !item.isActive && styles.cardInactive]}>
      <View style={[styles.avatar, { backgroundColor: `${roleColor}20` }]}>
        <Text style={[styles.avatarText, { color: roleColor }]}>{initials}</Text>
      </View>
      <View style={styles.cardContent}>
        <Text style={[styles.name, { color: colors.text }]}>{item.fullName}</Text>
        <Text style={[styles.email, { color: colors.textMuted }]} numberOfLines={1}>{item.email}</Text>
        {item.department && <Text style={[styles.dept, { color: colors.textSecondary }]}>{item.department}</Text>}
      </View>
      <View style={styles.right}>
        {item.role && (
          <View style={[styles.roleBadge, { backgroundColor: `${roleColor}15` }]}>
            <Text style={[styles.roleText, { color: roleColor }]}>{item.role}</Text>
          </View>
        )}
        {item.isActive === false && (
          <View style={[styles.inactiveBadge, { backgroundColor: `${colors.textMuted}20` }]}>
            <Text style={[styles.inactiveText, { color: colors.textMuted }]}>{'غير نشط'}</Text>
          </View>
        )}
        <TouchableOpacity
          style={[styles.editBtn, { backgroundColor: `${colors.primary}10` }]}
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
  const { colors } = useAppTheme();

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
      Alert.alert('خطأ', e?.message ?? 'Failed to load users');
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
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title={'المستخدمون'}
        subtitle={`${users.length} ${'حساب'}`}
        showBack
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(i, idx) => `${String(i.id)}-${idx}`}
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
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>{'لا يوجد مستخدمون'}</Text>
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
  safe:            { flex: 1 },
  center:          { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:            { padding: spacing.md, paddingBottom: 40 },

  // Card
  card:            { flexDirection: 'row', alignItems: 'center', borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, gap: spacing.md, ...shadow.sm },
  cardInactive:    { opacity: 0.55 },
  avatar:          { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText:      { fontSize: 16, fontWeight: '700' },
  cardContent:     { flex: 1 },
  name:            { ...typography.h4 },
  email:           { ...typography.caption, marginTop: 2 },
  dept:            { ...typography.caption, marginTop: 1 },
  right:           { alignItems: 'flex-end', gap: 4 },
  roleBadge:       { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  roleText:        { fontSize: 10, fontWeight: '700' },
  inactiveBadge:   { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full },
  inactiveText:    { fontSize: 9, fontWeight: '700' },
  editBtn:         { padding: 4, borderRadius: radius.sm },
  empty:           { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText:       { ...typography.bodySmall },

  // Modal sheet
  backdrop:        { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheetWrap:       { flex: 1, justifyContent: 'flex-end' },
  sheet:           { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, maxHeight: '90%', ...shadow.lg },
  handle:          { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  sheetTitle:      { ...typography.h2, marginBottom: 4 },
  sheetSub:        { ...typography.bodySmall, marginBottom: spacing.md },

  // Form
  label:           { ...typography.sectionLabel, marginBottom: spacing.xs, marginTop: spacing.md },
  input:           { borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: Platform.OS === 'ios' ? 12 : 8, fontSize: 15 },
  roleRow:         { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: 2 },
  roleChip:        { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1.5 },
  roleChipText:    { fontSize: 12, fontWeight: '700' },
  toggleRow:       { flexDirection: 'row', gap: spacing.sm, marginTop: 2 },
  toggleBtn:       { flex: 1, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1.5, alignItems: 'center', borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
  toggleText:      { fontSize: 13, fontWeight: '700' },

  // Buttons
  saveBtn:         { borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', marginTop: spacing.lg },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText:     { fontSize: 15, fontWeight: '700' },
  cancelBtn:       { alignItems: 'center', paddingVertical: 12, marginTop: spacing.sm, marginBottom: spacing.lg },
  cancelText:      { ...typography.body },
});
