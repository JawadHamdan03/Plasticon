import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
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
import * as ImagePicker from 'expo-image-picker';
import { api, uploadForm } from '../../api/client';
import { ScreenHeader } from '../../components';
import { useAuth } from '../../auth/AuthContext';
import { API_BASE } from '../../config';
import { radius, shadow, spacing, typography, roleColor } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserDocument {
  id: number;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  documentType: string;
  title: string;
  createdAt: string;
}

interface Profile {
  id: number;
  fullName: string;
  email: string;
  username: string;
  role: string;
  department?: string | null;
  jobTitle?: string | null;
  phone?: string | null;
  bio?: string | null;
  dateOfBirth?: string | null;
  address?: string | null;
  profileImage?: string | null;
  linkedIn?: string | null;
  skills?: string | null;
  profileCompleted?: boolean | null;
  createdAt?: string | null;
  userDocuments?: UserDocument[];
}

interface EditForm {
  fullName: string;
  phone: string;
  bio: string;
  jobTitle: string;
  department: string;
  dateOfBirth: string;
  address: string;
  linkedIn: string;
  skills: string;
}

type DocType = 'CV' | 'CERTIFICATE' | 'OTHER';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcCompletion(p: Profile): number {
  const fields = [
    p.fullName, p.email, p.phone, p.bio, p.jobTitle,
    p.department, p.dateOfBirth, p.address, p.linkedIn, p.skills, p.profileImage,
  ];
  return Math.round(fields.filter(Boolean).length / fields.length * 100);
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return iso; }
}

function fmtSize(bytes: number) {
  return `${(bytes / 1024).toFixed(0)} KB`;
}

