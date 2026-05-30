import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { colors, radius, shadow, spacing, typography } from '../../theme';

interface Performance {
  id: number;
  employee?: { fullName: string };
  employeeName?: string;
  period?: string;
  overallRating?: number;
  attendanceScore?: number;
  productivityScore?: number;
  qualityScore?: number;
  notes?: string;
  createdAt: string;
}

function RatingBar({ label, value }: { label: string; value: number }) {
  const pct   = Math.min(Math.max((value / 10) * 100, 0), 100);
  const color = value >= 8 ? colors.success : value >= 6 ? colors.warning : colors.danger;
  return (
    <View style={styles.ratingRow}>
      <Text style={styles.ratingLabel}>{label}</Text>
      <View style={styles.ratingTrack}>
        <View style={[styles.ratingFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.ratingVal, { color }]}>{value.toFixed(1)}</Text>
    </View>
  );
}

function PerfCard({ item }: { item: Performance }) {
  const name    = item.employee?.fullName ?? item.employeeName ?? `Record #${item.id}`;
  const overall = item.overallRating ?? 0;
  const ratingColor = overall >= 8 ? colors.success : overall >= 6 ? colors.warning : colors.danger;

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.empName}>{name}</Text>
          <Text style={styles.period}>{item.period ?? new Date(item.createdAt).toLocaleDateString([], { month: 'long', year: 'numeric' })}</Text>
        </View>
        <View style={[styles.ratingBadge, { backgroundColor: `${ratingColor}15` }]}>
          <Text style={[styles.ratingBadgeText, { color: ratingColor }]}>{overall.toFixed(1)}</Text>
          <Text style={[styles.ratingBadgeSub, { color: ratingColor }]}>/ 10</Text>
        </View>
      </View>
      {(item.attendanceScore != null || item.productivityScore != null || item.qualityScore != null) && (
        <View style={styles.bars}>
          {item.attendanceScore   != null && <RatingBar label="Attendance"   value={item.attendanceScore} />}
          {item.productivityScore != null && <RatingBar label="Productivity" value={item.productivityScore} />}
          {item.qualityScore      != null && <RatingBar label="Quality"      value={item.qualityScore} />}
        </View>
      )}
    </View>
  );
}

export function EmployeePerformanceScreen() {
  const [records, setRecords]   = useState<Performance[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<Performance[]>('/performance?limit=30');
      setRecords(Array.isArray(res) ? res : []);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to load performance records');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Employee Performance" subtitle={`${records.length} records`} showBack />
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View> : (
        <FlatList
          data={records}
          keyExtractor={(i) => String(i.id)}
          renderItem={({ item }) => <PerfCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="stats-chart-outline" size={44} color={colors.textMuted} /><Text style={styles.emptyText}>No performance records</Text></View>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: colors.background },
  center:          { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:            { padding: spacing.md, paddingBottom: 40 },
  card:            { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardTop:         { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 8 },
  avatar:          { width: 42, height: 42, borderRadius: 21, backgroundColor: `${colors.primary}20`, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText:      { fontSize: 18, fontWeight: '700', color: colors.primary },
  cardContent:     { flex: 1 },
  empName:         { ...typography.h4 },
  period:          { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  ratingBadge:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.md, alignItems: 'center' },
  ratingBadgeText: { fontSize: 18, fontWeight: '800' },
  ratingBadgeSub:  { fontSize: 10, fontWeight: '600' },
  bars:            { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, gap: 8 },
  ratingRow:       { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  ratingLabel:     { ...typography.caption, width: 80 },
  ratingTrack:     { flex: 1, height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' },
  ratingFill:      { height: '100%', borderRadius: 3 },
  ratingVal:       { ...typography.caption, fontWeight: '700', width: 28, textAlign: 'right' },
  empty:           { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText:       { ...typography.bodySmall, color: colors.textMuted },
});
