import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

interface SparePart {
  id: number;
  name: string;
  partNumber?: string;
  category?: string;
  unitPrice?: number;
  costPrice?: number;
  quantity?: number;
  supplier?: string;
  createdAt: string;
}

function fmt(n: number) { return n.toLocaleString('en-US', { minimumFractionDigits: 2 }); }

function PartCard({ item }: { item: SparePart }) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const price = item.unitPrice ?? item.costPrice ?? 0;
  const totalValue = price * (item.quantity ?? 0);

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
          {item.partNumber && <Text style={[styles.partNo, { color: colors.textMuted }]}>{item.partNumber}</Text>}
        </View>
        <View style={styles.priceBox}>
          <Text style={[styles.price, { color: colors.success }]}>${fmt(price)}</Text>
          <Text style={[styles.priceLabel, { color: colors.textMuted }]}>{isAr ? 'وحدة' : 'unit'}</Text>
        </View>
      </View>
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        {item.category && (
          <Text style={[styles.tag, { backgroundColor: `${colors.info}15`, color: colors.info }]}>
            {item.category}
          </Text>
        )}
        {item.quantity != null && (
          <Text style={[styles.qty, { color: colors.textSecondary }]}>
            {isAr ? 'الكمية:' : 'Qty:'} {item.quantity}
          </Text>
        )}
        {totalValue > 0 && (
          <Text style={[styles.total, { color: colors.text }]}>
            {isAr ? 'القيمة الإجمالية:' : 'Total value:'} ${fmt(totalValue)}
          </Text>
        )}
        {item.supplier && (
          <Text style={[styles.supplier, { color: colors.textMuted }]}>
            {isAr ? 'المورد:' : 'Supplier:'} {item.supplier}
          </Text>
        )}
      </View>
    </View>
  );
}

export function PartsPricingScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const [parts, setParts]       = useState<SparePart[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<SparePart[]>('/spare-parts?limit=40');
      setParts(Array.isArray(res) ? res : []);
    } catch (e: any) {
      Alert.alert(isAr ? 'خطأ' : 'Error', e?.message ?? (isAr ? 'فشل تحميل القطع' : 'Failed to load parts'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAr]);

  useEffect(() => { void load(); }, [load]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={isAr ? 'تسعير القطع' : 'Parts Pricing'} subtitle={`${parts.length} ${isAr ? 'قطعة' : 'parts'}`} showBack />
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View> : (
        <FlatList
          data={parts}
          keyExtractor={(i, idx) => `${String(i.id)}-${idx}`}
          renderItem={({ item }) => <PartCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="pricetag-outline" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {isAr ? 'لا توجد قطع' : 'No parts found'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:       { flex: 1 },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:       { padding: spacing.md, paddingBottom: 40 },
  card:       { borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardLeft:   { flex: 1, marginRight: spacing.sm },
  name:       { ...typography.h4 },
  partNo:     { ...typography.caption, marginTop: 2 },
  priceBox:   { alignItems: 'flex-end' },
  price:      { fontSize: 18, fontWeight: '800' },
  priceLabel: { ...typography.caption },
  footer:     { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, borderTopWidth: 1, paddingTop: 8 },
  tag:        { ...typography.caption, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full },
  qty:        { ...typography.caption },
  total:      { ...typography.caption, fontWeight: '700' },
  supplier:   { ...typography.caption },
  empty:      { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText:  { ...typography.bodySmall },
});
