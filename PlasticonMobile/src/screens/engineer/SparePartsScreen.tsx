import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader, StatCard } from '../../components';
import { SparePart } from '../../api/types';
import { colors, radius, shadow, spacing, typography } from '../../theme';

function PartCard({ item }: { item: SparePart }) {
  const low = item.quantity <= item.minQuantity;
  return (
    <View style={[styles.card, low && styles.cardLow]}>
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          {item.partNumber ? <Text style={styles.partNo}>#{item.partNumber}</Text> : null}
        </View>
        <View style={styles.qtyBlock}>
          <Text style={[styles.qty, low && { color: colors.danger }]}>{item.quantity}</Text>
          <Text style={styles.unit}>{item.unit}</Text>
        </View>
      </View>
      <View style={styles.footer}>
        <View style={[styles.stockBadge, low ? styles.lowBadge : styles.okBadge]}>
          <Ionicons name={low ? 'warning' : 'checkmark-circle'} size={12} color={low ? colors.danger : colors.success} />
          <Text style={[styles.stockText, { color: low ? colors.danger : colors.success }]}>
            {low ? `Low (min: ${item.minQuantity})` : 'In Stock'}
          </Text>
        </View>
        {item.cost != null && <Text style={styles.cost}>${item.cost.toFixed(2)}/unit</Text>}
      </View>
    </View>
  );
}

export function SparePartsScreen() {
  const [parts, setParts]       = useState<SparePart[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ parts: SparePart[] }>('/spare-parts?limit=60');
      setParts(res.parts ?? []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const lowCount = parts.filter((p) => p.quantity <= p.minQuantity).length;

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Spare Parts" subtitle={lowCount ? `${lowCount} low stock` : 'All stocked'} showBack />
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={parts}
          keyExtractor={(i) => String(i.id)}
          renderItem={({ item }) => <PartCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListHeaderComponent={lowCount > 0 ? (
            <StatCard label="Low Stock Alerts" value={String(lowCount)} icon="warning" color={colors.danger} style={styles.alertCard} />
          ) : null}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="settings-outline" size={44} color={colors.textMuted} /><Text style={styles.emptyText}>No spare parts</Text></View>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: colors.background },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:      { padding: spacing.md, paddingBottom: 40 },
  alertCard: { marginBottom: spacing.md },
  card:      { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardLow:   { borderLeftWidth: 3, borderLeftColor: colors.danger },
  cardTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  cardLeft:  { flex: 1, marginRight: spacing.sm },
  name:      { ...typography.h4 },
  partNo:    { ...typography.caption, marginTop: 2 },
  qtyBlock:  { alignItems: 'flex-end' },
  qty:       { fontSize: 22, fontWeight: '800', color: colors.text },
  unit:      { ...typography.caption },
  footer:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stockBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  lowBadge:  { backgroundColor: colors.dangerLight },
  okBadge:   { backgroundColor: colors.successLight },
  stockText: { fontSize: 11, fontWeight: '700' },
  cost:      { ...typography.caption, fontWeight: '600', color: colors.textSecondary },
  empty:     { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText: { ...typography.bodySmall, color: colors.textMuted },
});
