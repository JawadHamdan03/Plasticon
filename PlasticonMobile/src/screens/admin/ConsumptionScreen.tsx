import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, RefreshControl, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { colors, radius, shadow, spacing, typography } from '../../theme';

interface ConsumptionRecord {
  id:           string;
  materialName: string;
  quantity:     number;
  unit:         string;
  date:         string;
  shift?:       string;
  productLine?: string;
}

interface ConsumptionData {
  records:      ConsumptionRecord[];
  totalToday?:  number;
  totalWeek?:   number;
  totalMonth?:  number;
}

export function ConsumptionScreen() {
  const [data,       setData]       = useState<ConsumptionData | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const raw = await api.get<{ id: number; type: string; quantity: number; material?: { name: string; unit: string }; createdAt: string }[]>('/inventory/transactions/all');
      const rows = (Array.isArray(raw) ? raw : []).filter((r) => r.type === 'OUT');
      setData({
        records: rows.map((r) => ({
          id:           String(r.id),
          materialName: r.material?.name ?? `Material #${r.id}`,
          quantity:     r.quantity,
          unit:         r.material?.unit ?? 'units',
          date:         r.createdAt,
        })),
      });
    } catch {
      setData({ records: [] });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const records = data?.records ?? [];

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Consumption" subtitle="Raw material usage tracking" />
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
        >
          {/* Summary row */}
          <View style={styles.kpiRow}>
            <View style={[styles.kpi, { borderColor: `${colors.primary}40` }]}>
              <Text style={styles.kpiVal}>{data?.totalToday ?? records.length}</Text>
              <Text style={styles.kpiLabel}>Today</Text>
            </View>
            <View style={[styles.kpi, { borderColor: `${colors.info}40` }]}>
              <Text style={[styles.kpiVal, { color: colors.info }]}>{data?.totalWeek ?? '—'}</Text>
              <Text style={styles.kpiLabel}>This Week</Text>
            </View>
            <View style={[styles.kpi, { borderColor: `${colors.success}40` }]}>
              <Text style={[styles.kpiVal, { color: colors.success }]}>{data?.totalMonth ?? '—'}</Text>
              <Text style={styles.kpiLabel}>This Month</Text>
            </View>
          </View>

          {/* Records list */}
          <Text style={styles.sectionTitle}>Recent Consumption</Text>
          {records.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="cube-outline" size={40} color={colors.textMuted} />
              <Text style={styles.emptyText}>No consumption records found</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {records.map((r, idx) => (
                <View key={`${r.id}-${idx}`} style={styles.card}>
                  <View style={styles.cardIcon}>
                    <Ionicons name="cube" size={20} color={colors.warning} />
                  </View>
                  <View style={styles.cardBody}>
                    <Text style={styles.cardTitle}>{r.materialName}</Text>
                    <Text style={styles.cardSub}>
                      {r.quantity} {r.unit}{r.productLine ? ` · ${r.productLine}` : ''}
                    </Text>
                    {r.date ? <Text style={styles.cardDate}>{new Date(r.date).toLocaleDateString()}</Text> : null}
                  </View>
                  {r.shift ? (
                    <View style={styles.shiftBadge}>
                      <Text style={styles.shiftText}>{r.shift}</Text>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: colors.background },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content:      { padding: spacing.md, paddingBottom: 40 },
  kpiRow:       { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  kpi:          { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1.5, padding: spacing.md, alignItems: 'center', ...shadow.sm },
  kpiVal:       { ...typography.h2, color: colors.primary },
  kpiLabel:     { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  sectionTitle: { ...typography.h4, marginBottom: spacing.sm },
  empty:        { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.sm },
  emptyText:    { ...typography.bodySmall, color: colors.textMuted },
  list:         { gap: spacing.sm },
  card:         { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm, ...shadow.sm },
  cardIcon:     { width: 40, height: 40, borderRadius: radius.md, backgroundColor: `${colors.warning}15`, alignItems: 'center', justifyContent: 'center' },
  cardBody:     { flex: 1 },
  cardTitle:    { ...typography.h4 },
  cardSub:      { ...typography.bodySmall, color: colors.textMuted, marginTop: 2 },
  cardDate:     { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  shiftBadge:   { backgroundColor: `${colors.info}15`, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.sm },
  shiftText:    { fontSize: 11, fontWeight: '700', color: colors.info },
});
