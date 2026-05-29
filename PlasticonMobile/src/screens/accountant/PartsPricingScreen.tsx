import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { colors, radius, shadow, spacing, typography } from '../../theme';

interface SparePart {
  id: number;
  name: string;
  partNumber?: string;
  category?: string;
  unitPrice?: number;
  costPrice?: number;
  quantity?: number;
  supplier?: string;
  createdAt: string;
}

function fmt(n: number) { return n.toLocaleString('en-US', { minimumFractionDigits: 2 }); }

function PartCard({ item }: { item: SparePart }) {
  const price = item.unitPrice ?? item.costPrice ?? 0;
  const totalValue = price * (item.quantity ?? 0);
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          {item.partNumber && <Text style={styles.partNo}>{item.partNumber}</Text>}
        </View>
        <View style={styles.priceBox}>
          <Text style={styles.price}>${fmt(price)}</Text>
          <Text style={styles.priceLabel}>unit</Text>
        </View>
      </View>
      <View style={styles.footer}>
        {item.category && <Text style={styles.tag}>{item.category}</Text>}
        {item.quantity != null && <Text style={styles.qty}>Qty: {item.quantity}</Text>}
        {totalValue > 0 && <Text style={styles.total}>Total value: ${fmt(totalValue)}</Text>}
        {item.supplier && <Text style={styles.supplier}>Supplier: {item.supplier}</Text>}
      </View>
    </View>
  );
}

export function PartsPricingScreen() {
  const [parts, setParts]       = useState<SparePart[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ parts: SparePart[] }>('/spare-parts?limit=40');
      setParts(res.parts ?? []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Parts Pricing" subtitle={`${parts.length} parts`} showBack />
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View> : (
        <FlatList
          data={parts}
          keyExtractor={(i) => String(i.id)}
          renderItem={({ item }) => <PartCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="pricetag-outline" size={44} color={colors.textMuted} /><Text style={styles.emptyText}>No parts found</Text></View>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: colors.background },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:       { padding: spacing.md, paddingBottom: 40 },
  card:       { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardLeft:   { flex: 1, marginRight: spacing.sm },
  name:       { ...typography.h4 },
  partNo:     { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  priceBox:   { alignItems: 'flex-end' },
  price:      { fontSize: 18, fontWeight: '800', color: colors.success },
  priceLabel: { ...typography.caption, color: colors.textMuted },
  footer:     { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 },
  tag:        { ...typography.caption, backgroundColor: `${colors.info}15`, color: colors.info, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full },
  qty:        { ...typography.caption },
  total:      { ...typography.caption, fontWeight: '700', color: colors.text },
  supplier:   { ...typography.caption, color: colors.textMuted },
  empty:      { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText:  { ...typography.bodySmall, color: colors.textMuted },
});
