import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
import { useLocale } from '../../context/LocaleContext';
  ActivityIndicator, Alert, FlatList, RefreshControl,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';

type Priority = 'CRITICAL' | 'HIGH' | 'NORMAL';
type Filter   = 'all' | 'open' | 'resolved';

interface StopAlert {
  id: number;
  machine_label: string;
  priority: Priority;
  reason: string;
  started_at: string;
  resolved_at?: string | null;
  response_minutes?: number | null;
  created_at: string;
  worker_id?: number;
  worker_name?: string | null;
  worker_username?: string | null;
}

const P_COLOR: Record<Priority, string> = {
  CRITICAL: '#EF4444',
  HIGH:     '#F97316',
  NORMAL:   '#EAB308',
};

function elapsed(isoStart: string, isoEnd?: string | null, isAr?: boolean) {
  const end = isoEnd ? new Date(isoEnd).getTime() : Date.now();
  const mins = Math.floor((end - new Date(isoStart).getTime()) / 60000);
  if (mins < 60) return `${mins}${'د'}`;
  return `${Math.floor(mins / 60)}${'س'} ${mins % 60}${'د'}`;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function AdminMachineStopsScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const today0 = new Date().toISOString().slice(0, 10);
  const month0 = new Date().toISOString().slice(0, 7) + '-01';
  const [stops, setStops]       = useState<StopAlert[]>([]);
  const [filter, setFilter]     = useState<Filter>('all');
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fromDate, setFromDate] = useState(month0);
  const [toDate,   setToDate]   = useState(today0);

  const load = useCallback(async (f: Filter = filter) => {
    try {
      const res = await api.get<StopAlert[]>(
        `/worker-tools/admin/machine-stop-alerts?status=${f}`,
      );
      setStops(Array.isArray(res) ? res : []);
    } catch { setStops([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, [filter]);

  useEffect(() => { void load(); }, [load]);

  const handleFilterChange = (f: Filter) => {
    setFilter(f);
    setLoading(true);
    void load(f);
  };

  const handleResolve = (stop: StopAlert) => {
    Alert.alert(
      'تأكيد الحل',
      isAr
        ? `هل تأكدت من حل توقف "${stop.machine_label}"؟`
        : `Confirm that "${stop.machine_label}" stop has been resolved?`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'نعم، تم الحل',
          onPress: async () => {
            try {
              await api.patch(`/worker-tools/admin/machine-stop-alerts/${stop.id}/resolve`, {});
              setStops(prev => prev.map(s =>
                s.id === stop.id
                  ? { ...s, resolved_at: new Date().toISOString() }
                  : s,
              ));
            } catch (e: any) {
              Alert.alert('خطأ', e.message ?? 'Failed');
            }
          },
        },
      ],
    );
  };

  const inRange = (d: string) => { const s = d.slice(0, 10); return (!fromDate || s >= fromDate) && (!toDate || s <= toDate); };
  const filteredStops = useMemo(() => stops.filter(s => inRange(s.created_at)), [stops, fromDate, toDate]); // eslint-disable-line
  const criticalOpen = filteredStops.filter(s => !s.resolved_at && s.priority === 'CRITICAL').length;
  const highOpen  = filteredStops.filter(s => !s.resolved_at && s.priority === 'HIGH').length;
  const totalOpen = filteredStops.filter(s => !s.resolved_at).length;

  const FILTERS: { key: Filter; label: string; labelAr: string }[] = [
    { key: 'all',      label: 'All',      labelAr: 'الكل' },
    { key: 'open',     label: 'Open',     labelAr: 'مفتوح' },
    { key: 'resolved', label: 'Resolved', labelAr: 'محلول' },
  ];

  const renderStop = ({ item }: { item: StopAlert }) => {
    const pColor   = P_COLOR[item.priority] ?? colors.warning;
    const resolved = !!item.resolved_at;
    const workerLabel = item.worker_name ?? item.worker_username ?? `#${item.worker_id ?? '?'}`;

    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderLeftColor: pColor, opacity: resolved ? 0.75 : 1 }]}>
        {/* Header row */}
        <View style={styles.cardHead}>
          <View style={[styles.priorityBadge, { backgroundColor: pColor + '20' }]}>
            <Ionicons
              name={item.priority === 'CRITICAL' ? 'alert-circle' : item.priority === 'HIGH' ? 'warning' : 'information-circle'}
              size={12} color={pColor}
            />
            <Text style={[styles.priorityText, { color: pColor }]}>{item.priority}</Text>
          </View>

          {resolved ? (
            <View style={[styles.statusBadge, { backgroundColor: colors.success + '18' }]}>
              <Ionicons name="checkmark-circle" size={12} color={colors.success} />
              <Text style={[styles.statusText, { color: colors.success }]}>
                {'محلول'}
                {item.response_minutes != null
                  ? ` · ${Math.round(item.response_minutes)}${'د'}`
                  : ''}
              </Text>
            </View>
          ) : (
            <View style={[styles.statusBadge, { backgroundColor: pColor + '15' }]}>
              <Ionicons name="time-outline" size={12} color={pColor} />
              <Text style={[styles.statusText, { color: pColor }]}>
                {elapsed(item.started_at, null, isAr)} {'منذ'}
              </Text>
            </View>
          )}
        </View>

        {/* Machine name */}
        <Text style={[styles.machineText, { color: colors.text }]}>{item.machine_label}</Text>

        {/* Reason */}
        <Text style={[styles.reasonText, { color: colors.textMuted }]} numberOfLines={3}>
          {item.reason}
        </Text>

        {/* Footer */}
        <View style={styles.cardFoot}>
          <View style={styles.footLeft}>
            <Ionicons name="person-outline" size={12} color={colors.textMuted} />
            <Text style={[styles.workerText, { color: colors.textMuted }]}>{workerLabel}</Text>
            <Text style={[styles.timeText, { color: colors.textMuted }]}>· {fmtTime(item.created_at)}</Text>
          </View>
          {!resolved && (
            <TouchableOpacity
              style={[styles.resolveBtn, { backgroundColor: colors.success + '15', borderColor: colors.success }]}
              onPress={() => handleResolve(item)}
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark" size={13} color={colors.success} />
              <Text style={[styles.resolveBtnText, { color: colors.success }]}>
                {'حُل'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title={'توقفات الآلات'}
        subtitle={`${totalOpen} ${'مفتوح'}`}
        showBack
      />

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: '#EF444415' }]}>
          <Text style={[styles.statNum, { color: '#EF4444' }]}>{criticalOpen}</Text>
          <Text style={[styles.statLbl, { color: '#EF4444' }]}>{'حرج'}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#F9731615' }]}>
          <Text style={[styles.statNum, { color: '#F97316' }]}>{highOpen}</Text>
          <Text style={[styles.statLbl, { color: '#F97316' }]}>{'عالٍ'}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.statNum, { color: colors.text }]}>{filteredStops.length}</Text>
          <Text style={[styles.statLbl, { color: colors.textMuted }]}>{'إجمالي'}</Text>
        </View>
      </View>

      {/* Date filter bar */}
      <View style={[styles.filterBar, { backgroundColor: colors.surface }]}>
        <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
        <TextInput
          style={[styles.filterInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
          value={fromDate} onChangeText={setFromDate}
          placeholder="From YYYY-MM-DD" placeholderTextColor={colors.textMuted}
        />
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>→</Text>
        <TextInput
          style={[styles.filterInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
          value={toDate} onChangeText={setToDate}
          placeholder="To YYYY-MM-DD" placeholderTextColor={colors.textMuted}
        />
        <TouchableOpacity onPress={() => { setFromDate(month0); setToDate(today0); }} style={[styles.filterReset, { borderColor: colors.border }]}>
          <Ionicons name="refresh-outline" size={13} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Status filter tabs */}
      <View style={[styles.filterRow, { borderColor: colors.border }]}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterTab, filter === f.key && { backgroundColor: colors.primary }]}
            onPress={() => handleFilterChange(f.key)}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterText, { color: filter === f.key ? '#fff' : colors.textMuted }]}>
              {isAr ? f.labelAr : f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.danger} /></View>
      ) : (
        <FlatList
          data={filteredStops}
          keyExtractor={(item, idx) => `${item.id}-${idx}`}
          renderItem={renderStop}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.danger} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="checkmark-circle-outline" size={48} color={colors.success} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {'لا توجد توقفات'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1 },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:        { padding: spacing.md, paddingBottom: 40 },
  filterBar:   { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingVertical: 8 },
  filterInput: { flex: 1, borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, fontSize: 13 },
  filterReset: { width: 30, height: 30, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },

  statsRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  statCard: { flex: 1, borderRadius: radius.md, padding: spacing.sm, alignItems: 'center', gap: 2, ...shadow.sm },
  statNum:  { fontSize: 22, fontWeight: '800' },
  statLbl:  { fontSize: 10, fontWeight: '700' },

  filterRow: { flexDirection: 'row', borderWidth: 1, borderRadius: radius.md, margin: spacing.md, marginTop: 0, overflow: 'hidden' },
  filterTab: { flex: 1, paddingVertical: 9, alignItems: 'center' },
  filterText:{ fontSize: 12, fontWeight: '700' },

  card:         { borderRadius: radius.lg, padding: spacing.md, borderLeftWidth: 3, marginBottom: spacing.sm, ...shadow.sm },
  cardHead:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  priorityBadge:{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  priorityText: { fontSize: 10, fontWeight: '800' },
  statusBadge:  { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  statusText:   { fontSize: 10, fontWeight: '700' },

  machineText: { ...typography.h4, marginBottom: 4 },
  reasonText:  { ...typography.bodySmall, marginBottom: 8 },

  cardFoot:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  footLeft:    { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  workerText:  { ...typography.caption, fontWeight: '600' },
  timeText:    { ...typography.caption },

  resolveBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, borderWidth: 1 },
  resolveBtnText: { fontSize: 11, fontWeight: '700' },

  empty:     { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText: { ...typography.bodySmall },
});
