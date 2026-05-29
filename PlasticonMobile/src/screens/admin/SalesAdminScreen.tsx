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

interface Sale {
  id:         string;
  customer?:  string;
  product?:   string;
  quantity?:  number;
  total:      number;
  status?:    string;
  date?:      string;
}

function statusColor(s?: string) {
  if (!s) return colors.textMuted;
  const l = s.toLowerCase();
  if (l === 'paid' || l === 'completed') return colors.success;
  if (l === 'pending')                   return colors.warning;
  if (l === 'cancelled')                 return colors.danger;
  return colors.info;
}

export function SalesAdminScreen() {
  const [sales,      setSales]      = useState<Sale[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<Sale[] | { data: Sale[]; sales: Sale[] }>('/sales');
      if (Array.isArray(res)) {
        setSales(res);
      } else {
        setSales(res.data ?? res.sales ?? []);
      }
    } catch {
      setSales([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const totalRevenue = sales.reduce((s, sale) => s + (sale.total ?? 0), 0);
  const pending      = sales.filter((s) => s.status?.toLowerCase() === 'pending').length;

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Sales" subtitle="Sales orders and revenue" />
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
              <Text style={styles.kpiVal}>{sales.length}</Text>
              <Text style={styles.kpiLabel}>Orders</Text>
            </View>
            <View style={styles.kpi}>
              <Text style={[styles.kpiVal, { color: colors.warning }]}>{pending}</Text>
              <Text style={styles.kpiLabel}>Pending</Text>
            </View>
            <View style={styles.kpi}>
              <Text style={[styles.kpiVal, { color: colors.success }]}>
                ${totalRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </Text>
              <Text style={styles.kpiLabel}>Revenue</Text>
            </View>
          </View>

          {sales.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="bar-chart-outline" size={44} color={colors.textMuted} />
              <Text style={styles.emptyText}>No sales records found</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {sales.map((sale) => {
                const sc = statusColor(sale.status);
                return (
                  <View key={sale.id} style={styles.card}>
                    <View style={[styles.cardIcon, { backgroundColor: `${sc}15` }]}>
                      <Ionicons name="trending-up" size={20} color={sc} />
                    </View>
                    <View style={styles.cardBody}>
                      <Text style={styles.cardTitle}>{sale.customer ?? sale.product ?? `Order #${sale.id}`}</Text>
                      <Text style={styles.cardSub}>
                        {sale.product ? `${sale.product}` : ''}
                        {sale.quantity ? ` · Qty ${sale.quantity}` : ''}
                      </Text>
                      {sale.date ? <Text style={styles.cardDate}>{new Date(sale.date).toLocaleDateString()}</Text> : null}
                    </View>
                    <View style={styles.rightCol}>
                      <Text style={[styles.amount, { color: sc }]}>
                        ${sale.total.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </Text>
                      {sale.status ? (
                        <View style={[styles.badge, { backgroundColor: `${sc}15` }]}>
                          <Text style={[styles.badgeText, { color: sc }]}>{sale.status}</Text>
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
  amount:    { ...typography.h4 },
  badge:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm },
  badgeText: { fontSize: 11, fontWeight: '700' },
});
