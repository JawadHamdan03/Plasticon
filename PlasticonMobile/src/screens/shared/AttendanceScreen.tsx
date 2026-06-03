import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

interface AttendanceRecord {
  id: number;
  checkIn:        string | null;
  checkOut:       string | null;
  lateMinutes?:   number;
  overtimeMinutes?: number;
  shift?: { id: number; name: string } | null;
}

function fmtTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(iso: string | null, isAr: boolean): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

function calcDuration(checkIn: string | null, checkOut: string | null): string {
  if (!checkIn || !checkOut) return '—';
  const mins = Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function RecordRow({ item, colors, isAr }: { item: AttendanceRecord; colors: any; isAr: boolean }) {
  const isOpen     = !item.checkOut;
  const accentColor = isOpen ? colors.success : colors.primary;

  return (
    <View style={[styles.row, { backgroundColor: colors.surface }]}>
      <View style={[styles.rowAccent, { backgroundColor: accentColor }]} />
      <View style={styles.rowContent}>

        {/* Date + status badge */}
        <View style={styles.rowTop}>
          <Text style={[styles.rowDate, { color: colors.text }]}>
            {fmtDate(item.checkIn, isAr)}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: `${accentColor}18` }]}>
            <Text style={[styles.statusText, { color: accentColor }]}>
              {isOpen ? (isAr ? 'داخل الشفت' : 'Open') : (isAr ? 'مكتمل' : 'Closed')}
            </Text>
          </View>
        </View>

        {/* Shift name */}
        {item.shift?.name && (
          <View style={styles.shiftRow}>
            <Ionicons name="time-outline" size={12} color={colors.textMuted} />
            <Text style={[styles.shiftLabel, { color: colors.textMuted }]}>
              {item.shift.name}
            </Text>
          </View>
        )}

        {/* Times row */}
        <View style={styles.rowTimes}>
          <View style={styles.timeBlock}>
            <Ionicons name="log-in-outline" size={13} color={colors.success} />
            <Text style={[styles.timeLabel, { color: colors.textMuted }]}>{fmtTime(item.checkIn)}</Text>
          </View>
          <Ionicons name="arrow-forward" size={12} color={colors.textMuted} />
          <View style={styles.timeBlock}>
            <Ionicons name="log-out-outline" size={13} color={colors.danger} />
            <Text style={[styles.timeLabel, { color: colors.textMuted }]}>{fmtTime(item.checkOut)}</Text>
          </View>
          <Text style={[styles.duration, { color: colors.primary }]}>
            {calcDuration(item.checkIn, item.checkOut)}
          </Text>
        </View>

        {/* Late / Overtime */}
        {((item.lateMinutes ?? 0) > 0 || (item.overtimeMinutes ?? 0) > 0) && (
          <View style={styles.extraRow}>
            {(item.lateMinutes ?? 0) > 0 && (
              <View style={[styles.extraChip, { backgroundColor: `${colors.warning}18` }]}>
                <Text style={[styles.extraText, { color: colors.warning }]}>
                  {isAr ? `تأخير ${item.lateMinutes} د` : `Late ${item.lateMinutes}m`}
                </Text>
              </View>
            )}
            {(item.overtimeMinutes ?? 0) > 0 && (
              <View style={[styles.extraChip, { backgroundColor: `${colors.info}18` }]}>
                <Text style={[styles.extraText, { color: colors.info }]}>
                  {isAr ? `إضافي ${item.overtimeMinutes} د` : `OT ${item.overtimeMinutes}m`}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

export function AttendanceScreen() {
  const { colors } = useAppTheme();
  const { isAr }   = useLocale();

  const [records,       setRecords]       = useState<AttendanceRecord[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [actionLoading, setActionLoading] = useState<'in' | 'out' | ''>('');
  const [successMsg,    setSuccessMsg]    = useState('');
  const [errorMsg,      setErrorMsg]      = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.get<any>('/attendance/me');
      const recs: AttendanceRecord[] = Array.isArray(res) ? res : (res?.data ?? []);
      setRecords(recs);
    } catch {
      /* keep last state */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const hasOpenAttendance = useMemo(() => records.some((r) => !r.checkOut), [records]);

  const summary = useMemo(() => {
    const daySet   = new Set<string>();
    const monthSet = new Set<string>();
    let fridays = 0;
    const now = new Date();
    for (const rec of records) {
      if (!rec.checkIn) continue;
      const d   = new Date(rec.checkIn);
      if (Number.isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!daySet.has(key) && d.getDay() === 5) fridays++;
      daySet.add(key);
      if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
        monthSet.add(key);
      }
    }
    return { total: daySet.size, month: monthSet.size, fridays };
  }, [records]);

  const runAction = async (action: 'in' | 'out') => {
    setActionLoading(action);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      await api.post(action === 'in' ? '/attendance/check-in' : '/attendance/check-out', {});
      setSuccessMsg(action === 'in'
        ? (isAr ? 'تم تسجيل الدخول بنجاح' : 'Checked in successfully')
        : (isAr ? 'تم تسجيل الخروج بنجاح' : 'Checked out successfully'),
      );
      await load();
    } catch (err: any) {
      setErrorMsg(err?.message ?? (isAr ? 'فشلت العملية' : 'Action failed'));
    } finally {
      setActionLoading('');
    }
  };

  const handleCheckOut = () => {
    Alert.alert(
      isAr ? 'تسجيل الخروج' : 'Check Out',
      isAr ? 'تأكيد تسجيل الخروج؟' : 'Confirm check out?',
      [
        { text: isAr ? 'إلغاء' : 'Cancel', style: 'cancel' },
        { text: isAr ? 'خروج' : 'Check Out', style: 'destructive', onPress: () => void runAction('out') },
      ],
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title={isAr ? 'حضوري' : 'My Attendance'}
        subtitle={isAr ? 'سجل دخولك وخروجك وتابع سجلك اليومي' : 'Check in, check out, and review your attendance'}
        showBack
      />

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(i, idx) => `${String(i.id)}-${idx}`}
          renderItem={({ item }) => <RecordRow item={item} colors={colors} isAr={isAr} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); void load(); }}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={
            <View style={styles.headerBlock}>

              {/* Status + stats card */}
              <View style={[styles.actionCard, { backgroundColor: colors.surface }]}>

                {/* Status indicator */}
                <View style={styles.statusRow}>
                  <View style={[styles.statusDot, { backgroundColor: hasOpenAttendance ? colors.success : colors.textMuted }]} />
                  <Text style={[styles.statusLabel, { color: hasOpenAttendance ? colors.success : colors.textMuted }]}>
                    {hasOpenAttendance ? (isAr ? 'داخل الشفت' : 'Shift open') : (isAr ? 'لا يوجد شفت نشط' : 'No active shift')}
                  </Text>
                </View>

                {/* Stats row */}
                <View style={styles.statsRow}>
                  <View style={styles.stat}>
                    <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                    <Text style={[styles.statValue, { color: colors.text }]}>{summary.total}</Text>
                    <Text style={[styles.statLabel, { color: colors.textMuted }]}>{isAr ? 'أيام دوام' : 'Worked days'}</Text>
                  </View>
                  <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.stat}>
                    <Ionicons name="sunny-outline" size={18} color={colors.warning} />
                    <Text style={[styles.statValue, { color: colors.text }]}>{summary.month}</Text>
                    <Text style={[styles.statLabel, { color: colors.textMuted }]}>{isAr ? 'هذا الشهر' : 'This month'}</Text>
                  </View>
                  <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.stat}>
                    <Ionicons name="moon-outline" size={18} color={colors.info} />
                    <Text style={[styles.statValue, { color: colors.text }]}>{summary.fridays}</Text>
                    <Text style={[styles.statLabel, { color: colors.textMuted }]}>{isAr ? 'جمع' : 'Fridays'}</Text>
                  </View>
                </View>

                {/* Two action buttons */}
                <View style={styles.btnRow}>
                  <TouchableOpacity
                    style={[
                      styles.btn, styles.btnIn,
                      { backgroundColor: hasOpenAttendance ? colors.surfaceAlt : colors.success },
                      hasOpenAttendance && { borderWidth: 1.5, borderColor: colors.border },
                    ]}
                    onPress={() => void runAction('in')}
                    disabled={actionLoading !== '' || hasOpenAttendance}
                    activeOpacity={0.8}
                  >
                    {actionLoading === 'in'
                      ? <ActivityIndicator size="small" color={hasOpenAttendance ? colors.textMuted : '#fff'} />
                      : <Ionicons name="log-in-outline" size={20} color={hasOpenAttendance ? colors.textMuted : '#fff'} />
                    }
                    <Text style={[styles.btnText, { color: hasOpenAttendance ? colors.textMuted : '#fff' }]}>
                      {isAr ? 'تسجيل الدخول' : 'Check In'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.btn, styles.btnOut,
                      { backgroundColor: hasOpenAttendance ? colors.danger : colors.surfaceAlt },
                      !hasOpenAttendance && { borderWidth: 1.5, borderColor: colors.border },
                    ]}
                    onPress={handleCheckOut}
                    disabled={actionLoading !== '' || !hasOpenAttendance}
                    activeOpacity={0.8}
                  >
                    {actionLoading === 'out'
                      ? <ActivityIndicator size="small" color={hasOpenAttendance ? '#fff' : colors.textMuted} />
                      : <Ionicons name="log-out-outline" size={20} color={hasOpenAttendance ? '#fff' : colors.textMuted} />
                    }
                    <Text style={[styles.btnText, { color: hasOpenAttendance ? '#fff' : colors.textMuted }]}>
                      {isAr ? 'تسجيل الخروج' : 'Check Out'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Success / Error messages */}
                {!!successMsg && (
                  <View style={[styles.msgBanner, { backgroundColor: `${colors.success}15`, borderColor: `${colors.success}40` }]}>
                    <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                    <Text style={[styles.msgText, { color: colors.success }]}>{successMsg}</Text>
                  </View>
                )}
                {!!errorMsg && (
                  <View style={[styles.msgBanner, { backgroundColor: `${colors.danger}12`, borderColor: `${colors.danger}40` }]}>
                    <Ionicons name="alert-circle" size={14} color={colors.danger} />
                    <Text style={[styles.msgText, { color: colors.danger }]}>{errorMsg}</Text>
                  </View>
                )}
              </View>

              <Text style={[styles.histLabel, { color: colors.textMuted }]}>
                {isAr ? 'سجل الحضور والغياب' : 'ATTENDANCE HISTORY'}
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {isAr ? 'لا توجد سجلات حضور بعد' : 'No attendance records yet'}
              </Text>
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

  headerBlock: { marginBottom: spacing.sm },

  actionCard: { borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.lg, ...shadow.md },

  statusRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.md },
  statusDot:  { width: 10, height: 10, borderRadius: 5 },
  statusLabel: { ...typography.h4 },

  statsRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  stat:        { flex: 1, alignItems: 'center', gap: 4 },
  statValue:   { fontSize: 20, fontWeight: '800' },
  statLabel:   { ...typography.caption, textAlign: 'center' },
  statDivider: { width: 1, height: 40 },

  btnRow: { flexDirection: 'row', gap: spacing.sm },
  btn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 13, borderRadius: radius.md, gap: 8,
  },
  btnIn:   {},
  btnOut:  {},
  btnText: { fontWeight: '700', fontSize: 14 },

  msgBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1 },
  msgText:   { ...typography.caption, fontWeight: '600', flex: 1 },

  histLabel: { ...typography.sectionLabel, marginBottom: spacing.sm },

  // Record rows
  row: {
    flexDirection: 'row', borderRadius: radius.md,
    marginBottom: spacing.sm, overflow: 'hidden', ...shadow.sm,
  },
  rowAccent:  { width: 4 },
  rowContent: { flex: 1, padding: spacing.md },
  rowTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  rowDate:    { ...typography.h4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  statusText:  { fontSize: 11, fontWeight: '700' },
  shiftRow:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  shiftLabel:  { ...typography.caption, fontWeight: '600' },
  rowTimes:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeBlock:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeLabel:  { ...typography.caption, fontWeight: '600' },
  duration:   { ...typography.caption, marginLeft: 'auto', fontWeight: '700' },
  extraRow:   { flexDirection: 'row', gap: 6, marginTop: 6 },
  extraChip:  { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  extraText:  { fontSize: 11, fontWeight: '700' },

  empty:     { alignItems: 'center', paddingTop: 40, gap: spacing.sm },
  emptyText: { ...typography.bodySmall },
});
