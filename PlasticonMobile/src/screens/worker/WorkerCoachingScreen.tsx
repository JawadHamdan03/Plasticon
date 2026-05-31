import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../auth/AuthContext';
import { api, ragApi } from '../../api/client';
import { Button, ScreenHeader } from '../../components';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

interface WorkerStats {
  attendanceRate:     number;
  lateCount:          number;
  totalProduction:    number;
  avgDailyProduction: number;
}

function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.pill, { backgroundColor: `${color}15`, borderColor: `${color}30` }]}>
      <Text style={[styles.pillValue, { color }]}>{value}</Text>
      <Text style={[styles.pillLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

export function WorkerCoachingScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const { user }   = useAuth();
  const [stats, setStats]         = useState<WorkerStats | null>(null);
  const [coaching, setCoaching]   = useState('');
  const [loading, setLoading]     = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [att, prod] = await Promise.allSettled([
          api.get<{ records: { status: string; checkIn: string | null }[] }>('/attendance/me?limit=60'),
          api.get<{ records: { quantity?: number; totalPieces?: number; createdAt: string }[]; total: number }>('/production/me?limit=60'),
        ]);
        const attRecs  = att.status  === 'fulfilled' ? att.value.records  : [];
        const prodData = prod.status === 'fulfilled' ? prod.value         : null;

        const presentDays = attRecs.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length;
        const lateDays    = attRecs.filter((r) => r.status === 'LATE').length;
        const totalDays   = attRecs.length || 1;

        const prodTotal  = prodData?.total ?? 0;
        const uniqueDays = new Set(
          (prodData?.records ?? []).map((r) => new Date(r.createdAt).toDateString())
        ).size || 1;

        setStats({
          attendanceRate:     Math.round((presentDays / totalDays) * 100),
          lateCount:          lateDays,
          totalProduction:    prodTotal,
          avgDailyProduction: Math.round(prodTotal / uniqueDays),
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
      setCoaching(res.reply ?? res.response ?? (isAr ? 'تعذر إنشاء النصائح. حاول مرة أخرى.' : 'Could not generate coaching tips. Try again.'));
    } catch (err: any) {
      setCoaching(`${isAr ? 'خطأ: ' : 'Error: '}${err.message ?? (isAr ? 'تعذر الوصول إلى الخدمة.' : 'Could not reach AI service.')}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={isAr ? 'تدريب العامل' : 'Worker Coaching'} subtitle={isAr ? 'رؤى الأداء بالذكاء الاصطناعي' : 'AI performance insights'} showBack />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.greetCard, { backgroundColor: colors.surface, borderLeftColor: colors.success }]}>
          <View style={[styles.greetAvatar, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="person" size={22} color={colors.primary} />
          </View>
          <View style={styles.greetText}>
            <Text style={[styles.greetName, { color: colors.text }]}>{user?.fullName}</Text>
            <Text style={[styles.greetRole, { color: colors.textMuted }]}>{user?.department ?? user?.role}</Text>
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{isAr ? 'إحصائيات هذا الشهر' : "THIS MONTH'S STATS"}</Text>
        {statsLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginBottom: spacing.lg }} />
        ) : (
          <View style={styles.pillRow}>
            <StatPill label={isAr ? 'الحضور' : 'Attendance'} value={`${stats?.attendanceRate ?? 0}%`} color={colors.success} />
            <StatPill label={isAr ? 'أيام التأخر' : 'Late Days'} value={String(stats?.lateCount ?? 0)} color={stats?.lateCount ? colors.warning : colors.success} />
            <StatPill label={isAr ? 'الإنتاج' : 'Production'} value={(stats?.totalProduction ?? 0).toLocaleString()} color={colors.primary} />
            <StatPill label={isAr ? 'المعدل / يوم' : 'Avg / Day'} value={String(stats?.avgDailyProduction ?? 0)} color={colors.info} />
          </View>
        )}

        <Button onPress={getCoaching} loading={loading} fullWidth size="lg" style={styles.btn}>
          {isAr ? 'احصل على نصائح التدريب' : 'Get Coaching Tips'}
        </Button>

        {(loading || coaching) ? (
          <View style={[styles.coachCard, { backgroundColor: colors.surface, borderTopColor: colors.success }]}>
            <View style={styles.coachHeader}>
              <View style={[styles.coachIconWrap, { backgroundColor: colors.successLight }]}>
                <Ionicons name="school" size={18} color={colors.success} />
              </View>
              <Text style={[styles.coachTitle, { color: colors.success }]}>{isAr ? 'جلسة التدريب' : 'Your Coaching Session'}</Text>
            </View>
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={colors.success} />
                <Text style={[styles.loadingText, { color: colors.success }]}>{isAr ? 'جارٍ تخصيص التدريب…' : 'Personalising your coaching…'}</Text>
              </View>
            ) : (
              <Text style={[styles.coachText, { color: colors.text }]}>{coaching}</Text>
            )}
          </View>
        ) : (
          <View style={styles.emptyHint}>
            <Ionicons name="bulb-outline" size={32} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {isAr
                ? 'اضغط على الزر أعلاه للحصول على نصائح تدريبية مخصصة بناءً على أدائك.'
                : 'Tap the button above to receive personalised coaching tips based on your performance.'}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1 },
  content: { padding: spacing.md, paddingBottom: 40 },

  greetCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    borderRadius: radius.lg,
    padding: spacing.md, marginBottom: spacing.lg, ...shadow.sm,
    borderLeftWidth: 4,
  },
  greetAvatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  greetText: { flex: 1 },
  greetName: { ...typography.h3 },
  greetRole: { ...typography.caption, marginTop: 2 },

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
    borderRadius: radius.lg,
    padding: spacing.md, ...shadow.sm,
    borderTopWidth: 3,
  },
  coachHeader:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  coachIconWrap: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  coachTitle:    { ...typography.h4 },
  loadingRow:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  loadingText:   { ...typography.bodySmall },
  coachText:     { ...typography.body, lineHeight: 24 },

  emptyHint: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  emptyText: { ...typography.bodySmall, textAlign: 'center', lineHeight: 20 },
});
