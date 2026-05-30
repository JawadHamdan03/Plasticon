import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { User } from '../api/types';
import { useAppTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { roleColor, spacing, typography } from '../theme';

const ROLE_LABEL: Record<string, { en: string; ar: string }> = {
  ADMIN:      { en: 'Admin',      ar: 'مدير' },
  WORKER:     { en: 'Worker',     ar: 'عامل' },
  ENGINEER:   { en: 'Engineer',   ar: 'مهندس' },
  ACCOUNTANT: { en: 'Accountant', ar: 'محاسب' },
};

interface Props {
  user: User;
}

export function AppTopBar({ user }: Props) {
  const insets             = useSafeAreaInsets();
  const { colors, isDark, toggleTheme } = useAppTheme();
  const { locale, setLocale } = useLocale();
  const rColor             = roleColor(user.role);
  const firstName          = user.fullName?.split(' ')[0] ?? user.username ?? 'User';
  const roleLabel          = ROLE_LABEL[user.role] ?? { en: user.role, ar: user.role };

  return (
    <View style={[styles.bar, { paddingTop: insets.top, backgroundColor: colors.tabBar }]}>
      {/* ── Logo ── */}
      <View style={styles.logoRow}>
        <View style={[styles.logoMark, { backgroundColor: colors.accent }]}>
          <Text style={[styles.logoMarkText, { color: colors.tabBar }]}>P</Text>
        </View>
        <View>
          <Text style={[styles.logoName, { color: colors.textInverse }]}>PLASTICON</Text>
          <Text style={styles.logoTagline}>
            {locale === 'ar' ? 'إدارة المصنع' : 'Factory Management'}
          </Text>
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

        {/* Locale toggle */}
        <View style={styles.langPill}>
          <TouchableOpacity
            onPress={() => setLocale('en')}
            style={[styles.langBtn, locale === 'en' && { backgroundColor: colors.accent }]}
            activeOpacity={0.8}
          >
            <Text style={[styles.langText, locale === 'en' && styles.langTextActive]}>EN</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setLocale('ar')}
            style={[styles.langBtn, locale === 'ar' && { backgroundColor: colors.accent }]}
            activeOpacity={0.8}
          >
            <Text style={[styles.langText, locale === 'ar' && styles.langTextActive]}>ع</Text>
          </TouchableOpacity>
        </View>

        {/* User info */}
        <View style={styles.userRow}>
          <Text style={styles.userName} numberOfLines={1}>{firstName}</Text>
          <View style={[styles.roleBadge, { backgroundColor: rColor + '22' }]}>
            <View style={[styles.roleDot, { backgroundColor: rColor }]} />
            <Text style={[styles.roleText, { color: rColor }]}>
              {locale === 'ar' ? roleLabel.ar : roleLabel.en}
            </Text>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoMarkText: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  logoName: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  logoTagline: {
    fontSize: 9,
    fontWeight: '500',
    color: '#6B7A8D',
    letterSpacing: 0.5,
    marginTop: 1,
  },

  // Right section
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  // Theme toggle icon button
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Language pill
  langPill: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E2A3A',
    padding: 2,
    gap: 2,
  },
  langBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  langText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7A8D',
  },
  langTextActive: {
    color: '#0D1321',
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
    maxWidth: 80,
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
