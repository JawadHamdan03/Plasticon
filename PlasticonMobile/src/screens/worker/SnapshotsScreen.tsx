import React, { useCallback, useEffect, useState } from 'react';
import {
import { useLocale } from '../../context/LocaleContext';
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

async function takePhoto(): Promise<PickedImage | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission required', 'Please allow camera access to take a photo.');
    return null;
  }
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.8,
  });
  if (result.canceled || !result.assets[0]) return null;
  const a = result.assets[0];
  return { uri: a.uri, fileName: a.fileName ?? undefined, mimeType: a.mimeType ?? undefined };
}

async function pickFromLibrary(): Promise<PickedImage | null> {
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

function PhotoPicker({ label, image, onCamera, onGallery, onClear, colors, isAr }: {
  label: string;
  image: PickedImage | null;
  onCamera:  () => void;
  onGallery: () => void;
  onClear:   () => void;
  colors: any;
  isAr: boolean;
}) {
  if (image) {
    return (
      <View style={[styles.photoPicker, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}>
        <Image source={{ uri: image.uri }} style={styles.photoPickerImg} resizeMode="cover" />
        <TouchableOpacity style={styles.photoPickerClear} onPress={onClear} hitSlop={6}>
          <Ionicons name="close-circle" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  }
  return (
    <View style={[styles.photoPicker, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}>
      <Text style={[styles.photoPickerLabel, { color: colors.textMuted, marginBottom: 8 }]}>{label}</Text>
      <View style={styles.photoPickerBtns}>
        <TouchableOpacity
          style={[styles.photoPickerBtn, { backgroundColor: colors.primary }]}
          onPress={onCamera}
          activeOpacity={0.8}
        >
          <Ionicons name="camera" size={18} color="#fff" />
          <Text style={styles.photoPickerBtnText}>{'كاميرا'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.photoPickerBtn, { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border }]}
          onPress={onGallery}
          activeOpacity={0.8}
        >
          <Ionicons name="images-outline" size={18} color={colors.text} />
          <Text style={[styles.photoPickerBtnText, { color: colors.text }]}>{'معرض'}</Text>
        </TouchableOpacity>
      </View>
    </View>
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
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>{'عداد'}</Text>
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
              <View style={styles.photoTag}><Text style={styles.photoTagText}>{'عداد'}</Text></View>
            </TouchableOpacity>
          ) : null}
          {toImageUri(item.electricityImage) ? (
            <TouchableOpacity onPress={() => onImagePress(toImageUri(item.electricityImage)!)} style={styles.photoWrap}>
              <Image source={{ uri: toImageUri(item.electricityImage)! }} style={[styles.photo, { backgroundColor: colors.border }]} resizeMode="cover" />
              <View style={styles.photoTag}><Text style={styles.photoTagText}>{'كهرباء'}</Text></View>
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
      Alert.alert('مطلوب', 'أدخل اسم الماكينة');
      return;
    }
    const counter = parseFloat(machineCounter);
    const kwh     = parseFloat(electricityKwh);
    if (isNaN(counter) || isNaN(kwh)) {
      Alert.alert('مطلوب', 'أدخل قيم عددية صحيحة');
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
      Alert.alert('خطأ', err.message ?? ('فشل الحفظ'));
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
            {editing ? ('تعديل اللقطة') : ('لقطة جديدة')}
          </Text>

          {([
            { label: 'اسم الماكينة *',    key: 'machineLabel',   val: machineLabel,   set: setMachineLabel,   kb: 'default' as const },
            { label: 'عداد الماكينة *',  key: 'machineCounter', val: machineCounter, set: setMachineCounter, kb: 'numeric' as const },
            { label: 'الكهرباء (kWh) *', key: 'electricityKwh', val: electricityKwh, set: setElectricityKwh, kb: 'decimal-pad' as const },
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
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{'ملاحظات'}</Text>
            <TextInput
              style={[styles.input, styles.inputMulti, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
              placeholder={'ملاحظات اختيارية...'}
              placeholderTextColor={colors.textMuted}
              multiline numberOfLines={3}
              value={notes}
              onChangeText={setNotes}
            />
          </View>

          <View style={styles.photoPickers}>
            <View style={styles.photoPickerCol}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{'صورة العداد'}</Text>
              <PhotoPicker
                label={'أضف صورة العداد'}
                image={machineImg}
                onCamera={async () => { const img = await takePhoto();       if (img) setMachineImg(img); }}
                onGallery={async () => { const img = await pickFromLibrary(); if (img) setMachineImg(img); }}
                onClear={() => setMachineImg(null)}
                colors={colors}
                isAr={isAr}
              />
            </View>
            <View style={styles.photoPickerCol}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{'صورة الكهرباء'}</Text>
              <PhotoPicker
                label={'أضف صورة الكهرباء'}
                image={electricityImg}
                onCamera={async () => { const img = await takePhoto();       if (img) setElectricityImg(img); }}
                onGallery={async () => { const img = await pickFromLibrary(); if (img) setElectricityImg(img); }}
                onClear={() => setElectricityImg(null)}
                colors={colors}
                isAr={isAr}
              />
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={onClose}>
              <Text style={[styles.cancelText, { color: colors.textMuted }]}>{'إلغاء'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={submit} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>{'حفظ'}</Text>}
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
  const [search,  setSearch]        = useState('');
  const [fromDate, setFromDate]     = useState('');
  const [toDate,   setToDate]       = useState('');

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: '200' });
      if (fromDate.trim()) params.set('from', fromDate.trim());
      if (toDate.trim())   params.set('to',   toDate.trim());
      const res = await api.get<WorkerSnapshot[]>(`/settings/snapshots/mine?${params.toString()}`);
      setSnaps(Array.isArray(res) ? res : []);
    } catch {
      setSnaps([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => { void load(); }, [load]);

  const handleDelete = (snap: WorkerSnapshot) => {
    Alert.alert(
      'حذف اللقطة',
      'هل أنت متأكد من الحذف؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف', style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/settings/snapshots/${snap.id}`);
              setSnaps((prev) => prev.filter((s) => s.id !== snap.id));
            } catch (e: any) {
              Alert.alert('خطأ', e.message ?? 'Failed to delete.');
            }
          },
        },
      ],
    );
  };

  const visibleSnaps = snaps.filter((s) => {
    if (!search.trim()) return true;
    const term = search.trim().toLowerCase();
    return [s.machineLabel, s.notes ?? '', String(s.machineCounter), String(s.electricityKwh)].join(' ').toLowerCase().includes(term);
  });

  const totalElectricity = visibleSnaps.reduce((acc, s) => acc + (s.electricityKwh ?? 0), 0);
  const avgElectricity   = visibleSnaps.length ? totalElectricity / visibleSnaps.length : 0;
  const uniqueMachines   = new Set(visibleSnaps.map((s) => s.machineLabel.trim()).filter(Boolean)).size;
  // Delta only meaningful when filtering to a single machine (snaps sorted newest-first)
  const counterDelta = uniqueMachines === 1 && visibleSnaps.length >= 2
    ? visibleSnaps[0].machineCounter - visibleSnaps[visibleSnaps.length - 1].machineCounter
    : null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title={'لقطاتي'}
        subtitle={`${visibleSnaps.length} ${'سجل'}`}
        showBack
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={visibleSnaps}
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
          ListHeaderComponent={
            <View style={styles.listHeader}>
              {/* Search */}
              <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="search-outline" size={16} color={colors.textMuted} />
                <TextInput
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholder={'بحث في اللقطات…'}
                  placeholderTextColor={colors.textMuted}
                  value={search}
                  onChangeText={setSearch}
                />
                {search ? (
                  <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
                    <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Date filters */}
              <View style={styles.filterRow}>
                <View style={[styles.filterInput, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
                  <TextInput
                    style={[styles.filterText, { color: colors.text }]}
                    placeholder={'من تاريخ'}
                    placeholderTextColor={colors.textMuted}
                    value={fromDate}
                    onChangeText={setFromDate}
                  />
                </View>
                <View style={[styles.filterInput, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
                  <TextInput
                    style={[styles.filterText, { color: colors.text }]}
                    placeholder={'إلى تاريخ'}
                    placeholderTextColor={colors.textMuted}
                    value={toDate}
                    onChangeText={setToDate}
                  />
                </View>
                {(fromDate || toDate) && (
                  <TouchableOpacity
                    style={[styles.clearBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => { setFromDate(''); setToDate(''); }}
                    hitSlop={8}
                  >
                    <Ionicons name="close" size={14} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>

              {/* KPI stats */}
              {visibleSnaps.length > 0 && (
                <View style={[styles.statsRow, { backgroundColor: colors.surface }]}>
                  <View style={styles.stat}>
                    <Text style={[styles.statVal, { color: colors.primary }]}>{visibleSnaps.length}</Text>
                    <Text style={[styles.statLabel, { color: colors.textMuted }]}>{'سجل'}</Text>
                  </View>
                  <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.stat}>
                    <Text style={[styles.statVal, { color: colors.accent }]}>{totalElectricity.toFixed(1)}</Text>
                    <Text style={[styles.statLabel, { color: colors.textMuted }]}>{'kWh إجمالي'}</Text>
                  </View>
                  <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.stat}>
                    <Text style={[styles.statVal, { color: colors.success }]}>{avgElectricity.toFixed(1)}</Text>
                    <Text style={[styles.statLabel, { color: colors.textMuted }]}>{'متوسط kWh'}</Text>
                  </View>
                  <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.stat}>
                    <Text style={[styles.statVal, { color: counterDelta !== null && counterDelta < 0 ? colors.danger : colors.text }]}>
                      {counterDelta !== null ? (counterDelta >= 0 ? `+${counterDelta}` : String(counterDelta)) : '—'}
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.textMuted }]}>{'فرق العداد'}</Text>
                  </View>
                  <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.stat}>
                    <Text style={[styles.statVal, { color: colors.info }]}>{uniqueMachines}</Text>
                    <Text style={[styles.statLabel, { color: colors.textMuted }]}>{'آلات'}</Text>
                  </View>
                </View>
              )}
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="camera-outline" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {'لا توجد لقطات بعد'}
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
          {/* Close button */}
          <TouchableOpacity style={styles.imgViewerClose} onPress={() => setFullImage(null)} hitSlop={10}>
            <Ionicons name="close-circle" size={38} color="#fff" />
          </TouchableOpacity>
          {/* Hint */}
          <View style={styles.imgViewerHint}>
            <Ionicons name="expand-outline" size={13} color="rgba(255,255,255,0.6)" />
            <Text style={styles.imgViewerHintText}>
              {'قرص بأصبعين للتكبير · انقر للإغلاق'}
            </Text>
          </View>
          {/* Zoomable ScrollView */}
          {fullImage && (
            <ScrollView
              style={styles.imgScrollView}
              contentContainerStyle={styles.imgScrollContent}
              maximumZoomScale={5}
              minimumZoomScale={1}
              showsVerticalScrollIndicator={false}
              showsHorizontalScrollIndicator={false}
              bouncesZoom
              centerContent
            >
              <Image source={{ uri: fullImage }} style={styles.fullImg} resizeMode="contain" />
            </ScrollView>
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

  listHeader: { marginBottom: spacing.sm },
  searchBar:  { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 8, marginBottom: spacing.sm },
  searchInput: { flex: 1, fontSize: 14 },

  filterRow:   { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm, alignItems: 'center' },
  filterInput: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: spacing.sm, paddingVertical: 6 },
  filterText:  { flex: 1, fontSize: 12 },
  clearBtn:    { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, borderWidth: 1.5 },

  statsRow:     { flexDirection: 'row', borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, alignItems: 'center', ...shadow.sm },
  stat:         { flex: 1, alignItems: 'center' },
  statVal:      { fontSize: 16, fontWeight: '800' },
  statLabel:    { fontSize: 10, fontWeight: '600', marginTop: 2, textAlign: 'center' },
  statDivider:  { width: 1, height: 32 },

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
  photoPicker:     { minHeight: 110, borderRadius: radius.sm, borderWidth: 1.5, borderStyle: 'dashed', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', padding: 8 },
  photoPickerImg:  { width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 },
  photoPickerClear: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 12 },
  photoPickerBtns: { flexDirection: 'row', gap: 6, width: '100%' },
  photoPickerBtn:  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8, borderRadius: radius.sm },
  photoPickerBtnText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  photoPickerPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  photoPickerLabel: { ...typography.caption, textAlign: 'center' },

  actions:    { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  cancelBtn:  { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: radius.md, borderWidth: 1.5 },
  cancelText: { ...typography.bodySmall, fontWeight: '700' },
  saveBtn:    { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: radius.md },
  saveText:   { ...typography.bodySmall, fontWeight: '700', color: '#fff' },

  imgViewerOverlay: { flex: 1, backgroundColor: '#000' },
  imgViewerClose:   { position: 'absolute', top: 50, right: 16, zIndex: 20 },
  imgViewerHint:    { position: 'absolute', bottom: 36, alignSelf: 'center', zIndex: 20, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  imgViewerHintText: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },
  imgScrollView:    { flex: 1 },
  imgScrollContent: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fullImg:          { width: '100%', aspectRatio: 1, resizeMode: 'contain' },
});
