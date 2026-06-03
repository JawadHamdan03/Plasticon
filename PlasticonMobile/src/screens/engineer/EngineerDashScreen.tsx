import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, RefreshControl, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../auth/AuthContext';
import { StatCard } from '../../components';
import { api } from '../../api/client';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

interface DashData {
  machinesTotal:     number;
  machinesOp:        number;
  openMaintenance:   number;
  qualityPassRate:   number;
  recentMaint:       { id: number; machine?: { name: string }; type: string; status: string; createdAt: string }[];
}

function AlertRow({ item, colors }: { item: DashData['recentMaint'][0]; colors: any }) {
  const statusColor = item.status === 'COMPLETED' ? colors.success
    : item.status === 'IN_PROGRESS' ? colors.info : colors.warning;
  return (
    <View style={[styles.alertRow, { borderBottomColor: colors.border }]}>
      <View style={[styles.alertDot, { backgroundColor: statusColor }]} />
      <View style={styles.alertContent}>
        <Text style={[styles.alertMachine, { color: colors.text }]} numberOfLines={1}>{item.machine?.name ?? `Maint #${item.id}`}</Text>
        <Text style={[styles.alertType, { color: colors.textMuted }]}>{item.type}</Text>
      </View>
      <View style={[styles.alertBadge, { backgroundColor: `${statusColor}18` }]}>
        <Text style={[styles.alertBadgeText, { color: statusColor }]}>{item.status}</Text>
      </View>
    </View>
  );
}

