import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

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

function RegCard({ item, onAction }: { item: RegRequest; onAction: () => void }) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();

  const ROLE_COLOR: Record<string, string> = {
    ENGINEER:   colors.info,
    ACCOUNTANT: colors.success,
    WORKER:     colors.accent,
    ADMIN:      '#7C3AED',
  };

  const status    = item.status ?? 'PENDING';
  const roleColor = ROLE_COLOR[item.requestedRole ?? ''] ?? colors.textMuted;

  const approve = async () => {
    try {
      await api.post(`/registration-requests/${item.id}/approve`, {});
      onAction();
    } catch (e: any) {
      Alert.alert(isAr ? 'خطأ' : 'Error', e.message ?? 'Failed to approve');
    }
  };
  const reject = async () => {
    try {
      await api.post(`/registration-requests/${item.id}/reject`, {});
      onAction();
    } catch (e: any) {
      Alert.alert(isAr ? 'خطأ' : 'Error', e.message ?? 'Failed to reject');
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.cardTop}>
        <View style={[styles.avatar, { backgroundColor: `${colors.primary}20` }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>{item.fullName.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={[styles.name, { color: colors.text }]}>{item.fullName}</Text>
          <Text style={[styles.email, { color: colors.textMuted }]} numberOfLines={1}>{item.email}</Text>
          {item.requestedRole && (
            <View style={[styles.roleBadge, { backgroundColor: `${roleColor}15` }]}>
              <Text style={[styles.roleText, { color: roleColor }]}>{item.requestedRole}</Text>
            </View>
          )}
        </View>
        <View style={[
          styles.statusBadge,
          status === 'PENDING'
            ? { backgroundColor: `${colors.warning}15` }
            : status === 'APPROVED'
            ? { backgroundColor: `${colors.success}15` }
            : { backgroundColor: `${colors.danger}15` },
        ]}>
          <Text style={[styles.statusText, { color: colors.text }]}>{status}</Text>
        </View>
      </View>
      {item.reason && <Text style={[styles.reason, { color: colors.textSecondary }]} numberOfLines={2}>{item.reason}</Text>}
      {status === 'PENDING' && (
        <View style={[styles.actions, { borderTopColor: colors.border }]}>
          <TouchableOpacity style={[styles.btn, { backgroundColor: colors.success }]} onPress={approve} activeOpacity={0.8}>
            <Ionicons name="checkmark" size={16} color="#fff" />
            <Text style={styles.btnText}>{isAr ? 'موافقة' : 'Approve'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { backgroundColor: colors.danger }]} onPress={reject} activeOpacity={0.8}>
            <Ionicons name="close" size={16} color="#fff" />
            <Text style={styles.btnText}>{isAr ? 'رفض' : 'Reject'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export function RegistrationsScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();

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
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title={isAr ? 'طلبات التسجيل' : 'Registration Requests'}
        subtitle={pending > 0 ? `${pending} ${isAr ? 'معلق' : 'pending'}` : (isAr ? 'تم الحل' : 'All resolved')}
        showBack
      />
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(i, idx) => `${String(i.id)}-${idx}`}
          renderItem={({ item }) => <RegCard item={item} onAction={() => { setLoading(true); void load(); }} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); void load(); }}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="person-add-outline" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>{isAr ? 'لا توجد طلبات تسجيل' : 'No registration requests'}</Text>
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
  cardTop:     { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: 8 },
  avatar:      { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText:  { fontSize: 18, fontWeight: '700' },
  cardContent: { flex: 1 },
  name:        { ...typography.h4 },
  email:       { ...typography.caption, marginTop: 2 },
  roleBadge:   { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full, marginTop: 4 },
  roleText:    { fontSize: 10, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  statusText:  { fontSize: 10, fontWeight: '700' },
  reason:      { ...typography.bodySmall, marginBottom: 8 },
  actions:     { flexDirection: 'row', gap: spacing.sm, borderTopWidth: 1, paddingTop: spacing.sm },
  btn:         { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 9, borderRadius: radius.sm },
  btnText:     { color: '#fff', fontWeight: '700', fontSize: 13 },
  empty:       { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText:   { ...typography.bodySmall },
});
