import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader, StatCard } from '../../components';
import { colors, radius, shadow, spacing, typography } from '../../theme';

interface AttRecord {
  id: number;
  user?: { fullName: string; role?: string };
  date: string;
  checkIn?: string;
  checkOut?: string;
  status?: string;
  hoursWorked?: number;
}

const STATUS_COLOR: Record<string, string> = {
  PRESENT:  colors.success,
  ABSENT:   colors.danger,
  LATE:     colors.warning,
  HALF_DAY: colors.info,
};

function AttCard({ item }: { item: AttRecord }) {
  const status = item.status ?? 'PRESENT';
  const color  = STATUS_COLOR[status] ?? colors.textMuted;
  const name   = item.user?.fullName ?? `Record #${item.id}`;

  return (
    <View style={styles.card}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <View style={styles.cardContent}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.date}>{new Date(item.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
      </View>
      <View style={styles.right}>
        <View style={[styles.badge, { backgroundColor: `${color}15` }]}>
          <Text style={[styles.badgeText, { color }]}>{status}</Text>
        </View>
        {item.hoursWorked != null && <Text style={styles.hours}>{item.hoursWorked}h</Text>}
      </View>
    </View>
  );
}

export function AttendanceAdminScreen() {
  const [records, setRecords]   = useState<AttRecord[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ attendances: AttRecord[] }>('/attendance?limit=50');
      setRecords(res.attendances ?? []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const present = records.filter((r) => r.status === 'PRESENT' || !r.status).length;
  const absent  = records.filter((r) => r.status === 'ABSENT').length;

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Attendance Admin" showBack />
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View> : (
        <FlatList
          data={records}
          keyExtractor={(i) => String(i.id)}
          renderItem={({ item }) => <AttCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListHeaderComponent={
            <View style={styles.header}>
              <StatCard label="Present" value={String(present)} icon="checkmark-circle" color={colors.success} style={styles.stat} />
              <StatCard label="Absent"  value={String(absent)}  icon="close-circle"     color={colors.danger}  style={styles.stat} />
            </View>
          }
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="calendar-outline" size={44} color={colors.textMuted} /><Text style={styles.emptyText}>No attendance records</Text></View>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: colors.background },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:        { padding: spacing.md, paddingBottom: 40 },
  header:      { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  stat:        { flex: 1 },
  card:        { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, gap: spacing.sm, ...shadow.sm },
  dot:         { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  cardContent: { flex: 1 },
  name:        { ...typography.h4 },
  date:        { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  right:       { alignItems: 'flex-end', gap: 4 },
  badge:       { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  badgeText:   { fontSize: 10, fontWeight: '700' },
  hours:       { ...typography.caption, fontWeight: '700' },
  empty:       { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText:   { ...typography.bodySmall, color: colors.textMuted },
});