const DOC_TYPE_LABEL: Record<string, string> = {
  CV: 'CV / Resume',
  CERTIFICATE: 'Certificate',
  OTHER: 'Other',
};
const DOC_TYPE_LABEL_AR: Record<string, string> = {
  CV: 'السيرة الذاتية',
  CERTIFICATE: 'شهادة',
  OTHER: 'أخرى',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({
  icon, label, value, colors, linkUrl,
}: {
  icon: string; label: string; value: string | null | undefined; colors: any; linkUrl?: string;
}) {
  if (!value) return null;
  return (
    <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
      <View style={styles.infoRowLeft}>
        <Ionicons name={icon as any} size={14} color={colors.textMuted} style={{ marginTop: 1 }} />
        <Text style={[styles.infoLabel, { color: colors.textMuted }]}>{label}</Text>
      </View>
      {linkUrl ? (
        <TouchableOpacity onPress={() => Linking.openURL(linkUrl)} activeOpacity={0.7}>
          <Text style={[styles.infoValue, { color: colors.primary }]} numberOfLines={1}>{value}</Text>
        </TouchableOpacity>
      ) : (
        <Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={2}>{value}</Text>
      )}
    </View>
  );
}

function FormField({
  label, value, onChangeText, placeholder, multiline, keyboardType, colors,
}: {
  label: string; value: string; onChangeText: (t: string) => void;
  placeholder?: string; multiline?: boolean;
  keyboardType?: 'default' | 'phone-pad' | 'email-address' | 'url';
  colors: any;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMulti, { backgroundColor: colors.inputBg ?? colors.surface, borderColor: colors.border, color: colors.text }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? label}
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export function ProfileScreen() {
  const { user, logout } = useAuth();
  const { colors } = useAppTheme();
  const { isAr } = useLocale();

  const [profile, setProfile]           = useState<Profile | null>(null);
  const [loading, setLoading]           = useState(true);
  const [editOpen, setEditOpen]         = useState(false);
  const [saving, setSaving]             = useState(false);
  const [form, setForm]                 = useState<EditForm>({
    fullName: '', phone: '', bio: '', jobTitle: '', department: '',
    dateOfBirth: '', address: '', linkedIn: '', skills: '',
  });

  // photo
  const [photoUploading, setPhotoUploading] = useState(false);

  // doc upload modal
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [docTitle, setDocTitle]         = useState('');
  const [docType, setDocType]           = useState<DocType>('OTHER');
  const [docFile, setDocFile]           = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [docUploading, setDocUploading] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.get<Profile>('/profile/me');
      setProfile(data);
    } catch (err: any) {
      console.warn('ProfileScreen load error:', err?.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // ── Photo upload ────────────────────────────────────────────────────────────

  const handlePhotoPress = () => {
    Alert.alert(
      isAr ? 'تغيير الصورة الشخصية' : 'Change Photo',
      '',
      [
        {
          text: isAr ? 'الكاميرا' : 'Camera',
          onPress: () => void pickPhoto('camera'),
        },
        {
          text: isAr ? 'المعرض' : 'Gallery',
          onPress: () => void pickPhoto('library'),
        },
        { text: isAr ? 'إلغاء' : 'Cancel', style: 'cancel' },
      ],
    );
  };

  const pickPhoto = async (source: 'camera' | 'library') => {
    const permFn = source === 'camera'
      ? ImagePicker.requestCameraPermissionsAsync
      : ImagePicker.requestMediaLibraryPermissionsAsync;
    const { status } = await permFn();
    if (status !== 'granted') {
      Alert.alert(isAr ? 'لم يُمنح الإذن' : 'Permission denied');
      return;
    }
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.85 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', allowsEditing: true, aspect: [1, 1], quality: 0.85 });
    if (result.canceled) return;
    const asset = result.assets[0];
    setPhotoUploading(true);
    try {
      const fd = new FormData();
      fd.append('photo', { uri: asset.uri, type: 'image/jpeg', name: 'photo.jpg' } as any);
      await uploadForm('/profile/me/photo', fd);
      await load();
    } catch (e: any) {
      Alert.alert(isAr ? 'خطأ' : 'Error', e.message ?? 'Upload failed');
    } finally {
      setPhotoUploading(false);
    }
  };

  // ── Edit profile ─────────────────────────────────────────────────────────────

  const openEdit = () => {
    setForm({
      fullName:    profile?.fullName    ?? user?.fullName    ?? '',
      phone:       profile?.phone       ?? '',
      bio:         profile?.bio         ?? '',
      jobTitle:    profile?.jobTitle    ?? '',
      department:  profile?.department  ?? '',
      dateOfBirth: profile?.dateOfBirth ? profile.dateOfBirth.slice(0, 10) : '',
      address:     profile?.address     ?? '',
      linkedIn:    profile?.linkedIn    ?? '',
      skills:      profile?.skills      ?? '',
    });
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!form.fullName.trim()) {
      Alert.alert(isAr ? 'تحقق' : 'Validation', isAr ? 'الاسم الكامل مطلوب' : 'Full name is required.');
      return;
    }
    setSaving(true);
    try {
      await api.put('/profile/me', {
        fullName:    form.fullName.trim(),
        phone:       form.phone.trim()       || undefined,
        bio:         form.bio.trim()         || undefined,
        jobTitle:    form.jobTitle.trim()    || undefined,
        department:  form.department.trim()  || undefined,
        dateOfBirth: form.dateOfBirth.trim() || undefined,
        address:     form.address.trim()     || undefined,
        linkedIn:    form.linkedIn.trim()    || undefined,
        skills:      form.skills.trim()      || undefined,
      });
      await load();
      setEditOpen(false);
    } catch (e: any) {
      Alert.alert(isAr ? 'خطأ' : 'Error', e.message ?? 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  // ── Document upload ─────────────────────────────────────────────────────────

  const pickDocFile = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(isAr ? 'لم يُمنح الإذن' : 'Permission denied');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.9 });
    if (!result.canceled) setDocFile(result.assets[0]);
  };

  const handleDocUpload = async () => {
    if (!docFile) {
      Alert.alert(isAr ? 'اختر ملفاً' : 'Choose a file first');
      return;
    }
    setDocUploading(true);
    try {
      const fd = new FormData();
      fd.append('document', { uri: docFile.uri, type: 'image/jpeg', name: docFile.fileName ?? 'document.jpg' } as any);
      fd.append('title', docTitle.trim() || (docFile.fileName ?? 'document'));
      fd.append('documentType', docType);
      await uploadForm('/profile/me/documents', fd);
      await load();
      setDocFile(null);
      setDocTitle('');
      setDocType('OTHER');
      setDocModalOpen(false);
    } catch (e: any) {
      Alert.alert(isAr ? 'خطأ' : 'Error', e.message ?? 'Upload failed');
    } finally {
      setDocUploading(false);
    }
  };

  const handleDeleteDoc = (id: number) => {
    Alert.alert(
      isAr ? 'حذف المستند' : 'Delete Document',
      isAr ? 'هل أنت متأكد؟' : 'Are you sure?',
      [
        { text: isAr ? 'إلغاء' : 'Cancel', style: 'cancel' },
        {
          text: isAr ? 'حذف' : 'Delete', style: 'destructive',
          onPress: async () => {
            setDeletingDocId(id);
            try {
              await api.delete(`/profile/me/documents/${id}`);
              await load();
            } catch (e: any) {
              Alert.alert(isAr ? 'خطأ' : 'Error', e.message ?? 'Delete failed');
            } finally {
              setDeletingDocId(null);
            }
          },
        },
      ],
    );
  };

  // ── Logout ───────────────────────────────────────────────────────────────────

  const handleLogout = () => {
    Alert.alert(
      isAr ? 'تسجيل الخروج' : 'Sign Out',
      isAr ? 'هل أنت متأكد؟' : 'Are you sure you want to sign out?',
      [
        { text: isAr ? 'إلغاء' : 'Cancel', style: 'cancel' },
        { text: isAr ? 'تسجيل الخروج' : 'Sign Out', style: 'destructive', onPress: () => void logout() },
      ],
    );
  };

  // ── Derived ──────────────────────────────────────────────────────────────────

  const display   = profile ?? (user as any as Profile | null);
  const initials  = (display?.fullName ?? '?').split(' ').slice(0, 2).map((n) => n[0]?.toUpperCase() ?? '').join('');
  const color     = roleColor(display?.role);
  const photoUrl  = profile?.profileImage ? `${API_BASE}/pictures/${profile.profileImage}` : null;
  const completion = profile ? calcCompletion(profile) : 0;
  const skillsArr  = profile?.skills ? profile.skills.split(',').map(s => s.trim()).filter(Boolean) : [];
  const docs       = profile?.userDocuments ?? [];

  const setField = (key: keyof EditForm) => (val: string) => setForm(f => ({ ...f, [key]: val }));

  // ─────────────────────────────────────────────────────────────────────────────

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
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* ── Hero ── */}
          <View style={styles.hero}>
            {/* Avatar with photo tap */}
            <TouchableOpacity onPress={handlePhotoPress} activeOpacity={0.8} style={styles.avatarWrap}>
              {photoUrl ? (
                <Image source={{ uri: photoUrl }} style={styles.avatarImg} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: `${color}22`, borderColor: color }]}>
                  <Text style={[styles.avatarText, { color }]}>{initials}</Text>
                </View>
              )}
              <View style={[styles.cameraBtn, { backgroundColor: colors.primary }]}>
                {photoUploading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Ionicons name="camera" size={13} color="#fff" />
                }
              </View>
            </TouchableOpacity>

            <Text style={[styles.name, { color: colors.text }]}>{display?.fullName}</Text>
            {display?.jobTitle ? (
              <Text style={[styles.jobTitle, { color: colors.textMuted }]}>
                {display.jobTitle}{display.department ? ` · ${display.department}` : ''}
              </Text>
            ) : null}
            <Text style={[styles.email, { color: colors.textMuted }]}>{display?.email}</Text>

            <View style={[styles.roleBadge, { backgroundColor: `${color}18` }]}>
              <View style={[styles.roleDot, { backgroundColor: color }]} />
              <Text style={[styles.roleText, { color }]}>{display?.role ?? ''}</Text>
            </View>

            {/* Completion bar */}
            {profile && (
              <View style={styles.completionWrap}>
                <View style={styles.completionHeader}>
                  <Text style={[styles.completionLabel, { color: colors.textMuted }]}>
                    {isAr ? 'اكتمال الملف الشخصي' : 'Profile completion'}
                  </Text>
                  <Text style={[styles.completionPct, { color: completion >= 80 ? '#16a34a' : colors.primary }]}>
                    {completion}%
                  </Text>
                </View>
                <View style={[styles.completionTrack, { backgroundColor: `${colors.border}` }]}>
                  <View
                    style={[
                      styles.completionFill,
                      {
                        width: `${completion}%` as any,
                        backgroundColor: completion >= 80 ? '#16a34a' : colors.primary,
                      },
                    ]}
                  />
                </View>
              </View>
            )}
          </View>

          {/* ── Account info ── */}
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
              {isAr ? 'معلومات الحساب' : 'ACCOUNT INFO'}
            </Text>
            <InfoRow icon="person-outline"   label={isAr ? 'اسم المستخدم' : 'Username'}   value={display?.username}   colors={colors} />
            <InfoRow icon="call-outline"     label={isAr ? 'الهاتف' : 'Phone'}             value={profile?.phone}      colors={colors} />
            <InfoRow icon="calendar-outline" label={isAr ? 'تاريخ الميلاد' : 'Date of Birth'} value={profile?.dateOfBirth ? fmtDate(profile.dateOfBirth) : null} colors={colors} />
            <InfoRow icon="location-outline" label={isAr ? 'العنوان' : 'Address'}          value={profile?.address}    colors={colors} />
            <InfoRow icon="logo-linkedin"    label="LinkedIn"                               value={profile?.linkedIn}   colors={colors} linkUrl={profile?.linkedIn ?? undefined} />
          </View>

          {/* ── Bio ── */}
          {profile?.bio ? (
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                {isAr ? 'نبذة' : 'BIO'}
              </Text>
              <Text style={[styles.bioText, { color: colors.text }]}>{profile.bio}</Text>
            </View>
          ) : null}

          {/* ── Skills ── */}
          {skillsArr.length > 0 ? (
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                {isAr ? 'المهارات' : 'SKILLS'}
              </Text>
              <View style={styles.tagsWrap}>
                {skillsArr.map(s => (
                  <View key={s} style={[styles.tag, { backgroundColor: `${colors.primary}18` }]}>
                    <Text style={[styles.tagText, { color: colors.primary }]}>{s}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* ── Documents ── */}
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={styles.cardTitleRow}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                {isAr ? 'المستندات' : 'DOCUMENTS'}
              </Text>
              <TouchableOpacity
                onPress={() => setDocModalOpen(true)}
                style={[styles.uploadBtn, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}40` }]}
                activeOpacity={0.75}
              >
                <Ionicons name="add" size={14} color={colors.primary} />
                <Text style={[styles.uploadBtnText, { color: colors.primary }]}>
                  {isAr ? 'رفع' : 'Upload'}
                </Text>
              </TouchableOpacity>
            </View>

            {docs.length === 0 ? (
              <Text style={[styles.emptyDocs, { color: colors.textMuted }]}>
                {isAr ? 'لا توجد مستندات مرفوعة بعد.' : 'No documents uploaded yet.'}
              </Text>
            ) : (
              docs.map(doc => (
                <View key={doc.id} style={[styles.docRow, { borderColor: colors.border }]}>
                  <View style={[styles.docIcon, { backgroundColor: `${colors.primary}15` }]}>
                    <Ionicons name="document-text-outline" size={18} color={colors.primary} />
                  </View>
                  <View style={styles.docInfo}>
                    <Text style={[styles.docTitle, { color: colors.text }]} numberOfLines={1}>{doc.title}</Text>
                    <Text style={[styles.docMeta, { color: colors.textMuted }]}>
                      {isAr ? DOC_TYPE_LABEL_AR[doc.documentType] ?? doc.documentType : DOC_TYPE_LABEL[doc.documentType] ?? doc.documentType}
                      {' · '}{fmtSize(doc.fileSize)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteDoc(doc.id)}
                    disabled={deletingDocId === doc.id}
                    style={styles.docDelete}
                    activeOpacity={0.7}
                  >
                    {deletingDocId === doc.id
                      ? <ActivityIndicator size="small" color="#ef4444" />
                      : <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    }
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>

          {/* ── Sign out ── */}
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

      {/* ── Edit Modal ─────────────────────────────────────────────────────────── */}
      <Modal visible={editOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditOpen(false)}>
        <SafeAreaView style={[styles.modalSafe, { backgroundColor: colors.background }]}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
              <Pressable onPress={() => setEditOpen(false)} style={({ pressed }) => [styles.modalClose, pressed && { opacity: 0.6 }]}>
                <Text style={[styles.modalCancel, { color: colors.textMuted }]}>{isAr ? 'إلغاء' : 'Cancel'}</Text>
              </Pressable>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{isAr ? 'تعديل الملف' : 'Edit Profile'}</Text>
              <Pressable onPress={() => void handleSave()} disabled={saving} style={({ pressed }) => [styles.modalSaveBtn, pressed && { opacity: 0.7 }]}>
                {saving
                  ? <ActivityIndicator size="small" color={colors.primary} />
                  : <Text style={[styles.modalSave, { color: colors.primary }]}>{isAr ? 'حفظ' : 'Save'}</Text>
                }
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <FormField label={isAr ? 'الاسم الكامل' : 'Full Name'}       value={form.fullName}    onChangeText={setField('fullName')}    colors={colors} />
              <FormField label={isAr ? 'الهاتف' : 'Phone'}                 value={form.phone}       onChangeText={setField('phone')}       keyboardType="phone-pad"   colors={colors} />
              <FormField label={isAr ? 'المسمى الوظيفي' : 'Job Title'}     value={form.jobTitle}    onChangeText={setField('jobTitle')}    colors={colors} />
              <FormField label={isAr ? 'القسم' : 'Department'}             value={form.department}  onChangeText={setField('department')}  colors={colors} />
              <FormField label={isAr ? 'تاريخ الميلاد (YYYY-MM-DD)' : 'Date of Birth (YYYY-MM-DD)'} value={form.dateOfBirth} onChangeText={setField('dateOfBirth')} placeholder="YYYY-MM-DD" colors={colors} />
              <FormField label={isAr ? 'العنوان' : 'Address'}              value={form.address}     onChangeText={setField('address')}     multiline                  colors={colors} />
              <FormField label="LinkedIn URL"                               value={form.linkedIn}    onChangeText={setField('linkedIn')}    keyboardType="url"         colors={colors} />
              <FormField label={isAr ? 'المهارات (مفصولة بفاصلة)' : 'Skills (comma-separated)'} value={form.skills} onChangeText={setField('skills')} placeholder={isAr ? 'مثل: جودة، إنتاج' : 'e.g. Quality, Production'} colors={colors} />
              <FormField label={isAr ? 'نبذة' : 'Bio'}                    value={form.bio}         onChangeText={setField('bio')}         multiline                  colors={colors} />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* ── Document Upload Modal ───────────────────────────────────────────────── */}
      <Modal visible={docModalOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setDocModalOpen(false)}>
        <SafeAreaView style={[styles.modalSafe, { backgroundColor: colors.background }]}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
              <Pressable onPress={() => setDocModalOpen(false)} style={({ pressed }) => [styles.modalClose, pressed && { opacity: 0.6 }]}>
                <Text style={[styles.modalCancel, { color: colors.textMuted }]}>{isAr ? 'إلغاء' : 'Cancel'}</Text>
              </Pressable>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{isAr ? 'رفع مستند' : 'Upload Document'}</Text>
              <Pressable onPress={() => void handleDocUpload()} disabled={docUploading} style={({ pressed }) => [styles.modalSaveBtn, pressed && { opacity: 0.7 }]}>
                {docUploading
                  ? <ActivityIndicator size="small" color={colors.primary} />
                  : <Text style={[styles.modalSave, { color: colors.primary }]}>{isAr ? 'رفع' : 'Upload'}</Text>
                }
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
              {/* Doc type */}
              <Text style={[styles.fieldLabel, { color: colors.textMuted, marginBottom: 8 }]}>
                {isAr ? 'نوع المستند' : 'Document Type'}
              </Text>
              <View style={styles.docTypeRow}>
                {(['CV', 'CERTIFICATE', 'OTHER'] as DocType[]).map(t => (
                  <TouchableOpacity
                    key={t}
                    onPress={() => setDocType(t)}
                    style={[styles.docTypeChip, {
                      backgroundColor: docType === t ? `${colors.primary}18` : colors.surface,
                      borderColor: docType === t ? colors.primary : colors.border,
                    }]}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.docTypeText, { color: docType === t ? colors.primary : colors.textMuted }]}>
                      {isAr ? DOC_TYPE_LABEL_AR[t] : DOC_TYPE_LABEL[t]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Doc title */}
              <View style={[styles.fieldWrap, { marginTop: spacing.md }]}>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{isAr ? 'العنوان' : 'Title'}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  value={docTitle}
                  onChangeText={setDocTitle}
                  placeholder={isAr ? 'مثل: شهادة هندسية 2024' : 'e.g. Engineering Certificate 2024'}
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              {/* File picker */}
              <TouchableOpacity
                onPress={() => void pickDocFile()}
                style={[styles.filePickBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                activeOpacity={0.75}
              >
                <Ionicons name="image-outline" size={18} color={colors.primary} />
                <Text style={[styles.filePickText, { color: docFile ? colors.text : colors.textMuted }]}>
                  {docFile ? (docFile.fileName ?? 'Image selected') : (isAr ? 'اختر صورة من المعرض' : 'Choose image from gallery')}
                </Text>
              </TouchableOpacity>
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
  hero:           { alignItems: 'center', paddingVertical: spacing.xl },
  avatarWrap:     { position: 'relative', marginBottom: spacing.md },
  avatar: {
    width: 88, height: 88, borderRadius: 44,
    borderWidth: 2.5,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarImg:    { width: 88, height: 88, borderRadius: 44 },
  avatarText:   { fontSize: 28, fontWeight: '700' },
  cameraBtn: {
    position: 'absolute', bottom: 0, right: 0,
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  name:     { ...typography.h2, marginBottom: 2 },
  jobTitle: { ...typography.bodySmall, marginBottom: 2 },
  email:    { ...typography.bodySmall },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: radius.full, marginTop: spacing.sm,
  },
  roleDot:  { width: 7, height: 7, borderRadius: 4 },
  roleText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },

  completionWrap:   { width: '100%', marginTop: spacing.md, paddingHorizontal: spacing.sm },
  completionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  completionLabel:  { ...typography.caption },
  completionPct:    { ...typography.caption, fontWeight: '700' },
  completionTrack:  { height: 6, borderRadius: 3, overflow: 'hidden' },
  completionFill:   { height: '100%', borderRadius: 3 },

  // Card
  card: {
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.sm,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  sectionLabel: { ...typography.sectionLabel },

  // Info rows
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingVertical: 9, borderBottomWidth: 1,
  },
  infoRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 },
  infoLabel:   { ...typography.bodySmall, flex: 1 },
  infoValue:   { ...typography.bodySmall, fontWeight: '600', flex: 2, textAlign: 'right' },

  // Bio
  bioText: { ...typography.body, lineHeight: 22 },

  // Skills tags
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  tagText: { fontSize: 12, fontWeight: '600' },

  // Upload btn (in card header)
  uploadBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: radius.sm, borderWidth: 1,
  },
  uploadBtnText: { fontSize: 12, fontWeight: '600' },

  // Docs
  emptyDocs: { ...typography.bodySmall, fontStyle: 'italic', textAlign: 'center', paddingVertical: spacing.md },
  docRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.sm, borderBottomWidth: 1,
  },
  docIcon:   { width: 38, height: 38, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  docInfo:   { flex: 1, minWidth: 0 },
  docTitle:  { ...typography.body, fontWeight: '600' },
  docMeta:   { ...typography.caption, marginTop: 1 },
  docDelete: { padding: 4 },

  // Sign out
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, borderRadius: radius.md, padding: spacing.md,
    marginBottom: spacing.md, borderWidth: 1.5, ...shadow.sm,
  },
  signOutText: { ...typography.body, fontWeight: '700' },
  version:     { ...typography.caption, textAlign: 'center', marginTop: spacing.sm },

  // Modal
  modalSafe:    { flex: 1 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, borderBottomWidth: 1,
  },
  modalTitle:   { ...typography.h3 },
  modalClose:   { padding: 4, minWidth: 60 },
  modalCancel:  { ...typography.body },
  modalSaveBtn: { padding: 4, minWidth: 60, alignItems: 'flex-end' },
  modalSave:    { ...typography.body, fontWeight: '700' },
  modalContent: { padding: spacing.md, paddingBottom: spacing.xxl },

  // Form fields
  fieldWrap:  { marginBottom: spacing.md },
  fieldLabel: { ...typography.caption, marginBottom: 6 },
  input: {
    borderWidth: 1, borderRadius: radius.sm,
    paddingHorizontal: spacing.md, paddingVertical: 10,
    ...typography.body,
  },
  inputMulti: { minHeight: 80, textAlignVertical: 'top', paddingTop: 10 },

  // Doc type chips
  docTypeRow:  { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  docTypeChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.sm, borderWidth: 1 },
  docTypeText: { fontSize: 13, fontWeight: '600' },

  // File pick button
  filePickBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    borderWidth: 1, borderRadius: radius.sm, padding: spacing.md,
    borderStyle: 'dashed', marginTop: spacing.sm,
  },
  filePickText: { ...typography.body, flex: 1 },
});
