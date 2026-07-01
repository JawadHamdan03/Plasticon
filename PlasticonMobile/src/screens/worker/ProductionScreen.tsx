import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, KeyboardAvoidingView,
  Modal, Platform, RefreshControl, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { Button, ScreenHeader } from '../../components';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';

interface Shift { id: number; name: string; }
interface Machine { id: number; name: string; type: string; }
interface ProductionRecord {
  id: number;
  machineId?: number | null;
  machine?: { id: number; name: string; type: string } | null;
  shift?: { id: number; name: string } | null;
  shiftId?: number;
  cartonsCount: number;
  piecesPerCarton: number;
  totalPieces: number;
  damagedPieces?: number;
  netGoodPieces?: number;
  capColor?: string | null;
  preformType?: string | null;
  rawHdpeUsed?: number | null;
  rawLdpeUsed?: number | null;
  rawPetUsed?: number | null;
  colorUsed?: number | null;
  notes?: string | null;
  date?: string | null;
  createdAt: string;
}

type ProductType = 'CAPS' | 'PREFORMS';

interface FormState {
  productType: ProductType;
  machineId: string;
  shiftId: string;
  date: string;
  cartonsCount: string;
  damagedPieces: string;
  capColor: string;
  preformType: string;
  // preforms
  cavities: string;
  cycles: string;
  numberOfBoxes: string;
  // materials
  rawHdpeUsed: string;
  rawLdpeUsed: string;
  rawPetUsed: string;
  colorUsed: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  productType: 'CAPS',
  machineId: '',
  shiftId: '',
  date: new Date().toISOString().slice(0, 10),
  cartonsCount: '',
  damagedPieces: '0',
  capColor: '',
  preformType: '',
  cavities: '',
  cycles: '',
  numberOfBoxes: '',
  rawHdpeUsed: '',
  rawLdpeUsed: '',
  rawPetUsed: '',
  colorUsed: '',
  notes: '',
};

function todayISO() { return new Date().toISOString().slice(0, 10); }

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function calcPreformPieces(cavities: string, cycles: string, numberOfBoxes: string): number {
  const c = parseInt(cavities) || 0;
  const cy = parseInt(cycles) || 0;
  const nb = parseInt(numberOfBoxes) || 0;
  return c * cy * nb;
}

function calcCapPieces(cartons: string, piecesPerCarton: number): number {
  return (parseInt(cartons) || 0) * piecesPerCarton;
}

