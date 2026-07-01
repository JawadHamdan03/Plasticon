import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
import { useLocale } from '../../context/LocaleContext';
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { radius, shadow, spacing, typography } from '../../theme';
import { ScreenHeader } from '../../components';
import { useAppTheme } from '../../context/ThemeContext';

interface Sale {
  id: number;
  totalAmount: number;
  date: string;
  customer?: {
    id: number;
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
  };
}

interface CustomerEntry {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  totalDebt: number;
  salesCount: number;
  lastSaleDate: string;
}

function groupSalesByCustomer(sales: Sale[]): CustomerEntry[] {
  const map = new Map<number, CustomerEntry>();
  for (const sale of sales) {
    const c = sale.customer;
    if (!c?.id) continue;
    const existing = map.get(c.id);
    if (existing) {
      existing.totalDebt += sale.totalAmount ?? 0;
      existing.salesCount += 1;
      if (sale.date > existing.lastSaleDate) existing.lastSaleDate = sale.date;
    } else {
      map.set(c.id, {
        id: c.id,
        name: c.name ?? `Customer #${c.id}`,
        phone: c.phone,
        email: c.email,
        address: c.address,
        totalDebt: sale.totalAmount ?? 0,
        salesCount: 1,
        lastSaleDate: sale.date ?? '',
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.totalDebt - a.totalDebt);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function CustomerCard({ item }: { item: CustomerEntry }) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.avatarWrap, { backgroundColor: `${colors.info}15` }]}>
          <Ionicons name="person" size={22} color={colors.info} />
        </View>
        <View style={styles.cardHeaderText}>
          <Text style={[styles.customerName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
          {item.phone ? (
            <Text style={[styles.metaLine, { color: colors.textMuted }]} numberOfLines={1}>
              <Ionicons name="call-outline" size={12} color={colors.textMuted} />
              {'  '}{item.phone}
            </Text>
          ) : null}
          {item.email ? (
            <Text style={[styles.metaLine, { color: colors.textMuted }]} numberOfLines={1}>
              <Ionicons name="mail-outline" size={12} color={colors.textMuted} />
              {'  '}{item.email}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>{'إجمالي الدين'}</Text>
          <Text style={[styles.statValue, { color: colors.danger }]}>${formatCurrency(item.totalDebt)}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>{'المبيعات'}</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>{item.salesCount}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>{'آخر بيع'}</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>{formatDate(item.lastSaleDate)}</Text>
        </View>
      </View>
    </View>
  );
}

export function CustomersScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();

  const [customers, setCustomers]   = useState<CustomerEntry[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [search, setSearch]         = useState('');

  const fetchCustomers = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const res = await api.get<Sale[]>('/sales/all?limit=100');
      const raw: Sale[] = Array.isArray(res) ? res : [];
      setCustomers(groupSalesByCustomer(raw));
    } catch (err: any) {
      setError(err?.message ?? ('فشل تحميل العملاء.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAr]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone ?? '').toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q),
    );
  }, [customers, search]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={'العملاء'} showBack />

      <View style={[styles.searchWrap, { backgroundColor: colors.surface }]}>
        <Ionicons name="search-outline" size={18} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder={'البحث بالاسم أو الهاتف أو البريد…'}
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>{'جارٍ تحميل العملاء…'}</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
          <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, idx) => `${String(item.id)}-${idx}`}
          renderItem={({ item }) => <CustomerCard item={item} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchCustomers(true)}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="people-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {search
                  ? ('لا يوجد عملاء يطابقون البحث.')
                  : ('لا يوجد عملاء.')}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm,
    ...shadow.sm,
  },
  searchIcon:  { marginRight: spacing.xs },
  searchInput: { flex: 1, height: 42, ...typography.body },

  listContent: { padding: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xxl },

  card:           { borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardHeader:     { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  avatarWrap:     { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  cardHeaderText: { flex: 1 },
  customerName:   { ...typography.h4, marginBottom: 2 },
  metaLine:       { ...typography.bodySmall, marginTop: 2 },

  divider: { height: 1, marginVertical: spacing.sm },

  statsRow:  { flexDirection: 'row', justifyContent: 'space-between' },
  statItem:  { alignItems: 'center', flex: 1 },
  statLabel: { ...typography.bodySmall, marginBottom: 2 },
  statValue: { ...typography.h4 },

  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, marginTop: spacing.xxl },
  loadingText: { ...typography.body, marginTop: spacing.sm },
  errorText:   { ...typography.body, marginTop: spacing.sm, textAlign: 'center' },
  emptyText:   { ...typography.body, marginTop: spacing.sm, textAlign: 'center' },
});
