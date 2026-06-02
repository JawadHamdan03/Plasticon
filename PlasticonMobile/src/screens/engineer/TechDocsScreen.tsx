import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, KeyboardAvoidingView,
  Linking, Modal, Platform, Pressable, RefreshControl,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
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

interface TechDoc {
  id: number;
  title: string;
  category: string;
  description?: string | null;
  fileName?: string | null;
  filePath?: string | null;
  downloadCount: number;
  uploadedBy?: { id: number; fullName: string } | null;
  createdAt: string;
}

const CATEGORIES = ['All', 'Manual', 'Maintenance', 'Safety', 'Reference', 'Support', 'Other'];
const CATEGORIES_AR: Record<string, string> = {
  All: 'الكل', Manual: 'دليل', Maintenance: 'صيانة', Safety: 'سلامة',
  Reference: 'مرجع', Support: 'دعم', Other: 'أخرى',
};

const CAT_COLOR: Record<string, string> = {
  Manual: '#1d4ed8', Maintenance: '#d97706', Safety: '#dc2626',
  Reference: '#7c3aed', Support: '#059669', Other: '#6b7280',
};

interface UploadForm { title: string; category: string; description: string }
const emptyForm = (): UploadForm => ({ title: '', category: 'Manual', description: '' });

function UploadModal({ visible, onClose, onUploaded }: {
  visible: boolean; onClose: () => void; onUploaded: () => void;
}) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const [form, setForm]     = useState(emptyForm());
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof UploadForm) => (v: string) => setForm((p) => ({ ...p, [k]: v }));

  useEffect(() => { if (visible) { setForm(emptyForm()); setFileUri(null); } }, [visible]);

  const pickFile = async () => {
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

  const uploadCats = CATEGORIES.filter((c) => c !== 'All');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={styles.overlayBg} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <Text style={[styles.sheetTitle, { color: colors.text }]}>{isAr ? 'رفع وثيقة جديدة' : 'Upload New Document'}</Text>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{isAr ? 'العنوان *' : 'Title *'}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }]}
              value={form.title} onChangeText={set('title')}
              placeholder={isAr ? 'مثال: دليل الآلة أ' : 'e.g. Machine A – User Manual'}
              placeholderTextColor={colors.textMuted}
            />
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{isAr ? 'الفئة' : 'Category'}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
              {uploadCats.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catChip, { borderColor: colors.border, backgroundColor: colors.surfaceAlt },
                    form.category === cat && { borderColor: CAT_COLOR[cat] ?? colors.primary, backgroundColor: `${CAT_COLOR[cat] ?? colors.primary}18` }]}
                  onPress={() => set('category')(cat)}
                >
                  <Text style={[styles.catChipText, { color: colors.textSecondary }, form.category === cat && { color: CAT_COLOR[cat] ?? colors.primary }]}>
                    {isAr ? CATEGORIES_AR[cat] : cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{isAr ? 'الوصف' : 'Description'}</Text>
            <TextInput
              style={[styles.input, styles.inputMulti, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }]}
              value={form.description} onChangeText={set('description')}
              placeholder={isAr ? 'وصف مختصر للوثيقة...' : 'Brief description...'}
              placeholderTextColor={colors.textMuted} multiline textAlignVertical="top"
            />
            <TouchableOpacity style={[styles.fileBtn, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]} onPress={pickFile}>
              <Ionicons name={fileUri ? 'document' : 'document-outline'} size={18} color={fileUri ? colors.success : colors.primary} />
              <Text style={[styles.fileBtnText, { color: fileUri ? colors.success : colors.primary }]}>
                {fileUri ? (isAr ? 'ملف محدد ✓' : 'File selected ✓') : (isAr ? 'اختيار ملف / صورة' : 'Choose file / image')}
              </Text>
            </TouchableOpacity>
          </ScrollView>
          <View style={styles.sheetActions}>
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

