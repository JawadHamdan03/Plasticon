import React, { useCallback, useEffect, useState } from 'react';
import {
import { useLocale } from '../../context/LocaleContext';
  ActivityIndicator, Alert, FlatList, RefreshControl,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader, StatCard } from '../../components';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface InventoryItem {
  id: number;
  partName: string;
  quantity: number;
  imagePath?: string | null;
  unitPrice?: number | null;
  pricedBy?: { id: number; fullName: string } | null;
  pricedAt?: string | null;
}

interface Inventory {
  id: number;
  month: number;
  year: number;
  status: 'DRAFT' | 'SUBMITTED' | 'REVIEWED';
  notes?: string | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  engineer: { id: number; fullName: string; role: string };
  items: InventoryItem[];
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const STATUS_FILTERS = ['ALL', 'SUBMITTED', 'REVIEWED'] as const;

export function PartsPricingScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [expanded,   setExpanded]   = useState<Set<number>>(new Set());
  const [prices,     setPrices]     = useState<Record<number, string>>({});
  const [saving,     setSaving]     = useState<Record<number, boolean>>({});
  const [reviewing,  setReviewing]  = useState<Record<number, boolean>>({});

  const load = useCallback(async () => {
    try {
      const res = await api.get<Inventory[] | { data: Inventory[] }>('/engineer-inventory/all');
      const data = Array.isArray(res) ? res : ((res as any).data ?? []);
      setInventories(data);
      // Pre-fill existing prices
      const init: Record<number, string> = {};
      data.forEach((inv: Inventory) => {
        inv.items.forEach((item) => {
          if (item.unitPrice != null) init[item.id] = String(item.unitPrice);
        });
      });
      setPrices(init);
    } catch { setInventories([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSavePrice = async (itemId: number) => {
    const priceStr = prices[itemId];
    if (!priceStr || isNaN(Number(priceStr))) {
      Alert.alert('خطأ', 'أدخل سعرًا صحيحًا'); return;
    }
    setSaving((p) => ({ ...p, [itemId]: true }));
    try {
      await api.patch(`/engineer-inventory/items/${itemId}/price`, { unitPrice: parseFloat(priceStr) });
      setInventories((prev) => prev.map((inv) => ({
        ...inv,
        items: inv.items.map((it) =>
          it.id === itemId ? { ...it, unitPrice: parseFloat(priceStr) } : it,
        ),
      })));
    } catch (e: any) {
      Alert.alert('خطأ', e.message ?? 'Failed to save price');
    } finally { setSaving((p) => ({ ...p, [itemId]: false })); }
  };

  const handleMarkReviewed = async (inv: Inventory) => {
    const allPriced = inv.items.every((it) => it.unitPrice != null && Number(it.unitPrice) > 0);
    if (!allPriced) {
      Alert.alert(
        'تنبيه',
        'يجب تسعير جميع القطع أولاً',
      );
      return;
    }
    setReviewing((p) => ({ ...p, [inv.id]: true }));
    try {
      await api.patch(`/engineer-inventory/${inv.id}/review`, {});
      setInventories((prev) => prev.map((i) =>
        i.id === inv.id ? { ...i, status: 'REVIEWED' } : i,
      ));
    } catch (e: any) {
      Alert.alert('خطأ', e.message ?? 'Failed to mark reviewed');
    } finally { setReviewing((p) => ({ ...p, [inv.id]: false })); }
  };

  const visible = statusFilter === 'ALL' ? inventories
    : inventories.filter((i) => i.status === statusFilter);

  const awaiting  = inventories.filter((i) => i.status === 'SUBMITTED').length;
  const reviewed  = inventories.filter((i) => i.status === 'REVIEWED').length;
  const incomplete = inventories.filter((i) =>
    i.status === 'SUBMITTED' && i.items.some((it) => !it.unitPrice),
  ).length;

  const statusColor = (s: string) => {
    if (s === 'REVIEWED')  return { bg: colors.successLight, fg: colors.success };
    if (s === 'SUBMITTED') return { bg: colors.warningLight, fg: colors.warning };
    return                        { bg: colors.border,       fg: colors.textMuted };
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={'تسعير القطع'} showBack />

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(i) => String(i.id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListHeaderComponent={
            <View>
              <View style={styles.kpiRow}>
                <StatCard label={'بانتظار التسعير'} value={String(awaiting)} icon="time" color={colors.warning} style={styles.kpi} />
                <StatCard label={'تمت المراجعة'} value={String(reviewed)} icon="checkmark-circle" color={colors.success} style={styles.kpi} />
                <StatCard label={'غير مكتمل'} value={String(incomplete)} icon="alert-circle" color={colors.danger} style={styles.kpi} />
              </View>
              <View style={[styles.filterRow, { marginBottom: spacing.md }]}>
                {STATUS_FILTERS.map((f) => (
                  <TouchableOpacity key={f}
                    style={[styles.filterChip, statusFilter === f && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                    onPress={() => setStatusFilter(f)}>
                    <Text style={[styles.filterText, { color: statusFilter === f ? '#fff' : colors.textMuted }]}>
                      {isAr
                        ? f === 'ALL' ? 'الكل' : f === 'SUBMITTED' ? 'مقدم' : 'مراجع'
                        : f === 'ALL' ? 'All' : f}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          }
          renderItem={({ item: inv }) => {
            const isOpen = expanded.has(inv.id);
            const sc = statusColor(inv.status);
            const totalValue = inv.items.reduce((s, it) =>
              s + ((Number(it.unitPrice) || 0) * (Number(it.quantity) || 0)), 0);
            const allPriced = inv.items.length > 0 && inv.items.every((it) => it.unitPrice != null && Number(it.unitPrice) > 0);

            return (
              <View style={[styles.card, { backgroundColor: colors.surface }]}>
                <TouchableOpacity style={styles.cardHeader} onPress={() => toggleExpand(inv.id)} activeOpacity={0.7}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>
                      {MONTH_NAMES[(inv.month ?? 1) - 1]} {inv.year} — {inv.engineer?.fullName ?? '—'}
                    </Text>
                    <Text style={[styles.cardSub, { color: colors.textMuted }]}>
                      {inv.items.length} {'قطعة'} · ${fmt(totalValue)}
                    </Text>
                  </View>
                  <View style={styles.headerRight}>
                    {allPriced && inv.status === 'SUBMITTED' && (
                      <View style={[styles.badge, { backgroundColor: `${colors.info}15` }]}>
                        <Text style={[styles.badgeText, { color: colors.info }]}>{'جاهز'}</Text>
                      </View>
                    )}
                    <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                      <Text style={[styles.badgeText, { color: sc.fg }]}>{inv.status}</Text>
                    </View>
                    <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
                  </View>
                </TouchableOpacity>

                {isOpen && (
                  <View style={[styles.expandBody, { borderTopColor: colors.border }]}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View>
                        {/* Table Header */}
                        <View style={[styles.tableRow, { backgroundColor: colors.surfaceAlt }]}>
                          <Text style={[styles.thCell, styles.colPart, { color: colors.textMuted }]}>{'القطعة'}</Text>
                          <Text style={[styles.thCell, styles.colQty,  { color: colors.textMuted }]}>{'الكمية'}</Text>
                          <Text style={[styles.thCell, styles.colPrice,{ color: colors.textMuted }]}>{'سعر الوحدة'}</Text>
                          <Text style={[styles.thCell, styles.colTotal,{ color: colors.textMuted }]}>{'الإجمالي'}</Text>
                          <Text style={[styles.thCell, styles.colAct,  { color: colors.textMuted }]}>{'حفظ'}</Text>
                        </View>
                        {/* Table Rows */}
                        {inv.items.map((it) => {
                          const lineTotal = (Number(prices[it.id] || it.unitPrice) || 0) * Number(it.quantity);
                          const isSaved = saving[it.id];
                          return (
                            <View key={it.id} style={[styles.tableRow, { borderTopColor: colors.border }]}>
                              <Text style={[styles.tdCell, styles.colPart, { color: colors.text }]} numberOfLines={2}>{it.partName}</Text>
                              <Text style={[styles.tdCell, styles.colQty,  { color: colors.text }]}>{it.quantity}</Text>
                              <TextInput
                                style={[styles.priceInput, styles.colPrice, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                                placeholder="0.00" placeholderTextColor={colors.textMuted}
                                keyboardType="decimal-pad"
                                value={prices[it.id] ?? (it.unitPrice != null ? String(it.unitPrice) : '')}
                                onChangeText={(v) => setPrices((p) => ({ ...p, [it.id]: v }))}
                                editable={inv.status !== 'REVIEWED'}
                              />
                              <Text style={[styles.tdCell, styles.colTotal, { color: colors.primary }]}>${fmt(lineTotal)}</Text>
                              <View style={[styles.colAct, { alignItems: 'center', justifyContent: 'center' }]}>
                                {inv.status !== 'REVIEWED' && (
                                  <TouchableOpacity onPress={() => handleSavePrice(it.id)} disabled={isSaved}>
                                    {isSaved
                                      ? <ActivityIndicator size="small" color={colors.success} />
                                      : <Ionicons name="save-outline" size={18} color={colors.success} />}
                                  </TouchableOpacity>
                                )}
                                {it.unitPrice != null && <Ionicons name="checkmark" size={14} color={colors.success} />}
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    </ScrollView>

                    {inv.status === 'SUBMITTED' && (
                      <TouchableOpacity
                        style={[styles.reviewBtn, { borderColor: colors.success, backgroundColor: allPriced ? `${colors.success}15` : colors.surfaceAlt }]}
                        onPress={() => handleMarkReviewed(inv)}
                        disabled={!!reviewing[inv.id]}>
                        {reviewing[inv.id]
                          ? <ActivityIndicator size="small" color={colors.success} />
                          : <><Ionicons name="checkmark-done" size={16} color={allPriced ? colors.success : colors.textMuted} />
                            <Text style={[styles.reviewBtnText, { color: allPriced ? colors.success : colors.textMuted }]}>
                              {'تأشير كمراجع'}
                            </Text></>}
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="pricetag-outline" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>{'لا توجد جرديات'}</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1 },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:         { padding: spacing.md, paddingBottom: 40 },
  kpiRow:       { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md },
  kpi:          { flex: 1 },
  filterRow:    { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  filterChip:   { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1.5, borderColor: '#E2E8F0' },
  filterText:   { fontSize: 12, fontWeight: '600' as const },
  card:         { borderRadius: radius.lg, marginBottom: spacing.sm, ...shadow.sm, overflow: 'hidden' },
  cardHeader:   { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.sm },
  cardTitle:    { ...typography.h4, marginBottom: 2 },
  cardSub:      { ...typography.caption },
  headerRight:  { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  badge:        { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  badgeText:    { fontSize: 10, fontWeight: '700' as const },
  expandBody:   { borderTopWidth: 1, padding: spacing.sm },
  tableRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 0.5 },
  thCell:       { fontSize: 11, fontWeight: '700' as const, paddingHorizontal: 4 },
  tdCell:       { fontSize: 12, paddingHorizontal: 4 },
  colPart:      { width: 120 },
  colQty:       { width: 44, textAlign: 'center' as const },
  colPrice:     { width: 90 },
  colTotal:     { width: 80, textAlign: 'right' as const, fontWeight: '700' as const },
  colAct:       { width: 44, flexDirection: 'row', gap: 4 },
  priceInput:   { borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 4, fontSize: 12 },
  reviewBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: spacing.sm, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1.5 },
  reviewBtnText:{ fontWeight: '700' as const, fontSize: 13 },
  empty:        { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText:    { ...typography.bodySmall },
});
