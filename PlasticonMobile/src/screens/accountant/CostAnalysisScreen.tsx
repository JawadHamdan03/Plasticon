import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader, StatCard } from '../../components';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

interface CostRecord {
  id: number;
  category?: string;
  department?: string;
  cost?: number;
  amount?: number;
  percentage?: number;
  period?: string;
  description?: string;
  notes?: string;
  date?: string;
  createdAt: string;
}

function fmt(n: number) { return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function CostCard({ item }: { item: CostRecord }) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <Text style={[styles.category, { color: colors.text }]}>{item.category ?? (isAr ? 'عام' : 'General')}</Text>
          {item.department ? <Text style={[styles.dept, { color: colors.textMuted }]}>{item.department}</Text> : null}
        </View>
        <Text style={[styles.amount, { color: colors.danger }]}>${fmt(item.cost ?? item.amount ?? 0)}</Text>
      </View>
      {(item.description ?? item.notes) ? <Text style={[styles.desc, { color: colors.textSecondary }]} numberOfLines={2}>{item.description ?? item.notes}</Text> : null}
      <Text style={[styles.date, { color: colors.textMuted }]}>{item.period ?? new Date(item.createdAt).toLocaleDateString([], { month: 'short', year: 'numeric' })}</Text>
    </View>
  );
}

export function CostAnalysisScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();

  const [costs, setCosts]       = useState<CostRecord[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<CostRecord[]>('/cost-analysis?limit=30');
      const records = Array.isArray(res) ? res : [];
      setCosts(records);
      setTotal(records.reduce((s, r) => s + (r.cost ?? r.amount ?? 0), 0));
    } catch (e: any) {
      Alert.alert(isAr ? 'خطأ' : 'Error', e?.message ?? (isAr ? 'فشل تحميل تحليل التكاليف' : 'Failed to load cost analysis'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAr]);

  useEffect(() => { void load(); }, [load]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={isAr ? 'تحليل التكاليف' : 'Cost Analysis'} showBack />
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View> : (
        <FlatList
          data={costs}
          keyExtractor={(i, idx) => `${String(i.id)}-${idx}`}
          renderItem={({ item }) => <CostCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListHeaderComponent={<StatCard label={isAr ? 'إجمالي التكاليف' : 'Total Costs'} value={`$${fmt(total)}`} icon="analytics" color={colors.danger} style={styles.header} />}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="analytics-outline" size={44} color={colors.textMuted} /><Text style={[styles.emptyText, { color: colors.textMuted }]}>{isAr ? 'لا توجد بيانات تكاليف' : 'No cost data'}</Text></View>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:     { flex: 1 },
  center:   { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:     { padding: spacing.md, paddingBottom: 40 },
  header:   { marginBottom: spacing.md },
  card:     { borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardTop:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  cardLeft: { flex: 1, marginRight: spacing.sm },
  category: { ...typography.h4 },
  dept:     { ...typography.caption, marginTop: 2 },
  amount:   { fontSize: 18, fontWeight: '800' },
  desc:     { ...typography.bodySmall, marginBottom: 4 },
  date:     { ...typography.caption },
  empty:    { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText: { ...typography.bodySmall },
});
