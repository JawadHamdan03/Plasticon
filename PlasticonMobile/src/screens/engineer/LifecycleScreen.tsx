import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

interface HealthRecord {
  id: number;
  machine?: { id: number; name: string; type?: string };
  operationalStatus: string;
  efficiencyRating: number;
  maintenanceHours: number;
  downtimePercentage: number;
  notes?: string | null;
  recordedAt: string;
}

function healthScore(rec: HealthRecord): number {
  return Math.round(rec.efficiencyRating * 0.6 + (100 - rec.downtimePercentage) * 0.4);
}

function LifecycleCard({ item }: { item: HealthRecord }) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();

  const STATUS_META: Record<string, { color: string; label: string; labelAr: string }> = {
    OPERATIONAL:       { color: colors.success, label: 'Operational',       labelAr: 'تشغيلي' },
    MAINTENANCE:       { color: colors.warning, label: 'Maintenance',       labelAr: 'صيانة' },
    UNDER_MAINTENANCE: { color: colors.warning, label: 'Under Maintenance', labelAr: 'تحت الصيانة' },
    BROKEN:            { color: colors.danger,  label: 'Broken',            labelAr: 'معطل' },
    OFFLINE:           { color: colors.textMuted, label: 'Offline',         labelAr: 'غير متصل' },
  };

  const meta  = STATUS_META[item.operationalStatus] ?? STATUS_META.OFFLINE;
  const score = healthScore(item);
  const scoreColor = score >= 80 ? colors.success : score >= 60 ? colors.warning : colors.danger;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.machineName, { color: colors.text }]} numberOfLines={1}>{item.machine?.name ?? `Machine #${item.id}`}</Text>
          {item.machine?.type ? <Text style={[styles.machineType, { color: colors.textMuted }]}>{item.machine.type}</Text> : null}
        </View>
        <View style={[styles.scoreBadge, { backgroundColor: `${scoreColor}18`, borderColor: `${scoreColor}40` }]}>
          <Text style={[styles.scoreText, { color: scoreColor }]}>{score}</Text>
          <Text style={[styles.scoreLabel, { color: colors.textMuted }]}>{isAr ? 'نقاط' : 'score'}</Text>
        </View>
      </View>

      <View style={styles.barRow}>
        <Text style={[styles.barLabel, { color: colors.textMuted }]}>{isAr ? 'الصحة' : 'Health'}</Text>
        <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
          <View style={[styles.barFill, { width: `${score}%`, backgroundColor: scoreColor }]} />
        </View>
        <Text style={[styles.barValue, { color: scoreColor }]}>{score}%</Text>
      </View>

      <View style={[styles.metrics, { borderTopColor: colors.border }]}>
        <View style={styles.metric}>
          <Text style={[styles.metricVal, { color: colors.text }]}>{item.efficiencyRating}%</Text>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>{isAr ? 'الكفاءة' : 'Efficiency'}</Text>
        </View>
        <View style={styles.metric}>
          <Text style={[styles.metricVal, { color: colors.text }]}>{item.maintenanceHours}h</Text>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>{isAr ? 'ساعات الصيانة' : 'Maint. Hrs'}</Text>
        </View>
        <View style={styles.metric}>
          <View style={[styles.statusDot, { backgroundColor: meta.color }]} />
          <Text style={[styles.metricLabel, { color: meta.color, fontWeight: '600' }]}>{isAr ? meta.labelAr : meta.label}</Text>
        </View>
      </View>
    </View>
  );
}

export function LifecycleScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const [records, setRecords]   = useState<HealthRecord[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(false);

  const load = useCallback(async () => {
    try {
      const [res, attRes] = await Promise.all([
        api.get<{ records: HealthRecord[] }>('/machine-health?limit=40'),
        api.get<any>('/attendance/me').catch(() => []),
      ]);
      setRecords(Array.isArray(res) ? res : (res.records ?? []));
      const attList: any[] = Array.isArray(attRes) ? attRes : (attRes?.data ?? []);
      setIsCheckedIn(attList.some((r: any) => !r.checkOut));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={isAr ? 'تتبع دورة الحياة' : 'Lifecycle Tracking'} subtitle={isAr ? 'نقاط صحة المعدات' : 'Equipment health scores'} showBack />
      {!isCheckedIn && !loading && (
        <View style={[styles.banner, { backgroundColor: `${colors.warning}15`, borderColor: `${colors.warning}50` }]}>
          <Ionicons name="warning-outline" size={16} color={colors.warning} />
          <Text style={[styles.bannerText, { color: colors.warning }]}>
            {isAr ? 'يجب تسجيل الدخول لتسجيل بيانات المعدات' : 'Check in to record equipment data'}
          </Text>
        </View>
      )}
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(i, idx) => `${String(i.id)}-${idx}`}
          renderItem={({ item }) => <LifecycleCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="refresh-circle-outline" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>{isAr ? 'لا توجد بيانات دورة حياة' : 'No lifecycle data'}</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1 },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:    { padding: spacing.md, paddingBottom: 40 },
  card:    { borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  header:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  headerLeft: { flex: 1, marginRight: spacing.sm },
  machineName: { ...typography.h3 },
  machineType: { ...typography.caption, marginTop: 2 },
  scoreBadge: { alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.md, borderWidth: 1 },
  scoreText:  { fontSize: 22, fontWeight: '800' },
  scoreLabel: { ...typography.caption, marginTop: 1 },
  barRow:    { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  barLabel:  { ...typography.caption, width: 40 },
  barTrack:  { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  barFill:   { height: '100%', borderRadius: 3 },
  barValue:  { ...typography.caption, fontWeight: '700', width: 32, textAlign: 'right' },
  metrics:   { flexDirection: 'row', justifyContent: 'space-around', paddingTop: spacing.sm, borderTopWidth: 1 },
  metric:    { alignItems: 'center', gap: 2 },
  metricVal: { ...typography.h4 },
  metricLabel: { ...typography.caption },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  empty:     { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText: { ...typography.bodySmall },
  banner:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: spacing.md, marginBottom: 4, paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1 },
  bannerText: { fontSize: 13, fontWeight: '600', flex: 1 },
});
