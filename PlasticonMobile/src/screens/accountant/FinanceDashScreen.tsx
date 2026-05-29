import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../api/client';
import { ScreenHeader, StatCard } from '../../components';
import { colors, radius, shadow, spacing, typography } from '../../theme';

interface FinanceSummary {
  totalRevenue:    number;
  totalExpenses:   number;
  netProfit:       number;
  monthRevenue?:   number;
  pendingInvoices?: number;
  overdueCount?:   number;
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function FinanceDashScreen() {
  const [data, setData]         = useState<FinanceSummary | null>(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation<any>();

  const load = useCallback(async () => {
    try {
      const res = await api.get<FinanceSummary>('/financial/summary');
      setData(res);
    } catch {
      setData({ totalRevenue: 0, totalExpenses: 0, netProfit: 0 });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const profit = data?.netProfit ?? 0;

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Finance Dashboard" />
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View> : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
        >
          <View style={styles.kpiRow}>
            <StatCard label="Total Revenue"  value={`$${fmt(data?.totalRevenue ?? 0)}`}  icon="trending-up"   color={colors.success} style={styles.kpi} />
            <StatCard label="Total Expenses" value={`$${fmt(data?.totalExpenses ?? 0)}`} icon="trending-down" color={colors.danger}  style={styles.kpi} />
          </View>
          <View style={styles.kpiRow}>
            <StatCard label="Net Profit"  value={`$${fmt(profit)}`}                  icon="cash"     color={profit >= 0 ? colors.success : colors.danger} style={styles.kpi} />
            <StatCard label="This Month"  value={`$${fmt(data?.monthRevenue ?? 0)}`} icon="calendar" color={colors.info}  style={styles.kpi} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Access</Text>
            <View style={styles.qlRow}>
              {[
                { icon: 'document-text', label: 'Reports',  color: colors.primary, screen: 'FinancialReports' },
                { icon: 'analytics',     label: 'Analysis', color: colors.info,    screen: 'CostAnalysis' },
                { icon: 'wallet',        label: 'Budget',   color: colors.success, screen: 'BudgetPlanning' },
              ].map((q) => (
                <TouchableOpacity key={q.screen} style={[styles.ql, { borderColor: `${q.color}40` }]} onPress={() => navigation.navigate(q.screen)} activeOpacity={0.75}>
                  <Ionicons name={q.icon as any} size={20} color={q.color} />
                  <Text style={[styles.qlLabel, { color: q.color }]}>{q.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {((data?.pendingInvoices ?? 0) > 0 || (data?.overdueCount ?? 0) > 0) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Alerts</Text>
              {(data?.pendingInvoices ?? 0) > 0 && (
                <View style={styles.alertRow}>
                  <Ionicons name="alert-circle" size={18} color={colors.warning} />
                  <Text style={styles.alertText}>{data!.pendingInvoices} pending invoices awaiting action</Text>
                </View>
              )}
              {(data?.overdueCount ?? 0) > 0 && (
                <View style={styles.alertRow}>
                  <Ionicons name="warning" size={18} color={colors.danger} />
                  <Text style={styles.alertText}>{data!.overdueCount} overdue invoices require attention</Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: colors.background },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content:      { padding: spacing.md, paddingBottom: 40 },
  kpiRow:       { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  kpi:          { flex: 1 },
  section:      { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginTop: spacing.md, ...shadow.sm },
  sectionTitle: { ...typography.h4, marginBottom: spacing.md },
  qlRow:        { flexDirection: 'row', gap: spacing.sm },
  ql:           { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 12, borderRadius: radius.md, borderWidth: 1.5, backgroundColor: colors.surfaceAlt },
  qlLabel:      { fontSize: 11, fontWeight: '700' },
  alertRow:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  alertText:    { ...typography.bodySmall, flex: 1 },
});
