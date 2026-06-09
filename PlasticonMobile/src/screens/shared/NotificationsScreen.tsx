import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, Modal, RefreshControl, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../api/client';
import { Notification } from '../../api/types';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

const NOTIF_TYPES = [
  'SYSTEM_MESSAGE', 'PRODUCTION_ALERT', 'MAINTENANCE_URGENT',
  'QUALITY_ISSUE', 'PAYROLL_READY', 'INVENTORY_LOW', 'CHAT_MESSAGE',
];

const TYPE_ICON: Record<string, string> = {
  SYSTEM_MESSAGE:     'settings',
  PRODUCTION_ALERT:   'construct',
  MAINTENANCE_URGENT: 'build',
  QUALITY_ISSUE:      'checkmark-done',
  PAYROLL_READY:      'cash',
  INVENTORY_LOW:      'alert-circle',
  CHAT_MESSAGE:       'chatbubble',
  ALERT:    'warning',
  INFO:     'information-circle',
  SUCCESS:  'checkmark-circle',
  WARNING:  'alert-circle',
  REMINDER: 'alarm',
};

function fmtAgo(iso: string, isAr: boolean) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return isAr ? 'الآن'             : 'Just now';
  if (m < 60) return isAr ? `${m}د`             : `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return isAr ? `${h}س`             : `${h}h ago`;
  return isAr ? `${Math.floor(h / 24)}ي`         : `${Math.floor(h / 24)}d ago`;
}

function NotifRow({ item, onRead }: { item: Notification; onRead: (id: number) => void }) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();

  const TYPE_COLOR: Record<string, string> = {
    SYSTEM_MESSAGE:     colors.info,
    PRODUCTION_ALERT:   colors.warning,
    MAINTENANCE_URGENT: colors.danger,
    QUALITY_ISSUE:      colors.accent,
    PAYROLL_READY:      colors.success,
    INVENTORY_LOW:      colors.warning,
    CHAT_MESSAGE:       colors.primary,
    ALERT:    colors.danger,
    INFO:     colors.info,
    SUCCESS:  colors.success,
    WARNING:  colors.warning,
    REMINDER: colors.accent,
  };

  const type  = item.type ?? 'INFO';
  const icon  = TYPE_ICON[type] ?? 'notifications';
  const color = TYPE_COLOR[type] ?? colors.primary;

  return (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: item.isRead ? colors.surface : `${colors.primary}10` }]}
      onPress={() => !item.isRead && onRead(item.id)}
      activeOpacity={0.75}
    >
      {!item.isRead && <View style={[styles.unreadDot, { backgroundColor: color }]} />}
      <View style={[styles.iconWrap, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <View style={styles.rowContent}>
        <View style={styles.rowTop}>
          <Text
            style={[styles.rowTitle, { color: colors.text, fontWeight: item.isRead ? '500' : '700' }]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text style={[styles.rowTime, { color: colors.textMuted }]}>{fmtAgo(item.createdAt, isAr)}</Text>
        </View>
        <Text style={[styles.rowMsg, { color: colors.textMuted }]} numberOfLines={2}>{item.message}</Text>
      </View>
    </TouchableOpacity>
  );
}

const ROLES = [
  { key: 'SALES_REP', labelEn: 'Sales Rep', labelAr: 'مندوب مبيعات' },
  { key: 'WORKER',    labelEn: 'Worker',     labelAr: 'عامل'          },
  { key: 'ENGINEER',  labelEn: 'Engineer',   labelAr: 'مهندس'         },
  { key: 'ACCOUNTANT',labelEn: 'Accountant', labelAr: 'محاسب'         },
] as const;

interface SendForm {
  type: string;
  targetType: 'ALL' | 'USER' | 'SHIFT' | 'ROLE';
  title: string;
  message: string;
  userId: string;
  shiftId: string;
  role: string;
}

function AdminSendModal({
  visible, onClose, onSent,
}: { visible: boolean; onClose: () => void; onSent: () => void }) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const [form, setForm] = useState<SendForm>({
    type: 'SYSTEM_MESSAGE', targetType: 'ALL', title: '', message: '', userId: '', shiftId: '', role: 'SALES_REP',
  });
  const [sending, setSending] = useState(false);
  const [users,  setUsers]  = useState<{ id: number; fullName: string }[]>([]);
  const [shifts, setShifts] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    if (!visible) return;
    api.get<any[]>('/users/all').then(r => setUsers(Array.isArray(r) ? r : [])).catch(() => {});
    api.get<any[]>('/shifts').then(r => setShifts(Array.isArray(r) ? r : [])).catch(() => {});
  }, [visible]);

  const U = (field: keyof SendForm, val: string) => setForm(f => ({ ...f, [field]: val }));

  const send = async () => {
    if (!form.title.trim() || !form.message.trim()) return;
    setSending(true);
    try {
      const body: any = {
        type: form.type,
        targetType: form.targetType,
        title: form.title.trim(),
        message: form.message.trim(),
      };
      if (form.targetType === 'USER'  && form.userId)  body.userId  = Number(form.userId);
      if (form.targetType === 'SHIFT' && form.shiftId) body.shiftId = Number(form.shiftId);
      if (form.targetType === 'ROLE')                  body.role    = form.role;
      await api.post('/notifications', body);
      setForm({ type: 'SYSTEM_MESSAGE', targetType: 'ALL', title: '', message: '', userId: '', shiftId: '', role: 'SALES_REP' });
      onSent();
    } catch {} finally { setSending(false); }
  };

  const chip = (active: boolean) => ({
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full,
    backgroundColor: active ? colors.primary : colors.surfaceAlt,
    borderWidth: 1, borderColor: active ? colors.primary : colors.border,
    marginRight: 6,
  });
  const chipTxt = (active: boolean): any => ({
    fontSize: 11, fontWeight: '600', color: active ? '#fff' : colors.textMuted,
  });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <SafeAreaView style={[styles.sheet, { backgroundColor: colors.surface }]} edges={['bottom']}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>
              {isAr ? 'إرسال إشعار' : 'Send Notification'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.md }}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{isAr ? 'النوع' : 'Type'}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
              <View style={{ flexDirection: 'row' }}>
                {NOTIF_TYPES.map(t => (
                  <TouchableOpacity key={t} style={chip(form.type === t)} onPress={() => U('type', t)}>
                    <Text style={chipTxt(form.type === t)}>{t.replace(/_/g, ' ')}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{isAr ? 'الهدف' : 'Target'}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.md }}>
              {(['ALL', 'ROLE', 'USER', 'SHIFT'] as const).map(t => (
                <TouchableOpacity key={t} style={chip(form.targetType === t)} onPress={() => U('targetType', t)}>
                  <Text style={chipTxt(form.targetType === t)}>
                    {t === 'ALL' ? (isAr ? 'الكل' : 'All')
                      : t === 'USER'  ? (isAr ? 'مستخدم' : 'User')
                      : t === 'SHIFT' ? (isAr ? 'وردية' : 'Shift')
                      :                 (isAr ? 'دور' : 'Role')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {form.targetType === 'ROLE' && (
              <>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{isAr ? 'اختر الدور' : 'Select Role'}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.md }}>
                  {ROLES.map(r => (
                    <TouchableOpacity key={r.key} style={[chip(form.role === r.key), { marginBottom: 6 }]} onPress={() => U('role', r.key)}>
                      <Text style={chipTxt(form.role === r.key)}>{isAr ? r.labelAr : r.labelEn}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {form.targetType === 'USER' && users.length > 0 && (
              <>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{isAr ? 'اختر مستخدم' : 'Select User'}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
                  <View style={{ flexDirection: 'row' }}>
                    {users.map(u => (
                      <TouchableOpacity key={u.id} style={chip(form.userId === String(u.id))} onPress={() => U('userId', String(u.id))}>
                        <Text style={chipTxt(form.userId === String(u.id))}>{u.fullName}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </>
            )}
            {form.targetType === 'SHIFT' && shifts.length > 0 && (
              <>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{isAr ? 'اختر وردية' : 'Select Shift'}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.md }}>
                  {shifts.map(s => (
                    <TouchableOpacity key={s.id} style={[chip(form.shiftId === String(s.id)), { marginBottom: 6 }]} onPress={() => U('shiftId', String(s.id))}>
                      <Text style={chipTxt(form.shiftId === String(s.id))}>{s.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{isAr ? 'العنوان *' : 'Title *'}</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
              value={form.title}
              onChangeText={v => U('title', v)}
              placeholder={isAr ? 'عنوان الإشعار' : 'Notification title'}
              placeholderTextColor={colors.textMuted}
            />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{isAr ? 'الرسالة *' : 'Message *'}</Text>
            <TextInput
              style={[styles.input, styles.textarea, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
              value={form.message}
              onChangeText={v => U('message', v)}
              placeholder={isAr ? 'محتوى الإشعار' : 'Notification message'}
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { borderColor: colors.border, borderWidth: 1.5 }]} onPress={onClose}>
                <Text style={{ color: colors.textMuted, fontWeight: '600' }}>{isAr ? 'إلغاء' : 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { flex: 2, backgroundColor: colors.primary }]} onPress={send} disabled={sending}>
                {sending
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={{ color: '#fff', fontWeight: '700' }}>{isAr ? 'إرسال' : 'Send'}</Text>
                }
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

export function NotificationsScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const { user } = useAuth();

  const [notifs,    setNotifs]     = useState<Notification[]>([]);
  const [loading,   setLoading]    = useState(true);
  const [refreshing,setRefreshing] = useState(false);
  const [tab,       setTab]        = useState<'all' | 'unread'>('all');
  const [showSend,  setShowSend]   = useState(false);

  const isAdmin = user?.role === 'ADMIN';

  const load = useCallback(async () => {
    try {
      const res = await api.get<any>('/notifications?limit=50');
      const list: Notification[] = Array.isArray(res)
        ? res
        : Array.isArray(res?.items)
          ? res.items
          : [];
      setNotifs(list);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const markRead = async (id: number) => {
    try {
      await api.patch(`/notifications/${id}/read`, {});
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all', {});
      setNotifs(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch {}
  };

  const unreadCount = notifs.filter(n => !n.isRead).length;
  const visible     = tab === 'unread' ? notifs.filter(n => !n.isRead) : notifs;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {isAr ? 'الإشعارات' : 'Notifications'}
          </Text>
          {unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.danger }]}>
              <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity
            style={[styles.markAllBtn, { backgroundColor: colors.primaryLight }]}
            onPress={markAllRead}
          >
            <Text style={[styles.markAllText, { color: colors.primary }]}>
              {isAr ? 'تحديد الكل كمقروء' : 'Mark all read'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter tabs */}
      <View style={[styles.tabs, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {(['all', 'unread'] as const).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && { borderBottomWidth: 2, borderBottomColor: colors.primary }]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, { color: tab === t ? colors.primary : colors.textMuted }]}>
              {t === 'all'
                ? (isAr ? 'الكل' : 'All')
                : `${isAr ? 'غير مقروء' : 'Unread'}${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(i, idx) => `${String(i.id)}-${idx}`}
          renderItem={({ item }) => <NotifRow item={item} onRead={markRead} />}
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
              <Ionicons name="notifications-off-outline" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {tab === 'unread'
                  ? (isAr ? 'لا توجد إشعارات غير مقروءة' : 'No unread notifications')
                  : (isAr ? 'لا توجد إشعارات' : 'No notifications')}
              </Text>
            </View>
          }
        />
      )}

      {/* Admin FAB */}
      {isAdmin && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() => setShowSend(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={26} color="#fff" />
        </TouchableOpacity>
      )}

      <AdminSendModal
        visible={showSend}
        onClose={() => setShowSend(false)}
        onSent={() => { setShowSend(false); void load(); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { ...typography.h2 },
  badge:       { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center' },
  badgeText:   { color: '#fff', fontSize: 11, fontWeight: '700' },
  markAllBtn:  { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full },
  markAllText: { fontSize: 12, fontWeight: '700' },

  tabs:    { flexDirection: 'row', borderBottomWidth: 1 },
  tab:     { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabText: { fontSize: 13, fontWeight: '600' },

  list: { padding: spacing.md, paddingBottom: 100 },

  row: {
    flexDirection: 'row', alignItems: 'flex-start',
    borderRadius: radius.md, padding: spacing.md,
    marginBottom: spacing.sm, gap: spacing.sm, ...shadow.sm,
  },
  unreadDot:  { position: 'absolute', top: 14, left: 6, width: 7, height: 7, borderRadius: 4 },
  iconWrap:   { width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rowContent: { flex: 1 },
  rowTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  rowTitle:   { ...typography.h4, flex: 1, marginRight: 8 },
  rowTime:    { ...typography.caption, flexShrink: 0 },
  rowMsg:     { ...typography.bodySmall },

  empty:     { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText: { ...typography.bodySmall },

  fab: {
    position: 'absolute', bottom: 28, right: 24,
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    ...shadow.sm,
  },

  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:       { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  sheetTitle:  { ...typography.h3 },
  fieldLabel:  { ...typography.caption, fontWeight: '600', marginBottom: 6, marginTop: spacing.sm },
  input:       { borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, marginBottom: spacing.md },
  textarea:    { minHeight: 80, textAlignVertical: 'top' },
  modalActions:{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, marginBottom: spacing.md },
  modalBtn:    { flex: 1, paddingVertical: 12, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
