import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

interface WorkerItem {
  id: number;
  feature: string;
  worker_name?: string;
  title?: string;
  details?: string;
  created_at: string;
}

interface OverviewSummary {
  stops: number;
  checklist: number;
  waste: number;
  target: number;
  kaizen: number;
  quality: number;
  micro: number;
  anomaly: number;
  total: number;
}

function ItemCard({ item }: { item: WorkerItem }) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();

  const FEATURE_META: Record<string, { icon: string; color: string; label: string }> = {
    stops:     { icon: 'stop-circle',  color: colors.danger,   label: isAr ? 'توقف آلة' : 'Machine Stop' },
    checklist: { icon: 'checkbox',     color: colors.success,  label: isAr ? 'قائمة تحقق' : 'Checklist' },
    waste:     { icon: 'trash',        color: colors.warning,  label: isAr ? 'هدر مواد' : 'Material Waste' },
    target:    { icon: 'flag',         color: colors.info,     label: isAr ? 'هدف يومي' : 'Daily Target' },
    kaizen:    { icon: 'bulb',         color: colors.accent,   label: isAr ? 'كايزن' : 'Kaizen' },
    quality:   { icon: 'shield',       color: colors.primary,  label: isAr ? 'مشكلة جودة' : 'Quality Issue' },
    micro:     { icon: 'pause-circle', color: colors.warning,  label: isAr ? 'توقف مؤقت' : 'Micro Stop' },
    anomaly:   { icon: 'warning',      color: colors.danger,   label: isAr ? 'شذوذ' : 'Anomaly' },
  };

  const meta = FEATURE_META[item.feature] ?? { icon: 'document', color: colors.textMuted, label: item.feature };
  const date = new Date(item.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={[styles.iconWrap, { backgroundColor: `${meta.color}15` }]}>
        <Ionicons name={meta.icon as any} size={18} color={meta.color} />
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text style={[styles.worker, { color: colors.text }]}>{item.worker_name ?? (isAr ? 'غير معروف' : 'Unknown')}</Text>
          <View style={[styles.badge, { backgroundColor: `${meta.color}15` }]}>
            <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>
        {item.title   && <Text style={[styles.title,   { color: colors.text }]}          numberOfLines={1}>{item.title}</Text>}
        {item.details && <Text style={[styles.details, { color: colors.textSecondary }]} numberOfLines={1}>{item.details}</Text>}
        <Text style={[styles.date, { color: colors.textMuted }]}>{date}</Text>
      </View>
    </View>
  );
}

export function WorkerRecordsScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const [items, setItems]       = useState<WorkerItem[]>([]);
  const [summary, setSummary]   = useState<OverviewSummary | null>(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const FEATURE_META_SUMMARY: Record<string, { icon: string; color: string; label: string }> = {
    stops:     { icon: 'stop-circle',  color: colors.danger,   label: isAr ? 'توقف آلة' : 'Machine Stop' },
    checklist: { icon: 'checkbox',     color: colors.success,  label: isAr ? 'قائمة تحقق' : 'Checklist' },
    waste:     { icon: 'trash',        color: colors.warning,  label: isAr ? 'هدر مواد' : 'Material Waste' },
    target:    { icon: 'flag',         color: colors.info,     label: isAr ? 'هدف يومي' : 'Daily Target' },
    kaizen:    { icon: 'bulb',         color: colors.accent,   label: isAr ? 'كايزن' : 'Kaizen' },
    quality:   { icon: 'shield',       color: colors.primary,  label: isAr ? 'مشكلة جودة' : 'Quality Issue' },
    micro:     { icon: 'pause-circle', color: colors.warning,  label: isAr ? 'توقف مؤقت' : 'Micro Stop' },
    anomaly:   { icon: 'warning',      color: colors.danger,   label: isAr ? 'شذوذ' : 'Anomaly' },
  };

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ summary: OverviewSummary; items: WorkerItem[] }>('/worker-tools/admin/overview?limit=100');
      if (res && typeof res === 'object' && !Array.isArray(res)) {
        setSummary(res.summary ?? null);
        setItems(Array.isArray(res.items) ? res.items : []);
      } else if (Array.isArray(res)) {
        setItems(res as WorkerItem[]);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title={isAr ? 'سجلات العمال' : 'Worker Records'}
        subtitle={summary ? `${summary.total} ${isAr ? 'مدخل' : 'entries'}` : `${items.length} ${isAr ? 'سجل' : 'records'}`}
        showBack
      />
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View> : (
        <FlatList
          data={items}
          keyExtractor={(i) => `${i.feature}-${i.id}`}
          renderItem={({ item }) => <ItemCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListHeaderComponent={summary ? (
            <View style={styles.summaryWrap}>
              {Object.entries(FEATURE_META_SUMMARY).map(([key, meta]) => {
                const count = (summary as any)[key] as number ?? 0;
                if (!count) return null;
                return (
                  <View key={key} style={[styles.summaryChip, { backgroundColor: `${meta.color}12` }]}>
                    <Ionicons name={meta.icon as any} size={12} color={meta.color} />
                    <Text style={[styles.summaryChipText, { color: meta.color }]}>{count} {meta.label}</Text>
                  </View>
                );
              })}
            </View>
          ) : null}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="document-outline" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>{isAr ? 'لا توجد سجلات عمال' : 'No worker records'}</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:            { flex: 1 },
  center:          { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:            { padding: spacing.md, paddingBottom: 40 },
  summaryWrap:     { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
  summaryChip:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full },
  summaryChipText: { fontSize: 11, fontWeight: '700' },
  card:            { flexDirection: 'row', alignItems: 'flex-start', borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, gap: spacing.sm, ...shadow.sm },
  iconWrap:        { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
  cardBody:        { flex: 1 },
  cardTop:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
  worker:          { ...typography.h4, flex: 1 },
  badge:           { paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.full, marginLeft: 4 },
  badgeText:       { fontSize: 9, fontWeight: '800' },
  title:           { ...typography.bodySmall, fontWeight: '600', marginBottom: 2 },
  details:         { ...typography.caption, marginBottom: 2 },
  date:            { ...typography.caption },
  empty:           { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText:       { ...typography.bodySmall },
});
