import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { colors, radius, shadow, spacing, typography } from '../../theme';

interface User {
  id: number;
  fullName: string;
  email: string;
  role?: string;
  isActive?: boolean;
  department?: string;
  createdAt: string;
}

const ROLE_COLOR: Record<string, string> = {
  ADMIN:      '#7C3AED',
  ENGINEER:   colors.info,
  ACCOUNTANT: colors.success,
  WORKER:     colors.accent,
};

function UserCard({ item }: { item: User }) {
  const roleColor = ROLE_COLOR[item.role ?? ''] ?? colors.textMuted;
  const initials  = item.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <View style={[styles.card, !item.isActive && styles.cardInactive]}>
      <View style={[styles.avatar, { backgroundColor: `${roleColor}20` }]}>
        <Text style={[styles.avatarText, { color: roleColor }]}>{initials}</Text>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.name}>{item.fullName}</Text>
        <Text style={styles.email} numberOfLines={1}>{item.email}</Text>
        {item.department && <Text style={styles.dept}>{item.department}</Text>}
      </View>
      <View style={styles.right}>
        {item.role && (
          <View style={[styles.roleBadge, { backgroundColor: `${roleColor}15` }]}>
            <Text style={[styles.roleText, { color: roleColor }]}>{item.role}</Text>
          </View>
        )}
        {item.isActive === false && (
          <View style={styles.inactiveBadge}>
            <Text style={styles.inactiveText}>Inactive</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export function UsersAdminScreen() {
  const [users, setUsers]       = useState<User[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ users: User[] }>('/users?limit=50');
      setUsers(res.users ?? []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Users" subtitle={`${users.length} accounts`} showBack />
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View> : (
        <FlatList
          data={users}
          keyExtractor={(i) => String(i.id)}
          renderItem={({ item }) => <UserCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="people-outline" size={44} color={colors.textMuted} /><Text style={styles.emptyText}>No users found</Text></View>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: colors.background },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:        { padding: spacing.md, paddingBottom: 40 },
  card:        { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, gap: spacing.md, ...shadow.sm },
  cardInactive: { opacity: 0.55 },
  avatar:      { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText:  { fontSize: 16, fontWeight: '700' },
  cardContent: { flex: 1 },
  name:        { ...typography.h4 },
  email:       { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  dept:        { ...typography.caption, color: colors.textSecondary, marginTop: 1 },
  right:       { alignItems: 'flex-end', gap: 4 },
  roleBadge:   { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  roleText:    { fontSize: 10, fontWeight: '700' },
  inactiveBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full, backgroundColor: `${colors.textMuted}20` },
  inactiveText:  { fontSize: 9, fontWeight: '700', color: colors.textMuted },
  empty:       { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText:   { ...typography.bodySmall, color: colors.textMuted },
});
