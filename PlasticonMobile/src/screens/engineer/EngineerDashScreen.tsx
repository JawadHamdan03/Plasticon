import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, RefreshControl, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../auth/AuthContext';
import { StatCard } from '../../components';
import { api } from '../../api/client';
import { colors, radius, shadow, spacing, typography } from '../../theme';

interface DashData {
  machinesTotal:     number;
  machinesOp:        number;
  openMaintenance:   number;
  qualityPassRate:   number;
  recentMaint:       { id: number; machine?: { name: string }; type: string; status: string; createdAt: string }[];
}

function AlertRow({ item }: { item: DashData['recentMaint'][0] }) {
  const statusColor = item.status === 'COMPLETED' ? colors.success
    : item.status === 'IN_PROGRESS' ? colors.info : colors.warning;
  return (
    <View style={styles.alertRow}>
      <View style={[styles.alertDot, { backgroundColor: statusColor }]} />
      <View style={styles.alertContent}>
        <Text style={styles.alertMachine} numberOfLines={1}>{item.machine?.name ?? `Maint #${item.id}`}</Text>
        <Text style={styles.alertType}>{item.type}</Text>
      </View>
      <View style={[styles.alertBadge, { backgroundColor: `${statusColor}18` }]}>
        <Text style={[styles.alertBadgeText, { color: statusColor }]}>{item.status}</Text>
      </View>
    </View>
  );
}

function QuickLink({ icon, label, color, onPress }: { icon: string; label: string; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.ql, { borderColor: `${color}30` }]} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.qlIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text style={[styles.qlLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function EngineerDashScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const firstName = (user?.fullName ?? 'Engineer').split(' ')[0];
  const [data, setData]       = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [machines, maint] = await Promise.allSettled([
        api.get<any>('/machines'),
        api.get<any>('/maintenance?limit=5'),
      ]);

      // Both endpoints return plain arrays or wrapped objects — handle both shapes
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

  useEffect(() => { void load(); }, [load]);

  if (loading) return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
      >
        <View style={styles.greeting}>
          <View>
            <Text style={styles.greetSub}>Engineer Dashboard</Text>
            <Text style={styles.greetName}>{firstName} ⚙️</Text>
          </View>
          <TouchableOpacity style={styles.analyticBtn} onPress={() => navigation.navigate('ProductionAnalytics')}>
            <Ionicons name="analytics" size={16} color={colors.primary} />
            <Text style={styles.analyticText}>Analytics</Text>
          </TouchableOpacity>
        </View>

        {/* KPI row */}
        <View style={styles.kpiRow}>
          <StatCard label="Machines OK"   value={`${data?.machinesOp ?? 0}/${data?.machinesTotal ?? 0}`} icon="hardware-chip" color={colors.success}  style={styles.kpi} />
          <StatCard label="Open Maint."   value={String(data?.openMaintenance ?? 0)}                     icon="construct"    color={colors.warning}  style={styles.kpi} />
        </View>
        <View style={styles.kpiRow}>
          <StatCard label="Quality Pass"  value={`${data?.qualityPassRate ?? 0}%`}                       icon="shield-checkmark" color={colors.info}  style={styles.kpi} />
          <StatCard label="Dept"          value={user?.department ?? '—'}                                icon="business"     color={colors.accent}   style={styles.kpi} />
        </View>

        {/* Quick links */}
        <Text style={styles.sectionLabel}>QUICK ACCESS</Text>
        <View style={styles.qlGrid}>
          <QuickLink icon="construct-outline"       label="Maintenance"  color={colors.warning}  onPress={() => navigation.navigate('Maintenance', { screen: 'MaintMenu' })} />
          <QuickLink icon="hardware-chip-outline"   label="Machines"     color={colors.primary}  onPress={() => navigation.navigate('Machines',    { screen: 'MachMenu'  })} />
          <QuickLink icon="shield-checkmark-outline" label="Quality"     color={colors.success}  onPress={() => navigation.navigate('Quality',     { screen: 'QualMenu'  })} />
          <QuickLink icon="chatbubble-ellipses-outline" label="AI Tools" color={colors.info}     onPress={() => navigation.navigate('Profile',     { screen: 'AIHub'     })} />
        </View>

        {/* Recent maintenance */}
        <Text style={styles.sectionLabel}>RECENT MAINTENANCE</Text>
        <View style={styles.alertCard}>
          {data?.recentMaint.length ? data.recentMaint.map((item) => (
            <AlertRow key={item.id} item={item} />
          )) : (
            <View style={styles.empty}>
              <Ionicons name="checkmark-circle-outline" size={28} color={colors.success} />
              <Text style={styles.emptyText}>No maintenance issues</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center' },

  greeting:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg, paddingTop: spacing.sm },
  greetSub:     { ...typography.bodySmall, color: colors.textMuted },
  greetName:    { ...typography.h2 },
  analyticBtn:  { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.primaryLight, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full },
  analyticText: { fontSize: 12, fontWeight: '700', color: colors.primary },

  kpiRow:       { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  kpi:          { flex: 1 },
  sectionLabel: { ...typography.sectionLabel, marginBottom: spacing.sm, marginTop: spacing.sm },

  qlGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  ql: {
    width: '47%', alignItems: 'center', paddingVertical: spacing.md,
    borderRadius: radius.lg, borderWidth: 1.5, backgroundColor: colors.surface, ...shadow.sm,
  },
  qlIcon:  { marginBottom: 6 },
  qlLabel: { fontSize: 11, fontWeight: '700' },

  alertCard: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden', ...shadow.sm },
  alertRow:  { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.sm },
  alertDot:  { width: 8, height: 8, borderRadius: 4 },
  alertContent: { flex: 1 },
  alertMachine: { ...typography.h4 },
  alertType:    { ...typography.caption, marginTop: 1 },
  alertBadge:   { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  alertBadgeText: { fontSize: 10, fontWeight: '700' },

  empty:     { padding: spacing.lg, alignItems: 'center', gap: spacing.sm },
  emptyText: { ...typography.bodySmall, color: colors.textMuted },
});
