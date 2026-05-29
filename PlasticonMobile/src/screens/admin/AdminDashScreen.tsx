import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../api/client';
import { ScreenHeader, StatCard } from '../../components';
import { colors, radius, shadow, spacing, typography } from '../../theme';

interface DashData {
  totalUsers?:         number;
  totalMachines?:      number;
  activeMachines?:     number;
  openMaintenance?:    number;
  pendingApprovals?:   number;
  todayProduction?:    number;
  qualityPassRate?:    number;
  pendingRegistrations?: number;
}

export function AdminDashScreen() {
  const [data, setData]         = useState<DashData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation<any>();

  const load = useCallback(async () => {
    try {
      const res = await api.get<DashData>('/dashboard');
      setData(res);
    } catch {
      setData({});
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const shortcuts = [
    { icon: 'people',        label: 'Users',     color: colors.primary, tab: 'More',       screen: 'Users' },
    { icon: 'hardware-chip', label: 'Machines',  color: colors.info,    tab: 'Operations', screen: 'Machines' },
    { icon: 'shield',        label: 'Audit',     color: colors.warning, tab: 'More',       screen: 'AuditLogs' },
    { icon: 'person-add',    label: 'Requests',  color: colors.success, tab: 'More',       screen: 'Registrations' },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Admin Dashboard" />
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View> : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
        >
          <View style={styles.kpiRow}>
            <StatCard label="Total Users"   value={String(data?.totalUsers ?? 0)}   icon="people"        color={colors.primary} style={styles.kpi} />
            <StatCard label="Machines"      value={String(data?.totalMachines ?? 0)} icon="hardware-chip" color={colors.info}    style={styles.kpi} />
          </View>
          <View style={styles.kpiRow}>
            <StatCard label="Open Maint."   value={String(data?.openMaintenance ?? 0)}  icon="construct"      color={colors.warning} style={styles.kpi} />
            <StatCard label="Pass Rate"     value={`${data?.qualityPassRate ?? 0}%`}    icon="shield-checkmark" color={colors.success} style={styles.kpi} />
          </View>
          <View style={styles.kpiRow}>
            <StatCard label="Today Output"  value={String(data?.todayProduction ?? 0)} icon="cube"           color={colors.accent}  style={styles.kpi} />
            <StatCard label="Pending Regs." value={String(data?.pendingRegistrations ?? 0)} icon="person-add" color={data?.pendingRegistrations ? colors.danger : colors.textMuted} style={styles.kpi} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Access</Text>
            <View style={styles.shortcuts}>
              {shortcuts.map((s) => (
                <TouchableOpacity
                  key={s.screen}
                  style={[styles.shortcut, { backgroundColor: `${s.color}12` }]}
                  onPress={() => navigation.navigate(s.tab, { screen: s.screen })}
                  activeOpacity={0.75}
                >
                  <Ionicons name={s.icon as any} size={24} color={s.color} />
                  <Text style={[styles.shortcutLabel, { color: s.color }]}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: colors.background },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content:      { padding: spacing.md, paddingBottom: 40 },
  kpiRow:       { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  kpi:          { flex: 1 },
  section:      { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginTop: spacing.md, ...shadow.sm },
  sectionTitle: { ...typography.h4, marginBottom: spacing.md },
  shortcuts:    { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  shortcut:     { width: '47%', alignItems: 'center', paddingVertical: 16, borderRadius: radius.md, gap: 6 },
  shortcutLabel: { fontSize: 12, fontWeight: '700' },
});
