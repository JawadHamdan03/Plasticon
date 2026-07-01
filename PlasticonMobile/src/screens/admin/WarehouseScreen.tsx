import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, RefreshControl, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';

interface WarehouseItem {
  id:           string;
  name:         string;
  category?:    string;
  quantity:     number;
  unit:         string;
  location?:    string;
  minStock?:    number;
  status?:      'ok' | 'low' | 'critical';
}

export function WarehouseScreen() {
  const { colors } = useAppTheme();
  const [items,      setItems]      = useState<WarehouseItem[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  function statusColor(item: WarehouseItem) {
    if (item.status === 'critical') return colors.danger;
    if (item.status === 'low') return colors.warning;
    if (item.minStock && item.quantity <= item.minStock) return colors.warning;
    return colors.success;
  }

  const load = useCallback(async () => {
    try {
      const res = await api.get<WarehouseItem[]>('/inventory/materials');
      setItems(Array.isArray(res) ? res : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const lowStock = items.filter((i) => i.minStock && i.quantity <= i.minStock).length;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={'المستودع'} subtitle={'مستويات المخزون ومواقع التخزين'} showBack />
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
        >
          {/* Summary */}
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderLeftColor: colors.primary }]}>
              <Text style={[styles.summaryVal, { color: colors.primary }]}>{items.length}</Text>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>{'إجمالي الأصناف'}</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderLeftColor: colors.warning }]}>
              <Text style={[styles.summaryVal, { color: colors.warning }]}>{lowStock}</Text>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>{'مخزون منخفض'}</Text>
            </View>
          </View>

          {items.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="cube-outline" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>{'لا توجد أصناف في المستودع'}</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {items.map((item, idx) => {
                const dot = statusColor(item);
                return (
                  <View key={`${item.id}-${idx}`} style={[styles.card, { backgroundColor: colors.surface }]}>
                    <View style={[styles.dot, { backgroundColor: dot }]} />
                    <View style={styles.cardBody}>
                      <Text style={[styles.cardTitle, { color: colors.text }]}>{item.name}</Text>
                      <Text style={[styles.cardSub, { color: colors.textMuted }]}>
                        {item.category ? `${item.category} · ` : ''}{item.location ?? ('لا يوجد موقع')}
                      </Text>
                    </View>
                    <View style={styles.qtyBlock}>
                      <Text style={[styles.qtyVal, { color: dot }]}>{item.quantity}</Text>
                      <Text style={[styles.qtyUnit, { color: colors.textMuted }]}>{item.unit}</Text>
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
  safe:         { flex: 1 },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content:      { padding: spacing.md, paddingBottom: 40 },
  summaryRow:   { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  summaryCard:  { flex: 1, borderRadius: radius.md, padding: spacing.md, borderLeftWidth: 3, ...shadow.sm },
  summaryVal:   { ...typography.h2 },
  summaryLabel: { ...typography.caption, marginTop: 2 },
  empty:        { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.sm },
  emptyText:    { ...typography.bodySmall },
  list:         { gap: spacing.sm },
  card:         { flexDirection: 'row', alignItems: 'center', borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm, ...shadow.sm },
  dot:          { width: 10, height: 10, borderRadius: 5 },
  cardBody:     { flex: 1 },
  cardTitle:    { ...typography.h4 },
  cardSub:      { ...typography.caption, marginTop: 2 },
  qtyBlock:     { alignItems: 'flex-end' },
  qtyVal:       { ...typography.h4 },
  qtyUnit:      { ...typography.caption },
});
