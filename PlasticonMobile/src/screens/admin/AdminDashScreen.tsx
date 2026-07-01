import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

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

function KpiSection({ title, icon, children, colors }: { title: string; icon: string; children: React.ReactNode; colors: any }) {
  return (
    <View style={[styles.section, { backgroundColor: colors.surface }]}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon as any} size={16} color={colors.primary} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      </View>
      <View style={styles.kpiRow}>{children}</View>
    </View>
  );
}

function Kpi({ label, value, color, colors }: { label: string; value: string | number; color?: string; colors: any }) {
  return (
    <View style={styles.kpi}>
      <Text style={[styles.kpiVal, { color: color ?? colors.text }]}>{String(value)}</Text>
      <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

export function AdminDashScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
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
    { icon: 'bar-chart',     label: isAr ? 'التحليلات' : 'Analytics',  color: '#FF6B35',      screen: 'Analytics' },
    { icon: 'people',        label: isAr ? 'المستخدمون' : 'Users',    color: colors.primary, screen: 'Users' },
    { icon: 'hardware-chip', label: isAr ? 'الآلات' : 'Machines',     color: colors.info,    screen: 'Machines' },
    { icon: 'shield',        label: isAr ? 'سجلات التدقيق' : 'Audit', color: colors.warning, screen: 'AuditLogs' },
    { icon: 'person-add',    label: isAr ? 'طلبات' : 'Requests',      color: colors.success, screen: 'Registrations' },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={isAr ? 'لوحة التحكم' : 'Admin Dashboard'} />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); void load(); }}
              tintColor={colors.primary}
            />
          }
        >
          {/* People */}
          <KpiSection title={isAr ? 'الأشخاص' : 'People'} icon="people" colors={colors}>
            <Kpi label={isAr ? 'إجمالي المستخدمين' : 'Total Users'}  value={data?.totalUsers ?? 0} colors={colors} />
            <Kpi label={isAr ? 'نشط اليوم' : 'Active Today'}         value={data?.activeUsers ?? 0} color={colors.success} colors={colors} />
            <Kpi label={isAr ? 'طلبات معلقة' : 'Pending Regs.'}      value={data?.pendingRegistrations ?? 0} color={data?.pendingRegistrations ? colors.danger : colors.textMuted} colors={colors} />
          </KpiSection>

          {/* Attendance */}
          <KpiSection title={isAr ? 'الحضور اليوم' : 'Attendance Today'} icon="calendar" colors={colors}>
            <Kpi label={isAr ? 'حاضر' : 'Present'}  value={data?.attendanceToday ?? 0} color={colors.success} colors={colors} />
            <Kpi label={isAr ? 'متأخر' : 'Late'}     value={data?.lateToday ?? 0}       color={data?.lateToday ? colors.warning : colors.textMuted} colors={colors} />
            <Kpi label={isAr ? 'الورديات' : 'Shifts'} value={data?.totalShifts ?? 0} colors={colors} />
          </KpiSection>

          {/* Production */}
          <KpiSection title={isAr ? 'الإنتاج' : 'Production'} icon="cube" colors={colors}>
            <Kpi label={isAr ? 'اليوم (كرتون)' : 'Today (cartons)'} value={(data?.production?.todayCartons ?? 0).toLocaleString()} color={colors.primary} colors={colors} />
            <Kpi label={isAr ? 'اليوم (قطع)' : 'Today (pcs)'}       value={(data?.production?.todayPieces ?? 0).toLocaleString()} colors={colors} />
            <Kpi label={isAr ? 'الشهر (كرتون)' : 'Month (cartons)'} value={(data?.production?.monthCartons ?? 0).toLocaleString()} color={colors.info} colors={colors} />
          </KpiSection>

          {/* Machines */}
          <KpiSection title={isAr ? 'الآلات' : 'Machines'} icon="hardware-chip" colors={colors}>
            <Kpi label={isAr ? 'المجموع' : 'Total'}          value={data?.totalMachines ?? 0} colors={colors} />
            <Kpi label={isAr ? 'تشغيلية' : 'Operational'}    value={data?.operationalMachines ?? 0} color={colors.success} colors={colors} />
            <Kpi label={isAr ? 'صيانة' : 'Maintenance'}      value={data?.maintenanceThisMonth ?? 0} color={colors.warning} colors={colors} />
          </KpiSection>

          {/* Quality */}
          <KpiSection title={isAr ? 'الجودة' : 'Quality'} icon="shield-checkmark" colors={colors}>
            <Kpi label={isAr ? 'هذا الأسبوع' : 'This Week'}      value={data?.qualityThisWeek ?? 0} colors={colors} />
            <Kpi label={isAr ? 'مشاكل مفتوحة' : 'Open Issues'}   value={data?.openQualityIssues ?? 0} color={data?.openQualityIssues ? colors.danger : colors.success} colors={colors} />
            <Kpi label={isAr ? 'صيانة متأخرة' : 'Overdue Maint.'} value={data?.overdueSchedules ?? 0} color={data?.overdueSchedules ? colors.danger : colors.textMuted} colors={colors} />
          </KpiSection>

          {/* Inventory */}
          <KpiSection title={isAr ? 'المخزون' : 'Inventory'} icon="archive" colors={colors}>
            <Kpi label={isAr ? 'مواد خام' : 'Raw Materials'} value={data?.totalRawMaterials ?? 0} colors={colors} />
            <Kpi label={isAr ? 'نفاد المخزون' : 'Out of Stock'} value={data?.outOfStockCount ?? 0} color={data?.outOfStockCount ? colors.danger : colors.success} colors={colors} />
          </KpiSection>

          {/* Finance */}
          <KpiSection title={isAr ? 'المالية' : 'Finance'} icon="cash" colors={colors}>
            <Kpi label={isAr ? 'المبيعات (شهر)' : 'Sales (month)'}    value={fmt(data?.salesThisMonth ?? 0)}    color={colors.success} colors={colors} />
            <Kpi label={isAr ? 'المشتريات' : 'Purchases'}              value={fmt(data?.purchasesThisMonth ?? 0)} color={colors.info} colors={colors} />
            <Kpi label={isAr ? 'الرواتب (شهر)' : 'Payroll (month)'}   value={fmt(data?.payrollThisMonth ?? 0)}   color={colors.warning} colors={colors} />
          </KpiSection>

          {/* Recent Production */}
          {data?.recentProduction && data.recentProduction.length > 0 && (
            <View style={[styles.section, { backgroundColor: colors.surface, paddingBottom: 4 }]}>
              <View style={styles.sectionHeader}>
                <Ionicons name="time-outline" size={16} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {isAr ? 'الإنتاج الأخير' : 'Recent Production'}
                </Text>
              </View>
              {data.recentProduction.slice(0, 4).map((r, idx) => (
                <View key={`${r.id}-${idx}`} style={[styles.recentRow, { borderTopColor: colors.border }]}>
                  <Text style={[styles.recentName, { color: colors.text }]} numberOfLines={1}>
                    {r.machineName ?? `Record #${r.id}`}
                  </Text>
                  <Text style={[styles.recentVal, { color: colors.primary }]}>
                    {(r.cartonsCount ?? 0).toLocaleString()} {isAr ? 'كرتون' : 'cartons'}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Quick Access */}
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="apps-outline" size={16} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {isAr ? 'الإجراءات السريعة' : 'Quick Access'}
              </Text>
            </View>
            <View style={styles.shortcuts}>
              {shortcuts.map((s) => (
                <TouchableOpacity
                  key={s.screen}
                  style={[styles.shortcut, { backgroundColor: `${s.color}12` }]}
                  onPress={() => navigation.navigate(s.screen)}
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
  safe:          { flex: 1 },
  center:        { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content:       { padding: spacing.md, paddingBottom: 40 },
  section:       { borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  sectionTitle:  { ...typography.h4 },
  kpiRow:        { flexDirection: 'row' },
  kpi:           { flex: 1, alignItems: 'center' },
  kpiVal:        { fontSize: 20, fontWeight: '800' },
  kpiLabel:      { ...typography.caption, marginTop: 2, textAlign: 'center' },
  recentRow:     { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderTopWidth: 1 },
  recentName:    { ...typography.bodySmall, flex: 1 },
  recentVal:     { ...typography.caption, fontWeight: '700' },
  shortcuts:     { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  shortcut:      { width: '47%', alignItems: 'center', paddingVertical: 16, borderRadius: radius.md, gap: 6 },
  shortcutLabel: { fontSize: 12, fontWeight: '700' },
});
