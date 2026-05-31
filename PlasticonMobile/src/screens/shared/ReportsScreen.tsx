import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, RefreshControl, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader, StatCard } from '../../components';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

interface ReportSummary {
  attendance: { present: number; absent: number; late: number; totalDays: number };
  production: { totalPieces: number; totalLogs: number; topMachine: string };
  shifts:     { upcoming: number; completed: number };
}

function SectionCard({ title, icon, color, children }: {
  title: string; icon: string; color: string; children: React.ReactNode;
}) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.section, { backgroundColor: colors.surface }]}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIcon, { backgroundColor: `${color}15` }]}>
          <Ionicons name={icon as any} size={16} color={color} />
        </View>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function MetricRow({ label, value }: { label: string; value: string | number }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.metricRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

export function ReportsScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const [report, setReport]         = useState<ReportSummary | null>(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [att, prod, shiftRes] = await Promise.allSettled([
        api.get<{ records: { status: string }[] }>('/attendance/me?limit=60'),
        api.get<{ records: { quantity?: number; totalPieces?: number }[]; total: number }>('/production/me?limit=60'),
        api.get<{ shifts: { endTime?: string }[] }>('/shifts?limit=10'),
      ]);

      const attRecs   = att.status     === 'fulfilled' ? att.value.records       : [];
      const prodData  = prod.status    === 'fulfilled' ? prod.value              : null;
      const shiftList = shiftRes.status === 'fulfilled' ? shiftRes.value.shifts  : [];

      const present = attRecs.filter((r) => r.status === 'PRESENT').length;
      const late    = attRecs.filter((r) => r.status === 'LATE').length;
      const absent  = attRecs.filter((r) => r.status === 'ABSENT').length;

      const prodRecs    = prodData?.records ?? [];
      const totalPieces = prodRecs.reduce((s, r) => s + (r.totalPieces ?? r.quantity ?? 0), 0);

      const now       = new Date();
      const upcoming  = shiftList.filter((s) => s.endTime && new Date(s.endTime) > now).length;
      const completed = shiftList.filter((s) => s.endTime && new Date(s.endTime) <= now).length;

      setReport({
        attendance: { present, absent, late, totalDays: attRecs.length },
        production: { totalPieces, totalLogs: prodData?.total ?? prodRecs.length, topMachine: '—' },
        shifts:     { upcoming, completed },
      });
    } catch {
      setReport({
        attendance: { present: 0, absent: 0, late: 0, totalDays: 0 },
        production: { totalPieces: 0, totalLogs: 0, topMachine: '—' },
        shifts:     { upcoming: 0, completed: 0 },
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={isAr ? 'تقاريري' : 'My Reports'} subtitle={isAr ? 'ملخص هذا الشهر' : "This month's summary"} showBack />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
        >
          <View style={styles.kpiRow}>
            <StatCard label={isAr ? 'أيام الحضور' : 'Days Present'} value={report?.attendance.present ?? 0} icon="checkmark-circle" color={colors.success} style={styles.kpi} />
            <StatCard label={isAr ? 'وحدات مصنوعة' : 'Units Made'} value={(report?.production.totalPieces ?? 0).toLocaleString()} icon="cube" color={colors.primary} style={styles.kpi} />
          </View>

          <SectionCard title={isAr ? 'الحضور' : 'Attendance'} icon="time" color={colors.success}>
            <MetricRow label={isAr ? 'حاضر' : 'Present'}        value={report?.attendance.present   ?? 0} />
            <MetricRow label={isAr ? 'غائب' : 'Absent'}          value={report?.attendance.absent    ?? 0} />
            <MetricRow label={isAr ? 'متأخر' : 'Late'}           value={report?.attendance.late      ?? 0} />
            <MetricRow label={isAr ? 'إجمالي الأيام' : 'Total Days'} value={report?.attendance.totalDays ?? 0} />
          </SectionCard>

          <SectionCard title={isAr ? 'الإنتاج' : 'Production'} icon="cube" color={colors.primary}>
            <MetricRow label={isAr ? 'إجمالي القطع' : 'Total Pieces'}  value={(report?.production.totalPieces ?? 0).toLocaleString()} />
            <MetricRow label={isAr ? 'إجمالي السجلات' : 'Total Logs'}   value={report?.production.totalLogs    ?? 0} />
            <MetricRow label={isAr ? 'أفضل آلة' : 'Top Machine'}        value={report?.production.topMachine   ?? '—'} />
          </SectionCard>

          <SectionCard title={isAr ? 'الورديات' : 'Shifts'} icon="calendar" color={colors.accent}>
            <MetricRow label={isAr ? 'قادمة' : 'Upcoming'}   value={report?.shifts.upcoming  ?? 0} />
            <MetricRow label={isAr ? 'مكتملة' : 'Completed'} value={report?.shifts.completed ?? 0} />
          </SectionCard>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1 },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.md, paddingBottom: 40 },

  kpiRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  kpi:    { flex: 1 },

  section:       { borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  sectionIcon:   { width: 30, height: 30, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  sectionTitle:  { ...typography.h4 },

  metricRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1 },
  metricLabel: { ...typography.bodySmall },
  metricValue: { ...typography.h4 },
});
