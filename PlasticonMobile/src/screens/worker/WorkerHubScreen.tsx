import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, RefreshControl, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../api/client';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

// ── Types ──────────────────────────────────────────────────────────────────────
interface TodayAttendance {
  checkIn:         string | null;
  checkOut:        string | null;
  lateMinutes:     number;
  overtimeMinutes: number;
}
interface HubData {
  shiftName:       string | null;
  checkedIn:       boolean;
  attendance:      TodayAttendance | null;
  productionToday: number;
  recentLogs:      { id: number; productName?: string; totalPieces?: number; createdAt: string }[];
  snapshotsToday:  number;
  openStops:       number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function fmtMin(min: number): string {
  if (!min) return '0m';
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
function greetingAr(): string {
  const h = new Date().getHours();
  if (h < 12) return 'صباح الخير';
  if (h < 17) return 'مساء الخير';
  return 'مساء النور';
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon, color, colors }: {
  label: string; value: string; icon: string; color: string; colors: any;
}) {
  return (
    <View style={[styles.kpiCard, { backgroundColor: colors.surface }]}>
      <View style={[styles.kpiIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text style={[styles.kpiVal, { color }]}>{value}</Text>
      <Text style={[styles.kpiLabel, { color: colors.textMuted }]} numberOfLines={2}>{label}</Text>
    </View>
  );
}

function QuickBtn({ icon, label, color, onPress, colors }: {
  icon: string; label: string; color: string; onPress: () => void; colors: any;
}) {
  return (
    <TouchableOpacity
      style={[styles.qBtn, { borderColor: `${color}28`, backgroundColor: colors.surface }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.qBtnIcon, { backgroundColor: `${color}14` }]}>
        <Ionicons name={icon as any} size={21} color={color} />
      </View>
      <Text style={[styles.qBtnLabel, { color }]} numberOfLines={2}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────────
export function WorkerHubScreen() {
  const { colors }   = useAppTheme();
  const { isAr }     = useLocale();
  const { user }     = useAuth();
  const navigation   = useNavigation<any>();
  const firstName    = (user?.fullName ?? 'Worker').split(' ')[0];

  const [data, setData]           = useState<HubData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const [shifts, attendance, production, snaps, stops] = await Promise.allSettled([
        api.get<any>('/shifts?limit=3'),
        api.get<any>('/attendance/me?limit=1'),
        api.get<any>('/production/me?limit=5'),
        api.get<any>(`/settings/snapshots/mine?limit=200&from=${todayStr}&to=${todayStr}`),
        api.get<any>('/worker-tools/machine-stop-alerts/mine?limit=50'),
      ]);

      const shift0  = shifts.status     === 'fulfilled' ? (shifts.value?.shifts?.[0] ?? shifts.value?.[0])   : null;
      const att0    = attendance.status === 'fulfilled' ? (attendance.value?.records?.[0] ?? attendance.value?.[0]) : null;
      const prodVal = production.status === 'fulfilled' ? production.value : null;
      const snapArr = snaps.status      === 'fulfilled' ? (Array.isArray(snaps.value) ? snaps.value : [])     : [];
      const stopsArr = stops.status     === 'fulfilled' ? (Array.isArray(stops.value) ? stops.value : (stops.value?.alerts ?? [])) : [];

      const todayDate = new Date().toDateString();
      const checkedIn = att0?.checkIn
        ? new Date(att0.checkIn).toDateString() === todayDate && !att0.checkOut
        : false;

      const openStops = stopsArr.filter((s: any) => !s.resolved_at && !s.resolvedAt).length;

      setData({
        shiftName:       shift0 ? (shift0.shiftName ?? shift0.name ?? null) : null,
        checkedIn,
        attendance:      att0 ? {
          checkIn:         att0.checkIn         ?? null,
          checkOut:        att0.checkOut        ?? null,
          lateMinutes:     att0.lateMinutes      ?? 0,
          overtimeMinutes: att0.overtimeMinutes  ?? 0,
        } : null,
        productionToday: prodVal?.total ?? 0,
        recentLogs:      prodVal?.records ?? [],
        snapshotsToday:  snapArr.length,
        openStops,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const nav = (en: string, ar: string) => isAr ? ar : en;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
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

        {/* ── Greeting header ─────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.greetSub, { color: colors.textMuted }]}>
              {isAr ? greetingAr() : greeting()},
            </Text>
            <Text style={[styles.greetName, { color: colors.text }]}>{firstName} 👷</Text>
          </View>
          <View style={[
            styles.statusPill,
            data?.checkedIn
              ? { backgroundColor: '#dcfce7', borderColor: '#86efac' }
              : { backgroundColor: '#fee2e2', borderColor: '#fca5a5' },
          ]}>
            <View style={[styles.dot, { backgroundColor: data?.checkedIn ? '#16a34a' : '#dc2626' }]} />
            <Text style={[styles.statusText, { color: data?.checkedIn ? '#15803d' : '#b91c1c' }]}>
              {data?.checkedIn ? nav('Checked In', 'في العمل') : nav('Not Checked In', 'غير مسجل')}
            </Text>
          </View>
        </View>

        {/* ── 4 KPI cards ─────────────────────────────────────────────────── */}
        <View style={styles.kpiGrid}>
          <KpiCard
            label={nav('Production Today', 'إنتاج اليوم')}
            value={String(data?.productionToday ?? 0)}
            icon="cube-outline"
            color={colors.primary}
            colors={colors}
          />
          <KpiCard
            label={nav('Shift', 'الوردية')}
            value={data?.shiftName ?? nav('—', '—')}
            icon="time-outline"
            color={colors.accent}
            colors={colors}
          />
          <KpiCard
            label={nav('Snapshots Today', 'لقطات اليوم')}
            value={String(data?.snapshotsToday ?? 0)}
            icon="camera-outline"
            color="#8b5cf6"
            colors={colors}
          />
          <KpiCard
            label={nav('Open Stops', 'توقفات مفتوحة')}
            value={String(data?.openStops ?? 0)}
            icon="warning-outline"
            color={data?.openStops ? colors.danger : colors.success}
            colors={colors}
          />
        </View>

        {/* ── Today's attendance card ──────────────────────────────────────── */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
          {nav("TODAY'S ATTENDANCE", 'حضور اليوم')}
        </Text>
        <View style={[styles.attCard, { backgroundColor: colors.surface }]}>
          <View style={styles.attRow}>
            <View style={styles.attItem}>
              <Ionicons name="log-in-outline" size={18} color={colors.success} style={styles.attIcon} />
              <View>
                <Text style={[styles.attLabel, { color: colors.textMuted }]}>{nav('Check-In', 'الدخول')}</Text>
                <Text style={[styles.attVal, { color: colors.text }]}>
                  {fmtTime(data?.attendance?.checkIn ?? null)}
                </Text>
              </View>
            </View>
            <View style={[styles.attDivider, { backgroundColor: colors.border }]} />
            <View style={styles.attItem}>
              <Ionicons name="log-out-outline" size={18} color={colors.info} style={styles.attIcon} />
              <View>
                <Text style={[styles.attLabel, { color: colors.textMuted }]}>{nav('Check-Out', 'الخروج')}</Text>
                <Text style={[styles.attVal, { color: colors.text }]}>
                  {fmtTime(data?.attendance?.checkOut ?? null)}
                </Text>
              </View>
            </View>
          </View>

          {((data?.attendance?.lateMinutes ?? 0) > 0 || (data?.attendance?.overtimeMinutes ?? 0) > 0) && (
            <View style={[styles.attTags, { borderTopColor: colors.border }]}>
              {(data?.attendance?.lateMinutes ?? 0) > 0 && (
                <View style={styles.attTag}>
                  <Ionicons name="alert-circle-outline" size={13} color="#a16207" />
                  <Text style={styles.attTagLate}>
                    {nav('Late', 'تأخير')}: +{fmtMin(data?.attendance?.lateMinutes ?? 0)}
                  </Text>
                </View>
              )}
              {(data?.attendance?.overtimeMinutes ?? 0) > 0 && (
                <View style={styles.attTag}>
                  <Ionicons name="time-outline" size={13} color="#7c3aed" />
                  <Text style={styles.attTagOt}>
                    {nav('Overtime', 'إضافي')}: +{fmtMin(data?.attendance?.overtimeMinutes ?? 0)}
                  </Text>
                </View>
              )}
            </View>
          )}

          {!data?.attendance && (
            <Text style={[styles.attNoRecord, { color: colors.textMuted }]}>
              {nav('No attendance record for today', 'لا يوجد سجل حضور لليوم')}
            </Text>
          )}
        </View>

        {/* ── Quick actions ────────────────────────────────────────────────── */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
          {nav('QUICK ACTIONS', 'الإجراءات السريعة')}
        </Text>
        <View style={styles.qGrid}>
          <QuickBtn
            icon="time-outline"
            label={nav('Attendance', 'حضوري')}
            color={colors.success}
            colors={colors}
            onPress={() => navigation.navigate('Attendance')}
          />
          <QuickBtn
            icon="cube-outline"
            label={nav('Production', 'الإنتاج')}
            color={colors.primary}
            colors={colors}
            onPress={() => navigation.navigate('Production')}
          />
          <QuickBtn
            icon="camera-outline"
            label={nav('Snapshots', 'اللقطات')}
            color="#8b5cf6"
            colors={colors}
            onPress={() => navigation.navigate('Snapshots')}
          />
          <QuickBtn
            icon="warning-outline"
            label={nav('Machine Stops', 'توقف آلات')}
            color={colors.danger}
            colors={colors}
            onPress={() => navigation.navigate('MachineStops')}
          />
          <QuickBtn
            icon="chatbubble-ellipses-outline"
            label={nav('AI Chat', 'الدردشة')}
            color={colors.info}
            colors={colors}
            onPress={() => navigation.navigate('AI', { screen: 'Assistant' })}
          />
        </View>

        {/* ── Recent production logs ───────────────────────────────────────── */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
          {nav('RECENT PRODUCTION', 'الإنتاج الأخير')}
        </Text>
        <View style={[styles.logCard, { backgroundColor: colors.surface }]}>
          {data?.recentLogs.length ? (
            data.recentLogs.map((log, i) => (
              <View
                key={`${log.id}-${i}`}
                style={[
                  styles.logRow,
                  i < (data.recentLogs.length - 1) && [styles.logDivider, { borderBottomColor: colors.border }],
                ]}
              >
                <View style={[styles.logDot, { backgroundColor: colors.primary }]} />
                <Text style={[styles.logName, { color: colors.text }]} numberOfLines={1}>
                  {log.productName ?? `Log #${log.id}`}
                </Text>
                <Text style={[styles.logQty, { color: colors.primary }]}>
                  {(log.totalPieces ?? 0).toLocaleString()} {nav('units', 'وحدة')}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyLog}>
              <Ionicons name="cube-outline" size={30} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {nav('No production logged today', 'لا يوجد إنتاج مسجل اليوم')}
              </Text>
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:    { flex: 1 },
  content: { padding: spacing.md, paddingBottom: 40 },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Header
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg, paddingTop: spacing.sm },
  headerLeft: { flex: 1 },
  greetSub:   { ...typography.bodySmall, marginBottom: 1 },
  greetName:  { ...typography.h2 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, borderWidth: 1 },
  dot:        { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },

  // KPI grid
  kpiGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  kpiCard:  { width: '47.5%', borderRadius: radius.lg, padding: spacing.md, alignItems: 'flex-start', gap: 6, ...shadow.sm },
  kpiIcon:  { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  kpiVal:   { fontSize: 22, fontWeight: '800', lineHeight: 26 },
  kpiLabel: { fontSize: 11, fontWeight: '600', lineHeight: 14 },

  // Section label
  sectionLabel: { ...typography.caption, fontWeight: '700', letterSpacing: 0.7, marginBottom: spacing.sm, textTransform: 'uppercase' },

  // Attendance card
  attCard:    { borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.lg, ...shadow.sm },
  attRow:     { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  attItem:    { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  attIcon:    { marginTop: 2 },
  attDivider: { width: 1, height: 36, marginHorizontal: spacing.sm },
  attLabel:   { fontSize: 11, fontWeight: '600', marginBottom: 2 },
  attVal:     { fontSize: 17, fontWeight: '800', fontVariant: ['tabular-nums'] },
  attTags:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1 },
  attTag:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.full, backgroundColor: '#fef9c3' },
  attTagLate: { fontSize: 11, fontWeight: '700', color: '#a16207' },
  attTagOt:   { fontSize: 11, fontWeight: '700', color: '#7c3aed' },
  attNoRecord: { ...typography.bodySmall, textAlign: 'center', paddingVertical: spacing.sm },

  // Quick buttons
  qGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  qBtn:    { width: '31%', alignItems: 'center', paddingVertical: spacing.md, borderRadius: radius.lg, borderWidth: 1.5, gap: 6, ...shadow.sm },
  qBtnIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  qBtnLabel: { fontSize: 10, fontWeight: '700', textAlign: 'center', lineHeight: 13 },

  // Kaizen banner

  // Production logs
  logCard:    { borderRadius: radius.lg, marginBottom: spacing.md, overflow: 'hidden', ...shadow.sm },
  logRow:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 12, gap: 10 },
  logDivider: { borderBottomWidth: 1 },
  logDot:     { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  logName:    { ...typography.body, flex: 1 },
  logQty:     { ...typography.bodySmall, fontWeight: '700', flexShrink: 0 },

  emptyLog:  { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  emptyText: { ...typography.bodySmall },
});
