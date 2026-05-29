import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../auth/AuthContext';
import { api, ragApi } from '../../api/client';
import { Button, ScreenHeader } from '../../components';
import { colors, radius, shadow, spacing, typography } from '../../theme';

interface WorkerStats {
  attendanceRate: number;
  lateCount: number;
  totalProduction: number;
  avgDailyProduction: number;
}

function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: `${color}15`, borderColor: `${color}30` }]}>
      <Text style={[styles.pillValue, { color }]}>{value}</Text>
      <Text style={styles.pillLabel}>{label}</Text>
    </View>
  );
}

export function WorkerCoachingScreen() {
  const { user }   = useAuth();
  const [stats, setStats]   = useState<WorkerStats | null>(null);
  const [coaching, setCoaching] = useState('');
  const [loading, setLoading]   = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [att, prod] = await Promise.allSettled([
          api.get<{ summary: { presentDays: number; lateDays: number; totalDays: number } }>('/attendance/my/summary'),
          api.get<{ total: number; avgPerDay: number }>('/production/my/stats'),
        ]);
        const attData  = att.status  === 'fulfilled' ? att.value.summary  : null;
        const prodData = prod.status === 'fulfilled' ? prod.value         : null;
        setStats({
          attendanceRate:     attData ? Math.round((attData.presentDays / (attData.totalDays || 1)) * 100) : 0,
          lateCount:          attData?.lateDays ?? 0,
          totalProduction:    prodData?.total ?? 0,
          avgDailyProduction: Math.round(prodData?.avgPerDay ?? 0),
        });
      } finally {
        setStatsLoading(false);
      }
    };
    void fetchStats();
  }, []);

  const getCoaching = async () => {
    setLoading(true);
    try {
      const res = await ragApi.post<{ reply?: string; response?: string }>('/chat', {
        message: `You are a supportive factory performance coach at Plasticon.
Worker: ${user?.fullName}
Role: ${user?.role}
Department: ${user?.department ?? 'Factory Floor'}
Stats this month:
- Attendance rate: ${stats?.attendanceRate ?? 0}%
- Late arrivals: ${stats?.lateCount ?? 0}
- Total production: ${stats?.totalProduction ?? 0} units
- Average daily production: ${stats?.avgDailyProduction ?? 0} units/day

Please provide:
1. A brief performance summary (positive tone)
2. 3 specific, actionable coaching tips to improve performance
3. One motivational closing message

Keep it practical, warm, and factory-relevant.`,
        role: 'worker',
      });
      setCoaching(res.reply ?? res.response ?? 'Could not generate coaching tips. Try again.');
    } catch (err: any) {
      setCoaching(`Error: ${err.message ?? 'Could not reach AI service.'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Worker Coaching" subtitle="AI performance insights" showBack />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Greeting card */}
        <View style={styles.greetCard}>
          <View style={styles.greetAvatar}>
            <Ionicons name="person" size={22} color={colors.primary} />
          </View>
          <View style={styles.greetText}>
            <Text style={styles.greetName}>{user?.fullName}</Text>
            <Text style={styles.greetRole}>{user?.department ?? user?.role}</Text>
          </View>
        </View>

        {/* Stats */}
        <Text style={styles.sectionLabel}>THIS MONTH'S STATS</Text>
        {statsLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginBottom: spacing.lg }} />
        ) : (
          <View style={styles.pillRow}>
            <StatPill label="Attendance" value={`${stats?.attendanceRate ?? 0}%`} color={colors.success} />
            <StatPill label="Late Days"  value={String(stats?.lateCount ?? 0)}    color={stats?.lateCount ? colors.warning : colors.success} />
            <StatPill label="Production" value={(stats?.totalProduction ?? 0).toLocaleString()} color={colors.primary} />
            <StatPill label="Avg / Day"  value={String(stats?.avgDailyProduction ?? 0)} color={colors.info} />
          </View>
        )}

        <Button
          onPress={getCoaching}
          loading={loading}
          fullWidth
          size="lg"
          style={styles.btn}
        >
          Get Coaching Tips
        </Button>

        {(loading || coaching) ? (
          <View style={styles.coachCard}>
            <View style={styles.coachHeader}>
              <View style={styles.coachIconWrap}>
                <Ionicons name="school" size={18} color={colors.success} />
              </View>
              <Text style={styles.coachTitle}>Your Coaching Session</Text>
            </View>
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={colors.success} />
                <Text style={styles.loadingText}>Personalising your coaching…</Text>
              </View>
            ) : (
              <Text style={styles.coachText}>{coaching}</Text>
            )}
          </View>
        ) : (
          <View style={styles.emptyHint}>
            <Ionicons name="bulb-outline" size={32} color={colors.textMuted} />
            <Text style={styles.emptyText}>
              Tap the button above to receive personalised coaching tips based on your performance.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: 40 },

  greetCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.md, marginBottom: spacing.lg, ...shadow.sm,
    borderLeftWidth: 4, borderLeftColor: colors.success,
  },
  greetAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  greetText: { flex: 1 },
  greetName: { ...typography.h3 },
  greetRole: { ...typography.caption, color: colors.textMuted, marginTop: 2 },

  sectionLabel: { ...typography.sectionLabel, marginBottom: spacing.sm },

  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  pill: {
    flex: 1, minWidth: '44%', alignItems: 'center',
    borderRadius: radius.md, borderWidth: 1,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
  },
  pillValue: { fontSize: 20, fontWeight: '800' },
  pillLabel: { ...typography.caption, marginTop: 2 },

  btn: { marginBottom: spacing.lg },

  coachCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.md, ...shadow.sm,
    borderTopWidth: 3, borderTopColor: colors.success,
  },
  coachHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  coachIconWrap: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: colors.successLight,
    alignItems: 'center', justifyContent: 'center',
  },
  coachTitle: { ...typography.h4, color: colors.success },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  loadingText: { ...typography.bodySmall, color: colors.success },
  coachText:  { ...typography.body, lineHeight: 24 },

  emptyHint:  { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  emptyText:  { ...typography.bodySmall, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
});