function QuickLink({ icon, label, color, onPress, colors }: { icon: string; label: string; color: string; onPress: () => void; colors: any }) {
  return (
    <TouchableOpacity style={[styles.ql, { borderColor: `${color}30`, backgroundColor: colors.surface }]} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.qlIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text style={[styles.qlLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function EngineerDashScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const firstName = (user?.fullName ?? 'Engineer').split(' ')[0];
  const [data, setData]           = useState<DashData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [attendanceId, setAttendanceId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadAttendance = useCallback(async () => {
    try {
      const res = await api.get<any>('/attendance/me');
      const records: any[] = Array.isArray(res) ? res : (res?.data ?? []);
      const open = records.find((r: any) => !r.checkOut);
      setCheckedIn(!!open);
      setCheckInTime(open?.checkIn ?? null);
      setAttendanceId(open?.id ?? null);
    } catch { setCheckedIn(false); }
  }, []);

  const handleCheckToggle = async () => {
    setActionLoading(true);
    try {
      if (checkedIn) {
        await api.post('/attendance/check-out', {});
        setCheckedIn(false);
        setCheckInTime(null);
        setAttendanceId(null);
      } else {
        await api.post('/attendance/check-in', {});
        await loadAttendance();
      }
    } catch (e: any) {
      Alert.alert(
        isAr ? 'خطأ' : 'Error',
        e?.message ?? (isAr ? 'فشلت العملية' : 'Action failed'),
      );
    } finally {
      setActionLoading(false);
    }
  };

  const load = useCallback(async () => {
    try {
      const [machines, maint] = await Promise.allSettled([
        api.get<any>('/machines'),
        api.get<any>('/maintenance?limit=5'),
      ]);

      const rawM  = machines.status === 'fulfilled' ? machines.value : [];
      const mList: { status: string }[] = Array.isArray(rawM)
        ? rawM
        : (rawM?.machines ?? rawM?.data ?? []);

      const rawR  = maint.status === 'fulfilled' ? maint.value : [];
      const mRecs: DashData['recentMaint'] = Array.isArray(rawR)
        ? rawR
        : (rawR?.records ?? rawR?.data ?? []);

      setData({
        machinesTotal:   mList.length,
        machinesOp:      mList.filter((m) => m.status === 'OPERATIONAL').length,
        openMaintenance: (mRecs ?? []).filter((r) => r.status !== 'COMPLETED').length,
        qualityPassRate: 0,
        recentMaint:     mRecs ?? [],
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); void loadAttendance(); }, [load, loadAttendance]);

  if (loading) return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
      >
        <View style={styles.greeting}>
          <View>
            <Text style={[styles.greetSub, { color: colors.textMuted }]}>{isAr ? 'لوحة التحكم' : 'Dashboard'}</Text>
            <Text style={[styles.greetName, { color: colors.text }]}>{firstName} ⚙️</Text>
          </View>
          <TouchableOpacity style={[styles.analyticBtn, { backgroundColor: colors.primaryLight }]} onPress={() => navigation.navigate('Engineering', { screen: 'ProductionAnalytics' })}>
            <Ionicons name="analytics" size={16} color={colors.primary} />
            <Text style={[styles.analyticText, { color: colors.primary }]}>{isAr ? 'تحليل الإنتاج' : 'Production Analytics'}</Text>
          </TouchableOpacity>
        </View>

        {/* Check-in / Check-out card */}
        <View style={[styles.checkCard, { backgroundColor: checkedIn ? `${colors.success}12` : `${colors.danger}10`, borderColor: checkedIn ? `${colors.success}50` : `${colors.danger}40` }]}>
          <View style={styles.checkLeft}>
            <View style={[styles.checkDot, { backgroundColor: checkedIn ? colors.success : colors.danger }]} />
            <View>
              <Text style={[styles.checkStatus, { color: colors.text }]}>
                {checkedIn ? (isAr ? 'مسجّل الدخول' : 'Checked In') : (isAr ? 'لم تسجّل دخولاً' : 'Not Checked In')}
              </Text>
              {checkedIn && checkInTime ? (
                <Text style={[styles.checkSince, { color: colors.textMuted }]}>
                  {isAr ? 'منذ' : 'Since'}{' '}
                  {new Date(checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              ) : (
                <Text style={[styles.checkSince, { color: colors.textMuted }]}>
                  {isAr ? 'سجّل دخولك للبدء' : 'Check in to start your shift'}
                </Text>
              )}
            </View>
          </View>
          <TouchableOpacity
            style={[styles.checkBtn, { backgroundColor: checkedIn ? colors.danger : colors.success }, actionLoading && { opacity: 0.6 }]}
            onPress={handleCheckToggle}
            disabled={actionLoading}
            activeOpacity={0.82}
          >
            {actionLoading
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.checkBtnText}>{checkedIn ? (isAr ? 'خروج' : 'Check Out') : (isAr ? 'دخول' : 'Check In')}</Text>
            }
          </TouchableOpacity>
        </View>

        {/* KPI row */}
        <View style={styles.kpiRow}>
          <StatCard label={isAr ? 'الآلات بخير' : 'Machines OK'}  value={`${data?.machinesOp ?? 0}/${data?.machinesTotal ?? 0}`} icon="hardware-chip" color={colors.success}  style={styles.kpi} />
          <StatCard label={isAr ? 'صيانة مفتوحة' : 'Open Maint.'} value={String(data?.openMaintenance ?? 0)}                     icon="construct"    color={colors.warning}  style={styles.kpi} />
        </View>
        <View style={styles.kpiRow}>
          <StatCard label={isAr ? 'نجاح الجودة' : 'Quality Pass'} value={`${data?.qualityPassRate ?? 0}%`}                       icon="shield-checkmark" color={colors.info}  style={styles.kpi} />
          <StatCard label={isAr ? 'القسم' : 'Dept'}               value={user?.department ?? '—'}                                icon="business"     color={colors.accent}   style={styles.kpi} />
        </View>

        {/* Quick links */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{isAr ? 'وصول سريع' : 'QUICK ACCESS'}</Text>
        <View style={styles.qlGrid}>
          <QuickLink icon="construct-outline"        label={isAr ? 'الصيانة' : 'Maintenance'}  color={colors.warning}  onPress={() => navigation.navigate('Engineering', { screen: 'MaintenancePage' })} colors={colors} />
          <QuickLink icon="hardware-chip-outline"    label={isAr ? 'الآلات' : 'Machines'}      color={colors.primary}  onPress={() => navigation.navigate('Engineering', { screen: 'MachineHealth'  })} colors={colors} />
          <QuickLink icon="shield-checkmark-outline" label={isAr ? 'الجودة' : 'Quality'}       color={colors.success}  onPress={() => navigation.navigate('Engineering', { screen: 'QualityChecks'  })} colors={colors} />
          <QuickLink icon="chatbubble-ellipses-outline" label={isAr ? 'أدوات الذكاء' : 'AI Tools'} color={colors.info} onPress={() => navigation.navigate('AITools',     { screen: 'AIHub'     })} colors={colors} />
        </View>

        {/* Recent maintenance */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{isAr ? 'الصيانة الأخيرة' : 'RECENT MAINTENANCE'}</Text>
        <View style={[styles.alertCard, { backgroundColor: colors.surface }]}>
          {data?.recentMaint.length ? data.recentMaint.map((item, idx) => (
            <AlertRow key={`${item.id}-${idx}`} item={item} colors={colors} />
          )) : (
            <View style={styles.empty}>
              <Ionicons name="checkmark-circle-outline" size={28} color={colors.success} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>{isAr ? 'لا توجد مشاكل صيانة' : 'No maintenance issues'}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center' },

  greeting:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg, paddingTop: spacing.sm },
  greetSub:     { ...typography.bodySmall },
  greetName:    { ...typography.h2 },
  analyticBtn:  { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full },
  analyticText: { fontSize: 12, fontWeight: '700' },

  checkCard:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: radius.lg, borderWidth: 1.5, padding: spacing.md, marginBottom: spacing.md, ...shadow.sm },
  checkLeft:    { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  checkDot:     { width: 10, height: 10, borderRadius: 5 },
  checkStatus:  { ...typography.h4 },
  checkSince:   { ...typography.caption, marginTop: 2 },
  checkBtn:     { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.full, minWidth: 90, alignItems: 'center' },
  checkBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  kpiRow:       { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  kpi:          { flex: 1 },
  sectionLabel: { ...typography.sectionLabel, marginBottom: spacing.sm, marginTop: spacing.sm },

  qlGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  ql: {
    width: '47%', alignItems: 'center', paddingVertical: spacing.md,
    borderRadius: radius.lg, borderWidth: 1.5, ...shadow.sm,
  },
  qlIcon:  { marginBottom: 6 },
  qlLabel: { fontSize: 11, fontWeight: '700' },

  alertCard: { borderRadius: radius.lg, overflow: 'hidden', ...shadow.sm },
  alertRow:  { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, gap: spacing.sm },
  alertDot:  { width: 8, height: 8, borderRadius: 4 },
  alertContent: { flex: 1 },
  alertMachine: { ...typography.h4 },
  alertType:    { ...typography.caption, marginTop: 1 },
  alertBadge:   { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  alertBadgeText: { fontSize: 10, fontWeight: '700' },

  empty:     { padding: spacing.lg, alignItems: 'center', gap: spacing.sm },
  emptyText: { ...typography.bodySmall },
});
