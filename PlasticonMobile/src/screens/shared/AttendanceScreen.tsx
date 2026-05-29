import React, { useCallback, useEffect, useState } from 'react';
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
import { colors, radius, shadow, spacing, typography } from '../../theme';

interface AttendanceRecord {
  id: number;
  checkIn:  string | null;
  checkOut: string | null;
  status:   string;
  date?:    string;
}

function fmtTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function calcDuration(checkIn: string | null, checkOut: string | null): string {
  if (!checkIn || !checkOut) return '—';
  const mins = Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const STATUS_COLOR: Record<string, string> = {
  PRESENT: colors.success,
  LATE:    colors.warning,
  ABSENT:  colors.danger,
  HALF_DAY: colors.info,
};

function AttendanceRow({ item }: { item: AttendanceRecord }) {
  const statusColor = STATUS_COLOR[item.status] ?? colors.textMuted;
  return (
    <View style={styles.row}>
      <View style={[styles.rowAccent, { backgroundColor: statusColor }]} />
      <View style={styles.rowContent}>
        <View style={styles.rowTop}>
          <Text style={styles.rowDate}>{fmtDate(item.checkIn)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}18` }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
          </View>
        </View>
        <View style={styles.rowTimes}>
          <View style={styles.timeBlock}>
            <Ionicons name="log-in-outline" size={13} color={colors.success} />
            <Text style={styles.timeLabel}>{fmtTime(item.checkIn)}</Text>
          </View>
          <Ionicons name="arrow-forward" size={12} color={colors.textMuted} />
          <View style={styles.timeBlock}>
            <Ionicons name="log-out-outline" size={13} color={colors.danger} />
            <Text style={styles.timeLabel}>{fmtTime(item.checkOut)}</Text>
          </View>
          <Text style={styles.duration}>{calcDuration(item.checkIn, item.checkOut)}</Text>
        </View>
      </View>
    </View>
  );
}

export function AttendanceScreen() {
  const [records, setRecords]         = useState<AttendanceRecord[]>([]);
  const [today, setToday]             = useState<AttendanceRecord | null>(null);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ records: AttendanceRecord[] }>('/attendance/me?limit=30');
      const recs = res.records ?? [];
      const todayDate = new Date().toDateString();
      const todayRec = recs.find((r) =>
        r.checkIn ? new Date(r.checkIn).toDateString() === todayDate : false,
      ) ?? null;
      setToday(todayRec);
      setRecords(recs);
    } catch {
      // keep last state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); void load(); };

  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      await api.post('/attendance/check-in', {});
      await load();
    } catch (err: any) {
      Alert.alert('Check-In Failed', err.message ?? 'Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    Alert.alert('Check Out', 'Confirm check out for today?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Check Out', style: 'destructive',
        onPress: async () => {
          setActionLoading(true);
          try {
            await api.post('/attendance/check-out', {});
            await load();
          } catch (err: any) {
            Alert.alert('Check-Out Failed', err.message ?? 'Please try again.');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const checkedIn  = !!today?.checkIn;
  const checkedOut = !!today?.checkOut;
  const canCheckIn  = !checkedIn;
  const canCheckOut = checkedIn && !checkedOut;

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Attendance" subtitle="Track your work hours" />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(i) => String(i.id)}
          renderItem={({ item }) => <AttendanceRow item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListHeaderComponent={
            <View style={styles.header}>
              {/* Today card */}
              <View style={styles.todayCard}>
                <Text style={styles.todayLabel}>TODAY</Text>
                {today ? (
                  <View style={styles.todayTimes}>
                    <View style={styles.todayBlock}>
                      <Text style={styles.todayBlockLabel}>Check In</Text>
                      <Text style={[styles.todayBlockValue, { color: colors.success }]}>
                        {fmtTime(today.checkIn)}
                      </Text>
                    </View>
                    <View style={styles.todayDivider} />
                    <View style={styles.todayBlock}>
                      <Text style={styles.todayBlockLabel}>Check Out</Text>
                      <Text style={[styles.todayBlockValue, { color: checkedOut ? colors.danger : colors.textMuted }]}>
                        {fmtTime(today.checkOut)}
                      </Text>
                    </View>
                    <View style={styles.todayDivider} />
                    <View style={styles.todayBlock}>
                      <Text style={styles.todayBlockLabel}>Duration</Text>
                      <Text style={[styles.todayBlockValue, { color: colors.primary }]}>
                        {calcDuration(today.checkIn, today.checkOut)}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.todayEmpty}>You haven't checked in yet today.</Text>
                )}

                {/* Action button */}
                {(canCheckIn || canCheckOut) && (
                  <TouchableOpacity
                    style={[styles.actionBtn, canCheckOut ? styles.btnOut : styles.btnIn]}
                    onPress={canCheckIn ? handleCheckIn : handleCheckOut}
                    activeOpacity={0.8}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Ionicons
                          name={canCheckIn ? 'log-in-outline' : 'log-out-outline'}
                          size={20} color="#fff"
                        />
                        <Text style={styles.actionBtnText}>
                          {canCheckIn ? 'Check In' : 'Check Out'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                {checkedOut && (
                  <View style={styles.doneRow}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                    <Text style={styles.doneText}>Shift complete for today</Text>
                  </View>
                )}
              </View>

              <Text style={[styles.histLabel]}>HISTORY</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={44} color={colors.textMuted} />
              <Text style={styles.emptyText}>No attendance records yet</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:   { padding: spacing.md, paddingBottom: 40 },

  header: { marginBottom: spacing.sm },

  todayCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadow.md,
  },
  todayLabel: { ...typography.sectionLabel, marginBottom: spacing.sm },
  todayTimes: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  todayBlock: { flex: 1, alignItems: 'center' },
  todayBlockLabel: { ...typography.caption, marginBottom: 4 },
  todayBlockValue: { fontSize: 17, fontWeight: '700' },
  todayDivider: { width: 1, height: 36, backgroundColor: colors.border, marginHorizontal: 4 },
  todayEmpty: { ...typography.bodySmall, color: colors.textMuted, marginBottom: spacing.md },

  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 13, borderRadius: radius.md, gap: 8,
  },
  btnIn:  { backgroundColor: colors.success },
  btnOut: { backgroundColor: colors.danger },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  doneRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: spacing.sm },
  doneText: { ...typography.bodySmall, color: colors.success, fontWeight: '600' },

  histLabel: { ...typography.sectionLabel, marginBottom: spacing.sm },

  row: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    ...shadow.sm,
  },
  rowAccent:  { width: 4 },
  rowContent: { flex: 1, padding: spacing.md },
  rowTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  rowDate:   { ...typography.h4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  statusText:  { fontSize: 11, fontWeight: '700' },
  rowTimes:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeBlock: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeLabel: { ...typography.caption, fontWeight: '600' },
  duration:  { ...typography.caption, marginLeft: 'auto', fontWeight: '700', color: colors.primary },

  empty:     { alignItems: 'center', paddingTop: 40, gap: spacing.sm },
  emptyText: { ...typography.bodySmall, color: colors.textMuted },
});
