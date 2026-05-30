import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
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
import { useAuth } from '../../auth/AuthContext';
import { radius, shadow, spacing, typography, roleColor } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface Profile {
  id: number;
  fullName: string;
  email: string;
  username: string;
  role: string;
  department?: string;
  jobTitle?: string;
  phone?: string;
  bio?: string;
  dateOfBirth?: string;
  address?: string;
  profileImage?: string;
}

interface EditForm {
  fullName: string;
  phone: string;
  bio: string;
  jobTitle: string;
  department: string;
  dateOfBirth: string;
  address: string;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.infoLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
  colors,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'phone-pad' | 'email-address';
  colors: any;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          multiline && styles.inputMulti,
          { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? label}
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize="none"
      />
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export function ProfileScreen() {
  const { user, logout } = useAuth();
  const { colors } = useAppTheme();
  const { isAr } = useLocale();

  const [profile, setProfile]     = useState<Profile | null>(null);
  const [loading, setLoading]     = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving]       = useState(false);

  const emptyForm = (): EditForm => ({
    fullName:    profile?.fullName    ?? user?.fullName    ?? '',
    phone:       profile?.phone       ?? user?.phone       ?? '',
    bio:         profile?.bio         ?? '',
    jobTitle:    profile?.jobTitle    ?? user?.jobTitle    ?? '',
    department:  profile?.department  ?? user?.department  ?? '',
    dateOfBirth: profile?.dateOfBirth ?? '',
    address:     profile?.address     ?? '',
  });

  const [form, setForm] = useState<EditForm>(emptyForm);

