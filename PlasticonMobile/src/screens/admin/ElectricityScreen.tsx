import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
import { useLocale } from '../../context/LocaleContext';
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
  recordedBy?: { fullName: string } | null;
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

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function calcConsumption(start: number, end: number, isMeterReset: boolean, maxMeterValue?: number) {
  if (isNaN(start) || isNaN(end)) return null;
  if (isMeterReset && maxMeterValue != null && !isNaN(maxMeterValue)) {
    return (maxMeterValue - start) + end;
  }
  return end - start;
}

// ─── Reading Card ──────────────────────────────────────────────────────────────

function ReadingCard({
  item, colors, isAr, onEdit, onDelete, onImagePress,
}: {
  item: ElectricityReading; colors: any; isAr: boolean;
  onEdit: (r: ElectricityReading) => void;
  onDelete: (r: ElectricityReading) => void;
  onImagePress: (uri: string) => void;
}) {
  const dateStr = item.date ?? item.readingDate;
  const consumption = item.consumption ?? calcConsumption(item.startReading, item.endReading, item.isMeterReset, item.maxMeterValue ?? undefined);

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconWrap, { backgroundColor: `${colors.warning}15` }]}>
          <Ionicons name="flash" size={20} color={colors.warning} />
        </View>
        <View style={styles.cardInfo}>
          {dateStr && <Text style={[styles.cardDate, { color: colors.text }]}>{fmtDate(dateStr)}</Text>}
          {item.shift?.name && <Text style={[styles.cardShift, { color: colors.textMuted }]}>{item.shift.name}</Text>}
          {item.recordedBy?.fullName && <Text style={[styles.cardBy, { color: colors.textMuted }]}>{item.recordedBy.fullName}</Text>}
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity onPress={() => onEdit(item)} hitSlop={8} style={styles.actionBtn}>
            <Ionicons name="create-outline" size={18} color={colors.info} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onDelete(item)} hitSlop={8} style={styles.actionBtn}>
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.readingRow, { borderTopColor: colors.border }]}>
        <View style={styles.readingItem}>
          <Text style={[styles.readingLbl, { color: colors.textMuted }]}>{'بداية'}</Text>
          <Text style={[styles.readingVal, { color: colors.text }]}>{item.startReading}</Text>
        </View>
        <Ionicons name="arrow-forward" size={14} color={colors.textMuted} />
        <View style={styles.readingItem}>
          <Text style={[styles.readingLbl, { color: colors.textMuted }]}>{'نهاية'}</Text>
          <Text style={[styles.readingVal, { color: colors.text }]}>{item.endReading}</Text>
        </View>
        {consumption != null && (
          <>
            <View style={[styles.readingDivider, { backgroundColor: colors.border }]} />
            <View style={styles.readingItem}>
              <Text style={[styles.readingLbl, { color: colors.textMuted }]}>{'استهلاك'}</Text>
              <Text style={[styles.readingVal, { color: colors.warning }]}>{consumption.toFixed(2)} kWh</Text>
            </View>
          </>
        )}
        {item.shiftCost != null && item.shiftCost > 0 && (
          <>
            <View style={[styles.readingDivider, { backgroundColor: colors.border }]} />
            <View style={styles.readingItem}>
              <Text style={[styles.readingLbl, { color: colors.textMuted }]}>{'تكلفة'}</Text>
              <Text style={[styles.readingVal, { color: colors.success }]}>${item.shiftCost.toFixed(2)}</Text>
            </View>
          </>
        )}
      </View>

      {item.isMeterReset && (
        <View style={[styles.resetBadge, { backgroundColor: `${colors.danger}15` }]}>
          <Ionicons name="refresh-circle" size={12} color={colors.danger} />
          <Text style={[styles.resetText, { color: colors.danger }]}>{'إعادة ضبط العداد'}</Text>
        </View>
      )}

      {item.notes ? <Text style={[styles.notes, { color: colors.textMuted }]} numberOfLines={2}>{item.notes}</Text> : null}

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

