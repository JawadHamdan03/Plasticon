import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader, StatCard } from '../../components';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

interface Expense {
  id: number;
  title?: string;
  category?: string;
  amount?: number;
  description?: string;
  date?: string;
  submittedBy?: { fullName: string };
  paymentStatus?: string;
  status?: string;
  createdAt: string;
}

function fmt(n: number) { return n.toLocaleString('en-US', { minimumFractionDigits: 2 }); }

function ExpenseCard({ item }: { item: Expense }) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();

  const CAT_COLOR: Record<string, string> = {
    TRAVEL:     colors.info,
    UTILITIES:  colors.warning,
    SUPPLIES:   colors.success,
    EQUIPMENT:  colors.primary,
    OTHER:      colors.textMuted,
  };

  const color = CAT_COLOR[item.category ?? 'OTHER'] ?? colors.textMuted;
  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.cardTop}>
        <View style={[styles.iconWrap, { backgroundColor: `${color}15` }]}>
          <Ionicons name="receipt" size={18} color={color} />
        </View>
        <View style={styles.cardContent}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{item.title ?? item.category ?? `${isAr ? 'مصروف' : 'Expense'} #${item.id}`}</Text>
          <Text style={[styles.meta, { color: colors.textMuted }]}>{item.submittedBy?.fullName ?? ''} · {new Date(item.date ?? item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</Text>
        </View>
        <Text style={[styles.amount, { color: colors.danger }]}>${fmt(item.amount ?? 0)}</Text>
      </View>
      {item.description ? <Text style={[styles.desc, { color: colors.textSecondary }]} numberOfLines={1}>{item.description}</Text> : null}
    </View>
  );
}

export function ExpensesScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<Expense[]>('/expenses?limit=40');
      setExpenses(Array.isArray(res) ? res : []);
    } catch (e: any) {
      Alert.alert(isAr ? 'خطأ' : 'Error', e?.message ?? (isAr ? 'فشل تحميل المصروفات' : 'Failed to load expenses'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAr]);

  useEffect(() => { void load(); }, [load]);

  const total = expenses.reduce((s, e) => s + (e.amount ?? 0), 0);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={isAr ? 'المصروفات' : 'Expense Tracking'} showBack />
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View> : (
        <FlatList
          data={expenses}
          keyExtractor={(i, idx) => `${String(i.id)}-${idx}`}
          renderItem={({ item }) => <ExpenseCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListHeaderComponent={<StatCard label={isAr ? 'إجمالي المصروفات' : 'Total Expenses'} value={`$${fmt(total)}`} icon="receipt" color={colors.danger} style={styles.header} />}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="receipt-outline" size={44} color={colors.textMuted} /><Text style={[styles.emptyText, { color: colors.textMuted }]}>{isAr ? 'لا توجد مصروفات مسجلة' : 'No expenses recorded'}</Text></View>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1 },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:        { padding: spacing.md, paddingBottom: 40 },
  header:      { marginBottom: spacing.md },
  card:        { borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardTop:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4 },
  iconWrap:    { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardContent: { flex: 1 },
  title:       { ...typography.h4 },
  meta:        { ...typography.caption, marginTop: 2 },
  amount:      { fontSize: 16, fontWeight: '800', flexShrink: 0 },
  desc:        { ...typography.bodySmall },
  empty:       { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText:   { ...typography.bodySmall },
});
