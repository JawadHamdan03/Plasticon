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

interface ProductionRecord {
  id:          number;
  productName?: string;
  quantity?:   number;
  totalPieces?: number;
  notes?:      string;
  createdAt:   string;
  user?:       { fullName?: string };
  shift?:      { name?: string };
}

export function ProductionMonitorScreen() {
  const [records,    setRecords]    = useState<ProductionRecord[]>([]);
  const [total,      setTotal]      = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<ProductionRecord[] | { records: ProductionRecord[]; total?: number; data?: ProductionRecord[] }>('/production/all?limit=50');
      const list = Array.isArray(res) ? res : (res.records ?? res.data ?? []);
      setRecords(list);
      setTotal(Array.isArray(res) ? list.length : ((res as any).total ?? list.length));
    } catch { setRecords([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Production" subtitle={`${total} total records`} showBack />
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
            <Text style={styles.emptyText}>No production records found</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {records.map((r, idx) => {
              const qty = r.totalPieces ?? r.quantity ?? 0;
              return (
                <View key={`${r.id}-${idx}`} style={styles.card}>
                  <View style={styles.cardIcon}>
                    <Ionicons name="cube" size={18} color={colors.primary} />
                  </View>
                  <View style={styles.cardBody}>
                    <Text style={styles.cardName}>{r.productName ?? `Record #${r.id}`}</Text>
                    {r.user?.fullName && <Text style={styles.cardWorker}>{r.user.fullName}{r.shift?.name ? ` · ${r.shift.name}` : ''}</Text>}
                    {r.notes ? <Text style={styles.cardNotes} numberOfLines={1}>{r.notes}</Text> : null}
                    <Text style={styles.cardDate}>{new Date(r.createdAt).toLocaleString()}</Text>
                  </View>
                  <View style={styles.qtyBox}>
                    <Text style={styles.qty}>{qty}</Text>
                    <Text style={styles.qtyLabel}>units</Text>
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
  safe:      { flex: 1, backgroundColor: colors.background },
  content:   { padding: spacing.md, paddingBottom: 40 },
  empty:     { alignItems: 'center', paddingVertical: 80, gap: spacing.sm },
  emptyText: { ...typography.bodySmall, color: colors.textMuted },
  list:      { gap: spacing.sm },
  card:      { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm, ...shadow.sm },
  cardIcon:  { width: 38, height: 38, borderRadius: radius.md, backgroundColor: `${colors.primary}15`, alignItems: 'center', justifyContent: 'center' },
  cardBody:  { flex: 1 },
  cardName:  { ...typography.h4 },
  cardWorker:{ ...typography.caption, color: colors.primary, fontWeight: '600' },
  cardNotes: { ...typography.caption, color: colors.textMuted },
  cardDate:  { ...typography.caption, color: colors.textMuted },
  qtyBox:    { alignItems: 'flex-end' },
  qty:       { fontSize: 20, fontWeight: '800', color: colors.primary },
  qtyLabel:  { ...typography.caption, color: colors.textMuted },
});
