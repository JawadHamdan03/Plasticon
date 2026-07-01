import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, RefreshControl, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';

interface ProductionRecord {
  id:           number;
  productName?: string;
  quantity?:    number;
  totalPieces?: number;
  notes?:       string;
  createdAt:    string;
  user?:        { fullName?: string };
  shift?:       { name?: string };
}

export function ProductionMonitorScreen() {
  const { colors } = useAppTheme();
  const [records,    setRecords]    = useState<ProductionRecord[]>([]);
  const [total,      setTotal]      = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(false);

  const load = useCallback(async () => {
    try {
      const [res, attRes] = await Promise.all([
        api.get<ProductionRecord[] | { records: ProductionRecord[]; total?: number; data?: ProductionRecord[] }>('/production/all?limit=50'),
        api.get<any>('/attendance/me').catch(() => []),
      ]);
      const list = Array.isArray(res) ? res : (res.records ?? res.data ?? []);
      setRecords(list);
      setTotal(Array.isArray(res) ? list.length : ((res as any).total ?? list.length));
      const attList: any[] = Array.isArray(attRes) ? attRes : (attRes?.data ?? []);
      setIsCheckedIn(attList.some((r: any) => !r.checkOut));
    } catch { setRecords([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title={'الإنتاج'}
        subtitle={`${total} ${'سجل إجمالي'}`}
        showBack
      />
      {!isCheckedIn && !loading && (
        <View style={[styles.banner, { backgroundColor: `${colors.warning}15`, borderColor: `${colors.warning}50` }]}>
          <Ionicons name="warning-outline" size={16} color={colors.warning} />
          <Text style={[styles.bannerText, { color: colors.warning }]}>
            {'يجب تسجيل الدخول لتسجيل الإنتاج'}
          </Text>
        </View>
      )}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
      >
        {loading ? (
          <ActivityIndicator style={{ marginTop: 60 }} size="large" color={colors.primary} />
        ) : records.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="cube-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {'لا توجد سجلات إنتاج'}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {records.map((r, idx) => {
              const qty = r.totalPieces ?? r.quantity ?? 0;
              return (
                <View key={`${r.id}-${idx}`} style={[styles.card, { backgroundColor: colors.surface }]}>
                  <View style={[styles.cardIcon, { backgroundColor: `${colors.primary}15` }]}>
                    <Ionicons name="cube" size={18} color={colors.primary} />
                  </View>
                  <View style={styles.cardBody}>
                    <Text style={[styles.cardName, { color: colors.text }]}>
                      {r.productName ?? `${'سجل #'}${r.id}`}
                    </Text>
                    {r.user?.fullName && (
                      <Text style={[styles.cardWorker, { color: colors.primary }]}>
                        {r.user.fullName}{r.shift?.name ? ` · ${r.shift.name}` : ''}
                      </Text>
                    )}
                    {r.notes ? <Text style={[styles.cardNotes, { color: colors.textMuted }]} numberOfLines={1}>{r.notes}</Text> : null}
                    <Text style={[styles.cardDate, { color: colors.textMuted }]}>{new Date(r.createdAt).toLocaleString()}</Text>
                  </View>
                  <View style={styles.qtyBox}>
                    <Text style={[styles.qty, { color: colors.primary }]}>{qty}</Text>
                    <Text style={[styles.qtyLabel, { color: colors.textMuted }]}>{'وحدات'}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:       { flex: 1 },
  content:    { padding: spacing.md, paddingBottom: 40 },
  empty:      { alignItems: 'center', paddingVertical: 80, gap: spacing.sm },
  emptyText:  { ...typography.bodySmall },
  list:       { gap: spacing.sm },
  card:       { flexDirection: 'row', alignItems: 'center', borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm, ...shadow.sm },
  cardIcon:   { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  cardBody:   { flex: 1 },
  cardName:   { ...typography.h4 },
  cardWorker: { ...typography.caption, fontWeight: '600' },
  cardNotes:  { ...typography.caption },
  cardDate:   { ...typography.caption },
  qtyBox:     { alignItems: 'flex-end' },
  qty:        { fontSize: 20, fontWeight: '800' },
  qtyLabel:   { ...typography.caption },
  banner:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: spacing.md, marginBottom: 4, paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1 },
  bannerText: { fontSize: 13, fontWeight: '600', flex: 1 },
});
