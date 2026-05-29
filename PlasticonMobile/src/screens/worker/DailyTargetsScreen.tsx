import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, RefreshControl, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { colors, radius, shadow, spacing, typography } from '../../theme';

interface Target {
  id:          number;
  description: string;
  targetValue: number;
  actualValue?: number;
  unit?:       string;
  status?:     string;
  date?:       string;
  createdAt:   string;
}

function ProgressBar({ pct }: { pct: number }) {
  const clamped = Math.min(pct, 100);
  const color = clamped >= 100 ? colors.success : clamped >= 60 ? colors.warning : colors.danger;
  return (
    <View style={bar.track}>
      <View style={[bar.fill, { width: `${clamped}%` as any, backgroundColor: color }]} />
    </View>
  );
}
const bar = StyleSheet.create({
  track: { height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden', marginTop: 6 },
  fill:  { height: '100%', borderRadius: 3 },
});

export function DailyTargetsScreen() {
  const [targets,    setTargets]    = useState<Target[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<Target[] | { data: Target[] }>('/worker-tools/daily-targets/mine');
      setTargets(Array.isArray(res) ? res : (res.data ?? []));
    } catch { setTargets([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Daily Targets" subtitle="Today's production goals" showBack />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
      >
        {loading ? (
          <ActivityIndicator style={{ marginTop: 60 }} size="large" color={colors.primary} />
        ) : targets.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="flag-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>No targets assigned for today</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {targets.map((t) => {
              const actual = t.actualValue ?? 0;
              const pct = t.targetValue > 0 ? (actual / t.targetValue) * 100 : 0;
              const done = pct >= 100;
              return (
                <View key={t.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.badge, { backgroundColor: done ? `${colors.success}20` : `${colors.primary}20` }]}>
                      <Ionicons name={done ? 'checkmark-circle' : 'flag'} size={14} color={done ? colors.success : colors.primary} />
                      <Text style={[styles.badgeText, { color: done ? colors.success : colors.primary }]}>
                        {done ? 'Achieved' : 'In Progress'}
                      </Text>
                    </View>
                    {t.date && <Text style={styles.dateText}>{new Date(t.date).toLocaleDateString()}</Text>}
                  </View>
                  <Text style={styles.desc}>{t.description}</Text>
                  <View style={styles.progress}>
                    <Text style={styles.progressLabel}>
                      {actual} / {t.targetValue} {t.unit ?? 'units'}
                    </Text>
                    <Text style={styles.progressPct}>{Math.round(pct)}%</Text>
                  </View>
                  <ProgressBar pct={pct} />
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: colors.background },
  content:       { padding: spacing.md, paddingBottom: 40 },
  empty:         { alignItems: 'center', paddingVertical: 80, gap: spacing.sm },
  emptyText:     { ...typography.bodySmall, color: colors.textMuted },
  list:          { gap: spacing.sm },
  card:          { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, ...shadow.sm },
  cardHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  badge:         { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm },
  badgeText:     { fontSize: 11, fontWeight: '700' },
  dateText:      { ...typography.caption, color: colors.textMuted },
  desc:          { ...typography.bodySmall, marginBottom: spacing.sm },
  progress:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { ...typography.caption, color: colors.textMuted },
  progressPct:   { ...typography.caption, fontWeight: '700', color: colors.text },
});
