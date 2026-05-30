import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { User } from '../api/types';
import { colors, roleColor, spacing, typography } from '../theme';

const ROLE_LABEL: Record<string, string> = {
  ADMIN:      'Admin',
  WORKER:     'Worker',
  ENGINEER:   'Engineer',
  ACCOUNTANT: 'Accountant',
};

interface Props {
  user: User;
}

export function AppTopBar({ user }: Props) {
  const insets   = useSafeAreaInsets();
  const rColor   = roleColor(user.role);
  const firstName = user.fullName?.split(' ')[0] ?? user.username ?? 'User';

  return (
    <View style={[styles.bar, { paddingTop: insets.top }]}>
      {/* ── Logo ── */}
      <View style={styles.logoRow}>
        <View style={styles.logoMark}>
          <Text style={styles.logoMarkText}>P</Text>
        </View>
        <View>
          <Text style={styles.logoName}>PLASTICON</Text>
          <Text style={styles.logoTagline}>Factory Management</Text>
        </View>
      </View>

      {/* ── User info ── */}
      <View style={styles.userRow}>
        <Text style={styles.userName} numberOfLines={1}>{firstName}</Text>
        <View style={[styles.roleBadge, { backgroundColor: rColor + '22' }]}>
          <View style={[styles.roleDot, { backgroundColor: rColor }]} />
          <Text style={[styles.roleText, { color: rColor }]}>
            {ROLE_LABEL[user.role] ?? user.role}
          </Text>
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
    backgroundColor: colors.tabBar,
    paddingHorizontal: spacing.md,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E2A3A',
  },

  // Logo
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoMark: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoMarkText: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.tabBar,
    letterSpacing: -0.5,
  },
  logoName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textInverse,
    letterSpacing: 1.5,
  },
  logoTagline: {
    fontSize: 9,
    fontWeight: '500',
    color: '#6B7A8D',
    letterSpacing: 0.5,
    marginTop: 1,
  },

  // User
  userRow: {
    alignItems: 'flex-end',
    gap: 4,
  },
  userName: {
    ...typography.bodySmall,
    color: '#CBD5E1',
    fontWeight: '600',
    maxWidth: 100,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  roleDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
