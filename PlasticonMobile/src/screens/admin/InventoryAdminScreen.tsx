import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, RefreshControl, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { colors, radius, shadow, spacing, typography } from '../../theme';

interface InventoryItem {
  id:          string;
  name:        string;
  category?:   string;
  quantity:    number;
  unit:        string;
  reorderAt?:  number;
  cost?:       number;
  supplier?:   string;
}

export function InventoryAdminScreen() {
  const [items,      setItems]      = useState<InventoryItem[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<InventoryItem[] | { items: InventoryItem[]; data: InventoryItem[] }>('/inventory');
      if (Array.isArray(res)) {
        setItems(res);
      } else {
        setItems(res.items ?? res.data ?? []);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const lowCount  = items.filter((i) => i.reorderAt && i.quantity <= i.reorderAt).length;
  const totalCost = items.reduce((s, i) => s + (i.cost ?? 0) * i.quantity, 0);

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Inventory" subtitle="Stock management overview" />
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
        >
          <View style={styles.statsRow}>
            <View style={styles.stat}><Text style={styles.statVal}>{items.length}</Text><Text style={styles.statLabel}>SKUs</Text></View>
            <View style={styles.stat}><Text style={[styles.statVal, { color: colors.warning }]}>{lowCount}</Text><Text style={styles.statLabel}>Reorder</Text></View>
            <View style={styles.stat}><Text style={[styles.statVal, { color: colors.info }]}>${totalCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}</Text><Text style={styles.statLabel}>Total Value</Text></View>
          </View>

          {items.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="archive-outline" size={44} color={colors.textMuted} />
              <Text style={styles.emptyText}>No inventory items found</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {items.map((item) => {
                const isLow = !!(item.reorderAt && item.quantity <= item.reorderAt);
                return (
                  <View key={item.id} style={styles.card}>
                    <View style={[styles.cardIcon, { backgroundColor: isLow ? `${colors.warning}15` : `${colors.primary}10` }]}>
                      <Ionicons name={isLow ? 'warning' : 'archive'} size={20} color={isLow ? colors.warning : colors.primary} />
                    </View>
                    <View style={styles.cardBody}>
                      <Text style={styles.cardTitle}>{item.name}</Text>
                      <Text style={styles.cardSub}>{item.category ?? 'General'}{item.supplier ? ` · ${item.supplier}` : ''}</Text>
                    </View>
                    <View style={styles.qtyWrap}>
                      <Text style={[styles.qtyVal, isLow && { color: colors.warning }]}>{item.quantity}</Text>
                      <Text style={styles.qtyUnit}>{item.unit}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: colors.background },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content:   { padding: spacing.md, paddingBottom: 40 },
  statsRow:  { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.lg, ...shadow.sm },
  stat:      { flex: 1, alignItems: 'center' },
  statVal:   { ...typography.h2, color: colors.primary },
  statLabel: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  empty:     { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.sm },
  emptyText: { ...typography.bodySmall, color: colors.textMuted },
  list:      { gap: spacing.sm },
  card:      { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm, ...shadow.sm },
  cardIcon:  { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  cardBody:  { flex: 1 },
  cardTitle: { ...typography.h4 },
  cardSub:   { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  qtyWrap:   { alignItems: 'flex-end' },
  qtyVal:    { ...typography.h4 },
  qtyUnit:   { ...typography.caption, color: colors.textMuted },
});
