import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

interface Schedule {
  id: number;
  machine?: { id: number; name: string };
  scheduleType?: string;
  frequency?: string;
  nextScheduledDate?: string;
  lastScheduledDate?: string | null;
  status?: string;
  description?: string | null;
  assignedEngineer?: { fullName: string } | null;
}

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function isPast(d?: string) {
  if (!d) return false;
  return new Date(d) < new Date();
}

function ScheduleCard({ item }: { item: Schedule }) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();

  const STATUS_COLOR: Record<string, string> = {
    PENDING:     colors.warning,
    IN_PROGRESS: colors.info,
    COMPLETED:   colors.success,
    OVERDUE:     colors.danger,
  };

  const status  = item.status ?? 'PENDING';
  const overdue = status === 'PENDING' && isPast(item.nextScheduledDate);
  const color   = overdue ? colors.danger : (STATUS_COLOR[status] ?? colors.textMuted);

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }, overdue && { borderLeftWidth: 3, borderLeftColor: colors.danger }]}>
      <View style={styles.cardTop}>
        <Text style={[styles.machineName, { color: colors.text }]} numberOfLines={1}>{item.machine?.name ?? `Schedule #${item.id}`}</Text>
        <View style={[styles.badge, { backgroundColor: `${color}15` }]}>
          <Text style={[styles.badgeText, { color }]}>{overdue ? (isAr ? 'متأخر' : 'OVERDUE') : status}</Text>
        </View>
      </View>
      {item.scheduleType && <Text style={[styles.type, { color: colors.textMuted }]}>{item.scheduleType} · {item.frequency}</Text>}
      <View style={styles.dates}>
        <View style={styles.dateBlock}>
          <Text style={[styles.dateLabel, { color: colors.textMuted }]}>{isAr ? 'الموعد القادم' : 'Next Due'}</Text>
          <Text style={[styles.dateValue, { color: colors.text }, overdue && { color: colors.danger }]}>{fmtDate(item.nextScheduledDate)}</Text>
        </View>
        <View style={styles.dateBlock}>
          <Text style={[styles.dateLabel, { color: colors.textMuted }]}>{isAr ? 'آخر تنفيذ' : 'Last Done'}</Text>
          <Text style={[styles.dateValue, { color: colors.text }]}>{fmtDate(item.lastScheduledDate ?? undefined)}</Text>
        </View>
      </View>
      {item.assignedEngineer && (
        <View style={styles.engineerRow}>
          <Ionicons name="person-outline" size={12} color={colors.textMuted} />
          <Text style={[styles.engineerName, { color: colors.textMuted }]}>{item.assignedEngineer.fullName}</Text>
        </View>
      )}
    </View>
  );
}

export function MaintScheduleScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ schedules: Schedule[] }>('/maintenance-schedule?limit=40');
      setSchedules(res.schedules ?? []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={isAr ? 'جدول الصيانة الوقائية' : 'PM Schedule'} subtitle={isAr ? 'الصيانة الوقائية' : 'Preventive maintenance'} showBack />
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={schedules}
          keyExtractor={(i, idx) => `${String(i.id)}-${idx}`}
          renderItem={({ item }) => <ScheduleCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>{isAr ? 'لا توجد جداول' : 'No schedules'}</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:   { padding: spacing.md, paddingBottom: 40 },
  card:   { borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  machineName: { ...typography.h4, flex: 1, marginRight: spacing.sm },
  badge:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  badgeText: { fontSize: 10, fontWeight: '700' },
  type:      { ...typography.bodySmall, marginBottom: spacing.sm },
  dates:     { flexDirection: 'row', gap: spacing.xl },
  dateBlock: {},
  dateLabel: { ...typography.caption, marginBottom: 2 },
  dateValue: { ...typography.h4 },
  engineerRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm },
  engineerName: { ...typography.caption },
  empty:     { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText: { ...typography.bodySmall },
});
