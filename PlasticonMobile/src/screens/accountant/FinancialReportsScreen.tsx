import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { colors, radius, shadow, spacing, typography } from '../../theme';

interface FinancialReport {
  id: number;
  title?: string;
  reportType?: string;
  period?: string;
  totalRevenue?: number;
  totalExpenses?: number;
  netProfit?: number;
  createdAt: string;
}

function fmt(n: number) { return n.toLocaleString('en-US', { minimumFractionDigits: 0 }); }

function ReportCard({ item }: { item: FinancialReport }) {
  const profit = item.netProfit ?? 0;
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.iconWrap}>
          <Ionicons name="document-text" size={20} color={colors.primary} />
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.title} numberOfLines={1}>{item.title ?? item.reportType ?? `Report #${item.id}`}</Text>
          <Text style={styles.period}>{item.period ?? new Date(item.createdAt).toLocaleDateString([], { month: 'long', year: 'numeric' })}</Text>
        </View>
      </View>
      <View style={styles.metrics}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Revenue</Text>
          <Text style={[styles.metricVal, { color: colors.success }]}>${fmt(item.totalRevenue ?? 0)}</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Expenses</Text>
          <Text style={[styles.metricVal, { color: colors.danger }]}>${fmt(item.totalExpenses ?? 0)}</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Net</Text>
          <Text style={[styles.metricVal, { color: profit >= 0 ? colors.success : colors.danger }]}>${fmt(profit)}</Text>
        </View>
      </View>
    </View>
  );
}

export function FinancialReportsScreen() {
  const [reports, setReports]   = useState<FinancialReport[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<FinancialReport[]>('/financial-reports?limit=20');
      setReports(Array.isArray(res) ? res : []);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to load reports');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Financial Reports" subtitle={`${reports.length} reports`} showBack />
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View> : (
        <FlatList
          data={reports}
          keyExtractor={(i) => String(i.id)}
          renderItem={({ item }) => <ReportCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="document-outline" size={44} color={colors.textMuted} /><Text style={styles.emptyText}>No reports available</Text></View>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: colors.background },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:        { padding: spacing.md, paddingBottom: 40 },
  card:        { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardTop:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  iconWrap:    { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: `${colors.primary}15`, alignItems: 'center', justifyContent: 'center' },
  cardContent: { flex: 1 },
  title:       { ...typography.h4 },
  period:      { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  metrics:     { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  metric:      { flex: 1, alignItems: 'center' },
  metricLabel: { ...typography.caption, marginBottom: 2 },
  metricVal:   { fontSize: 14, fontWeight: '700' },
  empty:       { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText:   { ...typography.bodySmall, color: colors.textMuted },
});
