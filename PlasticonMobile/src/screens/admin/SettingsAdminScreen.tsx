import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { colors, radius, shadow, spacing, typography } from '../../theme';

interface Settings {
  companyName?:        string;
  timezone?:           string;
  currency?:           string;
  lowStockThreshold?:  number;
  emailNotifications?: boolean;
  maintenanceAlerts?:  boolean;
  workingHoursStart?:  string;
  workingHoursEnd?:    string;
  [key: string]: unknown;
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function fmt(val: unknown): string {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'boolean') return val ? 'Enabled' : 'Disabled';
  return String(val);
}

export function SettingsAdminScreen() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<Settings>('/settings');
      setSettings(res);
    } catch {
      setSettings({});
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const KNOWN: { key: keyof Settings; label: string }[] = [
    { key: 'companyName',        label: 'Company Name' },
    { key: 'timezone',           label: 'Timezone' },
    { key: 'currency',           label: 'Currency' },
    { key: 'lowStockThreshold',  label: 'Low Stock Threshold' },
    { key: 'emailNotifications', label: 'Email Notifications' },
    { key: 'maintenanceAlerts',  label: 'Maintenance Alerts' },
    { key: 'workingHoursStart',  label: 'Working Hours Start' },
    { key: 'workingHoursEnd',    label: 'Working Hours End' },
  ];

  const extra = settings
    ? Object.entries(settings).filter(([k]) => !KNOWN.map((n) => n.key).includes(k as keyof Settings))
    : [];

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="System Settings" showBack />
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View> : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Configuration</Text>
            {KNOWN.filter((n) => settings?.[n.key] != null).map((n) => (
              <SettingRow key={n.key} label={n.label} value={fmt(settings?.[n.key])} />
            ))}
            {extra.map(([k, v]) => (
              <SettingRow key={k} label={k.replace(/([A-Z])/g, ' $1').trim()} value={fmt(v)} />
            ))}
            {(!settings || Object.keys(settings).length === 0) && (
              <Text style={styles.empty}>No settings configured</Text>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: colors.background },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content:      { padding: spacing.md, paddingBottom: 40 },
  section:      { backgroundColor: colors.surface, borderRadius: radius.lg, ...shadow.sm, overflow: 'hidden' },
  sectionTitle: { ...typography.h4, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  row:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel:     { ...typography.body, color: colors.textSecondary, flex: 1 },
  rowValue:     { ...typography.body, fontWeight: '600', color: colors.text, textAlign: 'right', flex: 1 },
  empty:        { ...typography.bodySmall, color: colors.textMuted, padding: spacing.md },
});
