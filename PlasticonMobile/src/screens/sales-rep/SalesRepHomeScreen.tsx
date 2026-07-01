import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { radius, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import type { SalesRepTabParamList } from '../../navigation/types';
import { useLocale } from '../../context/LocaleContext';

type DashboardData = {
  customerCount: number;
  totalQuotationValue: number;
  acceptedQuotations: number;
  currentTarget: { targetAmount: number; achievedAmount: number } | null;
  recentVisits: { id: number; visitDate: string; customer: { name: string } }[];
  recentQuotations: { id: number; status: string; totalAmount: number; createdAt: string }[];
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#6b7280', SENT: '#3b82f6', ACCEPTED: '#10b981', REJECTED: '#ef4444', EXPIRED: '#f59e0b',
};

const QUICK_ACTIONS = [
  { icon: 'people-outline',        labelEn: 'My Customers', labelAr: 'عملائي',        subEn: 'View assigned customers',  subAr: 'عرض قائمة العملاء',   screen: 'Customers',  color: '#8b5cf6' },
  { icon: 'document-text-outline', labelEn: 'Quotations',   labelAr: 'عروض الأسعار',  subEn: 'Create & manage quotes',   subAr: 'إنشاء وإدارة العروض', screen: 'Quotations', color: '#3b82f6' },
  { icon: 'location-outline',      labelEn: 'Visit Log',    labelAr: 'سجل الزيارات',  subEn: 'Log & view visits',        subAr: 'تسجيل وعرض الزيارات', screen: 'Visits',     color: '#f59e0b' },
  { icon: 'flag-outline',          labelEn: 'Targets',      labelAr: 'أهداف المبيعات',subEn: 'View performance targets', subAr: 'عرض أهداف الأداء',    screen: 'Targets',    color: '#10b981' },
] as const;

export function SalesRepHomeScreen() {
  const { colors } = useAppTheme();
  const { isAr }   = useLocale();
  const nav = useNavigation<BottomTabNavigationProp<SalesRepTabParamList>>();

  const [data, setData]             = useState<DashboardData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const res = await api.get<DashboardData>('/sales-rep/dashboard');
      setData(res);
    } catch { setData(null); setError(true); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const pct = data?.currentTarget
    ? Math.min(100, Math.round((data.currentTarget.achievedAmount / data.currentTarget.targetAmount) * 100))
    : 0;

  const kpis = data ? [
    { icon: 'people-outline' as const,           label: 'عملائي',    value: String(data.customerCount),                   color: '#8b5cf6' },
    { icon: 'checkmark-circle-outline' as const, label: 'مقبولة',     value: String(data.acceptedQuotations),              color: '#10b981' },
    { icon: 'trending-up-outline' as const,      label: 'قيمة العروض',  value: `₪${Math.round(data.totalQuotationValue)}`,   color: '#3b82f6' },
  ] : [];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScreenHeader title={'لوحة المندوب'} />
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />}
      >
        {loading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
        ) : error ? (
          <View style={styles.errorBox}>
            <Ionicons name="cloud-offline-outline" size={44} color={colors.textSecondary} />
            <Text style={[styles.errorTitle, { color: colors.text }]}>
              {'تعذّر الاتصال بالخادم'}
            </Text>
            <Text style={[styles.muted, { color: colors.textSecondary }]}>
              {'تأكد من الاتصال بالشبكة'}
            </Text>
            <TouchableOpacity
              style={[styles.retryBtn, { backgroundColor: colors.accent }]}
              onPress={() => { setLoading(true); void load(); }}
            >
              <Text style={styles.retryText}>{'إعادة المحاولة'}</Text>
            </TouchableOpacity>
          </View>
        ) : !data ? (
          <Text style={[styles.muted, { color: colors.textSecondary }]}>{'لا توجد بيانات'}</Text>
        ) : (
          <>
            {/* KPI row */}
            <View style={styles.kpiRow}>
              {kpis.map((k, i) => (
                <View key={i} style={[styles.kpiCard, { backgroundColor: k.color + '18', borderColor: k.color + '44', borderWidth: 1 }]}>
                  <Ionicons name={k.icon} size={22} color={k.color} />
                  <Text style={[styles.kpiValue, { color: k.color }]}>{k.value}</Text>
                  <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>{k.label}</Text>
                </View>
              ))}
            </View>

            {/* Monthly target */}
            {data.currentTarget ? (
              <View style={[styles.card, { backgroundColor: colors.surface }]}>
                <View style={styles.cardTitleRow}>
                  <Ionicons name="flag-outline" size={15} color={colors.accent} />
                  <Text style={[styles.cardTitle, { color: colors.text }]}>
                    {isAr ? 'هدف الشهر' : "This Month's Target"}
                  </Text>
                  <Text style={[styles.pctBadge, { color: pct >= 100 ? '#10b981' : colors.accent }]}>{pct}%</Text>
                </View>
                <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
                  <View style={[styles.progressFill, { width: `${pct}%` as any, backgroundColor: pct >= 100 ? '#10b981' : colors.accent }]} />
                </View>
                <View style={styles.progressLabels}>
                  <Text style={[styles.muted, { color: colors.textSecondary }]}>
                    ₪{Math.round(data.currentTarget.achievedAmount)} {'محقق'}
                  </Text>
                  <Text style={[styles.muted, { color: colors.textSecondary }]}>
                    {'الهدف:'} ₪{Math.round(data.currentTarget.targetAmount)}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Quick Actions */}
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <View style={styles.cardTitleRow}>
                <Ionicons name="grid-outline" size={15} color={colors.accent} />
                <Text style={[styles.cardTitle, { color: colors.text }]}>{'الأدوات'}</Text>
              </View>
              {QUICK_ACTIONS.map((item, idx) => (
                <TouchableOpacity
                  key={item.screen}
                  style={[styles.tileRow, { borderBottomColor: colors.border, borderBottomWidth: idx < QUICK_ACTIONS.length - 1 ? 1 : 0 }]}
                  onPress={() => (nav as any).navigate('Sales', { screen: item.screen })}
                  activeOpacity={0.7}
                >
                  <View style={[styles.tileIcon, { backgroundColor: item.color + '22' }]}>
                    <Ionicons name={item.icon as any} size={18} color={item.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.tileName, { color: colors.text }]}>{isAr ? item.labelAr : item.labelEn}</Text>
                    <Text style={[styles.tileSub, { color: colors.textSecondary }]}>{isAr ? item.subAr : item.subEn}</Text>
                  </View>
                  <Ionicons name={'chevron-back'} size={14} color={colors.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>

            {/* Recent Quotations */}
            {data.recentQuotations.length > 0 && (
              <View style={[styles.card, { backgroundColor: colors.surface }]}>
                <View style={styles.cardTitleRow}>
                  <Ionicons name="document-text-outline" size={15} color={colors.accent} />
                  <Text style={[styles.cardTitle, { color: colors.text }]}>{'آخر العروض'}</Text>
                  <TouchableOpacity onPress={() => nav.navigate('Sales')}>
                    <Text style={{ color: colors.accent, fontSize: 12, fontWeight: '600' }}>{'الكل ←'}</Text>
                  </TouchableOpacity>
                </View>
                {data.recentQuotations.map((q) => (
                  <View key={q.id} style={[styles.activityRow, { borderBottomColor: colors.border }]}>
                    <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[q.status] + '22' }]}>
                      <Text style={[styles.statusText, { color: STATUS_COLORS[q.status] }]}>{q.status}</Text>
                    </View>
                    <Text style={[styles.activityAmount, { color: colors.accent }]}>₪{Math.round(q.totalAmount)}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Recent Visits */}
            {data.recentVisits.length > 0 && (
              <View style={[styles.card, { backgroundColor: colors.surface }]}>
                <View style={styles.cardTitleRow}>
                  <Ionicons name="location-outline" size={15} color={colors.accent} />
                  <Text style={[styles.cardTitle, { color: colors.text }]}>{'آخر الزيارات'}</Text>
                  <TouchableOpacity onPress={() => nav.navigate('Sales')}>
                    <Text style={{ color: colors.accent, fontSize: 12, fontWeight: '600' }}>{'الكل ←'}</Text>
                  </TouchableOpacity>
                </View>
                {data.recentVisits.map((v) => (
                  <View key={v.id} style={[styles.activityRow, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.visitName, { color: colors.text }]}>{v.customer.name}</Text>
                    <Text style={[styles.muted, { color: colors.textSecondary }]}>{new Date(v.visitDate).toLocaleDateString()}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:           { flex: 1 },
  container:      { padding: spacing.md, gap: spacing.md },
  errorBox:       { alignItems: 'center', marginTop: 60, gap: spacing.sm, paddingHorizontal: spacing.lg },
  errorTitle:     { ...typography.h3, textAlign: 'center' },
  retryBtn:       { marginTop: spacing.sm, paddingHorizontal: 28, paddingVertical: 10, borderRadius: 20 },
  retryText:      { color: '#fff', fontWeight: '700', fontSize: 14 },
  kpiRow:         { flexDirection: 'row', gap: spacing.sm },
  kpiCard:        { flex: 1, borderRadius: radius.md, padding: spacing.sm, alignItems: 'center', gap: 4 },
  kpiValue:       { ...typography.h3, fontWeight: '800' },
  kpiLabel:       { ...typography.caption, textAlign: 'center' },
  card:           { borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  cardTitleRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  cardTitle:      { ...typography.body, fontWeight: '700', flex: 1 },
  pctBadge:       { fontSize: 18, fontWeight: '800' },
  progressBg:     { height: 10, borderRadius: 5 },
  progressFill:   { height: 10, borderRadius: 5 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  tileRow:        { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  tileIcon:       { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tileName:       { ...typography.body, fontWeight: '600', fontSize: 14 },
  tileSub:        { ...typography.caption, marginTop: 1 },
  activityRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1 },
  statusBadge:    { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  statusText:     { ...typography.caption, fontWeight: '700' },
  activityAmount: { ...typography.body, fontWeight: '700' },
  visitName:      { ...typography.body, fontWeight: '600' },
  muted:          { ...typography.caption },
});
