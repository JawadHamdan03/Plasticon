import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader, StatCard } from '../../components';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

interface CostRecord {
  id: number;
  maintenanceId?: number;
  maintenance?: { machine?: { name: string } };
  category?: string;
  totalCost?: number;
  amount?: number;
  laborHours?: number;
  sparesTotal?: number;
  notes?: string;
  description?: string;
  createdAt: string;
}

function fmt(n: number) { return n.toLocaleString('en-US', { minimumFractionDigits: 2 }); }
function fmtDate(d: string) { return new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }); }

function CostCard({ item }: { item: CostRecord }) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <Text style={[styles.machine, { color: colors.text }]} numberOfLines={1}>{item.maintenance?.machine?.name ?? `Record #${item.id}`}</Text>
          <Text style={[styles.category, { color: colors.textMuted }]}>{item.category ?? (isAr ? 'عام' : 'General')}</Text>
        </View>
        <Text style={[styles.amount, { color: colors.danger }]}>${fmt(item.totalCost ?? item.amount ?? 0)}</Text>
      </View>
      {(item.notes ?? item.description) ? <Text style={[styles.desc, { color: colors.textSecondary }]} numberOfLines={2}>{item.notes ?? item.description}</Text> : null}
      <Text style={[styles.date, { color: colors.textMuted }]}>{fmtDate(item.createdAt)}</Text>
    </View>
  );
}

export function MaintCostsScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const [costs, setCosts]       = useState<CostRecord[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<CostRecord[]>('/maintenance-costs?limit=40');
      const records = Array.isArray(res) ? res : [];
      setCosts(records);
      setTotal(records.reduce((s, r) => s + (r.totalCost ?? r.amount ?? 0), 0));
    } catch {
      setCosts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={isAr ? 'تكاليف الصيانة' : 'Maintenance Costs'} showBack />
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={costs}
          keyExtractor={(i, idx) => `${String(i.id)}-${idx}`}
          renderItem={({ item }) => <CostCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListHeaderComponent={
            <StatCard label={isAr ? 'إجمالي تكاليف الصيانة' : 'Total Maintenance Cost'} value={`$${fmt(total)}`} icon="cash" color={colors.danger} style={styles.totalCard} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="cash-outline" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>{isAr ? 'لا توجد سجلات تكاليف' : 'No cost records'}</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1 },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:      { padding: spacing.md, paddingBottom: 40 },
  totalCard: { marginBottom: spacing.md },
  card:      { borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  cardLeft:  { flex: 1, marginRight: spacing.sm },
  machine:   { ...typography.h4 },
  category:  { ...typography.caption, marginTop: 2 },
  amount:    { fontSize: 18, fontWeight: '800' },
  desc:      { ...typography.bodySmall, marginBottom: 4 },
  date:      { ...typography.caption },
  empty:     { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText: { ...typography.bodySmall },
});
