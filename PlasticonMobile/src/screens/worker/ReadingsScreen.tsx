import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, RefreshControl, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { api, uploadForm } from '../../api/client';
import { ScreenHeader } from '../../components';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';

interface Reading {
  id:        number;
  value:     number;
  unit?:     string;
  notes?:    string;
  imagePath?: string;
  createdAt: string;
  user?:     { fullName: string };
}

export function ReadingsScreen() {
  const { colors } = useAppTheme();
  const [readings,   setReadings]   = useState<Reading[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [value,      setValue]      = useState('');
  const [notes,      setNotes]      = useState('');
  const [saving,     setSaving]     = useState(false);
  const [showForm,   setShowForm]   = useState(false);
  const [photoUri,   setPhotoUri]   = useState<string | null>(null);
  const [photoMime,  setPhotoMime]  = useState<string>('image/jpeg');

  const load = useCallback(async () => {
    try {
      const res = await api.get<Reading[] | { data: Reading[] }>('/electricity/readings');
      setReadings(Array.isArray(res) ? res : (res.data ?? []));
    } catch { setReadings([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const capturePhoto = async (fromCamera: boolean) => {
    if (fromCamera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('إذن مطلوب', 'يجب السماح بالوصول إلى الكاميرا.');
        return;
      }
      const res = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
      if (!res.canceled && res.assets?.[0]) {
        setPhotoUri(res.assets[0].uri);
        setPhotoMime(res.assets[0].mimeType ?? 'image/jpeg');
      }
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('إذن مطلوب', 'يجب السماح بالوصول إلى مكتبة الصور.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
      if (!res.canceled && res.assets?.[0]) {
        setPhotoUri(res.assets[0].uri);
        setPhotoMime(res.assets[0].mimeType ?? 'image/jpeg');
      }
    }
  };

  const showPhotoOptions = () => {
    Alert.alert(
      'إضافة صورة العداد',
      'اختر طريقة التقاط الصورة',
      [
        { text: 'الكاميرا',         onPress: () => capturePhoto(true)  },
        { text: 'من المعرض',       onPress: () => capturePhoto(false) },
        { text: 'إلغاء', style: 'cancel' },
      ],
    );
  };

  const submit = async () => {
    if (!value.trim() || isNaN(Number(value))) {
      Alert.alert('مطلوب', 'أدخل قيمة قراءة صالحة.');
      return;
    }
    setSaving(true);
    try {
      if (photoUri) {
        const form = new FormData();
        form.append('value', value.trim());
        if (notes.trim()) form.append('notes', notes.trim());
        form.append('image', { uri: photoUri, name: 'reading.jpg', type: photoMime } as any);
        await uploadForm('/electricity/readings', form);
      } else {
        await api.post('/electricity/readings', {
          value: parseFloat(value),
          notes: notes.trim() || undefined,
        });
      }
      setValue(''); setNotes(''); setPhotoUri(null); setShowForm(false);
      setLoading(true); void load();
    } catch (e: any) {
      Alert.alert('خطأ', e.message ?? ('فشل حفظ القراءة.'));
    } finally { setSaving(false); }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={'القراءات'} subtitle={'قراءات عداد الكهرباء'} showBack />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.warning} />}
      >
        {showForm ? (
          <View style={[styles.form, { backgroundColor: colors.surface }]}>
            <View style={styles.formTitleRow}>
              <Text style={[styles.formTitle, { color: colors.text }]}>{'تسجيل قراءة جديدة'}</Text>
              <TouchableOpacity onPress={showPhotoOptions} style={[styles.cameraBtn, { backgroundColor: `${colors.warning}15` }]}>
                <Ionicons name="camera" size={20} color={colors.warning} />
              </TouchableOpacity>
            </View>

            {photoUri ? (
              <View style={styles.photoPreviewWrap}>
                <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
                <TouchableOpacity style={[styles.removePhotoBtn, { backgroundColor: colors.danger }]} onPress={() => setPhotoUri(null)}>
                  <Ionicons name="close" size={14} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={[styles.photoPlaceholder, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]} onPress={showPhotoOptions} activeOpacity={0.75}>
                <Ionicons name="camera-outline" size={22} color={colors.textMuted} />
                <Text style={[styles.photoPlaceholderText, { color: colors.textMuted }]}>{'التقط صورة العداد (اختياري)'}</Text>
              </TouchableOpacity>
            )}

            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
              placeholder={'قيمة العداد (كيلوواط/ساعة)'}
              placeholderTextColor={colors.textMuted}
              value={value}
              onChangeText={setValue}
              keyboardType="numeric"
            />
            <TextInput
              style={[styles.input, styles.inputMulti, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
              placeholder={'ملاحظات (اختياري)'}
              placeholderTextColor={colors.textMuted}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={2}
            />
            <View style={styles.formRow}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => { setShowForm(false); setPhotoUri(null); }}>
                <Text style={[styles.cancelText, { color: colors.textMuted }]}>{'إلغاء'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.warning }]} onPress={submit} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>{'حفظ'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.warning }]} onPress={() => setShowForm(true)} activeOpacity={0.8}>
            <Ionicons name="add-circle" size={20} color="#fff" />
            <Text style={styles.addText}>{'تسجيل قراءة'}</Text>
          </TouchableOpacity>
        )}

        {loading ? <ActivityIndicator style={{ marginTop: 40 }} color={colors.warning} /> : (
          readings.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="flash-outline" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>{'لا توجد قراءات مسجلة'}</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {readings.map((r, idx) => (
                <View key={`${r.id}-${idx}`} style={[styles.card, { backgroundColor: colors.surface }]}>
                  <View style={[styles.cardIcon, { backgroundColor: `${colors.warning}15` }]}>
                    <Ionicons name="flash" size={20} color={colors.warning} />
                  </View>
                  <View style={styles.cardBody}>
                    <Text style={[styles.cardValue, { color: colors.text }]}>{r.value} {r.unit ?? 'kWh'}</Text>
                    {r.notes ? <Text style={[styles.cardNotes, { color: colors.textMuted }]}>{r.notes}</Text> : null}
                    <Text style={[styles.cardDate, { color: colors.textMuted }]}>{new Date(r.createdAt).toLocaleString()}</Text>
                  </View>
                  {r.imagePath ? (
                    <Ionicons name="image-outline" size={18} color={colors.warning} style={{ marginLeft: 'auto' }} />
                  ) : null}
                </View>
              ))}
            </View>
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1 },
  content: { padding: spacing.md, paddingBottom: 40 },

  form:        { borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, ...shadow.sm },
  formTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  formTitle:   { ...typography.h4 },
  cameraBtn:   { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },

  photoPreviewWrap: { position: 'relative', marginBottom: spacing.sm },
  photoPreview:     { width: '100%', height: 160, borderRadius: radius.md },
  removePhotoBtn:   { position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  photoPlaceholder:     { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderStyle: 'dashed', borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.sm, justifyContent: 'center' },
  photoPlaceholderText: { ...typography.caption },

  input:      { borderWidth: 1.5, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: 15, marginBottom: spacing.sm },
  inputMulti: { height: 64, textAlignVertical: 'top' },
  formRow:    { flexDirection: 'row', gap: spacing.sm },
  cancelBtn:  { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: radius.md, borderWidth: 1.5 },
  cancelText: { ...typography.bodySmall, fontWeight: '700' },
  saveBtn:    { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: radius.md },
  saveText:   { ...typography.bodySmall, fontWeight: '700', color: '#fff' },

  addBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: radius.lg, paddingVertical: 12, marginBottom: spacing.md },
  addText: { ...typography.bodySmall, fontWeight: '700', color: '#fff' },

  empty:     { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.sm },
  emptyText: { ...typography.bodySmall },

  list:      { gap: spacing.sm },
  card:      { flexDirection: 'row', alignItems: 'center', borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm, ...shadow.sm },
  cardIcon:  { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  cardBody:  { flex: 1 },
  cardValue: { ...typography.h4 },
  cardNotes: { ...typography.caption },
  cardDate:  { ...typography.caption },
});
