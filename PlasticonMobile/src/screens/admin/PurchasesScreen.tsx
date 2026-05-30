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

interface PurchaseItem {
  quantity:    number;
  pricePerUnit: number;
  material?:   { name: string; unit: string };
}

interface Purchase {
  id:          number;
  totalAmount: number;
  date:        string;
  createdAt:   string;
  supplier?:   { id: number; name?: string };
  receivedBy?: { fullName: string };
  items?:      PurchaseItem[];
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function PurchaseCard({ item }: { item: Purchase }) {
  const date     = new Date(item.date ?? item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  const itemDesc = item.items && item.items.length > 0
    ? item.items.map((i) => `${i.material?.name ?? 'Item'} ×${i.quantity}`).join(', ')
    : null;

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={[styles.cardIcon, { backgroundColor: `${colors.info}15` }]}>
          <Ionicons name="cart" size={20} color={colors.info} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>{item.supplier?.name ?? `Purchase #${item.id}`}</Text>
          {itemDesc && <Text style={styles.cardSub} numberOfLines={1}>{itemDesc}</Text>}
          <Text style={styles.cardDate}>{date}</Text>
        </View>
        <Text style={styles.amount}>${fmt(item.totalAmount ?? 0)}</Text>
      </View>
      {item.receivedBy && <Text style={styles.receivedBy}>By: {item.receivedBy.fullName}</Text>}
    </View>
  );
}

export function PurchasesScreen() {
  const [items,      setItems]      = useState<Purchase[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<Purchase[]>('/purchases/all');
      setItems(Array.isArray(res) ? res : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const totalValue = items.reduce((s, p) => s + (p.totalAmount ?? 0), 0);

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Purchases" subtitle="Purchase orders and procurement" />
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
        >
          <View style={styles.kpiRow}>
            <View style={styles.kpi}>
              <Text style={styles.kpiVal}>{items.length}</Text>
              <Text style={styles.kpiLabel}>Total Orders</Text>
            </View>
            <View style={styles.kpi}>
              <Text style={[styles.kpiVal, { color: colors.success }]}>
                ${totalValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </Text>
              <Text style={styles.kpiLabel}>Total Value</Text>
            </View>
          </View>

          {items.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="cart-outline" size={44} color={colors.textMuted} />
              <Text style={styles.emptyText}>No purchase orders found</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {items.map((p, idx) => <PurchaseCard key={`${p.id}-${idx}`} item={p} />)}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: colors.background },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content:    { padding: spacing.md, paddingBottom: 40 },
  kpiRow:     { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.lg, ...shadow.sm },
  kpi:        { flex: 1, alignItems: 'center' },
  kpiVal:     { ...typography.h2, color: colors.primary },
  kpiLabel:   { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  empty:      { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.sm },
  emptyText:  { ...typography.bodySmall, color: colors.textMuted },
  list:       { gap: spacing.sm },
  card:       { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, ...shadow.sm },
  cardTop:    { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardIcon:   { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  cardBody:   { flex: 1 },
  cardTitle:  { ...typography.h4 },
  cardSub:    { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  cardDate:   { ...typography.caption, color: colors.textMuted },
  amount:     { ...typography.h4, color: colors.info },
  receivedBy: { ...typography.caption, color: colors.textMuted, marginTop: 6, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 6 },
});
