import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { RawMaterial } from '../../api/types';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

interface AlertRecord {
  id: number;
  material?: RawMaterial;
  materialName?: string;
  alertType?: string;
  message?: string;
  currentStock?: number;
  minStock?: number;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  isResolved?: boolean;
  createdAt: string;
}

function AlertCard({ item }: { item: AlertRecord }) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();

  const SEV_META: Record<string, { color: string; icon: string }> = {
    LOW:      { color: colors.info,    icon: 'information-circle' },
    MEDIUM:   { color: colors.warning, icon: 'alert-circle' },
    HIGH:     { color: colors.danger,  icon: 'warning' },
    CRITICAL: { color: '#7C3AED',      icon: 'nuclear' },
  };

  const sev  = item.severity ?? 'MEDIUM';
  const meta = SEV_META[sev] ?? SEV_META.MEDIUM;
  const name = item.material?.name ?? item.materialName ?? `Alert #${item.id}`;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }, item.isResolved && styles.cardResolved]}>
      <View style={styles.cardTop}>
        <View style={[styles.iconWrap, { backgroundColor: `${meta.color}15` }]}>
          <Ionicons name={meta.icon as any} size={20} color={meta.color} />
        </View>
        <View style={styles.cardContent}>
          <Text style={[styles.materialName, { color: colors.text }]} numberOfLines={1}>{name}</Text>
          <Text style={[styles.message, { color: colors.textSecondary }]} numberOfLines={2}>{item.message ?? item.alertType ?? (isAr ? 'تنبيه مخزون منخفض' : 'Low stock alert')}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: `${meta.color}15` }]}>
          <Text style={[styles.badgeText, { color: meta.color }]}>{sev}</Text>
        </View>
      </View>
      {(item.currentStock != null || item.minStock != null) && (
        <View style={styles.stockRow}>
          <Text style={[styles.stockLabel, { color: colors.textMuted }]}>{isAr ? 'الحالي: ' : 'Current: '}<Text style={[styles.stockVal, { color: colors.text }]}>{item.currentStock ?? '—'}</Text></Text>
          <Text style={[styles.stockLabel, { color: colors.textMuted }]}>{isAr ? 'الأدنى: ' : 'Min: '}<Text style={[styles.stockVal, { color: colors.text }]}>{item.minStock ?? '—'}</Text></Text>
          {item.isResolved && (
            <View style={styles.resolvedBadge}>
              <Ionicons name="checkmark-circle" size={12} color={colors.success} />
              <Text style={[styles.resolvedText, { color: colors.success }]}>{isAr ? 'محلول' : 'Resolved'}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export function RawAlertsScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const [alerts, setAlerts]     = useState<AlertRecord[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ alerts: AlertRecord[] }>('/raw-material-alerts?limit=40');
      setAlerts(res.alerts ?? []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const active = alerts.filter((a) => !a.isResolved).length;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={isAr ? 'تنبيهات المواد الخام' : 'Raw Material Alerts'} subtitle={active ? `${active} ${isAr ? 'تنبيه نشط' : 'active alerts'}` : (isAr ? 'كل شيء على ما يرام' : 'All clear')} showBack />
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View> : (
        <FlatList
          data={alerts}
          keyExtractor={(i, idx) => `${String(i.id)}-${idx}`}
          renderItem={({ item }) => <AlertCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="checkmark-circle-outline" size={44} color={colors.success} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>{isAr ? 'لا توجد تنبيهات نشطة' : 'No active alerts'}</Text>
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
  cardResolved: { opacity: 0.6 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: 8 },
  iconWrap: { width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardContent: { flex: 1 },
  materialName: { ...typography.h4 },
  message:      { ...typography.bodySmall, marginTop: 2 },
  badge:   { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full, flexShrink: 0 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  stockRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stockLabel: { ...typography.caption },
  stockVal:   { fontWeight: '700' },
  resolvedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 'auto' },
  resolvedText:  { fontSize: 11, fontWeight: '700' },
  empty:   { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText: { ...typography.bodySmall },
});
