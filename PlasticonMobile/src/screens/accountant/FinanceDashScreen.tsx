import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../api/client';
import { ScreenHeader, StatCard } from '../../components';
import { colors, radius, shadow, spacing, typography } from '../../theme';

interface FinanceSummary {
  revenue?:         number;
  salesRevenue?:    number;
  expenses?:        number;
  approvedExpenses?: number;
  netProfit?:       number;
  profit?:          number;
  cashBalance?:     number;
  rawMaterialCost?: number;
  electricityCost?: number;
  salaryCost?:      number;
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function FinanceDashScreen() {
  const [data, setData]         = useState<FinanceSummary | null>(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [invoicePending, setInvoicePending] = useState(0);
  const navigation = useNavigation<any>();

  const load = useCallback(async () => {
    try {
      const [finRes, invRes] = await Promise.allSettled([
        api.get<FinanceSummary>('/financial/dashboard'),
        api.get<any[]>('/invoices?limit=100'),
      ]);
      if (finRes.status === 'fulfilled') setData(finRes.value);
      if (invRes.status === 'fulfilled' && Array.isArray(invRes.value)) {
        setInvoicePending(invRes.value.filter((i: any) => i.paymentStatus === 'PENDING' || i.status === 'PENDING').length);
      }
    } catch {
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const totalRevenue = data?.salesRevenue ?? data?.revenue ?? 0;
  const totalExpenses = (data?.approvedExpenses ?? data?.expenses ?? 0) + (data?.rawMaterialCost ?? 0) + (data?.electricityCost ?? 0) + (data?.salaryCost ?? 0);
  const profit = data?.netProfit ?? data?.profit ?? 0;

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
            <StatCard label="Sales Revenue"  value={`$${fmt(totalRevenue)}`}   icon="trending-up"   color={colors.success} style={styles.kpi} />
            <StatCard label="Total Expenses" value={`$${fmt(totalExpenses)}`}  icon="trending-down" color={colors.danger}  style={styles.kpi} />
          </View>
          <View style={styles.kpiRow}>
            <StatCard label="Net Profit"     value={`$${fmt(profit)}`}                              icon="cash"          color={profit >= 0 ? colors.success : colors.danger} style={styles.kpi} />
            <StatCard label="Salary Cost"    value={`$${fmt(data?.salaryCost ?? 0)}`}               icon="people"        color={colors.info}    style={styles.kpi} />
          </View>

          {(data?.rawMaterialCost != null || data?.electricityCost != null) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Cost Breakdown</Text>
              {[
                { label: 'Raw Materials', value: data?.rawMaterialCost ?? 0, color: colors.warning },
                { label: 'Electricity',   value: data?.electricityCost ?? 0, color: colors.info },
                { label: 'Salaries',      value: data?.salaryCost ?? 0,      color: colors.accent },
                { label: 'Other Expenses',value: data?.approvedExpenses ?? 0, color: colors.danger },
              ].map((row) => (
                <View key={row.label} style={styles.alertRow}>
                  <View style={[styles.dot, { backgroundColor: row.color }]} />
                  <Text style={styles.alertText}>{row.label}</Text>
                  <Text style={[styles.alertText, { fontWeight: '700', color: row.color }]}>${fmt(row.value)}</Text>
                </View>
              ))}
            </View>
          )}

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

          {invoicePending > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Alerts</Text>
              <View style={styles.alertRow}>
                <Ionicons name="alert-circle" size={18} color={colors.warning} />
                <Text style={styles.alertText}>{invoicePending} pending invoices awaiting action</Text>
              </View>
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
  dot:          { width: 8, height: 8, borderRadius: 4 },
  qlLabel:      { fontSize: 11, fontWeight: '700' },
  alertRow:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  alertText:    { ...typography.bodySmall, flex: 1 },
});
