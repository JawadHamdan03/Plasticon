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
import { useLocale } from '../../context/LocaleContext';

interface SaleItem {
  machineType: string;
  size:        string;
  quantity:    number;
  pricePerUnit: number;
}

interface Sale {
  id:          number;
  totalAmount: number;
  date:        string;
  createdAt:   string;
  customer?:   { id: number; name?: string };
  soldBy?:     { fullName: string };
  items?:      SaleItem[];
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function SaleCard({ item }: { item: Sale }) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const date     = new Date(item.date ?? item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  const itemDesc = item.items && item.items.length > 0
    ? item.items.map((i) => `${i.machineType} ${i.size} ×${i.quantity}`).join(', ')
    : null;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.cardTop}>
        <View style={[styles.cardIcon, { backgroundColor: `${colors.success}15` }]}>
          <Ionicons name="trending-up" size={20} color={colors.success} />
        </View>
        <View style={styles.cardBody}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{item.customer?.name ?? `${isAr ? 'بيع' : 'Sale'} #${item.id}`}</Text>
          {itemDesc && <Text style={[styles.cardSub, { color: colors.textMuted }]} numberOfLines={1}>{itemDesc}</Text>}
          <Text style={[styles.cardDate, { color: colors.textMuted }]}>{date}</Text>
        </View>
        <Text style={[styles.amount, { color: colors.success }]}>${fmt(item.totalAmount ?? 0)}</Text>
      </View>
      {item.soldBy && (
        <Text style={[styles.soldBy, { color: colors.textMuted, borderTopColor: colors.border }]}>
          {isAr ? 'بواسطة' : 'By'}: {item.soldBy.fullName}
        </Text>
      )}
    </View>
  );
}

export function SalesAdminScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const [sales,      setSales]      = useState<Sale[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<Sale[]>('/sales/all');
      setSales(Array.isArray(res) ? res : []);
    } catch {
      setSales([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const totalRevenue = sales.reduce((s, sale) => s + (sale.totalAmount ?? 0), 0);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={isAr ? 'المبيعات' : 'Sales'} subtitle={isAr ? 'طلبات البيع والإيرادات' : 'Sales orders and revenue'} />
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
        >
          <View style={[styles.kpiRow, { backgroundColor: colors.surface }]}>
            <View style={styles.kpi}>
              <Text style={[styles.kpiVal, { color: colors.primary }]}>{sales.length}</Text>
              <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>{isAr ? 'الطلبات' : 'Orders'}</Text>
            </View>
            <View style={styles.kpi}>
              <Text style={[styles.kpiVal, { color: colors.success }]}>
                ${totalRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </Text>
              <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>{isAr ? 'إجمالي الإيرادات' : 'Total Revenue'}</Text>
            </View>
          </View>

          {sales.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="bar-chart-outline" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>{isAr ? 'لا توجد سجلات مبيعات' : 'No sales records found'}</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {sales.map((sale, idx) => <SaleCard key={`${sale.id}-${idx}`} item={sale} />)}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1 },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content:   { padding: spacing.md, paddingBottom: 40 },
  kpiRow:    { flexDirection: 'row', borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.lg, ...shadow.sm },
  kpi:       { flex: 1, alignItems: 'center' },
  kpiVal:    { ...typography.h2 },
  kpiLabel:  { ...typography.caption, marginTop: 2 },
  empty:     { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.sm },
  emptyText: { ...typography.bodySmall },
  list:      { gap: spacing.sm },
  card:      { borderRadius: radius.lg, padding: spacing.md, ...shadow.sm },
  cardTop:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardIcon:  { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  cardBody:  { flex: 1 },
  cardTitle: { ...typography.h4 },
  cardSub:   { ...typography.caption, marginTop: 2 },
  cardDate:  { ...typography.caption },
  amount:    { ...typography.h4 },
  soldBy:    { ...typography.caption, marginTop: 6, borderTopWidth: 1, paddingTop: 6 },
});
