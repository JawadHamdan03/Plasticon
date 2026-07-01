import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { User } from '../api/types';
import { api } from '../api/client';
import { useAppTheme } from '../context/ThemeContext';
import { roleColor, spacing, typography } from '../theme';

const ROLE_LABEL: Record<string, string> = {
  ADMIN:      'مدير',
  WORKER:     'عامل',
  ENGINEER:   'مهندس',
  ACCOUNTANT: 'محاسب',
  SALES_REP:  'مندوب مبيعات',
};

interface Props {
  user: User;
}

export function AppTopBar({ user }: Props) {
  const insets   = useSafeAreaInsets();
  const { colors, isDark, toggleTheme } = useAppTheme();
  const navigation = useNavigation();
  const rColor     = roleColor(user.role);
  const firstName  = user.fullName?.split(' ')[0] ?? user.username ?? 'المستخدم';
  const roleLabel  = ROLE_LABEL[user.role] ?? user.role;

  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnread = () => {
      api.get<{ count: number }>('/notifications/unread-count')
        .then(r => setUnreadCount(r?.count ?? 0))
        .catch(() => {});
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 15_000);
    return () => clearInterval(interval);
  }, []);

  const openNotifications = () => {
    const tabNav = navigation.getParent<any>();
    const nav    = tabNav ?? navigation;
    if (user.role === 'ADMIN') {
      nav.navigate('More', { screen: 'Notifications' });
    } else {
      nav.navigate('Personal', { screen: 'Notifications' });
    }
  };

  return (
    <View style={[styles.bar, { paddingTop: insets.top, backgroundColor: colors.tabBar }]}>
      {/* ── Logo ── */}
      <View style={styles.logoRow}>
        <View style={[styles.logoMark, { backgroundColor: colors.accent }]}>
          <Text style={[styles.logoMarkText, { color: colors.tabBar }]}>P</Text>
        </View>
        <View>
          <Text style={[styles.logoName, { color: colors.textInverse }]}>PLASTICON</Text>
          <Text style={styles.logoTagline}>إدارة المصنع</Text>
        </View>
      </View>

      {/* ── Controls + User ── */}
      <View style={styles.rightSection}>
        {/* Theme toggle */}
        <TouchableOpacity
          onPress={toggleTheme}
          style={[styles.iconBtn, { borderColor: '#1E2A3A' }]}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isDark ? 'sunny' : 'moon'}
            size={16}
            color={isDark ? colors.accent : '#94A3B8'}
          />
        </TouchableOpacity>

        {/* Notification bell */}
        <TouchableOpacity
          onPress={openNotifications}
          style={[styles.iconBtn, { borderColor: '#1E2A3A' }]}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications" size={16} color={unreadCount > 0 ? colors.accent : '#94A3B8'} />
          {unreadCount > 0 && (
            <View style={[styles.notifBadge, { backgroundColor: colors.danger }]}>
              <Text style={styles.notifBadgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* User info */}
        <View style={styles.userRow}>
          <Text style={styles.userName} numberOfLines={1}>{firstName}</Text>
          <View style={[styles.roleBadge, { backgroundColor: rColor + '22' }]}>
            <View style={[styles.roleDot, { backgroundColor: rColor }]} />
            <Text style={[styles.roleText, { color: rColor }]}>{roleLabel}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E2A3A',
  },
  logoRow:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoMark:    { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  logoMarkText: { fontSize: 16, fontWeight: '900', letterSpacing: -0.5 },
  logoName:    { fontSize: 14, fontWeight: '800', letterSpacing: 1.5 },
  logoTagline: { fontSize: 9, fontWeight: '500', color: '#6B7A8D', letterSpacing: 0.5, marginTop: 1 },
  rightSection: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 30, height: 30, borderRadius: 8, borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center', justifyContent: 'center',
  },
  notifBadge: {
    position: 'absolute', top: -4, right: -4,
    minWidth: 14, height: 14, borderRadius: 7,
    paddingHorizontal: 3,
    alignItems: 'center', justifyContent: 'center',
  },
  notifBadgeText: { color: '#fff', fontSize: 8, fontWeight: '800' },
  userRow:   { alignItems: 'flex-end', gap: 4 },
  userName:  { ...typography.bodySmall, color: '#CBD5E1', fontWeight: '600', maxWidth: 80 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  roleDot:   { width: 5, height: 5, borderRadius: 3 },
  roleText:  { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
});
