import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

interface TaxFiling {
  id: number;
  taxType?: string;
  period?: string;
  amount?: number;
  status?: string;
  dueDate?: string;
  filedDate?: string;
  filedBy?: { fullName: string };
  createdAt: string;
}

function fmt(n: number) { return n.toLocaleString('en-US', { minimumFractionDigits: 2 }); }

function TaxCard({ item }: { item: TaxFiling }) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();

  const STATUS_META: Record<string, { color: string; icon: string }> = {
    FILED:   { color: colors.success, icon: 'checkmark-circle' },
    PENDING: { color: colors.warning, icon: 'time' },
    OVERDUE: { color: colors.danger,  icon: 'alert-circle' },
    DRAFT:   { color: colors.textMuted, icon: 'document' },
  };

  const status = item.status ?? 'PENDING';
  const meta   = STATUS_META[status] ?? STATUS_META.PENDING;
  const due    = item.dueDate ? new Date(item.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : null;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.cardTop}>
        <View style={[styles.iconWrap, { backgroundColor: `${meta.color}15` }]}>
          <Ionicons name={meta.icon as any} size={20} color={meta.color} />
        </View>
        <View style={styles.cardContent}>
          <Text style={[styles.taxType, { color: colors.text }]}>{item.taxType ?? `Filing #${item.id}`}</Text>
          <Text style={[styles.period, { color: colors.textMuted }]}>{item.period ?? new Date(item.createdAt).toLocaleDateString([], { month: 'long', year: 'numeric' })}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: `${meta.color}15` }]}>
          <Text style={[styles.badgeText, { color: meta.color }]}>{status}</Text>
        </View>
      </View>
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        {item.amount != null && (
          <Text style={[styles.detail, { color: colors.textSecondary }]}>
            {isAr ? 'المبلغ: ' : 'Amount: '}<Text style={[styles.detailVal, { color: colors.text }]}>${fmt(item.amount)}</Text>
          </Text>
        )}
        {due && (
          <Text style={[styles.detail, { color: colors.textSecondary }]}>
            {isAr ? 'الاستحقاق: ' : 'Due: '}<Text style={[styles.detailVal, { color: colors.text }]}>{due}</Text>
          </Text>
        )}
        {item.filedBy && (
          <Text style={[styles.detail, { color: colors.textSecondary }]}>
            {isAr ? 'قُدِّم بواسطة: ' : 'Filed by: '}<Text style={[styles.detailVal, { color: colors.text }]}>{item.filedBy.fullName}</Text>
          </Text>
        )}
      </View>
    </View>
  );
}

export function TaxComplianceScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const [filings, setFilings]   = useState<TaxFiling[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<TaxFiling[]>('/tax-filings?limit=20');
      setFilings(Array.isArray(res) ? res : []);
    } catch (e: any) {
      Alert.alert(isAr ? 'خطأ' : 'Error', e?.message ?? (isAr ? 'فشل تحميل الملفات الضريبية' : 'Failed to load tax filings'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const pending = filings.filter((f) => f.status === 'PENDING' || f.status === 'OVERDUE').length;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title={isAr ? 'الامتثال الضريبي' : 'Tax Compliance'}
        subtitle={pending > 0 ? `${pending} ${isAr ? 'ملفات معلقة' : 'pending filings'}` : (isAr ? 'كل شيء محدّث' : 'All up to date')}
        showBack
      />
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View> : (
        <FlatList
          data={filings}
          keyExtractor={(i, idx) => `${String(i.id)}-${idx}`}
          renderItem={({ item }) => <TaxCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="calculator-outline" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>{isAr ? 'لا توجد سجلات ضريبية' : 'No tax filings'}</Text>
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
  card:        { borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardTop:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 8 },
  iconWrap:    { width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardContent: { flex: 1 },
  taxType:     { ...typography.h4 },
  period:      { ...typography.caption, marginTop: 2 },
  badge:       { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  badgeText:   { fontSize: 10, fontWeight: '700' },
  footer:      { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, borderTopWidth: 1, paddingTop: 8 },
  detail:      { ...typography.caption },
  detailVal:   { fontWeight: '700' },
  empty:       { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText:   { ...typography.bodySmall },
});
