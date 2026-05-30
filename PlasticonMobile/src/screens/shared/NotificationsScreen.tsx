import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, RefreshControl,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { Notification } from '../../api/types';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

const TYPE_ICON: Record<string, string> = {
  ALERT:      'warning',
  INFO:       'information-circle',
  SUCCESS:    'checkmark-circle',
  WARNING:    'alert-circle',
  REMINDER:   'alarm',
};

function fmtAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)   return 'Just now';
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function NotifRow({
  item, onRead, colors,
}: { item: Notification; onRead: (id: number) => void; colors: any }) {
  const TYPE_COLOR: Record<string, string> = {
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
      style={[
        styles.row,
        { backgroundColor: colors.surface },
        !item.isRead && { backgroundColor: colors.primaryLight + '30' },
      ]}
      onPress={() => !item.isRead && onRead(item.id)}
      activeOpacity={0.75}
    >
      {!item.isRead && <View style={[styles.unreadDot, { backgroundColor: color }]} />}
      <View style={[styles.iconWrap, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <View style={styles.rowContent}>
        <View style={styles.rowTop}>
          <Text style={[styles.rowTitle, { color: colors.text }, !item.isRead && styles.rowTitleUnread]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[styles.rowTime, { color: colors.textMuted }]}>{fmtAgo(item.createdAt)}</Text>
        </View>
        <Text style={[styles.rowMsg, { color: colors.textMuted }]} numberOfLines={2}>{item.message}</Text>
      </View>
    </TouchableOpacity>
  );
}

export function NotificationsScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();

  const [notifs, setNotifs]     = useState<Notification[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ notifications: Notification[] }>('/notifications?limit=50');
      setNotifs(res.notifications ?? []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const markRead = async (id: number) => {
    try {
      await api.patch(`/notifications/${id}/read`, {});
      setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all', {});
      setNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {}
  };

  const unreadCount = notifs.filter((n) => !n.isRead).length;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {isAr ? 'الإشعارات' : 'Notifications'}
          </Text>
          {unreadCount > 0 && (
            <Text style={[styles.headerSub, { color: colors.primary }]}>{unreadCount} unread</Text>
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

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={notifs}
          keyExtractor={(i, idx) => `${String(i.id)}-${idx}`}
          renderItem={({ item }) => <NotifRow item={item} onRead={markRead} colors={colors} />}
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
                {isAr ? 'لا توجد إشعارات' : 'No notifications'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm,
  },
  headerTitle: { ...typography.h2 },
  headerSub:   { ...typography.caption, marginTop: 2 },
  markAllBtn:  { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full },
  markAllText: { fontSize: 12, fontWeight: '700' },

  list: { padding: spacing.md, paddingBottom: 40 },

  row: {
    flexDirection: 'row', alignItems: 'flex-start',
    borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.sm,
    gap: spacing.sm, ...shadow.sm,
  },
  unreadDot: {
    position: 'absolute', top: 14, left: 6,
    width: 7, height: 7, borderRadius: 4,
  },
  iconWrap: {
    width: 40, height: 40, borderRadius: radius.sm,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  rowContent: { flex: 1 },
  rowTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  rowTitle:   { ...typography.h4, flex: 1, marginRight: 8 },
  rowTitleUnread: { fontWeight: '700' },
  rowTime:    { ...typography.caption, flexShrink: 0 },
  rowMsg:     { ...typography.bodySmall },

  empty:     { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText: { ...typography.bodySmall },
});
