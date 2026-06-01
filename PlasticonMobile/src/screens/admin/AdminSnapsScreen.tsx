import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, Image, RefreshControl,
  StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { radius, shadow, spacing, typography } from '../../theme';
import { API_BASE } from '../../config';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

interface Snapshot {
  id: number;
  machineLabel?: string;
  machineCounter?: number;
  electricityKwh?: number;
  notes?: string | null;
  machineCounterImage?: string | null;
  electricityImage?: string | null;
  createdAt: string;
  createdBy?: { id: number; fullName: string } | null;
  createdByName?: string;
}

function toImageUri(stored?: string | null): string | null {
  if (!stored) return null;
  return `${API_BASE}/${stored.replace(/^prisma\/?pictures\//, 'pictures/')}`;
}

function fmtDT(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function SnapCard({
  item, prev, colors, isAr,
}: {
  item: Snapshot; prev?: Snapshot; colors: any; isAr: boolean;
}) {
  const workerName = item.createdBy?.fullName ?? item.createdByName ?? `${isAr ? 'عامل' : 'Worker'} #${item.id}`;
  const delta = (prev?.machineCounter != null && item.machineCounter != null)
    ? item.machineCounter - prev.machineCounter : null;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.cardTop}>
        <View style={[styles.avatar, { backgroundColor: `${colors.primary}20` }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>{workerName.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={[styles.workerName, { color: colors.text }]}>{workerName}</Text>
          <Text style={[styles.time, { color: colors.textMuted }]}>{fmtDT(item.createdAt)}</Text>
          {item.machineLabel && (
            <View style={[styles.machinePill, { backgroundColor: `${colors.primary}15` }]}>
              <Ionicons name="hardware-chip-outline" size={11} color={colors.primary} />
              <Text style={[styles.machineText, { color: colors.primary }]}>{item.machineLabel}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.metricsRow}>
        {item.machineCounter != null && (
          <View style={[styles.metricBox, { backgroundColor: `${colors.info}10` }]}>
            <Ionicons name="speedometer-outline" size={14} color={colors.info} />
            <Text style={[styles.metricVal, { color: colors.text }]}>{item.machineCounter.toLocaleString()}</Text>
            <Text style={[styles.metricLbl, { color: colors.textMuted }]}>{isAr ? 'عداد' : 'Counter'}</Text>
            {delta !== null && (
              <Text style={[styles.delta, { color: delta >= 0 ? colors.success : colors.warning }]}>
                {delta >= 0 ? '+' : ''}{delta.toLocaleString()}
              </Text>
            )}
          </View>
        )}
        {item.electricityKwh != null && (
          <View style={[styles.metricBox, { backgroundColor: `${colors.warning}10` }]}>
            <Ionicons name="flash-outline" size={14} color={colors.warning} />
            <Text style={[styles.metricVal, { color: colors.warning }]}>{item.electricityKwh}</Text>
            <Text style={[styles.metricLbl, { color: colors.textMuted }]}>kWh</Text>
          </View>
        )}
      </View>

      {item.notes ? (
        <Text style={[styles.notes, { color: colors.textMuted, borderTopColor: colors.border }]} numberOfLines={2}>
          {item.notes}
        </Text>
      ) : null}

      {(item.machineCounterImage || item.electricityImage) && (
        <View style={styles.photoRow}>
          {toImageUri(item.machineCounterImage) ? (
            <View style={styles.photoWrap}>
              <Image source={{ uri: toImageUri(item.machineCounterImage)! }} style={[styles.photo, { backgroundColor: colors.border }]} resizeMode="cover" />
              <View style={styles.photoTag}><Text style={styles.photoTagText}>{isAr ? 'عداد' : 'Counter'}</Text></View>
            </View>
          ) : null}
          {toImageUri(item.electricityImage) ? (
            <View style={styles.photoWrap}>
              <Image source={{ uri: toImageUri(item.electricityImage)! }} style={[styles.photo, { backgroundColor: colors.border }]} resizeMode="cover" />
              <View style={styles.photoTag}><Text style={styles.photoTagText}>{isAr ? 'كهرباء' : 'Electric'}</Text></View>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

export function AdminSnapsScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const [snaps, setSnaps]     = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<Snapshot[] | { items: Snapshot[] }>('/settings/snapshots?limit=50');
      const raw = Array.isArray(res) ? res : ((res as any).items ?? []);
      setSnaps(raw);
    } catch {
      setSnaps([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const totalKwh     = snaps.reduce((s, r) => s + (r.electricityKwh ?? 0), 0);
  const totalCounter = snaps.reduce((s, r) => s + (r.machineCounter ?? 0), 0);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title={isAr ? 'لقطات الإدارة' : 'Admin Snapshots'}
        subtitle={`${snaps.length} ${isAr ? 'سجل' : 'records'}`}
        showBack
      />

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={snaps}
          keyExtractor={(item, idx) => `${item.id}-${idx}`}
          renderItem={({ item, index }) => (
            <SnapCard
              item={item}
              prev={snaps[index + 1]}
              colors={colors}
              isAr={isAr}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />
          }
          ListHeaderComponent={
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
                <Ionicons name="flash" size={20} color={colors.warning} />
                <Text style={[styles.statVal, { color: colors.warning }]}>{totalKwh.toFixed(1)}</Text>
                <Text style={[styles.statLbl, { color: colors.textMuted }]}>kWh</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
                <Ionicons name="speedometer" size={20} color={colors.info} />
                <Text style={[styles.statVal, { color: colors.info }]}>{totalCounter.toLocaleString()}</Text>
                <Text style={[styles.statLbl, { color: colors.textMuted }]}>{isAr ? 'إجمالي العداد' : 'Total Counter'}</Text>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="camera-outline" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {isAr ? 'لا توجد لقطات مسجلة' : 'No snapshots recorded'}
              </Text>
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

  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  statCard: { flex: 1, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', gap: 4, ...shadow.sm },
  statVal:  { fontSize: 20, fontWeight: '800' },
  statLbl:  { ...typography.caption, textAlign: 'center' },

  card:       { borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardTop:    { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: 8 },
  avatar:     { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { fontSize: 15, fontWeight: '700' },
  cardInfo:   { flex: 1, gap: 3 },
  workerName: { ...typography.h4 },
  time:       { ...typography.caption },
  machinePill:{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, alignSelf: 'flex-start' },
  machineText:{ fontSize: 11, fontWeight: '700' },

  metricsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: 8 },
  metricBox:  { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radius.md, gap: 2 },
  metricVal:  { fontSize: 18, fontWeight: '800' },
  metricLbl:  { ...typography.caption },
  delta:      { fontSize: 11, fontWeight: '700' },

  notes:   { ...typography.bodySmall, borderTopWidth: 1, paddingTop: 6, fontStyle: 'italic' },

  photoRow:  { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  photoWrap: { flex: 1, position: 'relative' },
  photo:     { width: '100%', height: 90, borderRadius: radius.sm },
  photoTag:  { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', borderBottomLeftRadius: radius.sm, borderBottomRightRadius: radius.sm, paddingVertical: 3, alignItems: 'center' },
  photoTagText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  empty:     { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText: { ...typography.bodySmall },

});