function DocCard({ item, onDelete }: { item: TechDoc; onDelete: () => void }) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const color = CAT_COLOR[item.category] ?? '#6b7280';

  const open = async () => {
    if (item.filePath) {
      const url = `${API_BASE}/pictures/${item.filePath}`;
      await api.patch(`/tech-documents/${item.id}/download`, {}).catch(() => {});
      void Linking.openURL(url);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      isAr ? 'حذف الوثيقة' : 'Delete Document',
      `"${item.title}"?`,
      [
        { text: isAr ? 'إلغاء' : 'Cancel', style: 'cancel' },
        { text: isAr ? 'حذف' : 'Delete', style: 'destructive', onPress: onDelete },
      ],
    );
  };

  return (
    <TouchableOpacity style={[styles.docCard, { backgroundColor: colors.surface }]} onPress={open} activeOpacity={item.filePath ? 0.75 : 1}>
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
            <Text style={[styles.downloads, { color: colors.textMuted }]}>{item.downloadCount} ↓</Text>
          )}
        </View>
        {item.description ? <Text style={[styles.docDesc, { color: colors.textMuted }]} numberOfLines={1}>{item.description}</Text> : null}
        {item.uploadedBy && <Text style={[styles.uploader, { color: colors.textMuted }]}>{isAr ? 'بواسطة' : 'by'} {item.uploadedBy.fullName}</Text>}
      </View>
      <View style={styles.docActions}>
        {item.filePath && <Ionicons name="open-outline" size={16} color={colors.primary} style={{ marginBottom: 6 }} />}
        <TouchableOpacity onPress={confirmDelete} hitSlop={8}>
          <Ionicons name="trash-outline" size={16} color={colors.danger} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export function TechDocsScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const [docs, setDocs]           = useState<TechDoc[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCat, setActiveCat] = useState('All');
  const [modal, setModal]         = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<TechDoc[] | { data: TechDoc[] }>('/tech-documents');
      setDocs(Array.isArray(res) ? res : (res as any).data ?? []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/tech-documents/${id}`);
      setDocs((prev) => prev.filter((d) => d.id !== id));
    } catch (e: any) {
      Alert.alert(isAr ? 'خطأ' : 'Error', e?.message ?? (isAr ? 'فشل الحذف.' : 'Failed to delete.'));
    }
  };

  const filtered = activeCat === 'All' ? docs : docs.filter((d) => d.category === activeCat);
  const recentCount = docs.filter((d) => new Date(d.createdAt) > new Date(Date.now() - 30 * 86400000)).length;
  const totalDownloads = docs.reduce((s, d) => s + (d.downloadCount ?? 0), 0);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={isAr ? 'الوثائق التقنية' : 'Technical Docs'} subtitle={`${docs.length} ${isAr ? 'وثيقة' : 'documents'}`} showBack />

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => String(i.id)}
          renderItem={({ item }) => <DocCard item={item} onDelete={() => void handleDelete(item.id)} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListHeaderComponent={
            <>
              <View style={styles.statsRow}>
                <StatCard label={isAr ? 'الإجمالي' : 'Total'}   value={String(docs.length)}   icon="documents-outline"      color={colors.primary} style={styles.stat} />
                <StatCard label={isAr ? 'جديد' : 'Recent'}      value={String(recentCount)}   icon="time-outline"           color={colors.success} style={styles.stat} />
                <StatCard label={isAr ? 'تحميلات' : 'Downloads'} value={String(totalDownloads)} icon="download-outline"     color={colors.warning} style={styles.stat} />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.catTab, { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
                      activeCat === cat && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                    onPress={() => setActiveCat(cat)}
                  >
                    <Text style={[styles.catTabText, { color: colors.textSecondary }, activeCat === cat && { color: '#fff' }]}>
                      {isAr ? CATEGORIES_AR[cat] : cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="documents-outline" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>{isAr ? 'لا توجد وثائق' : 'No documents'}</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity style={[styles.fab, { backgroundColor: colors.primary }]} onPress={() => setModal(true)} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <UploadModal visible={modal} onClose={() => setModal(false)} onUploaded={() => { setModal(false); setLoading(true); void load(); }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:     { flex: 1 },
  center:   { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:     { padding: spacing.md, paddingBottom: 100 },
  statsRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md },
  stat:     { flex: 1 },
  catScroll: { marginBottom: spacing.md },
  catTab:    { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1.5, marginRight: spacing.sm },
  catTabText: { fontSize: 12, fontWeight: '700' },

  docCard:    { flexDirection: 'row', alignItems: 'flex-start', borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, gap: spacing.md, ...shadow.sm },
  docIcon:    { width: 44, height: 44, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  docContent: { flex: 1 },
  docTitle:   { ...typography.h4, marginBottom: 4 },
  docMeta:    { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 2 },
  catBadge:   { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full },
  catBadgeText: { fontSize: 10, fontWeight: '700' },
  downloads:  { ...typography.caption },
  docDesc:    { ...typography.caption },
  uploader:   { ...typography.caption, marginTop: 2 },
  docActions: { alignItems: 'center', gap: 4 },

  empty:     { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText: { ...typography.bodySmall },

  fab: { position: 'absolute', bottom: 28, right: 24, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', ...shadow.lg },

  overlay:   { flex: 1, justifyContent: 'flex-end' },
  overlayBg: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:     { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: 40, maxHeight: '88%' },
  handle:    { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  sheetTitle: { ...typography.h3, textAlign: 'center', marginBottom: spacing.lg },
  fieldLabel: { ...typography.caption, marginBottom: 6, marginTop: spacing.sm },
  input:      { borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: 11, ...typography.body, marginBottom: 4 },
  inputMulti: { height: 72, textAlignVertical: 'top' },
  catChip:    { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1.5, marginRight: spacing.sm },
  catChipText: { fontSize: 12, fontWeight: '600' },
  fileBtn:    { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 11, marginVertical: spacing.sm },
  fileBtnText: { fontSize: 14, fontWeight: '600' },
  sheetActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: radius.md, borderWidth: 1.5, alignItems: 'center' },
  cancelText: { ...typography.body, fontWeight: '600' },
  saveBtn:   { flex: 2, paddingVertical: 13, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  saveText:  { ...typography.body, fontWeight: '700', color: '#fff' },
});
