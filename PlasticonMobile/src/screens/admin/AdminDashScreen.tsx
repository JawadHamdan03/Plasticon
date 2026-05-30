import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { colors, radius, shadow, spacing, typography } from '../../theme';

interface Overview {
  totalUsers?: number;
  activeUsers?: number;
  pendingRegistrations?: number;
  attendanceToday?: number;
  lateToday?: number;
  production?: { todayCartons?: number; todayPieces?: number; weekCartons?: number; monthCartons?: number; todayRecords?: number };
  totalMachines?: number;
  operationalMachines?: number;
  totalRawMaterials?: number;
  outOfStockCount?: number;
  maintenanceThisMonth?: number;
  overdueSchedules?: number;
  qualityThisWeek?: number;
  openQualityIssues?: number;
  salesThisMonth?: number;
  purchasesThisMonth?: number;
  payrollThisMonth?: number;
  invoicesPending?: number;
  totalShifts?: number;
  recentProduction?: { id: number; machineName?: string; cartonsCount?: number; createdAt: string }[];
  recentMaintenance?: { id: number; title?: string; status?: string; machineName?: string }[];
}

function KpiSection({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon as any} size={16} color={colors.primary} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.kpiRow}>{children}</View>
    </View>
  );
}

function Kpi({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <View style={styles.kpi}>
      <Text style={[styles.kpiVal, color ? { color } : null]}>{String(value)}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

export function AdminDashScreen() {
  const [data, setData]         = useState<Overview | null>(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation<any>();

  const load = useCallback(async () => {
    try {
      const res = await api.get<Overview>('/dashboard/overview');
      setData(res && typeof res === 'object' ? res : {});
    } catch {
      setData({});
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const shortcuts = [
    { icon: 'people',        label: 'Users',     color: colors.primary, tab: 'More',       screen: 'Users' },
    { icon: 'hardware-chip', label: 'Machines',  color: colors.info,    tab: 'Operations', screen: 'Machines' },
    { icon: 'shield',        label: 'Audit',     color: colors.warning, tab: 'More',       screen: 'AuditLogs' },
    { icon: 'person-add',    label: 'Requests',  color: colors.success, tab: 'More',       screen: 'Registrations' },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Admin Dashboard" />
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View> : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
        >
          {/* People */}
          <KpiSection title="People" icon="people">
            <Kpi label="Total Users"   value={data?.totalUsers ?? 0} />
            <Kpi label="Active"        value={data?.activeUsers ?? 0} color={colors.success} />
            <Kpi label="Pending Regs." value={data?.pendingRegistrations ?? 0} color={data?.pendingRegistrations ? colors.danger : colors.textMuted} />
          </KpiSection>

          {/* Attendance */}
          <KpiSection title="Attendance Today" icon="calendar">
            <Kpi label="Present"    value={data?.attendanceToday ?? 0} color={colors.success} />
            <Kpi label="Late"       value={data?.lateToday ?? 0}       color={data?.lateToday ? colors.warning : colors.textMuted} />
            <Kpi label="Shifts"     value={data?.totalShifts ?? 0} />
          </KpiSection>

          {/* Production */}
          <KpiSection title="Production" icon="cube">
            <Kpi label="Today (cartons)" value={(data?.production?.todayCartons ?? 0).toLocaleString()} color={colors.primary} />
            <Kpi label="Today (pcs)"     value={(data?.production?.todayPieces ?? 0).toLocaleString()} />
            <Kpi label="Month (cartons)" value={(data?.production?.monthCartons ?? 0).toLocaleString()} color={colors.info} />
          </KpiSection>

          {/* Machines */}
          <KpiSection title="Machines" icon="hardware-chip">
            <Kpi label="Total"       value={data?.totalMachines ?? 0} />
            <Kpi label="Operational" value={data?.operationalMachines ?? 0} color={colors.success} />
            <Kpi label="Maintenance" value={data?.maintenanceThisMonth ?? 0} color={colors.warning} />
          </KpiSection>

          {/* Quality */}
          <KpiSection title="Quality" icon="shield-checkmark">
            <Kpi label="This Week"    value={data?.qualityThisWeek ?? 0} />
            <Kpi label="Open Issues"  value={data?.openQualityIssues ?? 0} color={data?.openQualityIssues ? colors.danger : colors.success} />
            <Kpi label="Overdue Maint." value={data?.overdueSchedules ?? 0} color={data?.overdueSchedules ? colors.danger : colors.textMuted} />
          </KpiSection>

          {/* Inventory */}
          <KpiSection title="Inventory" icon="archive">
            <Kpi label="Raw Materials"  value={data?.totalRawMaterials ?? 0} />
            <Kpi label="Out of Stock"   value={data?.outOfStockCount ?? 0} color={data?.outOfStockCount ? colors.danger : colors.success} />
          </KpiSection>

          {/* Finance */}
          <KpiSection title="Finance" icon="cash">
            <Kpi label="Sales (month)"    value={fmt(data?.salesThisMonth ?? 0)}    color={colors.success} />
            <Kpi label="Purchases"        value={fmt(data?.purchasesThisMonth ?? 0)} color={colors.info} />
            <Kpi label="Payroll (month)"  value={fmt(data?.payrollThisMonth ?? 0)}   color={colors.warning} />
          </KpiSection>

          {/* Recent Production */}
          {data?.recentProduction && data.recentProduction.length > 0 && (
            <View style={[styles.section, { paddingBottom: 4 }]}>
              <View style={styles.sectionHeader}>
                <Ionicons name="time-outline" size={16} color={colors.primary} />
                <Text style={styles.sectionTitle}>Recent Production</Text>
              </View>
              {data.recentProduction.slice(0, 4).map((r) => (
                <View key={r.id} style={styles.recentRow}>
                  <Text style={styles.recentName} numberOfLines={1}>{r.machineName ?? `Record #${r.id}`}</Text>
                  <Text style={styles.recentVal}>{(r.cartonsCount ?? 0).toLocaleString()} cartons</Text>
                </View>
              ))}
            </View>
          )}

          {/* Quick Access */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="apps-outline" size={16} color={colors.primary} />
              <Text style={styles.sectionTitle}>Quick Access</Text>
            </View>
            <View style={styles.shortcuts}>
              {shortcuts.map((s) => (
                <TouchableOpacity
                  key={s.screen}
                  style={[styles.shortcut, { backgroundColor: `${s.color}12` }]}
                  onPress={() => navigation.navigate(s.tab, { screen: s.screen })}
                  activeOpacity={0.75}
                >
                  <Ionicons name={s.icon as any} size={24} color={s.color} />
                  <Text style={[styles.shortcutLabel, { color: s.color }]}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: colors.background },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content:      { padding: spacing.md, paddingBottom: 40 },
  section:      { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  sectionTitle: { ...typography.h4 },
  kpiRow:       { flexDirection: 'row' },
  kpi:          { flex: 1, alignItems: 'center' },
  kpiVal:       { fontSize: 20, fontWeight: '800', color: colors.text },
  kpiLabel:     { ...typography.caption, color: colors.textMuted, marginTop: 2, textAlign: 'center' },
  recentRow:    { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderTopWidth: 1, borderTopColor: colors.border },
  recentName:   { ...typography.bodySmall, flex: 1 },
  recentVal:    { ...typography.caption, fontWeight: '700', color: colors.primary },
  shortcuts:    { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  shortcut:     { width: '47%', alignItems: 'center', paddingVertical: 16, borderRadius: radius.md, gap: 6 },
  shortcutLabel: { fontSize: 12, fontWeight: '700' },
});