  const load = useCallback(async () => {
    try {
      const data = await api.get<Profile>('/profile/me');
      setProfile(data);
    } catch (err: unknown) {
      // Silently fall back to auth context user — profile endpoint may not exist yet
      const msg = err instanceof Error ? err.message : 'Failed to load profile';
      console.warn('ProfileScreen load error:', msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const openEdit = () => {
    setForm({
      fullName:    profile?.fullName    ?? user?.fullName    ?? '',
      phone:       profile?.phone       ?? user?.phone       ?? '',
      bio:         profile?.bio         ?? '',
      jobTitle:    profile?.jobTitle    ?? user?.jobTitle    ?? '',
      department:  profile?.department  ?? user?.department  ?? '',
      dateOfBirth: profile?.dateOfBirth ?? '',
      address:     profile?.address     ?? '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.fullName.trim()) {
      Alert.alert('Validation', 'Full name is required.');
      return;
    }
    setSaving(true);
    try {
      const updated = await api.put<Profile>('/profile/me', {
        fullName:    form.fullName.trim(),
        phone:       form.phone.trim()       || undefined,
        bio:         form.bio.trim()         || undefined,
        jobTitle:    form.jobTitle.trim()    || undefined,
        department:  form.department.trim()  || undefined,
        dateOfBirth: form.dateOfBirth.trim() || undefined,
        address:     form.address.trim()     || undefined,
      });
      setProfile(updated);
      setModalOpen(false);
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      isAr ? 'تسجيل الخروج' : 'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: isAr ? 'تسجيل الخروج' : 'Sign Out', style: 'destructive', onPress: () => void logout() },
      ],
    );
  };

  const display  = profile ?? (user as Profile | null);
  const initials = (display?.fullName ?? '?')
    .split(' ').slice(0, 2).map((n) => n[0]?.toUpperCase() ?? '').join('');
  const color    = roleColor(display?.role);

  const setField = (key: keyof EditForm) => (val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title={isAr ? 'الملف الشخصي' : 'Profile'}
        showBack
        rightLabel={isAr ? 'تعديل' : 'Edit'}
        rightIcon="create-outline"
        onRightPress={openEdit}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar + identity */}
          <View style={styles.hero}>
            <View style={[styles.avatar, { backgroundColor: `${color}22`, borderColor: color }]}>
              <Text style={[styles.avatarText, { color }]}>{initials}</Text>
            </View>
            <Text style={[styles.name, { color: colors.text }]}>{display?.fullName}</Text>
            <Text style={[styles.email, { color: colors.textMuted }]}>{display?.email}</Text>
            <View style={[styles.roleBadge, { backgroundColor: `${color}18` }]}>
              <View style={[styles.roleDot, { backgroundColor: color }]} />
              <Text style={[styles.roleText, { color }]}>{display?.role ?? ''}</Text>
            </View>
          </View>

          {/* Account info */}
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>ACCOUNT INFO</Text>
            <InfoRow label="Username"   value={display?.username   ?? '—'} colors={colors} />
            <InfoRow label="Role"       value={display?.role       ?? '—'} colors={colors} />
            <InfoRow label="Department" value={display?.department ?? '—'} colors={colors} />
            <InfoRow label="Job Title"  value={display?.jobTitle   ?? '—'} colors={colors} />
            <InfoRow label="Phone"      value={display?.phone      ?? '—'} colors={colors} />
          </View>

          {/* Extended info */}
          {(profile?.bio || profile?.dateOfBirth || profile?.address) && (
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>ADDITIONAL INFO</Text>
              {profile.bio         && <InfoRow label="Bio"           value={profile.bio}           colors={colors} />}
              {profile.dateOfBirth && <InfoRow label="Date of Birth" value={profile.dateOfBirth}   colors={colors} />}
              {profile.address     && <InfoRow label="Address"       value={profile.address}       colors={colors} />}
            </View>
          )}

          <TouchableOpacity
            style={[styles.signOutBtn, { backgroundColor: colors.surface, borderColor: `${colors.danger}40` }]}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={20} color={colors.danger} />
            <Text style={[styles.signOutText, { color: colors.danger }]}>
              {isAr ? 'تسجيل الخروج' : 'Sign Out'}
            </Text>
          </TouchableOpacity>

          <Text style={[styles.version, { color: colors.textMuted }]}>Plasticon Mobile v1.0.0</Text>
        </ScrollView>
      )}

      {/* ── Edit Modal ─────────────────────────────────────────────────────── */}
      <Modal
        visible={modalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalOpen(false)}
      >
        <SafeAreaView style={[styles.modalSafe, { backgroundColor: colors.background }]}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            {/* Modal header */}
            <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
              <Pressable
                onPress={() => setModalOpen(false)}
                style={({ pressed }) => [styles.modalClose, pressed && { opacity: 0.6 }]}
              >
                <Text style={[styles.modalCancel, { color: colors.textMuted }]}>Cancel</Text>
              </Pressable>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {isAr ? 'تعديل الملف' : 'Edit Profile'}
              </Text>
              <Pressable
                onPress={() => void handleSave()}
                disabled={saving}
                style={({ pressed }) => [styles.modalSaveBtn, pressed && { opacity: 0.7 }]}
              >
                {saving
                  ? <ActivityIndicator size="small" color={colors.primary} />
                  : <Text style={[styles.modalSave, { color: colors.primary }]}>Save</Text>
                }
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.modalContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <FormField label="Full Name"     value={form.fullName}    onChangeText={setField('fullName')}    colors={colors} />
              <FormField label="Phone"         value={form.phone}       onChangeText={setField('phone')}       keyboardType="phone-pad"   colors={colors} />
              <FormField label="Job Title"     value={form.jobTitle}    onChangeText={setField('jobTitle')}    colors={colors} />
              <FormField label="Department"    value={form.department}  onChangeText={setField('department')}  colors={colors} />
              <FormField label="Date of Birth" value={form.dateOfBirth} onChangeText={setField('dateOfBirth')} placeholder="YYYY-MM-DD"  colors={colors} />
              <FormField label="Address"       value={form.address}     onChangeText={setField('address')}     multiline                  colors={colors} />
              <FormField label="Bio"           value={form.bio}         onChangeText={setField('bio')}         multiline                  colors={colors} />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:    { flex: 1 },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },

  // Hero
  hero: { alignItems: 'center', paddingVertical: spacing.xl },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 2.5,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: { fontSize: 26, fontWeight: '700' },
  name:  { ...typography.h2, marginBottom: 4 },
  email: { ...typography.bodySmall },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: radius.full, marginTop: spacing.sm,
  },
  roleDot:  { width: 7, height: 7, borderRadius: 4 },
  roleText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },

  // Info card
  card: {
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.sm,
  },
  sectionLabel: { ...typography.sectionLabel, marginBottom: spacing.md },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  infoLabel: { ...typography.bodySmall, flex: 1 },
  infoValue: { ...typography.bodySmall, fontWeight: '600', flex: 2, textAlign: 'right' },

  // Sign out
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1.5,
    ...shadow.sm,
  },
  signOutText: { ...typography.body, fontWeight: '700' },

  version: { ...typography.caption, textAlign: 'center', marginTop: spacing.sm },

  // Modal
  modalSafe:    { flex: 1 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
  },
  modalTitle:  { ...typography.h3 },
  modalClose:  { padding: 4, minWidth: 60 },
  modalCancel: { ...typography.body },
  modalSaveBtn:{ padding: 4, minWidth: 60, alignItems: 'flex-end' },
  modalSave:   { ...typography.body, fontWeight: '700' },
  modalContent:{ padding: spacing.md, paddingBottom: spacing.xxl },

  // Form fields
  fieldWrap:  { marginBottom: spacing.md },
  fieldLabel: { ...typography.caption, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md, paddingVertical: 10,
    ...typography.body,
  },
  inputMulti: { minHeight: 80, textAlignVertical: 'top', paddingTop: 10 },
});