export function ProductionScreen() {
  const { colors } = useAppTheme();
  const [records, setRecords] = useState<ProductionRecord[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [capsPerCarton, setCapsPerCarton] = useState(6000);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM, date: todayISO() });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const setF = (key: keyof FormState, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const filteredMachines = machines.filter(m => {
    const t = m.type.trim().toUpperCase();
    if (form.productType === 'CAPS') return t === 'CAPS' || t.includes('CAP');
    return t === 'PREFORM' || t.includes('PREFORM') || t.includes('PET');
  });

  const totalPieces = form.productType === 'CAPS'
    ? calcCapPieces(form.cartonsCount, capsPerCarton)
    : calcPreformPieces(form.cavities, form.cycles, form.numberOfBoxes);
  const damaged = parseInt(form.damagedPieces) || 0;
  const netGood = Math.max(0, totalPieces - damaged);

  const load = useCallback(async () => {
    try {
      const [recs, sh, mach, settings] = await Promise.all([
        api.get<ProductionRecord[]>('/production/me'),
        api.get<Shift[]>('/shifts'),
        api.get<Machine[]>('/machines'),
        api.get<Array<{ productType: string; piecesPerCarton: number }>>('/settings/production').catch(() => []),
      ]);
      setRecords(Array.isArray(recs) ? recs : []);
      setShifts(Array.isArray(sh) ? sh : []);
      setMachines(Array.isArray(mach) ? mach : []);
      const capsSetting = Array.isArray(settings) ? settings.find(s => s.productType === 'CAPS') : null;
      if (capsSetting?.piecesPerCarton) setCapsPerCarton(capsSetting.piecesPerCarton);
    } catch {
      /* keep last state */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleClose = () => {
    setForm({ ...EMPTY_FORM, date: todayISO() });
    setEditingId(null);
    setModalOpen(false);
  };

  const openEdit = (record: ProductionRecord) => {
    const machineType = record.machine?.type?.trim().toUpperCase() ?? '';
    const isPreform = machineType === 'PREFORM' || machineType.includes('PREFORM');
    setForm({
      productType: isPreform ? 'PREFORMS' : 'CAPS',
      machineId: String(record.machineId ?? ''),
      shiftId: String(record.shift?.id ?? record.shiftId ?? ''),
      date: (record.date ?? record.createdAt).slice(0, 10),
      cartonsCount: String(record.cartonsCount ?? ''),
      damagedPieces: String(record.damagedPieces ?? 0),
      capColor: record.capColor ?? '',
      preformType: record.preformType ?? '',
      cavities: '',
      cycles: '',
      numberOfBoxes: String(record.cartonsCount ?? ''),
      rawHdpeUsed: record.rawHdpeUsed != null ? String(record.rawHdpeUsed) : '',
      rawLdpeUsed: record.rawLdpeUsed != null ? String(record.rawLdpeUsed) : '',
      rawPetUsed: record.rawPetUsed != null ? String(record.rawPetUsed) : '',
      colorUsed: record.colorUsed != null ? String(record.colorUsed) : '',
      notes: record.notes ?? '',
    });
    setEditingId(record.id);
    setModalOpen(true);
  };

  const handleDelete = (record: ProductionRecord) => {
    Alert.alert(
      'حذف السجل',
      'هل أنت متأكد من حذف هذا السجل؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف', style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/production/${record.id}`);
              setRecords(prev => prev.filter(r => r.id !== record.id));
            } catch (e: any) {
              Alert.alert('خطأ', e.message ?? 'Failed to delete');
            }
          },
        },
      ],
    );
  };

  const handleSubmit = async () => {
    if (!form.shiftId) {
      Alert.alert('مطلوب', 'اختر الشفت');
      return;
    }

    if (form.productType === 'CAPS') {
      if (!form.cartonsCount || parseInt(form.cartonsCount) <= 0) {
        Alert.alert('مطلوب', 'أدخل عدد الكراتين');
        return;
      }
    } else {
      if (!form.cavities || !form.cycles || !form.numberOfBoxes) {
        Alert.alert('مطلوب', 'أدخل بيانات الصناديق');
        return;
      }
    }

    setSaving(true);
    try {
      if (editingId) {
        await api.patch(`/production/${editingId}`, {
          damagedPieces: parseInt(form.damagedPieces) || 0,
          capColor: form.capColor.trim() || undefined,
          preformType: form.preformType.trim() || undefined,
          notes: form.notes.trim() || undefined,
          date: form.date,
        });
      } else {
        const body: Record<string, unknown> = {
          shiftId: parseInt(form.shiftId),
          date: form.date,
          damagedPieces: parseInt(form.damagedPieces) || 0,
          notes: form.notes.trim() || undefined,
        };
        if (form.machineId) body.machineId = parseInt(form.machineId);
        if (form.productType === 'CAPS') {
          body.cartonsCount = parseInt(form.cartonsCount);
          if (form.capColor.trim()) body.capColor = form.capColor.trim();
          if (form.rawHdpeUsed) body.rawHdpeUsed = parseFloat(form.rawHdpeUsed);
          if (form.rawLdpeUsed) body.rawLdpeUsed = parseFloat(form.rawLdpeUsed);
          if (form.colorUsed) body.colorUsed = parseFloat(form.colorUsed);
        } else {
          body.boxes = [{
            cavities: parseInt(form.cavities),
            cycles: parseInt(form.cycles),
            numberOfBoxes: parseInt(form.numberOfBoxes),
          }];
          if (form.preformType.trim()) body.preformType = form.preformType.trim();
          if (form.rawPetUsed) body.rawPetUsed = parseFloat(form.rawPetUsed);
          if (form.colorUsed) body.colorUsed = parseFloat(form.colorUsed);
        }
        await api.post('/production', body);
      }
      handleClose();
      setLoading(true);
      void load();
    } catch (e: any) {
      Alert.alert('خطأ', e.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const renderRecord = ({ item }: { item: ProductionRecord }) => {
    const machineType = item.machine?.type?.trim().toUpperCase() ?? '';
    const isCaps = machineType === 'CAPS' || machineType.includes('CAP');
    const accentColor = isCaps ? colors.primary : colors.info;
    const typeLabel = isCaps ? ('كابات') : ('بريفورم');
    const net = item.netGoodPieces ?? item.totalPieces ?? 0;
    const total = item.totalPieces ?? 0;
    const damaged = item.damagedPieces ?? 0;
    const yieldPct = total > 0 ? Math.round((net / total) * 100) : 100;

    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderLeftWidth: 3, borderLeftColor: accentColor }]}>
        {/* Row 1: type tag + date + actions */}
        <View style={styles.cardTop}>
          <View style={[styles.typeTag, { backgroundColor: accentColor + '18' }]}>
            <Ionicons name={isCaps ? 'layers-outline' : 'cube-outline'} size={13} color={accentColor} />
            <Text style={[styles.typeTagText, { color: accentColor }]}>{typeLabel}</Text>
          </View>
          <Text style={[styles.cardDateBig, { color: colors.textSecondary }]}>
            {fmtDate(item.date ?? item.createdAt)}
          </Text>
          <View style={styles.cardActions}>
            <TouchableOpacity onPress={() => openEdit(item)} style={styles.cardActionBtn} activeOpacity={0.7}>
              <Ionicons name="pencil" size={15} color={colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(item)} style={styles.cardActionBtn} activeOpacity={0.7}>
              <Ionicons name="trash-outline" size={15} color={colors.danger} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Row 2: big metrics */}
        <View style={styles.metricsRow}>
          <View style={[styles.metric, { backgroundColor: accentColor + '10', borderRadius: radius.md }]}>
            <Text style={[styles.metricVal, { color: accentColor }]}>{total.toLocaleString()}</Text>
            <Text style={[styles.metricLbl, { color: colors.textMuted }]}>{'إجمالي'}</Text>
          </View>
          <View style={[styles.metric, { backgroundColor: colors.success + '10', borderRadius: radius.md }]}>
            <Text style={[styles.metricVal, { color: colors.success }]}>{net.toLocaleString()}</Text>
            <Text style={[styles.metricLbl, { color: colors.textMuted }]}>{'صالح'}</Text>
          </View>
          <View style={[styles.metric, { backgroundColor: damaged > 0 ? colors.danger + '10' : colors.border + '30', borderRadius: radius.md }]}>
            <Text style={[styles.metricVal, { color: damaged > 0 ? colors.danger : colors.textMuted }]}>{damaged.toLocaleString()}</Text>
            <Text style={[styles.metricLbl, { color: colors.textMuted }]}>{'تالف'}</Text>
          </View>
          <View style={[styles.metric, { backgroundColor: yieldPct >= 95 ? colors.success + '10' : colors.warning + '10', borderRadius: radius.md }]}>
            <Text style={[styles.metricVal, { color: yieldPct >= 95 ? colors.success : colors.warning }]}>{yieldPct}%</Text>
            <Text style={[styles.metricLbl, { color: colors.textMuted }]}>{'جودة'}</Text>
          </View>
        </View>

        {/* Row 3: shift · machine · color/type */}
        <View style={[styles.cardMeta, { borderTopColor: colors.border }]}>
          {item.shift && (
            <View style={styles.metaChip}>
              <Ionicons name="time-outline" size={11} color={colors.textMuted} />
              <Text style={[styles.metaChipText, { color: colors.textSecondary }]}>{item.shift.name}</Text>
            </View>
          )}
          {item.machine && (
            <View style={styles.metaChip}>
              <Ionicons name="hardware-chip-outline" size={11} color={colors.textMuted} />
              <Text style={[styles.metaChipText, { color: colors.textSecondary }]}>{item.machine.name}</Text>
            </View>
          )}
          {(item.capColor || item.preformType) && (
            <View style={styles.metaChip}>
              <Ionicons name="color-palette-outline" size={11} color={colors.textMuted} />
              <Text style={[styles.metaChipText, { color: colors.textSecondary }]}>{item.capColor ?? item.preformType}</Text>
            </View>
          )}
          <Text style={[styles.metaTime, { color: colors.textMuted }]}>{fmtTime(item.createdAt)}</Text>
        </View>

        {item.notes ? (
          <Text style={[styles.notes, { color: colors.textMuted, borderTopColor: colors.border }]} numberOfLines={2}>{item.notes}</Text>
        ) : null}
      </View>
    );
  };

  const totalGood = records.reduce((s, r) => s + (r.netGoodPieces ?? r.totalPieces ?? 0), 0);
  const totalDamaged = records.reduce((s, r) => s + (r.damagedPieces ?? 0), 0);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title={'الإنتاج'}
        subtitle={`${records.length} ${'سجل'}`}
        showBack
      />

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item, idx) => `${item.id}-${idx}`}
          renderItem={renderRecord}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />
          }
          ListHeaderComponent={
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: colors.primary + '15', borderWidth: 1, borderColor: colors.primary + '30' }]}>
                <Ionicons name="cube-outline" size={22} color={colors.primary} />
                <Text style={[styles.statVal, { color: colors.primary }]}>{records.length}</Text>
                <Text style={[styles.statLbl, { color: colors.textMuted }]}>{'سجل'}</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.success + '15', borderWidth: 1, borderColor: colors.success + '30' }]}>
                <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                <Text style={[styles.statVal, { color: colors.success }]}>{totalGood.toLocaleString()}</Text>
                <Text style={[styles.statLbl, { color: colors.textMuted }]}>{'صالح'}</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.danger + '15', borderWidth: 1, borderColor: colors.danger + '30' }]}>
                <Ionicons name="close-circle" size={22} color={colors.danger} />
                <Text style={[styles.statVal, { color: colors.danger }]}>{totalDamaged.toLocaleString()}</Text>
                <Text style={[styles.statLbl, { color: colors.textMuted }]}>{'تالف'}</Text>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="cube-outline" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {'لا توجد سجلات إنتاج'}
              </Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => { setForm({ ...EMPTY_FORM, date: todayISO() }); setEditingId(null); setModalOpen(true); }}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* ── Form Modal ── */}
      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={handleClose}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={[styles.sheetTitle, { color: colors.text }]}>
                {editingId
                  ? ('تعديل السجل')
                  : ('تسجيل الإنتاج')}
              </Text>

              {/* Product type tabs — only for new records */}
              {!editingId && (
                <View style={[styles.typeTabs, { borderColor: colors.border }]}>
                  {(['CAPS', 'PREFORMS'] as ProductType[]).map(t => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.typeTab, form.productType === t && { backgroundColor: colors.primary }]}
                      onPress={() => setF('productType', t)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.typeTabText, { color: form.productType === t ? '#fff' : colors.textMuted }]}>
                        {t === 'CAPS' ? ('كابات') : ('بريفورم')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Date */}
              <Field label={'التاريخ'}>
                <TextInput
                  style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                  value={form.date}
                  onChangeText={v => setF('date', v)}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textMuted}
                />
              </Field>

              {/* Shift picker */}
              {!editingId && (
                <Field label={'الشفت *'}>
                  <View style={styles.chipRow}>
                    {shifts.map(s => (
                      <TouchableOpacity
                        key={s.id}
                        style={[styles.chip, { borderColor: colors.border }, form.shiftId === String(s.id) && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                        onPress={() => setF('shiftId', String(s.id))}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.chipText, { color: form.shiftId === String(s.id) ? '#fff' : colors.textMuted }]}>{s.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </Field>
              )}

              {/* Machine picker */}
              {!editingId && (
                <Field label={'الماكينة (اختياري)'}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                    <TouchableOpacity
                      style={[styles.chip, { borderColor: colors.border }, form.machineId === '' && { backgroundColor: colors.border }]}
                      onPress={() => setF('machineId', '')}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.chipText, { color: colors.textMuted }]}>{'بلا'}</Text>
                    </TouchableOpacity>
                    {filteredMachines.map(m => (
                      <TouchableOpacity
                        key={m.id}
                        style={[styles.chip, { borderColor: colors.border }, form.machineId === String(m.id) && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                        onPress={() => setF('machineId', String(m.id))}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.chipText, { color: form.machineId === String(m.id) ? '#fff' : colors.textMuted }]}>{m.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </Field>
              )}

              {/* Caps-specific fields */}
              {(form.productType === 'CAPS' || editingId) && (
                <>
                  {!editingId && (
                    <Field label={'عدد الكراتين *'}>
                      <TextInput
                        style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                        value={form.cartonsCount}
                        onChangeText={v => setF('cartonsCount', v)}
                        keyboardType="numeric"
                        placeholder="e.g. 10"
                        placeholderTextColor={colors.textMuted}
                      />
                      {form.cartonsCount ? (
                        <Text style={[styles.calcHint, { color: colors.primary }]}>
                          = {calcCapPieces(form.cartonsCount, capsPerCarton).toLocaleString()} {'قطعة'}
                        </Text>
                      ) : null}
                    </Field>
                  )}
                  <Field label={'لون الكاب (اختياري)'}>
                    <TextInput
                      style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                      value={form.capColor}
                      onChangeText={v => setF('capColor', v)}
                      placeholder={'مثال: أبيض'}
                      placeholderTextColor={colors.textMuted}
                    />
                  </Field>
                </>
              )}

              {/* Preforms-specific fields */}
              {form.productType === 'PREFORMS' && !editingId && (
                <>
                  <Field label={'نوع البريفورم (اختياري)'}>
                    <TextInput
                      style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                      value={form.preformType}
                      onChangeText={v => setF('preformType', v)}
                      placeholder={'مثال: 28g 28mm'}
                      placeholderTextColor={colors.textMuted}
                    />
                  </Field>
                  <View style={styles.row3}>
                    <View style={styles.flex1}>
                      <Field label={'تجاويف'}>
                        <TextInput
                          style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                          value={form.cavities}
                          onChangeText={v => setF('cavities', v)}
                          keyboardType="numeric"
                          placeholder="32"
                          placeholderTextColor={colors.textMuted}
                        />
                      </Field>
                    </View>
                    <View style={styles.flex1}>
                      <Field label={'دورات'}>
                        <TextInput
                          style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                          value={form.cycles}
                          onChangeText={v => setF('cycles', v)}
                          keyboardType="numeric"
                          placeholder="100"
                          placeholderTextColor={colors.textMuted}
                        />
                      </Field>
                    </View>
                    <View style={styles.flex1}>
                      <Field label={'صناديق'}>
                        <TextInput
                          style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                          value={form.numberOfBoxes}
                          onChangeText={v => setF('numberOfBoxes', v)}
                          keyboardType="numeric"
                          placeholder="1"
                          placeholderTextColor={colors.textMuted}
                        />
                      </Field>
                    </View>
                  </View>
                  {(form.cavities && form.cycles && form.numberOfBoxes) ? (
                    <Text style={[styles.calcHint, { color: colors.primary, marginBottom: spacing.sm }]}>
                      = {calcPreformPieces(form.cavities, form.cycles, form.numberOfBoxes).toLocaleString()} {'قطعة'}
                    </Text>
                  ) : null}
                </>
              )}

              {/* Damaged pieces */}
              <Field label={'القطع التالفة'}>
                <TextInput
                  style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                  value={form.damagedPieces}
                  onChangeText={v => setF('damagedPieces', v)}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                />
              </Field>

              {/* Net good preview */}
              {totalPieces > 0 && (
                <View style={[styles.preview, { backgroundColor: colors.success + '12', borderColor: colors.success + '30' }]}>
                  <Text style={[styles.previewLabel, { color: colors.textMuted }]}>
                    {'الإنتاج الصالح'}: {' '}
                    <Text style={{ color: colors.success, fontWeight: '800' }}>{netGood.toLocaleString()}</Text>
                    {' '}{'قطعة'}
                  </Text>
                </View>
              )}

              {/* Raw materials — only for new records */}
              {!editingId && (
                <>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    {'المواد الخام (اختياري)'}
                  </Text>
                  {form.productType === 'CAPS' ? (
                    <View style={styles.row2}>
                      <View style={styles.flex1}>
                        <Field label={'HDPE (كيس)'}>
                          <TextInput
                            style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                            value={form.rawHdpeUsed}
                            onChangeText={v => setF('rawHdpeUsed', v)}
                            keyboardType="decimal-pad"
                            placeholder="0"
                            placeholderTextColor={colors.textMuted}
                          />
                        </Field>
                      </View>
                      <View style={styles.flex1}>
                        <Field label={'LDPE (كيس)'}>
                          <TextInput
                            style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                            value={form.rawLdpeUsed}
                            onChangeText={v => setF('rawLdpeUsed', v)}
                            keyboardType="decimal-pad"
                            placeholder="0"
                            placeholderTextColor={colors.textMuted}
                          />
                        </Field>
                      </View>
                    </View>
                  ) : (
                    <Field label={'PET (كيس)'}>
                      <TextInput
                        style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                        value={form.rawPetUsed}
                        onChangeText={v => setF('rawPetUsed', v)}
                        keyboardType="decimal-pad"
                        placeholder="0"
                        placeholderTextColor={colors.textMuted}
                      />
                    </Field>
                  )}
                  <Field label={'ملوّن (كجم)'}>
                    <TextInput
                      style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                      value={form.colorUsed}
                      onChangeText={v => setF('colorUsed', v)}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor={colors.textMuted}
                    />
                  </Field>
                </>
              )}

              {/* Notes */}
              <Field label={'ملاحظات (اختياري)'}>
                <TextInput
                  style={[styles.input, styles.inputMulti, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                  value={form.notes}
                  onChangeText={v => setF('notes', v)}
                  placeholder={'أي ملاحظات...'}
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={3}
                />
              </Field>

            </ScrollView>
            <View style={styles.modalActions}>
              <Button variant="ghost" onPress={handleClose} style={styles.actionBtn}>
                {'إلغاء'}
              </Button>
              <Button onPress={handleSubmit} loading={saving} style={styles.actionBtn}>
                {'حفظ'}
              </Button>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:   { padding: spacing.md, paddingBottom: 100 },

  statsRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md },
  statCard: { flex: 1, borderRadius: radius.lg, padding: spacing.sm, alignItems: 'center', gap: 3, ...shadow.sm },
  statVal:  { fontSize: 18, fontWeight: '900' },
  statLbl:  { fontSize: 10, fontWeight: '600', textAlign: 'center' },

  card:         { borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardTop:      { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
  typeTag:      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  typeTagText:  { fontSize: 11, fontWeight: '700' },
  cardDateBig:  { flex: 1, fontSize: 12, fontWeight: '600' },
  cardActions:  { flexDirection: 'row', gap: 2 },
  cardActionBtn:{ padding: 6 },

  metricsRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.sm },
  metric:     { flex: 1, alignItems: 'center', paddingVertical: 10, gap: 2 },
  metricVal:  { fontSize: 20, fontWeight: '900' },
  metricLbl:  { fontSize: 10, fontWeight: '600' },

  cardMeta:   { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, borderTopWidth: 1, paddingTop: 8, marginTop: 2 },
  metaChip:   { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaChipText:{ fontSize: 11, fontWeight: '600' },
  metaTime:   { marginLeft: 'auto' as any, fontSize: 11 },
  notes:      { ...typography.bodySmall, borderTopWidth: 1, paddingTop: 6, marginTop: 6, fontStyle: 'italic' },

  empty:     { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText: { ...typography.bodySmall },

  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    ...shadow.lg,
  },

  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: spacing.lg, paddingBottom: spacing.md, maxHeight: '90%', flexShrink: 1,
  },
  handle:     { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  sheetTitle: { ...typography.h2, marginBottom: spacing.md },

  typeTabs:   { flexDirection: 'row', borderWidth: 1, borderRadius: radius.md, overflow: 'hidden', marginBottom: spacing.md },
  typeTab:    { flex: 1, paddingVertical: 10, alignItems: 'center' },
  typeTabText:{ fontSize: 13, fontWeight: '700' },

  field:      { marginBottom: spacing.md },
  fieldLabel: { ...typography.caption, marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderRadius: radius.sm,
    paddingHorizontal: spacing.md, paddingVertical: 11,
    fontSize: 15,
  },
  inputMulti: { height: 80, textAlignVertical: 'top' },

  chipRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip:       { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, borderWidth: 1 },
  chipText:   { fontSize: 12, fontWeight: '600' },

  calcHint:   { fontSize: 12, fontWeight: '700', marginTop: 4 },
  preview:    { borderWidth: 1, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.md },
  previewLabel:{ fontSize: 13 },

  sectionTitle: { ...typography.h4, marginBottom: spacing.sm },
  row2:   { flexDirection: 'row', gap: spacing.sm },
  row3:   { flexDirection: 'row', gap: spacing.sm },
  flex1:  { flex: 1 },

  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  actionBtn:    { flex: 1 },
});
