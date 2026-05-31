import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

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
  const { colors } = useAppTheme();
  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

function fmt(val: unknown): string {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'boolean') return val ? 'Enabled' : 'Disabled';
  return String(val);
}

export function SettingsAdminScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
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
    { key: 'companyName',        label: isAr ? 'اسم الشركة' : 'Company Name' },
    { key: 'timezone',           label: isAr ? 'المنطقة الزمنية' : 'Timezone' },
    { key: 'currency',           label: isAr ? 'العملة' : 'Currency' },
    { key: 'lowStockThreshold',  label: isAr ? 'حد المخزون المنخفض' : 'Low Stock Threshold' },
    { key: 'emailNotifications', label: isAr ? 'إشعارات البريد' : 'Email Notifications' },
    { key: 'maintenanceAlerts',  label: isAr ? 'تنبيهات الصيانة' : 'Maintenance Alerts' },
    { key: 'workingHoursStart',  label: isAr ? 'بداية ساعات العمل' : 'Working Hours Start' },
    { key: 'workingHoursEnd',    label: isAr ? 'نهاية ساعات العمل' : 'Working Hours End' },
  ];

  const extra = settings
    ? Object.entries(settings).filter(([k]) => !KNOWN.map((n) => n.key).includes(k as keyof Settings))
    : [];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={isAr ? 'الإعدادات' : 'System Settings'} showBack />
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View> : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
        >
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { borderBottomColor: colors.border, color: colors.text }]}>
              {isAr ? 'الإعدادات' : 'Configuration'}
            </Text>
            {KNOWN.filter((n) => settings?.[n.key] != null).map((n) => (
              <SettingRow key={n.key} label={n.label} value={fmt(settings?.[n.key])} />
            ))}
            {extra.map(([k, v]) => (
              <SettingRow key={k} label={k.replace(/([A-Z])/g, ' $1').trim()} value={fmt(v)} />
            ))}
            {(!settings || Object.keys(settings).length === 0) && (
              <Text style={[styles.empty, { color: colors.textMuted }]}>
                {isAr ? 'لا توجد إعدادات' : 'No settings configured'}
              </Text>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1 },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content:      { padding: spacing.md, paddingBottom: 40 },
  section:      { borderRadius: radius.lg, ...shadow.sm, overflow: 'hidden' },
  sectionTitle: { ...typography.h4, padding: spacing.md, borderBottomWidth: 1 },
  row:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1 },
  rowLabel:     { ...typography.body, flex: 1 },
  rowValue:     { ...typography.body, fontWeight: '600', textAlign: 'right', flex: 1 },
  empty:        { ...typography.bodySmall, padding: spacing.md },
});
