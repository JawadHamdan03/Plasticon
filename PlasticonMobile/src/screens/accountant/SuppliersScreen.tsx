import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { colors, radius, shadow, spacing, typography } from '../../theme';

interface Supplier {
  id: number;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  category?: string;
  totalOrders?: number;
  createdAt: string;
}

function SupplierCard({ item }: { item: Supplier }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.name}>{item.name}</Text>
          {item.contactPerson && <Text style={styles.contact}>{item.contactPerson}</Text>}
        </View>
        {item.category && (
          <View style={styles.catBadge}>
            <Text style={styles.catText}>{item.category}</Text>
          </View>
        )}
      </View>
      <View style={styles.footer}>
        {item.email && (
          <View style={styles.footerItem}>
            <Ionicons name="mail-outline" size={13} color={colors.textMuted} />
            <Text style={styles.footerText} numberOfLines={1}>{item.email}</Text>
          </View>
        )}
        {item.phone && (
          <View style={styles.footerItem}>
            <Ionicons name="call-outline" size={13} color={colors.textMuted} />
            <Text style={styles.footerText}>{item.phone}</Text>
          </View>
        )}
        {item.totalOrders != null && (
          <View style={styles.footerItem}>
            <Ionicons name="cube-outline" size={13} color={colors.textMuted} />
            <Text style={styles.footerText}>{item.totalOrders} orders</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export function SuppliersScreen() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ suppliers: Supplier[] }>('/suppliers?limit=30');
      setSuppliers(res.suppliers ?? []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Suppliers" subtitle={`${suppliers.length} suppliers`} showBack />
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View> : (
        <FlatList
          data={suppliers}
          keyExtractor={(i) => String(i.id)}
          renderItem={({ item }) => <SupplierCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="business-outline" size={44} color={colors.textMuted} /><Text style={styles.emptyText}>No suppliers</Text></View>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: colors.background },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:        { padding: spacing.md, paddingBottom: 40 },
  card:        { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardTop:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 8 },
  avatar:      { width: 42, height: 42, borderRadius: 21, backgroundColor: `${colors.primary}20`, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText:  { fontSize: 18, fontWeight: '700', color: colors.primary },
  cardContent: { flex: 1 },
  name:        { ...typography.h4 },
  contact:     { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  catBadge:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full, backgroundColor: `${colors.info}15` },
  catText:     { fontSize: 10, fontWeight: '700', color: colors.info },
  footer:      { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 },
  footerItem:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerText:  { ...typography.caption, maxWidth: 140 },
  empty:       { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText:   { ...typography.bodySmall, color: colors.textMuted },
});
