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
import { useLocale } from '../../context/LocaleContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MaterialAlert {
  id: number;
  name: string;
  unit: string;
  currentQuantity: number;
  minQuantity: number;
  alertId?: number | null;
  alertActive?: boolean;
  status: 'OK' | 'LOW' | 'CRITICAL';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusMeta(status: string, colors: any) {
  return {
    OK:       { color: colors.success, icon: 'checkmark-circle' as const, label: 'OK',       labelAr: 'جيد' },
    LOW:      { color: colors.warning, icon: 'alert-circle' as const,     label: 'Low',      labelAr: 'منخفض' },
    CRITICAL: { color: colors.danger,  icon: 'warning' as const,          label: 'Critical', labelAr: 'حرج' },
  }[status] ?? { color: colors.textMuted, icon: 'help-circle' as const, label: status, labelAr: status };
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function AlertCard({ item, onEdit, onThreshold }: {
  item: MaterialAlert;
  onEdit: (item: MaterialAlert) => void;
  onThreshold: (item: MaterialAlert) => void;
}) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const meta = statusMeta(item.status, colors);
  const pct = item.minQuantity > 0 ? Math.min(100, Math.round((item.currentQuantity / item.minQuantity) * 100)) : 100;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderLeftColor: meta.color, borderLeftWidth: 3 }]}>
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <Text style={[styles.matName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.unit, { color: colors.textMuted }]}>{item.unit}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: `${meta.color}18` }]}>
          <Ionicons name={meta.icon} size={12} color={meta.color} />
          <Text style={[styles.badgeText, { color: meta.color }]}>{isAr ? meta.labelAr : meta.label}</Text>
        </View>
      </View>

      {/* Stock bar */}
      <View style={styles.barRow}>
        <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
          <View style={[styles.barFill, { width: `${Math.min(pct, 100)}%` as any, backgroundColor: meta.color }]} />
        </View>
      </View>

      <View style={styles.qtyRow}>
        <View style={styles.qtyBlock}>
          <Text style={[styles.qtyVal, { color: item.status !== 'OK' ? meta.color : colors.text }]}>{item.currentQuantity}</Text>
          <Text style={[styles.qtyLabel, { color: colors.textMuted }]}>{isAr ? 'الحالي' : 'Current'}</Text>
        </View>
        <View style={[styles.qtyDivider, { backgroundColor: colors.border }]} />
        <View style={styles.qtyBlock}>
          <Text style={[styles.qtyVal, { color: colors.text }]}>{item.minQuantity}</Text>
          <Text style={[styles.qtyLabel, { color: colors.textMuted }]}>{isAr ? 'الحد الأدنى' : 'Min Stock'}</Text>
        </View>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          onPress={() => onEdit(item)}
          style={[styles.cardBtn, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}30` }]}
          activeOpacity={0.75}
        >
          <Ionicons name="create-outline" size={14} color={colors.primary} />
          <Text style={[styles.cardBtnText, { color: colors.primary }]}>{isAr ? 'تحديث المخزون' : 'Update Stock'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onThreshold(item)}
          style={[styles.cardBtn, { backgroundColor: `${colors.warning}12`, borderColor: `${colors.warning}30` }]}
          activeOpacity={0.75}
        >
          <Ionicons name="options-outline" size={14} color={colors.warning} />
          <Text style={[styles.cardBtnText, { color: colors.warning }]}>{isAr ? 'الحد الأدنى' : 'Set Min'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function RawAlertsScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();

  const [alerts, setAlerts]     = useState<MaterialAlert[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Stock update modal
  const [editItem, setEditItem]   = useState<MaterialAlert | null>(null);
  const [newQty, setNewQty]       = useState('');
  const [saving, setSaving]       = useState(false);

  // Threshold modal
  const [threshItem, setThreshItem] = useState<MaterialAlert | null>(null);
  const [newThresh, setNewThresh]   = useState('');
  const [savingThresh, setSavingThresh] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<any>('/raw-material-alerts');
      setAlerts(Array.isArray(res) ? res : (res.materials ?? res.alerts ?? []));
    } catch {
      setAlerts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleEditOpen = (item: MaterialAlert) => {
    setNewQty(String(item.currentQuantity));
    setEditItem(item);
  };

  const handleStockSave = async () => {
    if (!editItem) return;
    const qty = parseFloat(newQty);
    if (isNaN(qty) || qty < 0) {
      Alert.alert(isAr ? 'تحقق' : 'Validation', isAr ? 'أدخل كمية صحيحة' : 'Enter a valid quantity.');
      return;
    }
    setSaving(true);
    try {
      await api.patch(`/raw-material-alerts/${editItem.id}/stock`, { currentQuantity: qty });
      setAlerts(prev => prev.map(a => a.id === editItem.id ? { ...a, currentQuantity: qty } : a));
      setEditItem(null);
    } catch (e: any) {
      Alert.alert(isAr ? 'خطأ' : 'Error', e.message ?? 'Failed to update.');
    } finally {
      setSaving(false);
    }
  };

  const handleThreshOpen = (item: MaterialAlert) => {
    setNewThresh(String(item.minQuantity));
    setThreshItem(item);
  };

  const handleThreshSave = async () => {
    if (!threshItem) return;
    const min = parseFloat(newThresh);
    if (isNaN(min) || min < 0) {
      Alert.alert(isAr ? 'تحقق' : 'Validation', isAr ? 'أدخل حداً صحيحاً' : 'Enter a valid threshold.');
      return;
    }
    setSavingThresh(true);
    try {
      await api.post('/raw-material-alerts/threshold', { materialId: threshItem.id, minQuantity: min });
      setAlerts(prev => prev.map(a => a.id === threshItem.id ? { ...a, minQuantity: min } : a));
      setThreshItem(null);
    } catch (e: any) {
      Alert.alert(isAr ? 'خطأ' : 'Error', e.message ?? 'Failed to update threshold.');
    } finally {
      setSavingThresh(false);
    }
  };

  const lowCount      = alerts.filter(a => a.status === 'LOW').length;
  const criticalCount = alerts.filter(a => a.status === 'CRITICAL').length;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title={isAr ? 'تنبيهات المواد الخام' : 'Raw Material Alerts'}
        subtitle={criticalCount > 0 ? `${criticalCount} ${isAr ? 'حرج' : 'critical'}` : (isAr ? 'كل شيء جيد' : 'All clear')}
        showBack
      />

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.statVal, { color: colors.text }]}>{alerts.length}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>{isAr ? 'المجموع' : 'Total'}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.statVal, { color: colors.warning }]}>{lowCount}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>{isAr ? 'منخفض' : 'Low'}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.statVal, { color: colors.danger }]}>{criticalCount}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>{isAr ? 'حرج' : 'Critical'}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(i) => String(i.id)}
          renderItem={({ item }) => (
            <AlertCard item={item} onEdit={handleEditOpen} onThreshold={handleThreshOpen} />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="checkmark-circle-outline" size={44} color={colors.success} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>{isAr ? 'لا توجد بيانات مواد' : 'No material data'}</Text>
            </View>
          }
        />
      )}

      {/* Update Stock Modal */}
      <Modal visible={!!editItem} transparent animationType="slide" onRequestClose={() => setEditItem(null)}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>
              {isAr ? 'تحديث المخزون' : 'Update Stock'} — {editItem?.name}
            </Text>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
              {isAr ? 'الكمية الجديدة' : 'New Quantity'} ({editItem?.unit})
            </Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
              value={newQty} onChangeText={setNewQty}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.textMuted}
            />
            <View style={styles.actions}>
              <Button variant="ghost" onPress={() => setEditItem(null)} style={styles.actionBtn}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
              <Button onPress={handleStockSave} loading={saving} style={styles.actionBtn}>{isAr ? 'حفظ' : 'Save'}</Button>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Set Threshold Modal */}
      <Modal visible={!!threshItem} transparent animationType="slide" onRequestClose={() => setThreshItem(null)}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>
              {isAr ? 'تعيين الحد الأدنى' : 'Set Minimum Threshold'} — {threshItem?.name}
            </Text>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
              {isAr ? 'الحد الأدنى للمخزون' : 'Minimum Stock Level'} ({threshItem?.unit})
            </Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
              value={newThresh} onChangeText={setNewThresh}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.textMuted}
            />
            <View style={styles.actions}>
              <Button variant="ghost" onPress={() => setThreshItem(null)} style={styles.actionBtn}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
              <Button onPress={handleThreshSave} loading={savingThresh} style={styles.actionBtn}>{isAr ? 'حفظ' : 'Save'}</Button>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:   { padding: spacing.md, paddingBottom: 40 },

  statsRow: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, paddingBottom: spacing.sm },
  statCard: { flex: 1, borderRadius: radius.md, padding: spacing.sm, alignItems: 'center', ...shadow.sm },
  statVal:  { fontSize: 22, fontWeight: '800' },
  statLabel:{ ...typography.caption, marginTop: 2, textAlign: 'center' },

  card:    { borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  cardLeft: { flex: 1, marginRight: spacing.sm },
  matName: { ...typography.h4 },
  unit:    { ...typography.caption, marginTop: 2 },
  badge:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full },
  badgeText: { fontSize: 11, fontWeight: '700' },

  barRow:  { marginBottom: spacing.sm },
  barTrack:{ height: 5, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },

  qtyRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  qtyBlock:{ flex: 1, alignItems: 'center' },
  qtyVal:  { fontSize: 20, fontWeight: '800' },
  qtyLabel:{ ...typography.caption },
  qtyDivider: { width: 1, height: 36, marginHorizontal: spacing.sm },

  cardActions: { flexDirection: 'row', gap: spacing.sm },
  cardBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 7, borderRadius: radius.sm, borderWidth: 1 },
  cardBtnText: { fontSize: 12, fontWeight: '600' },

  empty:    { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText:{ ...typography.bodySmall },

  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:   { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: 40 },
  handle:  { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  sheetTitle: { ...typography.h3, marginBottom: spacing.md },
  fieldLabel: { ...typography.caption, marginBottom: 6 },
  input:   { borderWidth: 1.5, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 11, fontSize: 15, marginBottom: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: 4 },
  actionBtn: { flex: 1 },
});
