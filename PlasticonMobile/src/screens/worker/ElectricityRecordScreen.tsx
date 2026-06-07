import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Image, KeyboardAvoidingView,
  Modal, Platform, RefreshControl, ScrollView, StyleSheet, Switch,
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

interface Shift { id: number; name: string; }

interface ElectricityReading {
  id: number;
  date?: string;
  readingDate?: string;
  shift?: { id: number; name: string } | null;
  shiftId?: number;
  startReading: number;
  endReading: number;
  isMeterReset: boolean;
  maxMeterValue?: number | null;
  consumption?: number | null;
  kwhPriceSnap?: number | null;
  shiftCost?: number | null;
  notes?: string | null;
  imagePath?: string | null;
}

interface PickedImage {
  uri: string;
  fileName?: string;
  mimeType?: string;
}

function toImageUri(stored?: string | null): string | null {
  if (!stored) return null;
  const filename = stored.replace(/^(?:prisma\/?)?pictures\//, '');
  return `${API_BASE}/pictures/${filename}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function calcConsumption(start: number, end: number, isMeterReset: boolean, maxMeterValue?: number) {
  if (isNaN(start) || isNaN(end)) return null;
  if (isMeterReset && maxMeterValue != null && !isNaN(maxMeterValue)) {
    return (maxMeterValue - start) + end;
  }
  return end - start;
}

// ─── Reading Card (worker view — no edit button) ───────────────────────────────

function ReadingCard({
  item, colors, isAr, onImagePress,
}: {
  item: ElectricityReading; colors: any; isAr: boolean;
  onImagePress: (uri: string) => void;
}) {
  const dateStr = item.date ?? item.readingDate;
  const consumption = item.consumption ?? calcConsumption(item.startReading, item.endReading, item.isMeterReset, item.maxMeterValue ?? undefined);

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderLeftWidth: 3, borderLeftColor: colors.warning }]}>
      {/* Top row: date + shift + consumption badge */}
      <View style={styles.cardHeader}>
        <View style={[styles.iconWrap, { backgroundColor: `${colors.warning}18` }]}>
          <Ionicons name="flash" size={22} color={colors.warning} />
        </View>
        <View style={styles.cardInfo}>
          {dateStr && <Text style={[styles.cardDate, { color: colors.text }]}>{fmtDate(dateStr)}</Text>}
          {item.shift?.name && (
            <View style={styles.shiftPill}>
              <Ionicons name="time-outline" size={11} color={colors.textMuted} />
              <Text style={[styles.cardShift, { color: colors.textMuted }]}>{item.shift.name}</Text>
            </View>
          )}
        </View>
        {consumption != null && (
          <View style={[styles.consumptionBox, { backgroundColor: `${colors.warning}18`, borderColor: `${colors.warning}35` }]}>
            <Text style={[styles.consumptionVal, { color: colors.warning }]}>{consumption.toFixed(1)}</Text>
            <Text style={[styles.consumptionUnit, { color: colors.warning }]}>kWh</Text>
          </View>
        )}
      </View>

      {/* Readings row */}
      <View style={[styles.readingRow, { borderTopColor: colors.border }]}>
        <View style={[styles.readingBox, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <Text style={[styles.readingLbl, { color: colors.textMuted }]}>{isAr ? 'قراءة البداية' : 'Start'}</Text>
          <Text style={[styles.readingVal, { color: colors.text }]}>{item.startReading.toLocaleString()}</Text>
        </View>
        <View style={[styles.arrowWrap, { backgroundColor: colors.border }]}>
          <Ionicons name="arrow-forward" size={12} color={colors.textMuted} />
        </View>
        <View style={[styles.readingBox, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <Text style={[styles.readingLbl, { color: colors.textMuted }]}>{isAr ? 'قراءة النهاية' : 'End'}</Text>
          <Text style={[styles.readingVal, { color: colors.text }]}>{item.endReading.toLocaleString()}</Text>
        </View>
        {item.shiftCost != null && item.shiftCost > 0 && (
          <View style={[styles.readingBox, { backgroundColor: `${colors.success}12`, borderColor: `${colors.success}25` }]}>
            <Text style={[styles.readingLbl, { color: colors.textMuted }]}>{isAr ? 'التكلفة' : 'Cost'}</Text>
            <Text style={[styles.readingVal, { color: colors.success }]}>${item.shiftCost.toFixed(2)}</Text>
          </View>
        )}
      </View>

      {item.isMeterReset && (
        <View style={[styles.resetBadge, { backgroundColor: `${colors.danger}15`, borderColor: `${colors.danger}25`, borderWidth: 1 }]}>
          <Ionicons name="refresh-circle" size={12} color={colors.danger} />
          <Text style={[styles.resetText, { color: colors.danger }]}>{isAr ? 'إعادة ضبط العداد' : 'Meter Reset'}</Text>
        </View>
      )}

      {item.notes ? <Text style={[styles.notes, { color: colors.textMuted, borderTopColor: colors.border }]} numberOfLines={2}>{item.notes}</Text> : null}

      {toImageUri(item.imagePath) && (
        <TouchableOpacity onPress={() => onImagePress(toImageUri(item.imagePath)!)}>
          <Image
            source={{ uri: toImageUri(item.imagePath)! }}
            style={[styles.cardImage, { backgroundColor: colors.border }]}
            resizeMode="cover"
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Log Form Modal ────────────────────────────────────────────────────────────

function LogForm({
  visible, shifts, kwhPrice, onClose, onSuccess, colors, isAr,
}: {
  visible: boolean;
  shifts: Shift[];
  kwhPrice: number;
  onClose: () => void;
  onSuccess: () => void;
  colors: any;
  isAr: boolean;
}) {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate]           = useState(today);
  const [shiftId, setShiftId]     = useState<number | null>(null);
  const [startReading, setStart]  = useState('');
  const [endReading, setEnd]      = useState('');
  const [isMeterReset, setReset]  = useState(false);
  const [maxMeterVal, setMaxVal]  = useState('');
  const [notes, setNotes]         = useState('');
  const [image, setImage]         = useState<PickedImage | null>(null);
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    if (!visible) return;
    setDate(today);
    setShiftId(shifts[0]?.id ?? null);
    setStart(''); setEnd(''); setReset(false); setMaxVal(''); setNotes(''); setImage(null);
  }, [visible]);

  const start = parseFloat(startReading);
  const end   = parseFloat(endReading);
  const max   = parseFloat(maxMeterVal);
  const consumption = calcConsumption(start, end, isMeterReset, isMeterReset && !isNaN(max) ? max : undefined);
  const cost = consumption != null && kwhPrice > 0 ? consumption * kwhPrice : null;

  const submit = async () => {
    if (!date || isNaN(start) || isNaN(end)) {
      Alert.alert(isAr ? 'مطلوب' : 'Required', isAr ? 'التاريخ وقراءات البداية والنهاية مطلوبة' : 'Date, start and end readings are required.');
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('date', date);
      if (shiftId != null) fd.append('shiftId', String(shiftId));
      fd.append('startReading', String(start));
      fd.append('endReading', String(end));
      fd.append('isMeterReset', isMeterReset ? 'true' : 'false');
      if (isMeterReset && !isNaN(max)) fd.append('maxMeterValue', String(max));
      fd.append('notes', notes.trim());
      if (image) {
        fd.append('image', {
          uri: image.uri, name: image.fileName ?? 'electricity.jpg', type: image.mimeType ?? 'image/jpeg',
        } as any);
      }
      await uploadForm('/electricity/readings', fd);
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
            {isAr ? 'تسجيل قراءة' : 'Log Reading'}
          </Text>

          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{isAr ? 'التاريخ *' : 'Date *'}</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
              value={date}
              onChangeText={setDate}
            />
          </View>

          {shifts.length > 0 && (
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{isAr ? 'الوردية' : 'Shift'}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipRow}>
                  {shifts.map((s) => (
                    <TouchableOpacity
                      key={s.id}
                      style={[styles.chip, { borderColor: colors.border }, shiftId === s.id && { backgroundColor: colors.warning, borderColor: colors.warning }]}
                      onPress={() => setShiftId(s.id)}
                    >
                      <Text style={[styles.chipText, { color: shiftId === s.id ? '#fff' : colors.textMuted }]}>{s.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          <View style={styles.rowFields}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{isAr ? 'بداية (kWh) *' : 'Start kWh *'}</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                value={startReading}
                onChangeText={setStart}
              />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{isAr ? 'نهاية (kWh) *' : 'End kWh *'}</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                value={endReading}
                onChangeText={setEnd}
              />
            </View>
          </View>

          <View style={[styles.field, styles.switchRow]}>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{isAr ? 'إعادة ضبط العداد؟' : 'Meter Reset?'}</Text>
            <Switch
              value={isMeterReset}
              onValueChange={setReset}
              trackColor={{ false: colors.border, true: `${colors.danger}60` }}
              thumbColor={isMeterReset ? colors.danger : colors.textMuted}
            />
          </View>

          {isMeterReset && (
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{isAr ? 'الحد الأقصى للعداد' : 'Max Meter Value'}</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                placeholder={isAr ? 'القيمة القصوى قبل الإعادة' : 'Max value before reset'}
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                value={maxMeterVal}
                onChangeText={setMaxVal}
              />
            </View>
          )}

          {consumption != null && !isNaN(consumption) && (
            <View style={[styles.preview, { backgroundColor: `${colors.warning}12`, borderColor: `${colors.warning}30` }]}>
              <View style={styles.previewItem}>
                <Text style={[styles.previewLbl, { color: colors.textMuted }]}>{isAr ? 'الاستهلاك' : 'Consumption'}</Text>
                <Text style={[styles.previewVal, { color: colors.warning }]}>{consumption.toFixed(2)} kWh</Text>
              </View>
              {cost != null && (
                <View style={styles.previewItem}>
                  <Text style={[styles.previewLbl, { color: colors.textMuted }]}>{isAr ? 'التكلفة التقديرية' : 'Est. Cost'}</Text>
                  <Text style={[styles.previewVal, { color: colors.success }]}>${cost.toFixed(2)}</Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{isAr ? 'ملاحظات' : 'Notes'}</Text>
            <TextInput
              style={[styles.input, styles.inputMulti, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
              placeholder={isAr ? 'ملاحظات اختيارية...' : 'Optional notes...'}
              placeholderTextColor={colors.textMuted}
              multiline numberOfLines={2}
              value={notes}
              onChangeText={setNotes}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{isAr ? 'صورة' : 'Photo'}</Text>
            <TouchableOpacity
              style={[styles.imgPicker, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}
              onPress={async () => {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') return;
                const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
                if (!res.canceled && res.assets[0]) {
                  const a = res.assets[0];
                  setImage({ uri: a.uri, fileName: a.fileName ?? undefined, mimeType: a.mimeType ?? undefined });
                }
              }}
              activeOpacity={0.8}
            >
              {image ? (
                <Image source={{ uri: image.uri }} style={styles.imgPickerPreview} resizeMode="cover" />
              ) : (
                <View style={styles.imgPickerPlaceholder}>
                  <Ionicons name="camera-outline" size={22} color={colors.textMuted} />
                  <Text style={[styles.imgPickerText, { color: colors.textMuted }]}>{isAr ? 'اختر صورة' : 'Select photo'}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.formActions}>
            <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={onClose}>
              <Text style={[styles.cancelText, { color: colors.textMuted }]}>{isAr ? 'إلغاء' : 'Cancel'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.warning }]} onPress={submit} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>{isAr ? 'حفظ' : 'Save'}</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export function ElectricityRecordScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const [readings, setReadings]     = useState<ElectricityReading[]>([]);
  const [shifts, setShifts]         = useState<Shift[]>([]);
  const [kwhPrice, setKwhPrice]     = useState(0);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm]     = useState(false);
  const [fullImage, setFullImage]   = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [readingsRes, shiftsRes, priceRes] = await Promise.all([
        api.get<ElectricityReading[] | { data: ElectricityReading[] }>('/electricity/readings'),
        api.get<Shift[]>('/shifts').catch(() => [] as Shift[]),
        api.get<{ price: number } | number>('/electricity/kwh-price').catch(() => 0),
      ]);
      setReadings(Array.isArray(readingsRes) ? readingsRes : ((readingsRes as any).data ?? []));
      setShifts(Array.isArray(shiftsRes) ? shiftsRes : []);
      if (typeof priceRes === 'number') setKwhPrice(priceRes);
      else if (priceRes && typeof (priceRes as any).price === 'number') setKwhPrice((priceRes as any).price);
    } catch {
      setReadings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title={isAr ? 'سجل الكهرباء' : 'Electricity Record'}
        subtitle={isAr ? 'سجل قراءات الوردية' : 'Shift meter readings'}
        showBack
      />

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={readings}
          keyExtractor={(item, idx) => `${item.id}-${idx}`}
          renderItem={({ item }) => (
            <ReadingCard
              item={item}
              colors={colors}
              isAr={isAr}
              onImagePress={(uri) => setFullImage(uri)}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.warning} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="flash-outline" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {isAr ? 'لا توجد قراءات مسجلة' : 'No readings logged yet'}
              </Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.warning }]}
        onPress={() => setShowForm(true)}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <LogForm
        visible={showForm}
        shifts={shifts}
        kwhPrice={kwhPrice}
        onClose={() => setShowForm(false)}
        onSuccess={() => { setShowForm(false); setLoading(true); void load(); }}
        colors={colors}
        isAr={isAr}
      />

      <Modal visible={!!fullImage} transparent animationType="fade" onRequestClose={() => setFullImage(null)}>
        <View style={styles.imgOverlay}>
          <TouchableOpacity style={styles.imgClose} onPress={() => setFullImage(null)}>
            <Ionicons name="close-circle" size={36} color="#fff" />
          </TouchableOpacity>
          {fullImage && <Image source={{ uri: fullImage }} style={styles.fullImg} resizeMode="contain" />}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:   { padding: spacing.md, paddingBottom: 100 },

  card:         { borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardHeader:   { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.sm },
  iconWrap:     { width: 42, height: 42, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardInfo:     { flex: 1, gap: 3 },
  cardDate:     { ...typography.h4 },
  shiftPill:    { flexDirection: 'row', alignItems: 'center', gap: 3 },
  cardShift:    { ...typography.caption },
  consumptionBox: { alignItems: 'center', borderRadius: radius.md, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 },
  consumptionVal: { fontSize: 18, fontWeight: '900', lineHeight: 22 },
  consumptionUnit:{ fontSize: 10, fontWeight: '700' },

  readingRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderTopWidth: 1, paddingTop: spacing.sm },
  readingBox:  { flex: 1, alignItems: 'center', borderRadius: radius.md, borderWidth: 1, paddingVertical: 8 },
  readingLbl:  { fontSize: 10, fontWeight: '600', marginBottom: 2 },
  readingVal:  { fontSize: 15, fontWeight: '800' },
  arrowWrap:   { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  resetBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 99, alignSelf: 'flex-start', marginTop: 8 },
  resetText:  { fontSize: 11, fontWeight: '700' },
  notes:      { ...typography.bodySmall, borderTopWidth: 1, paddingTop: 6, marginTop: 8, fontStyle: 'italic' },
  cardImage:  { width: '100%', height: 120, borderRadius: radius.sm, marginTop: 8 },

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
  inputMulti: { height: 70, textAlignVertical: 'top' },
  rowFields:  { flexDirection: 'row', gap: spacing.sm },
  switchRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  chipRow: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  chip:    { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5 },
  chipText:{ fontSize: 13, fontWeight: '600' },

  preview:     { flexDirection: 'row', justifyContent: 'space-around', borderRadius: radius.md, borderWidth: 1, padding: spacing.sm, marginBottom: spacing.md },
  previewItem: { alignItems: 'center' },
  previewLbl:  { ...typography.caption, marginBottom: 2 },
  previewVal:  { fontSize: 16, fontWeight: '800' },

  imgPicker:        { height: 90, borderRadius: radius.sm, borderWidth: 1.5, borderStyle: 'dashed', overflow: 'hidden' },
  imgPickerPreview: { width: '100%', height: '100%' },
  imgPickerPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  imgPickerText:    { ...typography.caption },

  formActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  cancelBtn:   { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: radius.md, borderWidth: 1.5 },
  cancelText:  { ...typography.bodySmall, fontWeight: '700' },
  saveBtn:     { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: radius.md },
  saveText:    { ...typography.bodySmall, fontWeight: '700', color: '#fff' },

  imgOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  imgClose:   { position: 'absolute', top: 50, right: 20, zIndex: 10 },
  fullImg:    { width: '100%', height: '80%' },
});
