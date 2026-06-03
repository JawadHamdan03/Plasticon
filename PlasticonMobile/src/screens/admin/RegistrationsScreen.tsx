import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, KeyboardAvoidingView,
  Modal, Platform, RefreshControl, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RegRequest {
  id: number;
  fullName: string;
  email: string;
  phone?: string | null;
  message?: string | null;
  requestedRole?: string;
  department?: string;
  status: string;
  role?: string | null;
  reviewNote?: string | null;
  reviewedBy?: { fullName: string } | null;
  createdAt: string;
}

interface Shift { id: number; name: string }

type StatusFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';
type RoleKey = 'WORKER' | 'ENGINEER' | 'ACCOUNTANT' | 'ADMIN';

const ROLES: RoleKey[] = ['WORKER', 'ENGINEER', 'ACCOUNTANT', 'ADMIN'];
const ROLES_WITH_SHIFT: RoleKey[] = ['WORKER', 'ENGINEER'];

const ROLE_COLOR: Record<RoleKey, string> = {
  WORKER:     '#3b82f6',
  ENGINEER:   '#8b5cf6',
  ACCOUNTANT: '#10b981',
  ADMIN:      '#f97316',
};

// ─── Approve Modal ────────────────────────────────────────────────────────────

function ApproveModal({
  request,
  shifts,
  onClose,
  onSuccess,
}: {
  request: RegRequest;
  shifts: Shift[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();

  const [selectedRole, setSelectedRole] = useState<RoleKey>('WORKER');
  const [selectedShiftId, setSelectedShiftId] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [saving, setSaving] = useState(false);

  const needsShift = ROLES_WITH_SHIFT.includes(selectedRole);

  const handleApprove = async () => {
    if (needsShift && shifts.length > 0 && !selectedShiftId) {
      Alert.alert(
        isAr ? 'مطلوب' : 'Required',
        isAr ? 'يرجى تحديد وردية للدور المختار.' : 'Please select a shift for this role.',
      );
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = { role: selectedRole, reviewNote };
      if (needsShift && selectedShiftId) body.shiftId = Number(selectedShiftId);
      await api.patch(`/registration-requests/${request.id}/approve`, body);
      onSuccess();
    } catch (e: any) {
      Alert.alert(isAr ? 'خطأ' : 'Error', e.message ?? 'Failed to approve');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={[styles.modalIconBox, { backgroundColor: `${colors.success}15` }]}>
              <Ionicons name="checkmark-circle" size={22} color={colors.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {isAr ? 'الموافقة على الطلب' : 'Approve Request'}
              </Text>
              <Text style={[styles.modalSub, { color: colors.textMuted }]} numberOfLines={1}>
                {request.fullName} · {request.email}
              </Text>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Role selector */}
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
              {isAr ? 'اختر الدور *' : 'Select Role *'}
            </Text>
            <View style={styles.roleGrid}>
              {ROLES.map((role) => {
                const active = selectedRole === role;
                const color = ROLE_COLOR[role];
                return (
                  <TouchableOpacity
                    key={role}
                    style={[
                      styles.roleBtn,
                      { borderColor: active ? color : colors.border, backgroundColor: active ? `${color}18` : colors.surfaceAlt },
                    ]}
                    onPress={() => { setSelectedRole(role); setSelectedShiftId(''); }}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.roleBtnText, { color: active ? color : colors.text }]}>{role}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Shift selector */}
            {needsShift && (
              <>
                <Text style={[styles.fieldLabel, { color: colors.textMuted, marginTop: spacing.sm }]}>
                  {isAr ? `الوردية (مطلوبة لـ ${selectedRole})` : `Shift (required for ${selectedRole})`}
                </Text>
                {shifts.length === 0 ? (
                  <Text style={[styles.noShifts, { color: colors.textMuted }]}>
                    {isAr ? 'لا توجد وردياات. أنشئ وردية أولاً.' : 'No shifts configured. Create a shift first.'}
                  </Text>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
                    {shifts.map((s) => {
                      const active = selectedShiftId === String(s.id);
                      const letter = s.name.replace(/[^A-Ca-c]/g, '').toUpperCase() || (s.name[0] ?? '').toUpperCase();
                      const color = ({ A: '#3b82f6', B: '#f97316', C: '#8b5cf6' } as Record<string, string>)[letter] ?? '#64748b';
                      return (
                        <TouchableOpacity
                          key={s.id}
                          style={[
                            styles.shiftBtn,
                            { borderColor: active ? color : colors.border, backgroundColor: active ? `${color}15` : colors.surfaceAlt },
                          ]}
                          onPress={() => setSelectedShiftId(String(s.id))}
                          activeOpacity={0.75}
                        >
                          <Text style={[styles.shiftLetter, { color: active ? color : colors.text }]}>{letter}</Text>
                          <Text style={[styles.shiftName, { color: active ? color : colors.textMuted }]}>{s.name}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}
              </>
            )}

            {/* Review note */}
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
                {isAr ? 'ملاحظة المراجعة (اختياري)' : 'Review Note (optional)'}
              </Text>
              <TextInput
                style={[styles.input, styles.inputMulti, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                multiline
                numberOfLines={2}
                placeholder={isAr ? 'ملاحظة...' : 'e.g. Assigned to morning shift'}
                placeholderTextColor={colors.textMuted}
                value={reviewNote}
                onChangeText={setReviewNote}
              />
            </View>

            {/* Email notice */}
            <View style={[styles.notice, { backgroundColor: `${colors.info}10`, borderColor: `${colors.info}25` }]}>
              <Ionicons name="mail-outline" size={14} color={colors.info} />
              <Text style={[styles.noticeText, { color: colors.textMuted }]}>
                {isAr
                  ? `سيتم إرسال بريد إلكتروني إلى ${request.email} لتعيين كلمة المرور.`
                  : `An email will be sent to ${request.email} to set their password.`}
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={onClose}>
                <Text style={[styles.cancelText, { color: colors.textMuted }]}>{isAr ? 'إلغاء' : 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.approveBtn,
                  { backgroundColor: colors.success },
                  (saving || (needsShift && shifts.length > 0 && !selectedShiftId)) && { opacity: 0.55 },
                ]}
                onPress={handleApprove}
                disabled={saving || (needsShift && shifts.length > 0 && !selectedShiftId)}
                activeOpacity={0.8}
              >
                {saving
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.approveBtnText}>{isAr ? 'موافقة وإنشاء حساب' : 'Approve & Create Account'}</Text>
                }
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function RegCard({
  item,
  onApprove,
  onReject,
}: {
  item: RegRequest;
  onApprove: (r: RegRequest) => void;
  onReject: (r: RegRequest) => void;
}) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();

  const status    = item.status ?? 'PENDING';
  const roleKey   = (item.role ?? item.requestedRole ?? '') as RoleKey;
  const roleColor = ROLE_COLOR[roleKey] ?? colors.textMuted;

  const statusStyle = {
    PENDING:  { bg: `${colors.warning}18`,  color: colors.warning },
    APPROVED: { bg: `${colors.success}18`,  color: colors.success },
    REJECTED: { bg: `${colors.danger}18`,   color: colors.danger  },
  }[status] ?? { bg: `${colors.textMuted}18`, color: colors.textMuted };

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.cardTop}>
        <View style={[styles.avatar, { backgroundColor: `${colors.primary}20` }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>{item.fullName.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={[styles.name, { color: colors.text }]}>{item.fullName}</Text>
          <Text style={[styles.email, { color: colors.textMuted }]} numberOfLines={1}>{item.email}</Text>
          {roleKey ? (
            <View style={[styles.roleBadge, { backgroundColor: `${roleColor}15` }]}>
              <Text style={[styles.roleText, { color: roleColor }]}>{roleKey}</Text>
            </View>
          ) : null}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
          <Text style={[styles.statusText, { color: statusStyle.color }]}>{status}</Text>
        </View>
      </View>

      {item.message ? (
        <Text style={[styles.reason, { color: colors.textSecondary }]} numberOfLines={2}>{item.message}</Text>
      ) : null}

      {item.reviewedBy && (
        <Text style={[styles.reviewedBy, { color: colors.textMuted }]}>
          {isAr ? `راجعه: ${item.reviewedBy.fullName}` : `Reviewed by ${item.reviewedBy.fullName}`}
          {item.reviewNote ? ` — "${item.reviewNote}"` : ''}
        </Text>
      )}

      {status === 'PENDING' && (
        <View style={[styles.actions, { borderTopColor: colors.border }]}>
          <TouchableOpacity style={[styles.btn, { backgroundColor: colors.success }]} onPress={() => onApprove(item)} activeOpacity={0.8}>
            <Ionicons name="checkmark" size={16} color="#fff" />
            <Text style={styles.btnText}>{isAr ? 'موافقة' : 'Approve'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { backgroundColor: colors.danger }]} onPress={() => onReject(item)} activeOpacity={0.8}>
            <Ionicons name="close" size={16} color="#fff" />
            <Text style={styles.btnText}>{isAr ? 'رفض' : 'Reject'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function RegistrationsScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();

  const [requests, setRequests]         = useState<RegRequest[]>([]);
  const [shifts, setShifts]             = useState<Shift[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('PENDING');
  const [approveTarget, setApproveTarget] = useState<RegRequest | null>(null);

  const load = useCallback(async () => {
    try {
      const qs = statusFilter !== 'ALL' ? `?status=${statusFilter}` : '';
      const [res, sRes] = await Promise.allSettled([
        api.get<RegRequest[]>(`/registration-requests${qs}`),
        api.get<Shift[]>('/shifts'),
      ]);
      if (res.status === 'fulfilled') setRequests(Array.isArray(res.value) ? res.value : []);
      else setRequests([]);
      if (sRes.status === 'fulfilled') setShifts(Array.isArray(sRes.value) ? sRes.value : []);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter]);

  useEffect(() => { void load(); }, [load]);

  const handleReject = (item: RegRequest) => {
    Alert.alert(
      isAr ? 'رفض الطلب' : 'Reject Request',
      isAr ? `هل أنت متأكد من رفض طلب ${item.fullName}؟` : `Reject registration request from ${item.fullName}?`,
      [
        { text: isAr ? 'إلغاء' : 'Cancel', style: 'cancel' },
        {
          text: isAr ? 'رفض' : 'Reject', style: 'destructive',
          onPress: async () => {
            try {
              await api.patch(`/registration-requests/${item.id}/reject`, { reviewNote: '' });
              void load();
            } catch (e: any) {
              Alert.alert(isAr ? 'خطأ' : 'Error', e.message ?? 'Failed to reject');
            }
          },
        },
      ],
    );
  };

  const pending = requests.filter(r => r.status === 'PENDING').length;

  const FILTER_TABS: { key: StatusFilter; label: string; labelAr: string }[] = [
    { key: 'ALL',      label: 'All',      labelAr: 'الكل' },
    { key: 'PENDING',  label: 'Pending',  labelAr: 'معلق' },
    { key: 'APPROVED', label: 'Approved', labelAr: 'موافق' },
    { key: 'REJECTED', label: 'Rejected', labelAr: 'مرفوض' },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title={isAr ? 'طلبات التسجيل' : 'Registration Requests'}
        subtitle={pending > 0 ? `${pending} ${isAr ? 'معلق' : 'pending'}` : (isAr ? 'لا يوجد معلق' : 'All resolved')}
        showBack
      />

      {/* Filter tabs */}
      <View style={[styles.tabs, { backgroundColor: colors.surfaceAlt }]}>
        {FILTER_TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            onPress={() => setStatusFilter(t.key)}
            style={[styles.tab, statusFilter === t.key && { backgroundColor: colors.surface, ...shadow.sm }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, { color: statusFilter === t.key ? colors.text : colors.textMuted }]}>
              {isAr ? t.labelAr : t.label}
              {t.key === 'PENDING' && pending > 0 ? ` (${pending})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(i, idx) => `${String(i.id)}-${idx}`}
          renderItem={({ item }) => (
            <RegCard
              item={item}
              onApprove={setApproveTarget}
              onReject={handleReject}
            />
          )}
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
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {isAr ? 'لا توجد طلبات تسجيل' : 'No registration requests'}
              </Text>
            </View>
          }
        />
      )}

      {approveTarget && (
        <ApproveModal
          request={approveTarget}
          shifts={shifts}
          onClose={() => setApproveTarget(null)}
          onSuccess={() => {
            setApproveTarget(null);
            setLoading(true);
            void load();
          }}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:    { flex: 1 },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:    { padding: spacing.md, paddingBottom: 40 },

  tabs:    { flexDirection: 'row', margin: spacing.md, marginBottom: 0, borderRadius: radius.md, padding: 3 },
  tab:     { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: radius.sm - 2 },
  tabText: { fontSize: 11, fontWeight: '600' },

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
  reason:      { ...typography.bodySmall, marginBottom: 4 },
  reviewedBy:  { ...typography.caption, fontStyle: 'italic', marginBottom: 4 },
  actions:     { flexDirection: 'row', gap: spacing.sm, borderTopWidth: 1, paddingTop: spacing.sm },
  btn:         { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 9, borderRadius: radius.sm },
  btnText:     { color: '#fff', fontWeight: '700', fontSize: 13 },
  empty:       { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText:   { ...typography.bodySmall },

  // Modal
  overlay:      { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:        { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: 40, maxHeight: '92%' },
  handle:       { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  modalHeader:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  modalIconBox: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  modalTitle:   { ...typography.h3 },
  modalSub:     { ...typography.caption, marginTop: 2 },
  fieldLabel:   { ...typography.caption, marginBottom: 6 },
  field:        { marginBottom: spacing.md },
  roleGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  roleBtn:      { paddingHorizontal: 18, paddingVertical: 10, borderRadius: radius.sm, borderWidth: 1.5 },
  roleBtnText:  { fontWeight: '700', fontSize: 13 },
  shiftBtn:     { width: 70, alignItems: 'center', paddingVertical: 10, borderRadius: radius.sm, borderWidth: 1.5, marginRight: spacing.sm },
  shiftLetter:  { fontSize: 20, fontWeight: '900' },
  shiftName:    { fontSize: 10, fontWeight: '600', marginTop: 2 },
  noShifts:     { ...typography.bodySmall, marginBottom: spacing.md },
  input:        { borderWidth: 1.5, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 11, fontSize: 15 },
  inputMulti:   { height: 70, textAlignVertical: 'top' },
  notice:       { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, marginBottom: spacing.md },
  noticeText:   { ...typography.caption, flex: 1 },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  cancelBtn:    { flex: 1, paddingVertical: 13, borderRadius: radius.md, borderWidth: 1.5, alignItems: 'center' },
  cancelText:   { ...typography.body, fontWeight: '600' },
  approveBtn:   { flex: 2, paddingVertical: 13, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  approveBtnText: { ...typography.body, fontWeight: '700', color: '#fff' },
});
