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
import { useLocale } from '../../context/LocaleContext';

interface ConsumptionRecord {
  id:           number;
  materialName: string;
  quantity:     number;
  unit?:        string;
  notes?:       string;
  createdAt:    string;
}

export function ConsumptionWorkerScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const [records,   setRecords]   = useState<ConsumptionRecord[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing,setRefreshing]= useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ data: { id: number; material_type: string; waste_kg: number; reason?: string; created_at: string }[] }>('/worker-tools/material-waste/mine');
      const rows = res.data ?? [];
      setRecords(rows.map((r) => ({
        id:           r.id,
        materialName: r.material_type,
        quantity:     r.waste_kg,
        unit:         'kg',
        notes:        r.reason,
        createdAt:    r.created_at,
      })));
    } catch { setRecords([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={isAr ? 'الاستهلاك' : 'Consumption'} subtitle={isAr ? 'سجلات استخدام المواد' : 'Material usage records'} showBack />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.accent} />}
      >
        {loading ? (
          <ActivityIndicator style={{ marginTop: 60 }} size="large" color={colors.accent} />
        ) : records.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="flask-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>{isAr ? 'لا توجد سجلات استهلاك' : 'No consumption records'}</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {records.map((r, idx) => (
              <View key={`${r.id}-${idx}`} style={[styles.card, { backgroundColor: colors.surface }]}>
                <View style={[styles.cardIcon, { backgroundColor: `${colors.accent}15` }]}>
                  <Ionicons name="flask" size={20} color={colors.accent} />
                </View>
                <View style={styles.cardBody}>
                  <Text style={[styles.cardName, { color: colors.text }]}>{r.materialName}</Text>
                  {r.notes ? <Text style={[styles.cardNotes, { color: colors.textMuted }]}>{r.notes}</Text> : null}
                  <Text style={[styles.cardDate, { color: colors.textMuted }]}>{new Date(r.createdAt).toLocaleDateString()}</Text>
                </View>
                <View style={styles.qtyBox}>
                  <Text style={[styles.qty, { color: colors.accent }]}>{r.quantity}</Text>
                  <Text style={[styles.unit, { color: colors.textMuted }]}>{r.unit ?? 'kg'}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:     { flex: 1 },
  content:  { padding: spacing.md, paddingBottom: 40 },
  empty:    { alignItems: 'center', paddingVertical: 80, gap: spacing.sm },
  emptyText:{ ...typography.bodySmall },
  list:     { gap: spacing.sm },
  card:     { flexDirection: 'row', alignItems: 'center', borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm, ...shadow.sm },
  cardIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1 },
  cardName: { ...typography.h4 },
  cardNotes:{ ...typography.caption },
  cardDate: { ...typography.caption },
  qtyBox:   { alignItems: 'flex-end' },
  qty:      { fontSize: 18, fontWeight: '800' },
  unit:     { ...typography.caption },
});
