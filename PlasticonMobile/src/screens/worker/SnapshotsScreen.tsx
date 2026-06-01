import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Image, KeyboardAvoidingView,
  Modal, Platform, RefreshControl, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { api, uploadForm } from '../../api/client';
import { ScreenHeader } from '../../components';
import { radius, shadow, spacing, typography } from '../../theme';
import { API_BASE } from '../../config';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

interface WorkerSnapshot {
  id: number;
  createdAt: string;
  machineLabel: string;
  machineCounter: number;
  electricityKwh: number;
  notes: string | null;
  machineCounterImage?: string | null;
  electricityImage?: string | null;
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

function fmtDT(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} · ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

async function pickImage(): Promise<PickedImage | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission required', 'Please allow access to your photo library.');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.8,
  });
  if (result.canceled || !result.assets[0]) return null;
  const a = result.assets[0];
  return { uri: a.uri, fileName: a.fileName ?? undefined, mimeType: a.mimeType ?? undefined };
}

function PhotoPicker({ label, image, onPick, colors }: {
  label: string; image: PickedImage | null; onPick: () => void; colors: any;
}) {
  return (
    <TouchableOpacity
      style={[styles.photoPicker, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}
      onPress={onPick}
      activeOpacity={0.8}
    >
      {image ? (
        <Image source={{ uri: image.uri }} style={styles.photoPickerImg} resizeMode="cover" />
      ) : (
        <View style={styles.photoPickerPlaceholder}>
          <Ionicons name="camera-outline" size={22} color={colors.textMuted} />
          <Text style={[styles.photoPickerLabel, { color: colors.textMuted }]}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function SnapCard({
  item, colors, isAr, onEdit, onDelete, onImagePress,
}: {
  item: WorkerSnapshot; colors: any; isAr: boolean;
  onEdit: (s: WorkerSnapshot) => void;
  onDelete: (s: WorkerSnapshot) => void;
  onImagePress: (uri: string) => void;
}) {
  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.cardTop}>
        <View style={[styles.machinePill, { backgroundColor: `${colors.primary}18` }]}>
          <Ionicons name="hardware-chip-outline" size={13} color={colors.primary} />
          <Text style={[styles.machineText, { color: colors.primary }]}>{item.machineLabel}</Text>
        </View>
        <Text style={[styles.cardTime, { color: colors.textMuted }]}>{fmtDT(item.createdAt)}</Text>
        <View style={styles.cardActions}>
          <TouchableOpacity onPress={() => onEdit(item)} hitSlop={8} style={styles.actionIcon}>
            <Ionicons name="create-outline" size={18} color={colors.info} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onDelete(item)} hitSlop={8} style={styles.actionIcon}>
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.metrics}>
        <View style={styles.metric}>
          <Text style={[styles.metricVal, { color: colors.primary }]}>{(item.machineCounter ?? 0).toLocaleString()}</Text>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>{isAr ? 'عداد' : 'Counter'}</Text>
        </View>
        <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />
        <View style={styles.metric}>
          <Text style={[styles.metricVal, { color: colors.accent }]}>{item.electricityKwh}</Text>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>kWh</Text>
        </View>
      </View>

      {item.notes ? <Text style={[styles.notes, { color: colors.textMuted }]}>{item.notes}</Text> : null}

      {(item.machineCounterImage || item.electricityImage) && (
        <View style={styles.photoRow}>
          {toImageUri(item.machineCounterImage) ? (
            <TouchableOpacity onPress={() => onImagePress(toImageUri(item.machineCounterImage)!)} style={styles.photoWrap}>
              <Image source={{ uri: toImageUri(item.machineCounterImage)! }} style={[styles.photo, { backgroundColor: colors.border }]} resizeMode="cover" />
              <View style={styles.photoTag}><Text style={styles.photoTagText}>{isAr ? 'عداد' : 'Counter'}</Text></View>
            </TouchableOpacity>
          ) : null}
          {toImageUri(item.electricityImage) ? (
            <TouchableOpacity onPress={() => onImagePress(toImageUri(item.electricityImage)!)} style={styles.photoWrap}>
              <Image source={{ uri: toImageUri(item.electricityImage)! }} style={[styles.photo, { backgroundColor: colors.border }]} resizeMode="cover" />
              <View style={styles.photoTag}><Text style={styles.photoTagText}>{isAr ? 'كهرباء' : 'Electric'}</Text></View>
            </TouchableOpacity>
          ) : null}
        </View>
      )}
    </View>
  );
}

function SnapModal({
  visible, editing, onClose, onSuccess, colors, isAr,
}: {
  visible: boolean;
  editing: WorkerSnapshot | null;
  onClose: () => void;
  onSuccess: () => void;
  colors: any;
  isAr: boolean;
}) {
  const [machineLabel, setMachineLabel] = useState('');
  const [machineCounter, setMachineCounter] = useState('');
  const [electricityKwh, setElectricityKwh] = useState('');
  const [notes, setNotes] = useState('');
  const [machineImg, setMachineImg] = useState<PickedImage | null>(null);
  const [electricityImg, setElectricityImg] = useState<PickedImage | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible && editing) {
      setMachineLabel(editing.machineLabel ?? '');
      setMachineCounter(String(editing.machineCounter ?? ''));
      setElectricityKwh(String(editing.electricityKwh ?? ''));
      setNotes(editing.notes ?? '');
      setMachineImg(null);
      setElectricityImg(null);
    } else if (visible && !editing) {
      setMachineLabel(''); setMachineCounter(''); setElectricityKwh(''); setNotes('');
      setMachineImg(null); setElectricityImg(null);
    }
  }, [visible, editing]);

  const submit = async () => {
    if (!machineLabel.trim()) {
      Alert.alert(isAr ? 'مطلوب' : 'Required', isAr ? 'أدخل اسم الماكينة' : 'Machine label is required.');
      return;
    }
    const counter = parseFloat(machineCounter);
    const kwh     = parseFloat(electricityKwh);
    if (isNaN(counter) || isNaN(kwh)) {
      Alert.alert(isAr ? 'مطلوب' : 'Required', isAr ? 'أدخل قيم عددية صحيحة' : 'Enter valid numeric values.');
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('machineLabel',   machineLabel.trim());
      fd.append('machineCounter', String(counter));
      fd.append('electricityKwh', String(kwh));
      fd.append('notes',          notes.trim());
      if (machineImg) {
        fd.append('machineCounterImage', {
          uri: machineImg.uri, name: machineImg.fileName ?? 'machine.jpg', type: machineImg.mimeType ?? 'image/jpeg',
        } as any);
      }
      if (electricityImg) {
        fd.append('electricityImage', {
          uri: electricityImg.uri, name: electricityImg.fileName ?? 'electricity.jpg', type: electricityImg.mimeType ?? 'image/jpeg',
        } as any);
      }

      if (editing) {
        await uploadForm(`/settings/snapshots/${editing.id}`, fd, 'PUT');
      } else {
        await uploadForm('/settings/snapshots', fd);
      }
      onSuccess();
    } catch (err: any) {
      Alert.alert(isAr ? 'خطأ' : 'Error', err.message ?? (isAr ? 'فشل الحفظ' : 'Failed to save.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={[styles.sheet, { backgroundColor: colors.surface }]}
          contentContainerStyle={styles.sheetContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <Text style={[styles.sheetTitle, { color: colors.text }]}>
            {editing ? (isAr ? 'تعديل اللقطة' : 'Edit Snapshot') : (isAr ? 'لقطة جديدة' : 'New Snapshot')}
          </Text>

          {([
            { label: isAr ? 'اسم الماكينة *'   : 'Machine Label *',    key: 'machineLabel',   val: machineLabel,   set: setMachineLabel,   kb: 'default' as const },
            { label: isAr ? 'عداد الماكينة *'  : 'Machine Counter *',  key: 'machineCounter', val: machineCounter, set: setMachineCounter, kb: 'numeric' as const },
            { label: isAr ? 'الكهرباء (kWh) *' : 'Electricity (kWh) *', key: 'electricityKwh', val: electricityKwh, set: setElectricityKwh, kb: 'decimal-pad' as const },
          ] as const).map((f) => (
            <View key={f.key} style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{f.label}</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                placeholder={f.label.replace(' *', '')}
                placeholderTextColor={colors.textMuted}
                keyboardType={f.kb}
                value={f.val}
                onChangeText={f.set}
              />
            </View>
          ))}

          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{isAr ? 'ملاحظات' : 'Notes'}</Text>
            <TextInput
              style={[styles.input, styles.inputMulti, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
              placeholder={isAr ? 'ملاحظات اختيارية...' : 'Optional notes...'}
              placeholderTextColor={colors.textMuted}
              multiline numberOfLines={3}
              value={notes}
              onChangeText={setNotes}
            />
          </View>

          <View style={styles.photoPickers}>
            <View style={styles.photoPickerCol}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{isAr ? 'صورة العداد' : 'Counter Photo'}</Text>
              <PhotoPicker
                label={isAr ? 'اختر صورة' : 'Select'}
                image={machineImg}
                onPick={async () => { const img = await pickImage(); if (img) setMachineImg(img); }}
                colors={colors}
              />
            </View>
            <View style={styles.photoPickerCol}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{isAr ? 'صورة الكهرباء' : 'Electricity Photo'}</Text>
              <PhotoPicker
                label={isAr ? 'اختر صورة' : 'Select'}
                image={electricityImg}
                onPick={async () => { const img = await pickImage(); if (img) setElectricityImg(img); }}
                colors={colors}
              />
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={onClose}>
              <Text style={[styles.cancelText, { color: colors.textMuted }]}>{isAr ? 'إلغاء' : 'Cancel'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={submit} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>{isAr ? 'حفظ' : 'Save'}</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function SnapshotsScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();

  const [snaps, setSnaps]     = useState<WorkerSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal]   = useState(false);
  const [editing, setEditing]       = useState<WorkerSnapshot | null>(null);
  const [fullImage, setFullImage]   = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get<WorkerSnapshot[]>('/settings/snapshots/mine?limit=30');
      setSnaps(Array.isArray(res) ? res : []);
    } catch {
      setSnaps([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleDelete = (snap: WorkerSnapshot) => {
    Alert.alert(
      isAr ? 'حذف اللقطة' : 'Delete Snapshot',
      isAr ? 'هل أنت متأكد من الحذف؟' : 'Are you sure you want to delete this snapshot?',
      [
        { text: isAr ? 'إلغاء' : 'Cancel', style: 'cancel' },
        {
          text: isAr ? 'حذف' : 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/settings/snapshots/${snap.id}`);
              setSnaps((prev) => prev.filter((s) => s.id !== snap.id));
            } catch (e: any) {
              Alert.alert(isAr ? 'خطأ' : 'Error', e.message ?? 'Failed to delete.');
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title={isAr ? 'لقطاتي' : 'My Snapshots'}
        subtitle={`${snaps.length} ${isAr ? 'سجل' : 'records'}`}
        showBack
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={snaps}
          keyExtractor={(item, idx) => `${item.id}-${idx}`}
          renderItem={({ item }) => (
            <SnapCard
              item={item}
              colors={colors}
              isAr={isAr}
              onEdit={(s) => { setEditing(s); setShowModal(true); }}
              onDelete={handleDelete}
              onImagePress={(uri) => setFullImage(uri)}
            />
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
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="camera-outline" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {isAr ? 'لا توجد لقطات بعد' : 'No snapshots yet'}
              </Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => { setEditing(null); setShowModal(true); }}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <SnapModal
        visible={showModal}
        editing={editing}
        onClose={() => { setShowModal(false); setEditing(null); }}
        onSuccess={() => { setShowModal(false); setEditing(null); setLoading(true); void load(); }}
        colors={colors}
        isAr={isAr}
      />

      <Modal visible={!!fullImage} transparent animationType="fade" onRequestClose={() => setFullImage(null)}>
        <View style={styles.imgViewerOverlay}>
          <TouchableOpacity style={styles.imgViewerClose} onPress={() => setFullImage(null)}>
            <Ionicons name="close-circle" size={36} color="#fff" />
          </TouchableOpacity>
          {fullImage && (
            <Image source={{ uri: fullImage }} style={styles.fullImg} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:   { padding: spacing.md, paddingBottom: 100 },

  card:        { borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardTop:     { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm, gap: 8 },
  machinePill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  machineText: { fontSize: 12, fontWeight: '700' },
  cardTime:    { ...typography.caption, flex: 1 },
  cardActions: { flexDirection: 'row', gap: 10 },
  actionIcon:  { padding: 4 },

  metrics:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingVertical: spacing.sm },
  metric:        { alignItems: 'center' },
  metricVal:     { fontSize: 22, fontWeight: '800' },
  metricLabel:   { ...typography.caption, marginTop: 2 },
  metricDivider: { width: 1, height: 36 },
  notes:         { ...typography.bodySmall, marginTop: spacing.sm, fontStyle: 'italic' },

  photoRow:  { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  photoWrap: { flex: 1, position: 'relative' },
  photo:     { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.sm },
  photoTag:  { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', borderBottomLeftRadius: radius.sm, borderBottomRightRadius: radius.sm, paddingVertical: 3, alignItems: 'center' },
  photoTagText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  empty:     { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText: { ...typography.bodySmall },

  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    ...shadow.lg,
  },

  overlay:      { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:        { maxHeight: '92%', borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl },
  sheetContent: { padding: spacing.lg, paddingBottom: 40 },
  handle:       { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  sheetTitle:   { ...typography.h2, marginBottom: spacing.md },

  field:      { marginBottom: spacing.md },
  fieldLabel: { ...typography.caption, marginBottom: 6 },
  input:      { borderWidth: 1.5, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 11, fontSize: 15 },
  inputMulti: { height: 80, textAlignVertical: 'top' },

  photoPickers:    { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  photoPickerCol:  { flex: 1 },
  photoPicker:     { height: 90, borderRadius: radius.sm, borderWidth: 1.5, borderStyle: 'dashed', overflow: 'hidden' },
  photoPickerImg:  { width: '100%', height: '100%' },
  photoPickerPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  photoPickerLabel: { ...typography.caption },

  actions:    { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  cancelBtn:  { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: radius.md, borderWidth: 1.5 },
  cancelText: { ...typography.bodySmall, fontWeight: '700' },
  saveBtn:    { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: radius.md },
  saveText:   { ...typography.bodySmall, fontWeight: '700', color: '#fff' },

  imgViewerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  imgViewerClose:   { position: 'absolute', top: 50, right: 20, zIndex: 10 },
  fullImg:          { width: '100%', height: '80%' },
});