// ─── Form Modal ────────────────────────────────────────────────────────────────

function ElectricityForm({
  visible, editing, shifts, kwhPrice, onClose, onSuccess, colors, isAr,
}: {
  visible: boolean;
  editing: ElectricityReading | null;
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
    if (editing) {
      const d = editing.date ?? editing.readingDate ?? today;
      setDate(d.split('T')[0]);
      setShiftId(editing.shift?.id ?? editing.shiftId ?? null);
      setStart(String(editing.startReading ?? ''));
      setEnd(String(editing.endReading ?? ''));
      setReset(editing.isMeterReset ?? false);
      setMaxVal(String(editing.maxMeterValue ?? ''));
      setNotes(editing.notes ?? '');
      setImage(null);
    } else {
      setDate(today);
      setShiftId(shifts[0]?.id ?? null);
      setStart(''); setEnd(''); setReset(false); setMaxVal(''); setNotes(''); setImage(null);
    }
  }, [visible, editing]);

  const start = parseFloat(startReading);
  const end   = parseFloat(endReading);
  const max   = parseFloat(maxMeterVal);
  const consumption = calcConsumption(start, end, isMeterReset, isMeterReset && !isNaN(max) ? max : undefined);
  const cost = consumption != null && kwhPrice > 0 ? consumption * kwhPrice : null;

  const submit = async () => {
    if (!date || isNaN(start) || isNaN(end)) {
      Alert.alert('مطلوب', 'التاريخ وقراءات البداية والنهاية مطلوبة');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/electricity/readings/${editing.id}`, {
          date,
          shiftId:       shiftId ?? undefined,
          startReading:  start,
          endReading:    end,
          isMeterReset,
          maxMeterValue: isMeterReset && !isNaN(max) ? max : null,
          notes:         notes.trim() || null,
        });
      } else {
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
            {editing ? ('تعديل القراءة') : ('قراءة جديدة')}
          </Text>

          {/* Date */}
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{'التاريخ *'}</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
              value={date}
              onChangeText={setDate}
            />
          </View>

          {/* Shift Picker */}
          {shifts.length > 0 && (
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{'الوردية'}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipRow}>
                  {shifts.map((s) => (
                    <TouchableOpacity
                      key={s.id}
                      style={[styles.chip, { borderColor: colors.border }, shiftId === s.id && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                      onPress={() => setShiftId(s.id)}
                    >
                      <Text style={[styles.chipText, { color: shiftId === s.id ? '#fff' : colors.textMuted }]}>{s.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Start & End */}
          <View style={styles.rowFields}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{'بداية (kWh) *'}</Text>
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
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{'نهاية (kWh) *'}</Text>
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

          {/* Meter Reset Toggle */}
          <View style={[styles.field, styles.switchRow]}>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{'إعادة ضبط العداد؟'}</Text>
            <Switch
              value={isMeterReset}
              onValueChange={setReset}
              trackColor={{ false: colors.border, true: `${colors.danger}60` }}
              thumbColor={isMeterReset ? colors.danger : colors.textMuted}
            />
          </View>

          {isMeterReset && (
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{'الحد الأقصى للعداد'}</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                placeholder={'القيمة القصوى قبل الإعادة'}
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                value={maxMeterVal}
                onChangeText={setMaxVal}
              />
            </View>
          )}

          {/* Live Preview */}
          {consumption != null && !isNaN(consumption) && (
            <View style={[styles.preview, { backgroundColor: `${colors.warning}12`, borderColor: `${colors.warning}30` }]}>
              <View style={styles.previewItem}>
                <Text style={[styles.previewLbl, { color: colors.textMuted }]}>{'الاستهلاك'}</Text>
                <Text style={[styles.previewVal, { color: colors.warning }]}>{consumption.toFixed(2)} kWh</Text>
              </View>
              {cost != null && (
                <View style={styles.previewItem}>
                  <Text style={[styles.previewLbl, { color: colors.textMuted }]}>{'التكلفة التقديرية'}</Text>
                  <Text style={[styles.previewVal, { color: colors.success }]}>${cost.toFixed(2)}</Text>
                </View>
              )}
            </View>
          )}

          {/* Notes */}
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{'ملاحظات'}</Text>
            <TextInput
              style={[styles.input, styles.inputMulti, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
              placeholder={'ملاحظات اختيارية...'}
              placeholderTextColor={colors.textMuted}
              multiline numberOfLines={2}
              value={notes}
              onChangeText={setNotes}
            />
          </View>

          {/* Photo (new readings only) */}
          {!editing && (
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{'صورة'}</Text>
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
                    <Text style={[styles.imgPickerText, { color: colors.textMuted }]}>{'اختر صورة'}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.formActions}>
            <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={onClose}>
              <Text style={[styles.cancelText, { color: colors.textMuted }]}>{'إلغاء'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.warning }]} onPress={submit} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>{'حفظ'}</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export function ElectricityScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const [readings, setReadings]     = useState<ElectricityReading[]>([]);
  const [shifts, setShifts]         = useState<Shift[]>([]);
  const [kwhPrice, setKwhPrice]     = useState(0);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm]     = useState(false);
  const [editing, setEditing]       = useState<ElectricityReading | null>(null);
  const [fullImage, setFullImage]   = useState<string | null>(null);
  const [kwhInput,  setKwhInput]   = useState('');
  const [savingKwh, setSavingKwh]  = useState(false);
  const today0 = new Date().toISOString().slice(0, 10);
  const month0 = new Date().toISOString().slice(0, 7) + '-01';
  const [fromDate,      setFromDate]      = useState(month0);
  const [toDate,        setToDate]        = useState(today0);
  const [filterShiftId, setFilterShiftId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const [readingsRes, shiftsRes, priceRes] = await Promise.all([
        api.get<ElectricityReading[] | { data: ElectricityReading[] }>('/electricity/readings'),
        api.get<Shift[]>('/shifts').catch(() => [] as Shift[]),
        api.get<{ price: number } | number>('/electricity/kwh-price').catch(() => 0),
      ]);
      setReadings(Array.isArray(readingsRes) ? readingsRes : ((readingsRes as any).data ?? []));
      setShifts(Array.isArray(shiftsRes) ? shiftsRes : []);
      const p = typeof priceRes === 'number' ? priceRes : ((priceRes as any)?.price ?? 0);
      setKwhPrice(p);
      setKwhInput(String(p > 0 ? p : ''));
    } catch {
      setReadings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleDelete = (r: ElectricityReading) => {
    Alert.alert(
      'حذف القراءة',
      'هل أنت متأكد؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف', style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/electricity/readings/${r.id}`);
              setReadings((prev) => prev.filter((x) => x.id !== r.id));
            } catch (e: any) {
              Alert.alert('خطأ', e.message ?? 'Failed to delete.');
            }
          },
        },
      ],
    );
  };

  const handleSaveKwh = async () => {
    const price = parseFloat(kwhInput);
    if (!kwhInput.trim() || isNaN(price) || price <= 0) return;
    setSavingKwh(true);
    try {
      await api.post('/electricity/kwh-price', { price });
      setKwhPrice(price);
      Alert.alert('تم', 'تم تحديث سعر الكيلوواط');
    } catch (e: any) { Alert.alert('خطأ', e?.message ?? 'Failed'); }
    finally { setSavingKwh(false); }
  };

  const filteredReadings = useMemo(() => {
    return readings.filter((r) => {
      const d = (r.readingDate ?? r.date ?? '').slice(0, 10);
      if (fromDate && d < fromDate) return false;
      if (toDate   && d > toDate)   return false;
      if (filterShiftId !== null && r.shiftId !== filterShiftId) return false;
      return true;
    });
  }, [readings, fromDate, toDate, filterShiftId]); // eslint-disable-line

  const totalConsumption = filteredReadings.reduce((s, r) => {
    const c = r.consumption ?? calcConsumption(r.startReading, r.endReading, r.isMeterReset, r.maxMeterValue ?? undefined);
    return s + (c ?? 0);
  }, 0);
  const totalCost = filteredReadings.reduce((s, r) => s + (r.shiftCost ?? 0), 0);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title={'الكهرباء'}
        subtitle={`${filteredReadings.length} ${'قراءات'}`}
        showBack
      />

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={filteredReadings}
          keyExtractor={(item, idx) => `${item.id}-${idx}`}
          renderItem={({ item }) => (
            <ReadingCard
              item={item}
              colors={colors}
              isAr={isAr}
              onEdit={(r) => { setEditing(r); setShowForm(true); }}
              onDelete={handleDelete}
              onImagePress={(uri) => setFullImage(uri)}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />
          }
          ListHeaderComponent={
            <View>
              <View style={styles.statsRow}>
                <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
                  <Ionicons name="flash" size={20} color={colors.warning} />
                  <Text style={[styles.statVal, { color: colors.warning }]}>{totalConsumption.toFixed(1)}</Text>
                  <Text style={[styles.statLbl, { color: colors.textMuted }]}>kWh</Text>
                </View>
                {totalCost > 0 && (
                  <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
                    <Ionicons name="cash" size={20} color={colors.success} />
                    <Text style={[styles.statVal, { color: colors.success }]}>${totalCost.toFixed(0)}</Text>
                    <Text style={[styles.statLbl, { color: colors.textMuted }]}>{'التكلفة'}</Text>
                  </View>
                )}
              </View>

              {/* kWh Price management */}
              <View style={[styles.kwhCard, { backgroundColor: colors.surface }]}>
                <View style={styles.kwhCardLeft}>
                  <View style={[styles.kwhIconWrap, { backgroundColor: `${colors.warning}18` }]}>
                    <Ionicons name="flash" size={20} color={colors.warning} />
                  </View>
                  <View>
                    <Text style={[styles.kwhLabel, { color: colors.textMuted }]}>
                      {'سعر الكيلوواط/ساعة'}
                    </Text>
                    <Text style={[styles.kwhValue, { color: colors.text }]}>
                      {kwhPrice > 0 ? `${kwhPrice.toFixed(4)} ILS` : '—'}
                    </Text>
                  </View>
                </View>
                <View style={styles.kwhCardRight}>
                  <TextInput
                    style={[styles.kwhInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                    value={kwhInput}
                    onChangeText={setKwhInput}
                    keyboardType="decimal-pad"
                    placeholder="0.0000"
                    placeholderTextColor={colors.textMuted}
                  />
                  <TouchableOpacity
                    style={[styles.kwhSaveBtn, { backgroundColor: colors.warning }, savingKwh && { opacity: 0.6 }]}
                    onPress={() => void handleSaveKwh()}
                    disabled={savingKwh}
                    activeOpacity={0.8}
                  >
                    {savingKwh
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Ionicons name="save-outline" size={15} color="#fff" />
                    }
                    <Text style={styles.kwhSaveBtnText}>{'حفظ'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Date filter bar */}
              <View style={[styles.elFilterBar, { backgroundColor: colors.surface }]}>
                <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
                <TextInput
                  style={[styles.elFilterInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                  value={fromDate} onChangeText={setFromDate}
                  placeholder="From YYYY-MM-DD" placeholderTextColor={colors.textMuted}
                />
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>→</Text>
                <TextInput
                  style={[styles.elFilterInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                  value={toDate} onChangeText={setToDate}
                  placeholder="To YYYY-MM-DD" placeholderTextColor={colors.textMuted}
                />
                <TouchableOpacity onPress={() => { setFromDate(month0); setToDate(today0); setFilterShiftId(null); }} style={[styles.elFilterReset, { borderColor: colors.border }]}>
                  <Ionicons name="refresh-outline" size={13} color={colors.primary} />
                </TouchableOpacity>
              </View>

              {/* Shift filter chips */}
              {shifts.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
                  <View style={styles.elShiftRow}>
                    <TouchableOpacity
                      style={[styles.elShiftChip, { borderColor: colors.border }, filterShiftId === null && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                      onPress={() => setFilterShiftId(null)}
                    >
                      <Text style={[styles.elShiftText, { color: filterShiftId === null ? '#fff' : colors.textMuted }]}>
                        {'كل الوردات'}
                      </Text>
                    </TouchableOpacity>
                    {shifts.map((s) => (
                      <TouchableOpacity
                        key={s.id}
                        style={[styles.elShiftChip, { borderColor: colors.border }, filterShiftId === s.id && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                        onPress={() => setFilterShiftId(s.id)}
                      >
                        <Text style={[styles.elShiftText, { color: filterShiftId === s.id ? '#fff' : colors.textMuted }]}>{s.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              )}
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="flash-outline" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {'لا توجد قراءات كهربائية'}
              </Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.warning }]}
        onPress={() => { setEditing(null); setShowForm(true); }}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <ElectricityForm
        visible={showForm}
        editing={editing}
        shifts={shifts}
        kwhPrice={kwhPrice}
        onClose={() => { setShowForm(false); setEditing(null); }}
        onSuccess={() => { setShowForm(false); setEditing(null); setLoading(true); void load(); }}
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

  kwhCard:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: radius.lg, padding: spacing.sm, marginBottom: spacing.sm, ...shadow.sm },
  kwhCardLeft:    { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  kwhCardRight:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  kwhIconWrap:    { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  kwhLabel:       { fontSize: 10, fontWeight: '600' },
  kwhValue:       { fontSize: 15, fontWeight: '800' },
  kwhInput:       { width: 90, borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, fontSize: 13, fontWeight: '700' },
  kwhSaveBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8 },
  kwhSaveBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  elFilterBar:   { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.sm, paddingVertical: 8, borderRadius: radius.md, marginBottom: spacing.xs },
  elFilterInput: { flex: 1, borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, fontSize: 13 },
  elFilterReset: { width: 30, height: 30, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  elShiftRow:    { flexDirection: 'row', gap: 8, paddingHorizontal: 2, paddingBottom: spacing.sm },
  elShiftChip:   { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1.5 },
  elShiftText:   { fontSize: 12, fontWeight: '600' },

  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  statCard: { flex: 1, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', gap: 4, ...shadow.sm },
  statVal:  { fontSize: 20, fontWeight: '800' },
  statLbl:  { ...typography.caption, textAlign: 'center' },

  card:        { borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardHeader:  { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: 8 },
  iconWrap:    { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardInfo:    { flex: 1, gap: 2 },
  cardDate:    { ...typography.h4 },
  cardShift:   { ...typography.caption },
  cardBy:      { ...typography.caption, fontStyle: 'italic' },
  cardActions: { flexDirection: 'row', gap: 10 },
  actionBtn:   { padding: 4 },

  readingRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, paddingTop: 8, flexWrap: 'wrap' },
  readingItem:   { alignItems: 'center' },
  readingLbl:    { ...typography.caption, marginBottom: 2 },
  readingVal:    { fontSize: 13, fontWeight: '700' },
  readingDivider:{ width: 1, height: 28 },

  resetBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, alignSelf: 'flex-start', marginTop: 6 },
  resetText:  { fontSize: 11, fontWeight: '700' },
  notes:      { ...typography.bodySmall, marginTop: 6, fontStyle: 'italic' },
  cardImage:  { width: '100%', height: 130, borderRadius: radius.sm, marginTop: 8 },

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
