import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, RefreshControl, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../auth/AuthContext';
import { Card, StatCard } from '../../components';
import { api } from '../../api/client';
import { colors, radius, shadow, spacing, typography } from '../../theme';

interface HubData {
  shiftName:       string | null;
  checkedIn:       boolean;
  productionToday: number;
  recentLogs:      { id: number; productName?: string; totalPieces?: number; createdAt: string }[];
}

function QuickAction({ icon, label, color, onPress }: {
  icon: string; label: string; color: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[styles.qa, { borderColor: `${color}30` }]} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.qaIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon as any} size={22} color={color} />
      </View>
      <Text style={[styles.qaLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function WorkerHubScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const firstName  = (user?.fullName ?? 'Worker').split(' ')[0];

  const [data, setData]       = useState<HubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [shifts, attendance, production] = await Promise.allSettled([
        api.get<{ shifts: { shiftName?: string; name?: string }[] }>('/shifts?limit=1'),
        api.get<{ records: { checkIn: string | null; checkOut: string | null }[] }>('/attendance/my?limit=1'),
        api.get<{ records: { id: number; productName?: string; totalPieces?: number; createdAt: string }[]; total: number }>('/production/my?limit=5'),
      ]);

      const shift0  = shifts.status      === 'fulfilled' ? shifts.value.shifts?.[0]              : null;
      const att0    = attendance.status  === 'fulfilled' ? attendance.value.records?.[0]         : null;
      const prodVal = production.status  === 'fulfilled' ? production.value                      : null;

      const todayDate  = new Date().toDateString();
      const checkedIn  = att0?.checkIn
        ? new Date(att0.checkIn).toDateString() === todayDate && !att0?.checkOut
        : false;

      setData({
        shiftName:       shift0 ? (shift0.shiftName ?? shift0.name ?? null) : null,
        checkedIn,
        productionToday: prodVal?.total ?? 0,
        recentLogs:      prodVal?.records ?? [],
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
      >
        {/* Greeting bar */}
        <View style={styles.greeting}>
          <View>
            <Text style={styles.greetSub}>Good day,</Text>
            <Text style={styles.greetName}>{firstName} 👷</Text>
          </View>
          <View style={[styles.statusPill, data?.checkedIn ? styles.pillIn : styles.pillOut]}>
            <View style={[styles.dot, { backgroundColor: data?.checkedIn ? colors.success : colors.danger }]} />
            <Text style={[styles.statusText, { color: data?.checkedIn ? colors.success : colors.danger }]}>
              {data?.checkedIn ? 'Checked In' : 'Not In'}
            </Text>
          </View>
        </View>

        {/* KPI cards */}
        <View style={styles.statRow}>
          <StatCard
            label="Production Today"
            value={String(data?.productionToday ?? 0)}
            icon="cube"
            color={colors.primary}
            style={styles.stat}
          />
          <StatCard
            label="Current Shift"
            value={data?.shiftName ?? 'No shift'}
            icon="time"
            color={colors.accent}
            style={styles.stat}
          />
        </View>

        {/* Quick actions */}
        <Text style={styles.sectionLabel}>QUICK ACTIONS</Text>
        <View style={styles.qaRow}>
          <QuickAction
            icon="time"
            label="Attendance"
            color={colors.success}
            onPress={() => navigation.navigate('Personal', { screen: 'Attendance' })}
          />
          <QuickAction
            icon="cube-outline"
            label="Production"
            color={colors.primary}
            onPress={() => navigation.navigate('Work', { screen: 'Production' })}
          />
          <QuickAction
            icon="cash-outline"
            label="Payroll"
            color={colors.accent}
            onPress={() => navigation.navigate('Personal', { screen: 'Payroll' })}
          />
          <QuickAction
            icon="chatbubble-ellipses-outline"
            label="AI Chat"
            color={colors.info}
            onPress={() => navigation.navigate('AI', { screen: 'Assistant' })}
          />
        </View>

        {/* Recent production */}
        <Text style={styles.sectionLabel}>RECENT PRODUCTION</Text>
        {data?.recentLogs.length ? (
          <Card style={styles.logCard}>
            {data.recentLogs.map((log, i) => (
              <View key={log.id} style={[styles.logRow, i < data.recentLogs.length - 1 && styles.logDivider]}>
                <View style={styles.logLeft}>
                  <View style={styles.logDot} />
                  <Text style={styles.logName} numberOfLines={1}>
                    {log.productName ?? `Log #${log.id}`}
                  </Text>
                </View>
                <Text style={styles.logQty}>{(log.totalPieces ?? 0)} units</Text>
              </View>
            ))}
          </Card>
        ) : (
          <Card style={styles.emptyCard}>
            <Ionicons name="cube-outline" size={32} color={colors.textMuted} />
            <Text style={styles.emptyText}>No production logged today</Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center' },

  greeting: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg, paddingTop: spacing.sm },
  greetSub:  { ...typography.bodySmall, color: colors.textMuted },
  greetName: { ...typography.h2 },
  statusPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, borderWidth: 1 },
  pillIn:  { backgroundColor: colors.successLight, borderColor: `${colors.success}40` },
  pillOut: { backgroundColor: colors.dangerLight,  borderColor: `${colors.danger}40` },
  dot:        { width: 7, height: 7, borderRadius: 4, marginRight: 5 },
  statusText: { fontSize: 11, fontWeight: '700' },

  statRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  stat:    { flex: 1 },

  sectionLabel: { ...typography.sectionLabel, marginBottom: spacing.sm },

  qaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  qa: {
    width: '47%', alignItems: 'center',
    paddingVertical: spacing.md, borderRadius: radius.lg,
    borderWidth: 1.5, backgroundColor: colors.surface, ...shadow.sm,
  },
  qaIcon:  { marginBottom: 6 },
  qaLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },

  snapBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.accentLight, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.lg,
    borderWidth: 1, borderColor: `${colors.accent}40`,
  },
  snapText: { ...typography.bodySmall, color: colors.accentDark, fontWeight: '600', flex: 1 },

  logCard:    { marginBottom: spacing.md, padding: 0, overflow: 'hidden' },
  logRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 12 },
  logDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  logLeft:    { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: spacing.sm },
  logDot:     { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginRight: 10 },
  logName:    { ...typography.body, flex: 1 },
  logQty:     { ...typography.bodySmall, fontWeight: '600', color: colors.primary },

  emptyCard: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  emptyText: { ...typography.bodySmall, color: colors.textMuted },
});
