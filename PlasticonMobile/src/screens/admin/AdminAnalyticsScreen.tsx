import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { colors, radius, shadow, spacing, typography } from '../../theme';

interface Analytics {
  totalUsers?: number;
  activeUsers?: number;
  totalMachines?: number;
  operationalMachines?: number;
  totalShifts?: number;
  todayTotalHours?: number;
  thisMonthPayroll?: number;
  productionToday?: number;
  inventoryItems?: number;
  lowStockItems?: number;
}

const RANGES = ['Today', '7 Days', '30 Days', '90 Days'] as const;
type Range = typeof RANGES[number];

function rangeParams(range: Range) {
  const now  = new Date();
  const to   = now.toISOString().split('T')[0];
  const days = range === 'Today' ? 1 : range === '7 Days' ? 7 : range === '30 Days' ? 30 : 90;
  const from = new Date(now.getTime() - days * 86400_000).toISOString().split('T')[0];
  return `?from=${from}&to=${to}`;
}

function StatRow({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statRight}>
        <Text style={[styles.statValue, color ? { color } : null]}>{value}</Text>
        {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
      </View>
    </View>
  );
}

export function AdminAnalyticsScreen() {
  const [data, setData]         = useState<Analytics | null>(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [range, setRange]       = useState<Range>('Today');

  const load = useCallback(async (r: Range = range) => {
    try {
      const res = await api.get<Analytics>(`/dashboard/analytics${rangeParams(r)}`);
      setData(res && typeof res === 'object' ? res : {});
    } catch {
      setData({});
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [range]);

  useEffect(() => { void load(); }, [load]);

  const changeRange = (r: Range) => {
    setRange(r);
    setLoading(true);
    void load(r);
  };

  const fmt = (n?: number) => {
    if (!n) return '$0';
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
    return `$${n.toLocaleString()}`;
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Analytics" showBack />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
      >
        {/* Date range filter */}
        <View style={styles.rangeRow}>
          {RANGES.map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.rangeBtn, range === r && styles.rangeBtnActive]}
              onPress={() => changeRange(r)}
              activeOpacity={0.7}
            >
              <Text style={[styles.rangeTxt, range === r && styles.rangeTxtActive]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
        ) : (
          <>
            {/* People */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="people" size={16} color={colors.primary} />
                <Text style={styles.cardTitle}>People</Text>
              </View>
              <StatRow label="Total Users"      value={String(data?.totalUsers ?? 0)} />
              <StatRow label="Active Users"     value={String(data?.activeUsers ?? 0)}     color={colors.success} />
              <StatRow label="Total Shifts"     value={String(data?.totalShifts ?? 0)} />
              <StatRow label="Hours Logged Today" value={`${data?.todayTotalHours ?? 0}h`} color={colors.info} />
            </View>

            {/* Production */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="cube" size={16} color={colors.info} />
                <Text style={styles.cardTitle}>Production</Text>
              </View>
              <StatRow label="Output Today"     value={(data?.productionToday ?? 0).toLocaleString()} color={colors.primary} sub="units" />
            </View>

            {/* Machines */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="hardware-chip" size={16} color={colors.warning} />
                <Text style={styles.cardTitle}>Machines</Text>
              </View>
              <StatRow label="Total Machines"       value={String(data?.totalMachines ?? 0)} />
              <StatRow label="Operational"          value={String(data?.operationalMachines ?? 0)} color={colors.success} />
              <StatRow
                label="Uptime Rate"
                value={data?.totalMachines ? `${Math.round(((data?.operationalMachines ?? 0) / data.totalMachines) * 100)}%` : '—'}
                color={colors.info}
              />
            </View>

            {/* Finance */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="cash" size={16} color={colors.success} />
                <Text style={styles.cardTitle}>Finance</Text>
              </View>
              <StatRow label="Payroll (month)" value={fmt(data?.thisMonthPayroll)} color={colors.warning} />
            </View>

            {/* Inventory */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="archive" size={16} color={colors.accent} />
                <Text style={styles.cardTitle}>Inventory</Text>
              </View>
              <StatRow label="Total Items"  value={String(data?.inventoryItems ?? 0)} />
              <StatRow label="Low Stock"    value={String(data?.lowStockItems ?? 0)}  color={data?.lowStockItems ? colors.danger : colors.success} />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: colors.background },
  center:         { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  content:        { padding: spacing.md, paddingBottom: 40 },
  rangeRow:       { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md },
  rangeBtn:       { flex: 1, paddingVertical: 8, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, alignItems: 'center', backgroundColor: colors.surface },
  rangeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  rangeTxt:       { ...typography.caption, fontWeight: '600', color: colors.textMuted },
  rangeTxtActive: { color: '#fff' },
  card:           { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardHeader:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  cardTitle:      { ...typography.h4 },
  statRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.border },
  statLabel:      { ...typography.bodySmall, color: colors.textSecondary },
  statRight:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statValue:      { ...typography.bodySmall, fontWeight: '700', color: colors.text },
  statSub:        { ...typography.caption, color: colors.textMuted },
});
