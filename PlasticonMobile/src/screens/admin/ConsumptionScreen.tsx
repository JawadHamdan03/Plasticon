import React, { useCallback, useEffect, useState } from 'react';
import {
import { useLocale } from '../../context/LocaleContext';
  ActivityIndicator, RefreshControl, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';

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
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
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
          materialName: r.material?.name ?? `${'مادة'} #${r.id}`,
          quantity:     r.quantity,
          unit:         r.material?.unit ?? ('وحدة'),
          date:         r.createdAt,
        })),
      });
    } catch {
      setData({ records: [] });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAr]);

  useEffect(() => { void load(); }, [load]);

  const records = data?.records ?? [];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={'الاستهلاك'} subtitle={'تتبع استخدام المواد الخام'} showBack />
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
            <View style={[styles.kpi, { backgroundColor: colors.surface, borderColor: `${colors.primary}40` }]}>
              <Text style={[styles.kpiVal, { color: colors.primary }]}>{data?.totalToday ?? records.length}</Text>
              <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>{'اليوم'}</Text>
            </View>
            <View style={[styles.kpi, { backgroundColor: colors.surface, borderColor: `${colors.info}40` }]}>
              <Text style={[styles.kpiVal, { color: colors.info }]}>{data?.totalWeek ?? '—'}</Text>
              <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>{'هذا الأسبوع'}</Text>
            </View>
            <View style={[styles.kpi, { backgroundColor: colors.surface, borderColor: `${colors.success}40` }]}>
              <Text style={[styles.kpiVal, { color: colors.success }]}>{data?.totalMonth ?? '—'}</Text>
              <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>{'هذا الشهر'}</Text>
            </View>
          </View>

          {/* Records list */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{'الاستهلاك الأخير'}</Text>
          {records.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="cube-outline" size={40} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>{'لا توجد سجلات استهلاك'}</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {records.map((r, idx) => (
                <View key={`${r.id}-${idx}`} style={[styles.card, { backgroundColor: colors.surface }]}>
                  <View style={[styles.cardIcon, { backgroundColor: `${colors.warning}15` }]}>
                    <Ionicons name="cube" size={20} color={colors.warning} />
                  </View>
                  <View style={styles.cardBody}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>{r.materialName}</Text>
                    <Text style={[styles.cardSub, { color: colors.textMuted }]}>
                      {r.quantity} {r.unit}{r.productLine ? ` · ${r.productLine}` : ''}
                    </Text>
                    {r.date ? <Text style={[styles.cardDate, { color: colors.textMuted }]}>{new Date(r.date).toLocaleDateString()}</Text> : null}
                  </View>
                  {r.shift ? (
                    <View style={[styles.shiftBadge, { backgroundColor: `${colors.info}15` }]}>
                      <Text style={[styles.shiftText, { color: colors.info }]}>{r.shift}</Text>
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
  safe:         { flex: 1 },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content:      { padding: spacing.md, paddingBottom: 40 },
  kpiRow:       { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  kpi:          { flex: 1, borderRadius: radius.lg, borderWidth: 1.5, padding: spacing.md, alignItems: 'center', ...shadow.sm },
  kpiVal:       { ...typography.h2 },
  kpiLabel:     { ...typography.caption, marginTop: 2 },
  sectionTitle: { ...typography.h4, marginBottom: spacing.sm },
  empty:        { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.sm },
  emptyText:    { ...typography.bodySmall },
  list:         { gap: spacing.sm },
  card:         { flexDirection: 'row', alignItems: 'center', borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm, ...shadow.sm },
  cardIcon:     { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  cardBody:     { flex: 1 },
  cardTitle:    { ...typography.h4 },
  cardSub:      { ...typography.bodySmall, marginTop: 2 },
  cardDate:     { ...typography.caption, marginTop: 2 },
  shiftBadge:   { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.sm },
  shiftText:    { fontSize: 11, fontWeight: '700' },
});
