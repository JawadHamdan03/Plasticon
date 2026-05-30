import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { colors, radius, shadow, spacing, typography } from '../../theme';

interface RegRequest {
  id: number;
  fullName: string;
  email: string;
  requestedRole?: string;
  department?: string;
  status?: string;
  reason?: string;
  createdAt: string;
}

const ROLE_COLOR: Record<string, string> = {
  ENGINEER:   colors.info,
  ACCOUNTANT: colors.success,
  WORKER:     colors.accent,
  ADMIN:      '#7C3AED',
};

function RegCard({ item, onAction }: { item: RegRequest; onAction: () => void }) {
  const status    = item.status ?? 'PENDING';
  const roleColor = ROLE_COLOR[item.requestedRole ?? ''] ?? colors.textMuted;

  const approve = async () => {
    try {
      await api.post(`/registration-requests/${item.id}/approve`, {});
      onAction();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to approve');
    }
  };
  const reject = async () => {
    try {
      await api.post(`/registration-requests/${item.id}/reject`, {});
      onAction();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to reject');
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.fullName.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.name}>{item.fullName}</Text>
          <Text style={styles.email} numberOfLines={1}>{item.email}</Text>
          {item.requestedRole && (
            <View style={[styles.roleBadge, { backgroundColor: `${roleColor}15` }]}>
              <Text style={[styles.roleText, { color: roleColor }]}>{item.requestedRole}</Text>
            </View>
          )}
        </View>
        <View style={[styles.statusBadge, status === 'PENDING' ? styles.pending : status === 'APPROVED' ? styles.approved : styles.rejected]}>
          <Text style={styles.statusText}>{status}</Text>
        </View>
      </View>
      {item.reason && <Text style={styles.reason} numberOfLines={2}>{item.reason}</Text>}
      {status === 'PENDING' && (
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.btn, styles.btnApprove]} onPress={approve} activeOpacity={0.8}>
            <Ionicons name="checkmark" size={16} color="#fff" />
            <Text style={styles.btnText}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.btnReject]} onPress={reject} activeOpacity={0.8}>
            <Ionicons name="close" size={16} color="#fff" />
            <Text style={styles.btnText}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export function RegistrationsScreen() {
  const [requests, setRequests] = useState<RegRequest[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<RegRequest[]>('/registration-requests?limit=30');
      setRequests(Array.isArray(res) ? res : []);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const pending = requests.filter((r) => r.status === 'PENDING' || !r.status).length;

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Registration Requests" subtitle={pending > 0 ? `${pending} pending` : 'All resolved'} showBack />
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View> : (
        <FlatList
          data={requests}
          keyExtractor={(i, idx) => `${String(i.id)}-${idx}`}
          renderItem={({ item }) => <RegCard item={item} onAction={() => { setLoading(true); void load(); }} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="person-add-outline" size={44} color={colors.textMuted} /><Text style={styles.emptyText}>No registration requests</Text></View>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: colors.background },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:        { padding: spacing.md, paddingBottom: 40 },
  card:        { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardTop:     { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: 8 },
  avatar:      { width: 44, height: 44, borderRadius: 22, backgroundColor: `${colors.primary}20`, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText:  { fontSize: 18, fontWeight: '700', color: colors.primary },
  cardContent: { flex: 1 },
  name:        { ...typography.h4 },
  email:       { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  roleBadge:   { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full, marginTop: 4 },
  roleText:    { fontSize: 10, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  pending:     { backgroundColor: `${colors.warning}15` },
  approved:    { backgroundColor: `${colors.success}15` },
  rejected:    { backgroundColor: `${colors.danger}15` },
  statusText:  { fontSize: 10, fontWeight: '700', color: colors.text },
  reason:      { ...typography.bodySmall, color: colors.textSecondary, marginBottom: 8 },
  actions:     { flexDirection: 'row', gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  btn:         { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 9, borderRadius: radius.sm },
  btnApprove:  { backgroundColor: colors.success },
  btnReject:   { backgroundColor: colors.danger },
  btnText:     { color: '#fff', fontWeight: '700', fontSize: 13 },
  empty:       { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText:   { ...typography.bodySmall, color: colors.textMuted },
});
