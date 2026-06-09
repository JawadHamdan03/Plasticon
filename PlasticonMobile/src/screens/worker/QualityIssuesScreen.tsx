import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, Platform,
  RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { api, uploadForm } from '../../api/client';
import { ScreenHeader } from '../../components';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
import { API_BASE } from '../../config';

interface QualityIssue {
  id: number;
  batch_code: string;
  machine_label: string;
  issue_type: string;
  details?: string | null;
  issue_image?: string | null;
  created_at: string;
}

interface PickedImage {
  uri: string;
  fileName?: string;
  mimeType?: string;
}

function toImageUri(stored?: string | null): string | null {
  if (!stored) return null;
  return `${API_BASE}/${stored.replace(/^prisma\/?pictures\//, 'pictures/')}`;
}

export function QualityIssuesScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();

  const today0 = new Date().toISOString().slice(0, 10);
  const month0 = new Date().toISOString().slice(0, 7) + '-01';
  const [fromDate, setFromDate] = useState(month0);
  const [toDate,   setToDate]   = useState(today0);
  const [issues,     setIssues]     = useState<QualityIssue[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal,      setModal]      = useState(false);
  const [batchCode,  setBatchCode]  = useState('');
  const [machineLbl, setMachineLbl] = useState('');
  const [issueType,  setIssueType]  = useState('');
  const [details,    setDetails]    = useState('');
  const [image,      setImage]      = useState<PickedImage | null>(null);
  const [saving,     setSaving]     = useState(false);
  const [fullImage,  setFullImage]  = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get<QualityIssue[] | { data: QualityIssue[] }>('/worker-tools/quality-issues/mine');
      setIssues(Array.isArray(res) ? res : ((res as any).data ?? []));
    } catch { setIssues([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const inRange = (d: string) => {
    const s = d.slice(0, 10);
    return (!fromDate || s >= fromDate) && (!toDate || s <= toDate);
  };

  const filteredIssues = useMemo(() => issues.filter(i => inRange(i.created_at)), [issues, fromDate, toDate]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission required', 'Please allow access to your photo library.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0];
      setImage({ uri: a.uri, fileName: a.fileName ?? undefined, mimeType: a.mimeType ?? undefined });
    }
  };

  const handleDelete = (issue: QualityIssue) => {
    Alert.alert(
      isAr ? 'حذف التقرير' : 'Delete Report',
      isAr ? 'هل أنت متأكد؟' : 'Are you sure?',
      [
        { text: isAr ? 'إلغاء' : 'Cancel', style: 'cancel' },
        {
          text: isAr ? 'حذف' : 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/worker-tools/entries/quality/${issue.id}`);
              setIssues((prev) => prev.filter((i) => i.id !== issue.id));
            } catch (e: any) {
              Alert.alert(isAr ? 'خطأ' : 'Error', e.message ?? 'Failed');
            }
          },
        },
      ],
    );
  };

  const submit = async () => {
    if (!batchCode.trim()) { Alert.alert(isAr ? 'مطلوب' : 'Required', isAr ? 'أدخل رمز الدُّفعة.' : 'Enter batch code.'); return; }
    if (!machineLbl.trim()) { Alert.alert(isAr ? 'مطلوب' : 'Required', isAr ? 'أدخل اسم الآلة.' : 'Enter machine label.'); return; }
    if (!issueType.trim()) { Alert.alert(isAr ? 'مطلوب' : 'Required', isAr ? 'أدخل نوع المشكلة.' : 'Enter issue type.'); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('batchCode',    batchCode.trim());
      fd.append('machineLabel', machineLbl.trim());
      fd.append('issueType',    issueType.trim());
      fd.append('details',      details.trim());
      if (image) {
        fd.append('issueImage', { uri: image.uri, name: image.fileName ?? 'issue.jpg', type: image.mimeType ?? 'image/jpeg' } as any);
      }
      await uploadForm('/worker-tools/quality-issues', fd);
      setModal(false);
      setBatchCode(''); setMachineLbl(''); setIssueType(''); setDetails(''); setImage(null);
      setLoading(true); void load();
    } catch (e: any) {
      Alert.alert(isAr ? 'خطأ' : 'Error', e.message ?? (isAr ? 'فشل الإبلاغ.' : 'Failed to report issue.'));
    } finally { setSaving(false); }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={isAr ? 'مشاكل الجودة' : 'Quality Issues'} subtitle={`${issues.length} ${isAr ? 'مسجل' : 'reported'}`} showBack />
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.warning} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.warning} />}
        >
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
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.warning }]} onPress={() => setModal(true)} activeOpacity={0.8}>
            <Ionicons name="alert-circle" size={20} color="#fff" />
            <Text style={styles.addText}>{isAr ? 'الإبلاغ عن مشكلة جودة' : 'Report Quality Issue'}</Text>
          </TouchableOpacity>

          {filteredIssues.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="shield-checkmark-outline" size={48} color={colors.success} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>{isAr ? 'لا توجد مشاكل جودة مسجلة' : 'No quality issues reported'}</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {filteredIssues.map((issue, idx) => {
                const imgUri = toImageUri(issue.issue_image);
                return (
                  <View key={`${issue.id}-${idx}`} style={[styles.card, { backgroundColor: colors.surface, borderLeftColor: colors.warning }]}>
                    <View style={styles.cardTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.cardBatch, { color: colors.warning }]}>{issue.batch_code}</Text>
                        <Text style={[styles.cardMachine, { color: colors.text }]}>{issue.machine_label}</Text>
                      </View>
                      <View style={[styles.typeBadge, { backgroundColor: `${colors.warning}20` }]}>
                        <Text style={[styles.typeBadgeText, { color: colors.warning }]}>{issue.issue_type}</Text>
                      </View>
                      <TouchableOpacity onPress={() => handleDelete(issue)} hitSlop={8} style={{ marginLeft: 6 }}>
                        <Ionicons name="trash-outline" size={16} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                    {issue.details ? <Text style={[styles.cardDetails, { color: colors.textMuted }]} numberOfLines={2}>{issue.details}</Text> : null}
                    {imgUri && (
                      <TouchableOpacity onPress={() => setFullImage(imgUri)} style={styles.imgWrap}>
                        <Image source={{ uri: imgUri }} style={[styles.thumb, { backgroundColor: colors.border }]} resizeMode="cover" />
                      </TouchableOpacity>
                    )}
                    <Text style={[styles.dateText, { color: colors.textMuted }]}>{new Date(issue.created_at).toLocaleString()}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}

      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={[styles.sheetTitle, { color: colors.text }]}>{isAr ? 'الإبلاغ عن مشكلة جودة' : 'Report Quality Issue'}</Text>

              <Text style={[styles.label, { color: colors.textMuted }]}>{isAr ? 'رمز الدُّفعة *' : 'Batch Code *'}</Text>
              <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]} placeholder={isAr ? 'مثال: BATCH-2024-001' : 'e.g. BATCH-2024-001'} placeholderTextColor={colors.textMuted} value={batchCode} onChangeText={setBatchCode} />

              <Text style={[styles.label, { color: colors.textMuted }]}>{isAr ? 'اسم الآلة *' : 'Machine Label *'}</Text>
              <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]} placeholder={isAr ? 'مثال: خط PVC 2' : 'e.g. PVC Line 2'} placeholderTextColor={colors.textMuted} value={machineLbl} onChangeText={setMachineLbl} />

              <Text style={[styles.label, { color: colors.textMuted }]}>{isAr ? 'نوع المشكلة *' : 'Issue Type *'}</Text>
              <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]} placeholder={isAr ? 'مثال: عيب في الحجم، لون غير صحيح' : 'e.g. Size defect, Wrong color'} placeholderTextColor={colors.textMuted} value={issueType} onChangeText={setIssueType} />

              <Text style={[styles.label, { color: colors.textMuted }]}>{isAr ? 'التفاصيل (اختياري)' : 'Details (optional)'}</Text>
              <TextInput style={[styles.input, styles.inputMulti, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]} placeholder={isAr ? 'اشرح المشكلة بالتفصيل…' : 'Describe the quality issue in detail…'} placeholderTextColor={colors.textMuted} value={details} onChangeText={setDetails} multiline numberOfLines={3} />

              <Text style={[styles.label, { color: colors.textMuted }]}>{isAr ? 'صورة (اختياري)' : 'Photo (optional)'}</Text>
              <TouchableOpacity
                style={[styles.photoPicker, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}
                onPress={pickImage}
                activeOpacity={0.8}
              >
                {image ? (
                  <Image source={{ uri: image.uri }} style={styles.photoPickerImg} resizeMode="cover" />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Ionicons name="camera-outline" size={22} color={colors.textMuted} />
                    <Text style={[styles.photoLabel, { color: colors.textMuted }]}>{isAr ? 'اختر صورة' : 'Select Photo'}</Text>
                  </View>
                )}
              </TouchableOpacity>

            </ScrollView>
            <View style={styles.actions}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => setModal(false)}>
                <Text style={[styles.cancelText, { color: colors.textMuted }]}>{isAr ? 'إلغاء' : 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.warning }]} onPress={submit} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitText}>{isAr ? 'إبلاغ' : 'Report'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={!!fullImage} transparent animationType="fade" onRequestClose={() => setFullImage(null)}>
        <View style={styles.imgViewerOverlay}>
          <TouchableOpacity style={styles.imgViewerClose} onPress={() => setFullImage(null)}>
            <Ionicons name="close-circle" size={36} color="#fff" />
          </TouchableOpacity>
          {fullImage && <Image source={{ uri: fullImage }} style={styles.fullImg} resizeMode="contain" />}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:          { flex: 1 },
  center:        { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content:       { padding: spacing.md, paddingBottom: 40 },
  addBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: radius.lg, paddingVertical: 12, marginBottom: spacing.md },
  addText:       { ...typography.bodySmall, fontWeight: '700', color: '#fff' },
  empty:         { alignItems: 'center', paddingVertical: 60, gap: spacing.sm },
  emptyText:     { ...typography.bodySmall },
  list:          { gap: spacing.sm },
  card:          { borderRadius: radius.lg, padding: spacing.md, borderLeftWidth: 3, ...shadow.sm },
  cardTop:       { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 4 },
  cardBatch:     { fontSize: 11, fontWeight: '700' },
  cardMachine:   { ...typography.h4 },
  typeBadge:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm },
  typeBadgeText: { fontSize: 11, fontWeight: '700' },
  cardDetails:   { ...typography.bodySmall, marginBottom: 6 },
  imgWrap:       { marginBottom: 6 },
  thumb:         { width: '100%', height: 120, borderRadius: radius.sm },
  dateText:      { ...typography.caption },
  overlay:       { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:         { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: spacing.md, maxHeight: '92%', flexShrink: 1 },
  handle:        { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  sheetTitle:    { ...typography.h2, marginBottom: spacing.md },
  label:         { ...typography.caption, marginBottom: 6 },
  input:         { borderWidth: 1.5, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: 15, marginBottom: spacing.md },
  inputMulti:    { height: 80, textAlignVertical: 'top' },
  photoPicker:   { height: 90, borderRadius: radius.sm, borderWidth: 1.5, borderStyle: 'dashed', overflow: 'hidden', marginBottom: spacing.md },
  photoPickerImg: { width: '100%', height: '100%' },
  photoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  photoLabel:    { ...typography.caption },
  actions:       { flexDirection: 'row', gap: spacing.sm },
  cancelBtn:     { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: radius.md, borderWidth: 1.5 },
  cancelText:    { fontWeight: '700' },
  submitBtn:     { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: radius.md },
  submitText:    { fontWeight: '700', color: '#fff' },
  imgViewerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  imgViewerClose:   { position: 'absolute', top: 50, right: 20, zIndex: 10 },
  fullImg:          { width: '100%', height: '80%' },
  filterBar:   { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 10, marginBottom: 8 },
  filterInput: { flex: 1, borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, fontSize: 13 },
  filterReset: { width: 30, height: 30, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
