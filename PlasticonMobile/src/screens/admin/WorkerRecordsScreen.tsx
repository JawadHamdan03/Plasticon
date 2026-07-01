import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
import { useLocale } from '../../context/LocaleContext';
  ActivityIndicator, FlatList, RefreshControl,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';

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
  quality: number;
  micro: number;
  anomaly: number;
  total: number;
}

function ItemCard({ item }: { item: WorkerItem }) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();

  const FEATURE_META: Record<string, { icon: string; color: string; label: string }> = {
    stops:     { icon: 'stop-circle',  color: colors.danger,   label: 'توقف آلة' },
    checklist: { icon: 'checkbox',     color: colors.success,  label: 'قائمة تحقق' },
    waste:     { icon: 'trash',        color: colors.warning,  label: 'هدر مواد' },
    target:    { icon: 'flag',         color: colors.info,     label: 'هدف يومي' },
    quality:   { icon: 'shield',       color: colors.primary,  label: 'مشكلة جودة' },
    micro:     { icon: 'pause-circle', color: colors.warning,  label: 'توقف مؤقت' },
    anomaly:   { icon: 'warning',      color: colors.danger,   label: 'شذوذ' },
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
          <Text style={[styles.worker, { color: colors.text }]}>{item.worker_name ?? ('غير معروف')}</Text>
          <View style={[styles.badge, { backgroundColor: `${meta.color}15` }]}>
            <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>
        {item.title   && <Text style={[styles.title,   { color: colors.text }]}          numberOfLines={1}>{item.title}</Text>}
        {item.details && <Text style={[styles.details, { color: colors.textMuted }]} numberOfLines={1}>{item.details}</Text>}
        <Text style={[styles.date, { color: colors.textMuted }]}>{date}</Text>
      </View>
    </View>
  );
}

const FEATURE_KEYS = ['stops','checklist','waste','target','quality','micro','anomaly'] as const;

export function WorkerRecordsScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const [items, setItems]             = useState<WorkerItem[]>([]);
  const [summary, setSummary]         = useState<OverviewSummary | null>(null);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  const [search, setSearch]           = useState('');

  const FEATURE_META: Record<string, { icon: string; color: string; label: string; labelAr: string }> = {
    stops:     { icon: 'stop-circle',  color: colors.danger,   label: 'Machine Stop',  labelAr: 'توقف آلة' },
    checklist: { icon: 'checkbox',     color: colors.success,  label: 'Checklist',     labelAr: 'قائمة تحقق' },
    waste:     { icon: 'trash',        color: colors.warning,  label: 'Material Waste', labelAr: 'هدر مواد' },
    target:    { icon: 'flag',         color: colors.info,     label: 'Daily Target',  labelAr: 'هدف يومي' },
    quality:   { icon: 'shield',       color: colors.primary,  label: 'Quality Issue', labelAr: 'مشكلة جودة' },
    micro:     { icon: 'pause-circle', color: colors.warning,  label: 'Micro Stop',    labelAr: 'توقف مؤقت' },
    anomaly:   { icon: 'warning',      color: colors.danger,   label: 'Anomaly',       labelAr: 'شذوذ' },
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

  const filtered = useMemo(() => {
    let result = items;
    if (activeFeature) {
      result = result.filter((i) => i.feature === activeFeature);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((i) => (i.worker_name ?? '').toLowerCase().includes(q) || (i.title ?? '').toLowerCase().includes(q));
    }
    return result;
  }, [items, activeFeature, search]);

  const FilterBar = (
    <View style={styles.filterWrap}>
      <View style={[styles.searchRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={16} color={colors.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder={'بحث باسم العامل...'}
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.chipsRow}>
        <TouchableOpacity
          style={[styles.chip, !activeFeature && { backgroundColor: colors.primary }]}
          onPress={() => setActiveFeature(null)}
        >
          <Text style={[styles.chipText, { color: !activeFeature ? '#fff' : colors.textMuted }]}>
            {'الكل'}
          </Text>
        </TouchableOpacity>
        {FEATURE_KEYS.map((key) => {
          const meta = FEATURE_META[key];
          const active = activeFeature === key;
          const count = summary ? (summary as any)[key] as number ?? 0 : 0;
          if (summary && !count) return null;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.chip, active && { backgroundColor: meta.color }]}
              onPress={() => setActiveFeature(active ? null : key)}
            >
              <Ionicons name={meta.icon as any} size={11} color={active ? '#fff' : meta.color} />
              <Text style={[styles.chipText, { color: active ? '#fff' : meta.color }]}>
                {isAr ? meta.labelAr : meta.label}
                {count ? ` (${count})` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title={'سجلات العمال'}
        subtitle={`${filtered.length} / ${items.length} ${'سجل'}`}
        showBack
      />
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View> : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => `${i.feature}-${i.id}`}
          renderItem={({ item }) => <ItemCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListHeaderComponent={FilterBar}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="document-outline" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>{'لا توجد سجلات'}</Text>
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

  filterWrap:  { marginBottom: spacing.md, gap: spacing.sm },
  searchRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.sm, paddingVertical: 8 },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  chipsRow:    { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  chip:        { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, backgroundColor: '#e5e7eb' },
  chipText:    { fontSize: 11, fontWeight: '700' },

  card:      { flexDirection: 'row', alignItems: 'flex-start', borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, gap: spacing.sm, ...shadow.sm },
  iconWrap:  { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
  cardBody:  { flex: 1 },
  cardTop:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
  worker:    { ...typography.h4, flex: 1 },
  badge:     { paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.full, marginLeft: 4 },
  badgeText: { fontSize: 9, fontWeight: '800' },
  title:     { ...typography.bodySmall, fontWeight: '600', marginBottom: 2 },
  details:   { ...typography.caption, marginBottom: 2 },
  date:      { ...typography.caption },
  empty:     { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText: { ...typography.bodySmall },
});
