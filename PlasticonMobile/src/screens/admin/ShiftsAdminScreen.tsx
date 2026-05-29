import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { colors, radius, shadow, spacing, typography } from '../../theme';

interface Shift {
  id: number;
  name?: string;
  shiftType?: string;
  startTime?: string;
  endTime?: string;
  workers?: { fullName: string }[];
  workerCount?: number;
  date?: string;
  createdAt: string;
}

const SHIFT_COLORS: Record<string, string> = {
  MORNING:   colors.warning,
  AFTERNOON: colors.info,
  NIGHT:     '#7C3AED',
  DAY:       colors.success,
};

function ShiftCard({ item }: { item: Shift }) {
  const type  = item.shiftType ?? item.name ?? 'Shift';
  const color = SHIFT_COLORS[type.toUpperCase().split(' ')[0]] ?? colors.primary;
  const count = item.workerCount ?? item.workers?.length ?? 0;

  return (
    <View style={styles.card}>
      <View style={[styles.colorBar, { backgroundColor: color }]} />
      <View style={styles.cardContent}>
        <View style={styles.cardTop}>
          <Text style={styles.name}>{item.name ?? type}</Text>
          <Text style={styles.time}>
            {item.startTime ?? '—'} – {item.endTime ?? '—'}
          </Text>
        </View>
        <View style={styles.footer}>
          {item.date && <Text style={styles.date}>{new Date(item.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</Text>}
          {count > 0 && (
            <View style={styles.workers}>
              <Ionicons name="people-outline" size={13} color={colors.textMuted} />
              <Text style={styles.workerCount}>{count} workers</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

export function ShiftsAdminScreen() {
  const [shifts, setShifts]     = useState<Shift[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ shifts: Shift[] }>('/shifts?limit=40');
      setShifts(res.shifts ?? []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Shifts" subtitle={`${shifts.length} shifts`} showBack />
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View> : (
        <FlatList
          data={shifts}
          keyExtractor={(i) => String(i.id)}
          renderItem={({ item }) => <ShiftCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="time-outline" size={44} color={colors.textMuted} /><Text style={styles.emptyText}>No shifts configured</Text></View>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: colors.background },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:         { padding: spacing.md, paddingBottom: 40 },
  card:         { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.md, marginBottom: spacing.sm, overflow: 'hidden', ...shadow.sm },
  colorBar:     { width: 5 },
  cardContent:  { flex: 1, padding: spacing.md },
  cardTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  name:         { ...typography.h4 },
  time:         { ...typography.caption, fontWeight: '700', color: colors.primary },
  footer:       { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  date:         { ...typography.caption, color: colors.textMuted },
  workers:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  workerCount:  { ...typography.caption },
  empty:        { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText:    { ...typography.bodySmall, color: colors.textMuted },
});
