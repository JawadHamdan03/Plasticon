import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

interface TransferRecord {
  id: number;
  item?: { name: string };
  itemName?: string;
  fromLocation?: string;
  toLocation?: string;
  quantity?: number;
  transferredBy?: { fullName: string } | null;
  transferDate?: string;
  notes?: string | null;
  createdAt: string;
}

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function TransferCard({ item }: { item: TransferRecord }) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const name = item.item?.name ?? item.itemName ?? `Transfer #${item.id}`;
  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.cardTop}>
        <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>{name}</Text>
        <Text style={[styles.date, { color: colors.textMuted }]}>{fmtDate(item.transferDate ?? item.createdAt)}</Text>
      </View>
      <View style={styles.route}>
        <View style={styles.location}>
          <Text style={[styles.locationLabel, { color: colors.textMuted }]}>{isAr ? 'من' : 'From'}</Text>
          <Text style={[styles.locationValue, { color: colors.text }]}>{item.fromLocation ?? '—'}</Text>
        </View>
        <Ionicons name="arrow-forward" size={16} color={colors.primary} />
        <View style={styles.location}>
          <Text style={[styles.locationLabel, { color: colors.textMuted }]}>{isAr ? 'إلى' : 'To'}</Text>
          <Text style={[styles.locationValue, { color: colors.text }]}>{item.toLocation ?? '—'}</Text>
        </View>
        {item.quantity != null && (
          <View style={styles.qty}>
            <Text style={[styles.qtyVal, { color: colors.primary }]}>{item.quantity}</Text>
            <Text style={[styles.qtyLabel, { color: colors.textMuted }]}>{isAr ? 'وحدة' : 'units'}</Text>
          </View>
        )}
      </View>
      {item.transferredBy && (
        <View style={styles.byRow}>
          <Ionicons name="person-outline" size={11} color={colors.textMuted} />
          <Text style={[styles.byText, { color: colors.textMuted }]}>{item.transferredBy.fullName}</Text>
        </View>
      )}
    </View>
  );
}

export function TransferLogScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const [logs, setLogs]         = useState<TransferRecord[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ transfers: TransferRecord[] }>('/engineer-inventory/transfers?limit=40');
      setLogs(res.transfers ?? []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={isAr ? 'سجل النقل' : 'Transfer Log'} subtitle={isAr ? 'سجل حركة المعدات' : 'Equipment movement history'} showBack />
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(i, idx) => `${String(i.id)}-${idx}`}
          renderItem={({ item }) => <TransferCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="swap-horizontal-outline" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>{isAr ? 'لا توجد سجلات نقل' : 'No transfer records'}</Text>
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
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  itemName: { ...typography.h4, flex: 1, marginRight: spacing.sm },
  date:     { ...typography.caption },
  route:    { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  location: { flex: 1 },
  locationLabel: { ...typography.caption },
  locationValue: { ...typography.h4, fontSize: 14 },
  qty:      { alignItems: 'center' },
  qtyVal:   { fontSize: 18, fontWeight: '800' },
  qtyLabel: { ...typography.caption },
  byRow:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  byText:   { ...typography.caption },
  empty:    { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText: { ...typography.bodySmall },
});
