import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

interface InventoryItem {
  id: number;
  name: string;
  category?: string;
  quantity: number;
  unit?: string;
  location?: string;
  condition?: string;
  assignedTo?: { fullName: string } | null;
}

function ItemCard({ item }: { item: InventoryItem }) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();

  const CONDITION_COLOR: Record<string, string> = {
    GOOD: colors.success, FAIR: colors.warning, POOR: colors.danger,
  };
  const condColor = CONDITION_COLOR[item.condition ?? 'GOOD'] ?? colors.primary;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.category, { color: colors.textMuted }]}>{item.category ?? (isAr ? 'عام' : 'General')}</Text>
        </View>
        <View style={styles.cardRight}>
          <Text style={[styles.qty, { color: colors.primary }]}>{item.quantity}</Text>
          <Text style={[styles.unit, { color: colors.textMuted }]}>{item.unit ?? (isAr ? 'قطعة' : 'pcs')}</Text>
        </View>
      </View>
      <View style={styles.footer}>
        {item.location ? (
          <View style={[styles.chip, { backgroundColor: colors.surfaceAlt }]}>
            <Ionicons name="location-outline" size={11} color={colors.textMuted} />
            <Text style={[styles.chipText, { color: colors.textSecondary }]}>{item.location}</Text>
          </View>
        ) : null}
        {item.condition ? (
          <View style={[styles.chip, { backgroundColor: `${condColor}15` }]}>
            <Text style={[styles.chipText, { color: condColor }]}>{item.condition}</Text>
          </View>
        ) : null}
        {item.assignedTo ? (
          <View style={[styles.chip, { backgroundColor: colors.surfaceAlt }]}>
            <Ionicons name="person-outline" size={11} color={colors.textMuted} />
            <Text style={[styles.chipText, { color: colors.textSecondary }]}>{item.assignedTo.fullName}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

export function EngInventoryScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const [items, setItems]       = useState<InventoryItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ items: InventoryItem[] }>('/engineer-inventory?limit=60');
      setItems(res.items ?? []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={isAr ? 'مخزون المهندس' : 'Engineer Inventory'} subtitle={`${items.length} ${isAr ? 'عنصر' : 'items'}`} showBack />
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i, idx) => `${String(i.id)}-${idx}`}
          renderItem={({ item }) => <ItemCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="cube-outline" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>{isAr ? 'لا توجد عناصر مخزون' : 'No inventory items'}</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1 },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:    { padding: spacing.md, paddingBottom: 40 },
  card:    { borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  cardLeft:  { flex: 1, marginRight: spacing.sm },
  name:      { ...typography.h4 },
  category:  { ...typography.caption, marginTop: 2 },
  cardRight: { alignItems: 'flex-end' },
  qty:       { fontSize: 20, fontWeight: '800' },
  unit:      { ...typography.caption },
  footer:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip:      { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  chipText:  { fontSize: 11, fontWeight: '600' },
  empty:     { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText: { ...typography.bodySmall },
});
