import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Dimensions, FlatList, Image,
  KeyboardAvoidingView, Linking, Modal, Platform, Pressable,
  RefreshControl, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { api, uploadForm } from '../../api/client';
import { ScreenHeader, StatCard } from '../../components';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
import { API_BASE } from '../../config';

const { width: SW, height: SH } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────────────────

interface TechDoc {
  id: number;
  title: string;
  category: string;
  description?: string | null;
  fileName?: string | null;
  filePath?: string | null;
  mimeType?: string | null;
  images?: string[];
  downloadCount: number;
  uploadedBy?: { id: number; fullName: string } | null;
  createdAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = ['All', 'Manual', 'Maintenance', 'Safety', 'Reference', 'Support', 'Other'];
const CATEGORIES_AR: Record<string, string> = {
  All: 'الكل', Manual: 'دليل', Maintenance: 'صيانة', Safety: 'سلامة',
  Reference: 'مرجع', Support: 'دعم', Other: 'أخرى',
};
const CAT_COLOR: Record<string, string> = {
  Manual: '#1d4ed8', Maintenance: '#d97706', Safety: '#dc2626',
  Reference: '#7c3aed', Support: '#059669', Other: '#6b7280',
};

function picUrl(fp: string) { return `${API_BASE}/pictures/${fp}`; }
function isImageFile(fp?: string | null, mime?: string | null) {
  if (mime?.startsWith('image/')) return true;
  return !!fp && /\.(png|jpe?g|gif|webp)$/i.test(fp);
}
function fmtDate(iso: string) {
  try { return new Date(iso).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return iso; }
}

interface UploadForm { title: string; category: string; description: string }
const emptyForm = (): UploadForm => ({ title: '', category: 'Manual', description: '' });

// ─── Photo fullscreen viewer ──────────────────────────────────────────────────

function PhotoViewer({ uri, onClose }: { uri: string; onClose: () => void }) {
  const { colors } = useAppTheme();
  return (
    <Modal visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {/* Close button */}
        <TouchableOpacity
          onPress={onClose}
          style={{ position: 'absolute', top: 50, right: 20, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20, padding: 8 }}
          activeOpacity={0.8}
        >
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        {/* Zoomable image */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          maximumZoomScale={5}
          minimumZoomScale={1}
          bouncesZoom
          centerContent
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
        >
          <Image source={{ uri }} style={{ width: SW, height: SH }} resizeMode="contain" />
        </ScrollView>
        <Text style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', fontSize: 12, paddingBottom: 24 }}>
          Pinch to zoom · tap × to close
        </Text>
      </View>
    </Modal>
  );
}

// ─── Document detail bottom sheet ─────────────────────────────────────────────

function DocDetailSheet({ doc, onClose, onDeleted, onEdited }: {
  doc: TechDoc;
  onClose: () => void;
  onDeleted: () => void;
  onEdited: () => void;
}) {
  const { colors } = useAppTheme();
  const { isAr }   = useLocale();
  const color      = CAT_COLOR[doc.category] ?? '#6b7280';
  const photos     = doc.images ?? [];
  const hasFile    = !!doc.filePath;
  const fileIsImg  = hasFile && isImageFile(doc.filePath, doc.mimeType);

  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);
  const [deleting, setDeleting]         = useState(false);
  const [editing, setEditing]           = useState(false);
  const [editTitle, setEditTitle]       = useState(doc.title);
  const [editCat, setEditCat]           = useState(doc.category);
  const [editDesc, setEditDesc]         = useState(doc.description ?? '');
  const [editSaving, setEditSaving]     = useState(false);

  const openFile = async () => {
    if (!doc.filePath) return;
    await api.patch(`/tech-documents/${doc.id}/download`, {}).catch(() => {});
    if (fileIsImg) {
      setViewingPhoto(picUrl(doc.filePath));
    } else {
      void Linking.openURL(picUrl(doc.filePath));
    }
  };

  const submitEdit = async () => {
    if (!editTitle.trim()) return;
    setEditSaving(true);
    try {
      await api.patch(`/tech-documents/${doc.id}`, {
        title: editTitle.trim(),
        category: editCat,
        description: editDesc.trim() || undefined,
      });
      setEditing(false);
      onClose();
      onEdited();
    } catch (e: any) {
      Alert.alert(isAr ? 'خطأ' : 'Error', e?.message ?? 'Failed to update');
    } finally { setEditSaving(false); }
  };

  const handleDelete = () => {
    Alert.alert(
      isAr ? 'حذف الوثيقة' : 'Delete Document',
      `"${doc.title}"?`,
      [
        { text: isAr ? 'إلغاء' : 'Cancel', style: 'cancel' },
        {
          text: isAr ? 'حذف' : 'Delete', style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await api.delete(`/tech-documents/${doc.id}`);
              onDeleted();
              onClose();
            } catch (e: any) {
              Alert.alert(isAr ? 'خطأ' : 'Error', e?.message ?? 'Failed to delete');
            } finally { setDeleting(false); }
          },
        },
      ],
    );
  };

  return (
    <>
      <Modal visible transparent animationType="slide" onRequestClose={onClose}>
        <Pressable style={styles.overlay} onPress={onClose}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]} onPress={e => e.stopPropagation()}>
            {/* Handle */}
            <View style={[styles.handle, { backgroundColor: colors.border }]} />

            {/* Header */}
            <View style={styles.sheetHeaderRow}>
              <View style={[styles.docIconLg, { backgroundColor: `${color}18` }]}>
                <Ionicons name="document-text" size={26} color={color} />
              </View>
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <Text style={[styles.sheetDocTitle, { color: colors.text }]} numberOfLines={2}>{doc.title}</Text>
                <View style={[styles.catBadge, { backgroundColor: `${color}18`, alignSelf: 'flex-start', marginTop: 4 }]}>
                  <Text style={[styles.catBadgeText, { color }]}>{isAr ? CATEGORIES_AR[doc.category] : doc.category}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => { setEditing(e => !e); }} hitSlop={8} style={{ padding: 4, marginRight: 2 }}>
                <Ionicons name={editing ? 'close-circle-outline' : 'pencil-outline'} size={20} color={editing ? colors.danger : colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} hitSlop={8} style={{ padding: 4 }}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: spacing.md }}>
              {/* ── Edit form (inline) ────────────────────────────── */}
              {editing && (
                <View style={{ marginBottom: spacing.md, gap: spacing.sm }}>
                  <Text style={[{ fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }]}>{isAr ? 'تعديل الوثيقة' : 'Edit Document'}</Text>
                  <TextInput
                    style={[styles.editInput, { borderColor: colors.primary, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                    value={editTitle}
                    onChangeText={setEditTitle}
                    placeholder={isAr ? 'العنوان' : 'Title'}
                    placeholderTextColor={colors.textMuted}
                  />
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {['Manual', 'Maintenance', 'Safety', 'Reference', 'Support', 'Other'].map(cat => (
                      <TouchableOpacity
                        key={cat}
                        style={[styles.editCatChip, { borderColor: colors.border }, editCat === cat && { backgroundColor: CAT_COLOR[cat] ?? colors.primary, borderColor: CAT_COLOR[cat] ?? colors.primary }]}
                        onPress={() => setEditCat(cat)}
                        activeOpacity={0.8}
                      >
                        <Text style={[{ fontSize: 11, fontWeight: '700', color: colors.textMuted }, editCat === cat && { color: '#fff' }]}>{cat}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <TextInput
                    style={[styles.editInput, styles.editInputMulti, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                    value={editDesc}
                    onChangeText={setEditDesc}
                    placeholder={isAr ? 'الوصف (اختياري)' : 'Description (optional)'}
                    placeholderTextColor={colors.textMuted}
                    multiline
                    numberOfLines={3}
                  />
                  <TouchableOpacity
                    style={[styles.openBtn, { backgroundColor: colors.primary }]}
                    onPress={() => void submitEdit()}
                    disabled={editSaving}
                    activeOpacity={0.85}
                  >
                    {editSaving
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Ionicons name="checkmark" size={17} color="#fff" />}
                    <Text style={styles.openBtnText}>{isAr ? 'حفظ التغييرات' : 'Save Changes'}</Text>
                  </TouchableOpacity>
                </View>
              )}
              {/* Description + rest — hidden when editing */}
              {doc.description && !editing ? (
                <Text style={[styles.sheetDesc, { color: colors.textSecondary }]}>{doc.description}</Text>
              ) : null}

              {/* Meta */}
              <View style={[styles.metaBox, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                {doc.uploadedBy && (
                  <View style={styles.metaRow}>
                    <Ionicons name="person-outline" size={13} color={colors.textMuted} />
                    <Text style={[styles.metaText, { color: colors.textMuted }]}>{doc.uploadedBy.fullName}</Text>
                  </View>
                )}
                <View style={styles.metaRow}>
                  <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
                  <Text style={[styles.metaText, { color: colors.textMuted }]}>{fmtDate(doc.createdAt)}</Text>
                </View>
                {doc.downloadCount > 0 && (
                  <View style={styles.metaRow}>
                    <Ionicons name="eye-outline" size={13} color={colors.textMuted} />
                    <Text style={[styles.metaText, { color: colors.textMuted }]}>{doc.downloadCount} {isAr ? 'مشاهدة' : 'views'}</Text>
                  </View>
                )}
                {doc.fileName && (
                  <View style={styles.metaRow}>
                    <Ionicons name="attach-outline" size={13} color={colors.textMuted} />
                    <Text style={[styles.metaText, { color: colors.textMuted }]} numberOfLines={1}>{doc.fileName}</Text>
                  </View>
                )}
              </View>

              {/* Photo grid */}
              {photos.length > 0 && (
                <>
                  <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                    {isAr ? 'الصور المرفقة' : 'Attached Photos'} ({photos.length})
                  </Text>
                  <View style={styles.photoGrid}>
                    {photos.map((img, i) => (
                      <TouchableOpacity
                        key={i}
                        onPress={() => setViewingPhoto(picUrl(img))}
                        activeOpacity={0.8}
                        style={styles.photoThumb}
                      >
                        <Image source={{ uri: picUrl(img) }} style={styles.photoThumbImg} resizeMode="cover" />
                        <View style={styles.photoOverlay}>
                          <Ionicons name="expand-outline" size={16} color="#fff" />
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* Actions */}
              <View style={styles.sheetActions}>
                {hasFile && (
                  <TouchableOpacity
                    style={[styles.openBtn, { backgroundColor: color }]}
                    onPress={() => void openFile()}
                    activeOpacity={0.85}
                  >
                    <Ionicons name={fileIsImg ? 'image-outline' : 'document-outline'} size={17} color="#fff" />
                    <Text style={styles.openBtnText}>
                      {fileIsImg
                        ? (isAr ? 'عرض الصورة' : 'View Image')
                        : (isAr ? 'فتح الوثيقة' : 'Open Document')}
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.deleteBtn, { borderColor: colors.danger + '60', backgroundColor: colors.danger + '10' }]}
                  onPress={handleDelete}
                  disabled={deleting}
                  activeOpacity={0.8}
                >
                  {deleting
                    ? <ActivityIndicator size="small" color={colors.danger} />
                    : <Ionicons name="trash-outline" size={17} color={colors.danger} />
                  }
                  <Text style={[styles.deleteBtnText, { color: colors.danger }]}>{isAr ? 'حذف' : 'Delete'}</Text>
                </TouchableOpacity>
              </View>

              <View style={{ height: 28 }} />
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Photo fullscreen viewer */}
      {viewingPhoto && <PhotoViewer uri={viewingPhoto} onClose={() => setViewingPhoto(null)} />}
    </>
  );
}

// ─── Doc card (compact, tappable) ─────────────────────────────────────────────

function DocCard({ item, onPress }: { item: TechDoc; onPress: () => void }) {
  const { colors } = useAppTheme();
  const { isAr }   = useLocale();
  const color      = CAT_COLOR[item.category] ?? '#6b7280';
  const photos     = item.images ?? [];

  return (
    <TouchableOpacity
      style={[styles.docCard, { backgroundColor: colors.surface }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.docIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name="document-text" size={22} color={color} />
      </View>
      <View style={styles.docContent}>
        <Text style={[styles.docTitle, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>
        <View style={styles.docMeta}>
          <View style={[styles.catBadge, { backgroundColor: `${color}15` }]}>
            <Text style={[styles.catBadgeText, { color }]}>{isAr ? CATEGORIES_AR[item.category] : item.category}</Text>
          </View>
          {item.downloadCount > 0 && (
            <Text style={[styles.downloads, { color: colors.textMuted }]}>{item.downloadCount} 👁</Text>
          )}
          {photos.length > 0 && (
            <Text style={[styles.downloads, { color: colors.textMuted }]}>{photos.length} 🖼</Text>
          )}
        </View>
        {item.description ? <Text style={[styles.docDesc, { color: colors.textMuted }]} numberOfLines={1}>{item.description}</Text> : null}
        {item.uploadedBy  ? <Text style={[styles.uploader, { color: colors.textMuted }]}>{isAr ? 'بواسطة' : 'by'} {item.uploadedBy.fullName}</Text> : null}
      </View>
      <View style={styles.docChevron}>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Upload modal ─────────────────────────────────────────────────────────────

function UploadModal({ visible, onClose, onUploaded }: {
  visible: boolean; onClose: () => void; onUploaded: () => void;
}) {
  const { colors } = useAppTheme();
  const { isAr }   = useLocale();
  const [form, setForm]       = useState(emptyForm());
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [saving, setSaving]   = useState(false);
  const set = (k: keyof UploadForm) => (v: string) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => { if (visible) { setForm(emptyForm()); setFileUri(null); } }, [visible]);

  const pickFile = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert(isAr ? 'لم يُمنح الإذن' : 'Permission denied'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', allowsEditing: false, quality: 0.9 });
    if (!result.canceled) setFileUri(result.assets[0].uri);
  };

  const submit = async () => {
    if (!form.title.trim()) { Alert.alert(isAr ? 'مطلوب' : 'Required', isAr ? 'العنوان مطلوب.' : 'Title is required.'); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title.trim());
      fd.append('category', form.category);
      if (form.description.trim()) fd.append('description', form.description.trim());
      if (fileUri) fd.append('file', { uri: fileUri, type: 'image/jpeg', name: 'document.jpg' } as any);
      await uploadForm('/tech-documents', fd);
      onUploaded();
    } catch (e: any) {
      Alert.alert(isAr ? 'خطأ' : 'Error', e?.message ?? (isAr ? 'فشل الرفع.' : 'Failed to upload.'));
    } finally { setSaving(false); }
  };

  const uploadCats = CATEGORIES.filter(c => c !== 'All');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={styles.overlayBg} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <Text style={[styles.sheetTitle, { color: colors.text }]}>{isAr ? 'رفع وثيقة جديدة' : 'Upload New Document'}</Text>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{isAr ? 'العنوان *' : 'Title *'}</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }]} value={form.title} onChangeText={set('title')} placeholder={isAr ? 'مثال: دليل الآلة أ' : 'e.g. Machine A – User Manual'} placeholderTextColor={colors.textMuted} />
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{isAr ? 'الفئة' : 'Category'}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
              {uploadCats.map(cat => (
                <TouchableOpacity key={cat}
                  style={[styles.catChip, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }, form.category === cat && { borderColor: CAT_COLOR[cat] ?? colors.primary, backgroundColor: `${CAT_COLOR[cat] ?? colors.primary}18` }]}
                  onPress={() => set('category')(cat)}>
                  <Text style={[styles.catChipText, { color: colors.textSecondary }, form.category === cat && { color: CAT_COLOR[cat] ?? colors.primary }]}>
                    {isAr ? CATEGORIES_AR[cat] : cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{isAr ? 'الوصف' : 'Description'}</Text>
            <TextInput style={[styles.input, styles.inputMulti, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }]} value={form.description} onChangeText={set('description')} placeholder={isAr ? 'وصف مختصر...' : 'Brief description...'} placeholderTextColor={colors.textMuted} multiline textAlignVertical="top" />
            <TouchableOpacity style={[styles.fileBtn, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]} onPress={pickFile}>
              <Ionicons name={fileUri ? 'document' : 'document-outline'} size={18} color={fileUri ? colors.success : colors.primary} />
              <Text style={[styles.fileBtnText, { color: fileUri ? colors.success : colors.primary }]}>
                {fileUri ? (isAr ? 'ملف محدد ✓' : 'File selected ✓') : (isAr ? 'اختيار ملف / صورة' : 'Choose file / image')}
              </Text>
            </TouchableOpacity>
          </ScrollView>
          <View style={styles.sheetFooter}>
            <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={onClose}>
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>{isAr ? 'إلغاء' : 'Cancel'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]} onPress={submit} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>{isAr ? 'رفع' : 'Upload'}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export function TechDocsScreen() {
  const { colors } = useAppTheme();
  const { isAr }   = useLocale();

  const [docs,       setDocs]      = useState<TechDoc[]>([]);
  const [loading,    setLoading]   = useState(true);
  const [refreshing, setRefreshing]= useState(false);
  const [activeCat,  setActiveCat] = useState('All');
  const [search,     setSearch]    = useState('');
  const [uploadOpen, setUploadOpen]= useState(false);
  const [selected,   setSelected]  = useState<TechDoc | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get<TechDoc[] | { data: TechDoc[] }>('/tech-documents');
      setDocs(Array.isArray(res) ? res : (res as any).data ?? []);
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const q = search.trim().toLowerCase();
  const filtered = docs.filter(d => {
    const catOk    = activeCat === 'All' || d.category === activeCat;
    const searchOk = !q
      || d.title.toLowerCase().includes(q)
      || (d.description ?? '').toLowerCase().includes(q)
      || d.category.toLowerCase().includes(q)
      || (d.uploadedBy?.fullName ?? '').toLowerCase().includes(q);
    return catOk && searchOk;
  });

  const recentCount    = docs.filter(d => new Date(d.createdAt) > new Date(Date.now() - 30 * 86400000)).length;
  const totalDownloads = docs.reduce((s, d) => s + (d.downloadCount ?? 0), 0);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title={isAr ? 'الوثائق التقنية' : 'Technical Docs'}
        subtitle={`${docs.length} ${isAr ? 'وثيقة' : 'documents'}`}
        showBack
      />

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => String(i.id)}
          renderItem={({ item }) => <DocCard item={item} onPress={() => setSelected(item)} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListHeaderComponent={
            <>
              {/* KPI row */}
              <View style={styles.statsRow}>
                <StatCard label={isAr ? 'الإجمالي' : 'Total'}     value={String(docs.length)}    icon="documents-outline"  color={colors.primary} style={styles.stat} />
                <StatCard label={isAr ? 'جديد' : 'Recent'}        value={String(recentCount)}    icon="time-outline"       color={colors.success} style={styles.stat} />
                <StatCard label={isAr ? 'مشاهدات' : 'Views'}      value={String(totalDownloads)} icon="eye-outline"        color={colors.warning} style={styles.stat} />
              </View>

              {/* Search */}
              <View style={[styles.searchBox, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                <Ionicons name="search-outline" size={16} color={colors.textMuted} />
                <TextInput
                  style={[styles.searchInput, { color: colors.text }]}
                  value={search}
                  onChangeText={setSearch}
                  placeholder={isAr ? 'بحث في الوثائق...' : 'Search documents...'}
                  placeholderTextColor={colors.textMuted}
                  returnKeyType="search"
                  autoCorrect={false}
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
                    <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Category tabs */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity key={cat}
                    style={[styles.catTab, { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
                      activeCat === cat && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                    onPress={() => setActiveCat(cat)}>
                    <Text style={[styles.catTabText, { color: colors.textSecondary }, activeCat === cat && { color: '#fff' }]}>
                      {isAr ? CATEGORIES_AR[cat] : cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Result count when searching */}
              {q ? (
                <Text style={[styles.resultCount, { color: colors.textMuted }]}>
                  {filtered.length} {isAr ? 'نتيجة' : 'result(s)'}
                </Text>
              ) : null}
            </>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="documents-outline" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {q ? (isAr ? 'لا توجد نتائج' : 'No results found') : (isAr ? 'لا توجد وثائق' : 'No documents')}
              </Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={[styles.fab, { backgroundColor: colors.primary }]} onPress={() => setUploadOpen(true)} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Upload modal */}
      <UploadModal
        visible={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={() => { setUploadOpen(false); setLoading(true); void load(); }}
      />

      {/* Doc detail sheet */}
      {selected && (
        <DocDetailSheet
          doc={selected}
          onClose={() => setSelected(null)}
          onDeleted={() => { setDocs(prev => prev.filter(d => d.id !== selected.id)); setSelected(null); }}
          onEdited={() => { setSelected(null); setLoading(true); void load(); }}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const THUMB = (SW - spacing.md * 2 - spacing.sm * 2) / 3;

const styles = StyleSheet.create({
  safe:    { flex: 1 },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:    { padding: spacing.md, paddingBottom: 110 },

  statsRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md },
  stat:     { flex: 1 },

  // Search
  searchBox:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.sm, paddingVertical: 9, marginBottom: spacing.sm },
  searchInput: { flex: 1, ...typography.body, paddingVertical: 0 },

  catScroll: { marginBottom: spacing.sm },
  catTab:    { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1.5, marginRight: spacing.sm },
  catTabText:{ fontSize: 12, fontWeight: '700' },

  resultCount: { ...typography.caption, marginBottom: spacing.sm },

  // Doc card
  docCard:    { flexDirection: 'row', alignItems: 'flex-start', borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, gap: spacing.sm, ...shadow.sm },
  docIcon:    { width: 44, height: 44, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  docContent: { flex: 1 },
  docTitle:   { ...typography.h4, marginBottom: 4 },
  docMeta:    { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 2, flexWrap: 'wrap' },
  catBadge:   { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full },
  catBadgeText: { fontSize: 10, fontWeight: '700' },
  downloads:  { ...typography.caption },
  docDesc:    { ...typography.caption },
  uploader:   { ...typography.caption, marginTop: 2 },
  docChevron: { justifyContent: 'center', paddingLeft: 4 },

  // Empty
  empty:     { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText: { ...typography.bodySmall },

  // FAB
  fab: { position: 'absolute', bottom: 28, right: 24, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', ...shadow.lg },

  // Modals shared
  overlay:   { flex: 1, justifyContent: 'flex-end' },
  overlayBg: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:     { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: 0, maxHeight: '90%' },
  handle:    { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  sheetTitle: { ...typography.h3, textAlign: 'center', marginBottom: spacing.lg },
  sheetFooter:{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, paddingBottom: 34 },

  // Upload modal fields
  fieldLabel: { ...typography.caption, marginBottom: 6, marginTop: spacing.sm },
  input:      { borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: 11, ...typography.body, marginBottom: 4 },
  inputMulti: { height: 72, textAlignVertical: 'top' },
  catChip:    { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1.5, marginRight: spacing.sm },
  catChipText:{ fontSize: 12, fontWeight: '600' },
  fileBtn:    { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 11, marginVertical: spacing.sm },
  fileBtnText:{ fontSize: 14, fontWeight: '600' },
  cancelBtn:  { flex: 1, paddingVertical: 13, borderRadius: radius.md, borderWidth: 1.5, alignItems: 'center' },
  cancelText: { ...typography.body, fontWeight: '600' },
  saveBtn:    { flex: 2, paddingVertical: 13, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  saveText:   { ...typography.body, fontWeight: '700', color: '#fff' },

  // Edit form
  editInput:      { borderWidth: 1.5, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: 14 },
  editInputMulti: { height: 72, textAlignVertical: 'top' },
  editCatChip:    { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1.5, marginRight: spacing.xs },

  // Detail sheet
  sheetHeaderRow: { flexDirection: 'row', alignItems: 'flex-start' },
  docIconLg:      { width: 52, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  sheetDocTitle:  { ...typography.h3, lineHeight: 22 },
  sheetDesc:      { ...typography.body, lineHeight: 22, marginBottom: spacing.md },

  metaBox:  { borderWidth: 1, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.md, gap: spacing.xs },
  metaRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  metaText: { ...typography.bodySmall },

  sectionLabel: { ...typography.sectionLabel, marginBottom: spacing.sm },

  // Photo grid
  photoGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  photoThumb:    { width: THUMB, height: THUMB, borderRadius: radius.sm, overflow: 'hidden' },
  photoThumbImg: { width: '100%', height: '100%' },
  photoOverlay:  { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center' },

  // Sheet actions
  sheetActions: { gap: spacing.sm, paddingBottom: spacing.md },
  openBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: 14, borderRadius: radius.md },
  openBtnText:  { ...typography.body, fontWeight: '700', color: '#fff' },
  deleteBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: 12, borderRadius: radius.md, borderWidth: 1.5 },
  deleteBtnText:{ ...typography.body, fontWeight: '700' },
});
