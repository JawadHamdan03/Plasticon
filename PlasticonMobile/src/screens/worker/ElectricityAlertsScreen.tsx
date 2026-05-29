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

interface ElecAlert {
  id:        number;
  type?:     string;
  message:   string;
  severity?: string;
  resolved?: boolean;
  createdAt: string;
}

const SEV_COLOR: Record<string, string> = {
  low:      colors.success,
  medium:   colors.warning,
  high:     colors.danger,
  critical: '#9B0000',
};

export function ElectricityAlertsScreen() {
  const [alerts,     setAlerts]     = useState<ElecAlert[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<ElecAlert[] | { data: ElecAlert[]; alerts?: ElecAlert[] }>('/worker-tools/electricity-anomaly-alerts/mine');
      const list = Array.isArray(res) ? res : (res.alerts ?? res.data ?? []);
      setAlerts(list);
    } catch { setAlerts([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const active   = alerts.filter((a) => !a.resolved);
  const resolved = alerts.filter((a) => a.resolved);

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Electricity Alerts" subtitle={`${active.length} active`} showBack />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.warning} />}
      >
        {loading ? (
          <ActivityIndicator style={{ marginTop: 60 }} size="large" color={colors.warning} />
        ) : alerts.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="flash-outline" size={48} color={colors.success} />
            <Text style={styles.emptyText}>No electricity alerts</Text>
            <Text style={styles.emptyHint}>All systems operating normally</Text>
          </View>
        ) : (
          <>
            {active.length > 0 && (
              <>
                <Text style={styles.section}>Active Alerts</Text>
                <View style={styles.list}>
                  {active.map((a) => {
                    const c = SEV_COLOR[a.severity?.toLowerCase() ?? 'medium'] ?? colors.warning;
                    return (
                      <View key={a.id} style={[styles.card, { borderLeftColor: c }]}>
                        <View style={styles.cardRow}>
                          <Ionicons name="flash" size={16} color={c} />
                          <Text style={[styles.cardType, { color: c }]}>{a.type ?? 'Alert'}</Text>
                          {a.severity && (
                            <View style={[styles.badge, { backgroundColor: `${c}20` }]}>
                              <Text style={[styles.badgeText, { color: c }]}>{a.severity}</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.cardMsg}>{a.message}</Text>
                        <Text style={styles.cardDate}>{new Date(a.createdAt).toLocaleString()}</Text>
                      </View>
                    );
                  })}
                </View>
              </>
            )}

            {resolved.length > 0 && (
              <>
                <Text style={[styles.section, { marginTop: spacing.md }]}>Resolved</Text>
                <View style={styles.list}>
                  {resolved.map((a) => (
                    <View key={a.id} style={[styles.card, styles.cardResolved]}>
                      <View style={styles.cardRow}>
                        <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                        <Text style={styles.cardType}>{a.type ?? 'Alert'}</Text>
                      </View>
                      <Text style={[styles.cardMsg, { color: colors.textMuted }]}>{a.message}</Text>
                      <Text style={styles.cardDate}>{new Date(a.createdAt).toLocaleString()}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: colors.background },
  content:      { padding: spacing.md, paddingBottom: 40 },
  empty:        { alignItems: 'center', paddingVertical: 80, gap: spacing.xs },
  emptyText:    { ...typography.h4 },
  emptyHint:    { ...typography.bodySmall, color: colors.textMuted },
  section:      { ...typography.caption, color: colors.textMuted, marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.8 },
  list:         { gap: spacing.sm, marginBottom: spacing.sm },
  card:         { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderLeftWidth: 3, borderLeftColor: colors.border, ...shadow.sm },
  cardResolved: { opacity: 0.65 },
  cardRow:      { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  cardType:     { ...typography.caption, fontWeight: '700', flex: 1 },
  badge:        { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.sm },
  badgeText:    { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  cardMsg:      { ...typography.bodySmall, marginBottom: 4 },
  cardDate:     { ...typography.caption, color: colors.textMuted },
});
