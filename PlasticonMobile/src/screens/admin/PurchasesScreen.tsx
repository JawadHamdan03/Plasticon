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

interface Purchase {
  id:         string;
  itemName:   string;
  supplier?:  string;
  quantity:   number;
  unitPrice?: number;
  total?:     number;
  status?:    string;
  date?:      string;
}

function statusColor(s?: string) {
  if (!s) return colors.textMuted;
  const l = s.toLowerCase();
  if (l === 'completed' || l === 'delivered') return colors.success;
  if (l === 'pending')   return colors.warning;
  if (l === 'cancelled') return colors.danger;
  return colors.info;
}

export function PurchasesScreen() {
  const [items,      setItems]      = useState<Purchase[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<Purchase[] | { data: Purchase[]; purchases: Purchase[] }>('/purchases');
      if (Array.isArray(res)) {
        setItems(res);
      } else {
        setItems(res.data ?? res.purchases ?? []);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const totalValue = items.reduce((s, p) => s + (p.total ?? (p.unitPrice ?? 0) * p.quantity), 0);
  const pending    = items.filter((p) => p.status?.toLowerCase() === 'pending').length;

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
              <Text style={[styles.kpiVal, { color: colors.warning }]}>{pending}</Text>
              <Text style={styles.kpiLabel}>Pending</Text>
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
              {items.map((p) => {
                const sc = statusColor(p.status);
                return (
                  <View key={p.id} style={styles.card}>
                    <View style={[styles.cardIcon, { backgroundColor: `${sc}15` }]}>
                      <Ionicons name="cart" size={20} color={sc} />
                    </View>
                    <View style={styles.cardBody}>
                      <Text style={styles.cardTitle}>{p.itemName}</Text>
                      <Text style={styles.cardSub}>
                        Qty: {p.quantity}{p.supplier ? ` · ${p.supplier}` : ''}
                      </Text>
                      {p.date ? <Text style={styles.cardDate}>{new Date(p.date).toLocaleDateString()}</Text> : null}
                    </View>
                    <View style={styles.rightCol}>
                      {(p.total || p.unitPrice) ? (
                        <Text style={styles.amount}>
                          ${(p.total ?? (p.unitPrice! * p.quantity)).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </Text>
                      ) : null}
                      {p.status ? (
                        <View style={[styles.badge, { backgroundColor: `${sc}15` }]}>
                          <Text style={[styles.badgeText, { color: sc }]}>{p.status}</Text>
                        </View>
                      ) : null}
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
  kpiRow:    { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.lg, ...shadow.sm },
  kpi:       { flex: 1, alignItems: 'center' },
  kpiVal:    { ...typography.h2, color: colors.primary },
  kpiLabel:  { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  empty:     { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.sm },
  emptyText: { ...typography.bodySmall, color: colors.textMuted },
  list:      { gap: spacing.sm },
  card:      { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm, ...shadow.sm },
  cardIcon:  { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  cardBody:  { flex: 1 },
  cardTitle: { ...typography.h4 },
  cardSub:   { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  cardDate:  { ...typography.caption, color: colors.textMuted },
  rightCol:  { alignItems: 'flex-end', gap: 4 },
  amount:    { ...typography.h4, color: colors.success },
  badge:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm },
  badgeText: { fontSize: 11, fontWeight: '700' },
});
