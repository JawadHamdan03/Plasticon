import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader, StatCard } from '../../components';
import { colors, radius, shadow, spacing, typography } from '../../theme';

interface Reading {
  id: number;
  readingDate?: string;
  consumptionKwh?: number;
  peakDemandKw?: number;
  cost?: number;
  meter?: string;
  notes?: string;
  createdAt: string;
}

function fmt(n: number) { return n.toLocaleString('en-US', { minimumFractionDigits: 2 }); }

function ReadingCard({ item }: { item: Reading }) {
  const kwh  = item.consumptionKwh ?? 0;
  const date = new Date(item.readingDate ?? item.createdAt).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={[styles.iconWrap]}>
          <Ionicons name="flash" size={20} color={colors.warning} />
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.date}>{date}</Text>
          {item.meter && <Text style={styles.meter}>{item.meter}</Text>}
        </View>
        <Text style={styles.kwh}>{kwh.toLocaleString()} kWh</Text>
      </View>
      <View style={styles.footer}>
        {item.peakDemandKw != null && <Text style={styles.detail}>Peak: <Text style={styles.detailVal}>{item.peakDemandKw} kW</Text></Text>}
        {item.cost != null && <Text style={styles.detail}>Cost: <Text style={styles.detailVal}>${fmt(item.cost)}</Text></Text>}
        {item.notes ? <Text style={styles.notes} numberOfLines={1}>{item.notes}</Text> : null}
      </View>
    </View>
  );
}

export function ElectricityScreen() {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<Reading[]>('/electricity/readings?limit=30');
      setReadings(Array.isArray(res) ? res : []);
    } catch {
      setReadings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const totalKwh = readings.reduce((s, r) => s + (r.consumptionKwh ?? 0), 0);

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Electricity" subtitle={`${readings.length} readings`} showBack />
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View> : (
        <FlatList
          data={readings}
          keyExtractor={(i, idx) => `${String(i.id)}-${idx}`}
          renderItem={({ item }) => <ReadingCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListHeaderComponent={<StatCard label="Total Consumption" value={`${totalKwh.toLocaleString()} kWh`} icon="flash" color={colors.warning} style={styles.header} />}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="flash-outline" size={44} color={colors.textMuted} /><Text style={styles.emptyText}>No electricity readings</Text></View>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: colors.background },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:        { padding: spacing.md, paddingBottom: 40 },
  header:      { marginBottom: spacing.md },
  card:        { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardTop:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 6 },
  iconWrap:    { width: 36, height: 36, borderRadius: radius.sm, backgroundColor: `${colors.warning}15`, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardContent: { flex: 1 },
  date:        { ...typography.h4 },
  meter:       { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  kwh:         { fontSize: 16, fontWeight: '800', color: colors.warning },
  footer:      { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 6 },
  detail:      { ...typography.caption },
  detailVal:   { fontWeight: '700', color: colors.text },
  notes:       { ...typography.caption, color: colors.textMuted, flex: 1 },
  empty:       { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText:   { ...typography.bodySmall, color: colors.textMuted },
});
