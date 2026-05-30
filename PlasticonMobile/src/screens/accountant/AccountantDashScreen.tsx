import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, RefreshControl, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../api/client';
import { colors, radius, shadow, spacing, typography } from '../../theme';

interface DashData {
  totalRevenue:    number;
  totalExpenses:   number;
  netProfit:       number;
  pendingInvoices: number;
  openPayables:    number;
  openReceivables: number;
}

function fmt(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

function KpiCard({ label, value, icon, color, onPress }: {
  label: string; value: string; icon: string; color: string; onPress?: () => void;
}) {
  const Wrap = onPress ? TouchableOpacity : View;
  return (
    <Wrap style={[styles.kpi, { borderLeftColor: color }]} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.kpiIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <Text style={[styles.kpiValue, { color }]}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </Wrap>
  );
}

function QuickLink({ icon, label, color, onPress }: {
  icon: string; label: string; color: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.ql} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.qlIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon as any} size={22} color={color} />
      </View>
      <Text style={[styles.qlLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function AccountantDashScreen() {
  const { user }    = useAuth();
  const navigation  = useNavigation<any>();
  const firstName   = (user?.fullName ?? 'Accountant').split(' ')[0];

  const [data,       setData]       = useState<DashData | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [finRes, invRes, payRes, recRes] = await Promise.allSettled([
        api.get<any>('/financial/dashboard'),
        api.get<any[]>('/invoices?limit=100'),
        api.get<any[]>('/supplier-payables?limit=100'),
        api.get<any[]>('/customer-receivables?limit=100'),
      ]);

      const fin = finRes.status === 'fulfilled' ? (finRes.value ?? {}) : {};
      const invList: any[] = invRes.status === 'fulfilled' && Array.isArray(invRes.value) ? invRes.value : [];
      const payList: any[] = payRes.status === 'fulfilled' && Array.isArray(payRes.value) ? payRes.value : [];
      const recList: any[] = recRes.status === 'fulfilled' && Array.isArray(recRes.value) ? recRes.value : [];

      const pendingInvCount = invList.filter((i) => i.paymentStatus === 'PENDING' || i.status === 'PENDING').length;
      const openPay = payList.reduce((s, p) => s + (p.amount ?? 0), 0);
      const openRec = recList.reduce((s, r) => s + (r.amount ?? 0), 0);

      setData({
        totalRevenue:    fin.salesRevenue    ?? fin.revenue    ?? fin.totalRevenue    ?? 0,
        totalExpenses:   fin.netProfit != null
          ? ((fin.salesRevenue ?? fin.revenue ?? 0) - fin.netProfit)
          : (fin.approvedExpenses ?? fin.expenses ?? fin.totalExpenses ?? 0),
        netProfit:       fin.netProfit       ?? fin.profit     ?? 0,
        pendingInvoices: pendingInvCount,
        openPayables:    openPay,
        openReceivables: openRec,
      });
    } catch { /* keep null */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.accent} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greetSub}>Finance Overview</Text>
            <Text style={styles.greetName}>Hello, {firstName}</Text>
          </View>
          <TouchableOpacity style={styles.reportBtn} onPress={() => navigation.navigate('Reports')} activeOpacity={0.8}>
            <Ionicons name="bar-chart" size={16} color={colors.accent} />
            <Text style={styles.reportBtnText}>Reports</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginVertical: 40 }} size="large" color={colors.accent} />
        ) : (
          <>
            {/* KPI grid */}
            <Text style={styles.sectionLabel}>FINANCIAL SUMMARY</Text>
            <View style={styles.kpiGrid}>
              <KpiCard label="Total Revenue"   value={fmt(data?.totalRevenue ?? 0)}    icon="trending-up"    color={colors.success}  onPress={() => navigation.navigate('Finance', { screen: 'FinanceDash' })} />
              <KpiCard label="Total Expenses"  value={fmt(data?.totalExpenses ?? 0)}   icon="trending-down"  color={colors.danger}   onPress={() => navigation.navigate('Finance', { screen: 'Expenses' })} />
              <KpiCard label="Net Profit"      value={fmt(data?.netProfit ?? 0)}       icon="cash"           color={(data?.netProfit ?? 0) >= 0 ? colors.success : colors.danger} />
              <KpiCard label="Open Receivables" value={fmt(data?.openReceivables ?? 0)} icon="arrow-down-circle" color={colors.primary} onPress={() => navigation.navigate('Finance', { screen: 'CustomerReceivables' })} />
              <KpiCard label="Open Payables"   value={fmt(data?.openPayables ?? 0)}    icon="arrow-up-circle" color={colors.warning}  onPress={() => navigation.navigate('Finance', { screen: 'SupplierPayables' })} />
              <KpiCard label="Invoices"        value={String(data?.pendingInvoices ?? 0)} icon="document-text" color={colors.info}  onPress={() => navigation.navigate('Finance', { screen: 'Invoices' })} />
            </View>

            {/* Quick links */}
            <Text style={styles.sectionLabel}>QUICK ACCESS</Text>
            <View style={styles.qlGrid}>
              <QuickLink icon="document-text"   label="Invoices"    color={colors.primary} onPress={() => navigation.navigate('Finance', { screen: 'Invoices' })} />
              <QuickLink icon="receipt"         label="Expenses"    color={colors.danger}  onPress={() => navigation.navigate('Finance', { screen: 'Expenses' })} />
              <QuickLink icon="checkmark-done"  label="Approvals"   color={colors.success} onPress={() => navigation.navigate('Finance', { screen: 'ApprovalWorkflows' })} />
              <QuickLink icon="hardware-chip"   label="AI Tools"    color={colors.info}    onPress={() => navigation.navigate('AITools', { screen: 'AIHub' })} />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: colors.background },
  content:      { padding: spacing.md, paddingBottom: 40 },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg, paddingTop: spacing.sm },
  greetSub:     { ...typography.caption, color: colors.textMuted },
  greetName:    { ...typography.h2 },
  reportBtn:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full, backgroundColor: `${colors.accent}15`, borderWidth: 1, borderColor: `${colors.accent}30` },
  reportBtnText:{ fontSize: 12, fontWeight: '700', color: colors.accent },
  sectionLabel: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.8 },
  kpiGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  kpi:          { width: '47.5%', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderLeftWidth: 3, ...shadow.sm },
  kpiIcon:      { width: 32, height: 32, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  kpiValue:     { fontSize: 20, fontWeight: '800', marginBottom: 2 },
  kpiLabel:     { ...typography.caption, color: colors.textMuted },
  qlGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  ql:           { width: '47.5%', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, paddingVertical: spacing.md, ...shadow.sm },
  qlIcon:       { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  qlLabel:      { fontSize: 11, fontWeight: '700' },
});
