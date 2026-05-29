import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../auth/AuthContext';
import { Button } from '../../components/Button';
import { Input }  from '../../components/Input';
import { colors, radius, spacing, typography } from '../../theme';

export function LoginScreen() {
  const { login } = useAuth();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* ── Brand header ─────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.logoWrap}>
            <Ionicons name="business" size={32} color={colors.accent} />
          </View>
          <Text style={styles.brandName}>PLASTICON</Text>
          <Text style={styles.brandTagline}>Factory Management System</Text>

          {/* Decorative dots */}
          <View style={styles.dots}>
            {[0, 1, 2, 3, 4].map((i) => (
              <View
                key={i}
                style={[styles.dot, i === 2 && styles.dotActive]}
              />
            ))}
          </View>
        </View>

        {/* ── Login form ───────────────────────────────────────────── */}
        <ScrollView
          style={styles.formSheet}
          contentContainerStyle={styles.formContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formHandle} />

          <Text style={styles.welcomeTitle}>Welcome back</Text>
          <Text style={styles.welcomeSub}>Sign in to continue to your dashboard</Text>

          <View style={styles.form}>
            <Input
              label="Email address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="you@plasticon.com"
              icon="mail-outline"
            />

            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              isPassword
              placeholder="Enter your password"
              icon="lock-closed-outline"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={15} color={colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Button
              onPress={handleLogin}
              loading={loading}
              fullWidth
              size="lg"
              style={styles.signInBtn}
            >
              Sign In
            </Button>
          </View>

          {/* Role legend */}
          <View style={styles.roleLegend}>
            <Text style={styles.legendTitle}>ACCESS LEVELS</Text>
            <View style={styles.roleRow}>
              {ROLE_PILLS.map((r) => (
                <View key={r.label} style={[styles.rolePill, { backgroundColor: `${r.color}18` }]}>
                  <View style={[styles.roleDot, { backgroundColor: r.color }]} />
                  <Text style={[styles.roleLabel, { color: r.color }]}>{r.label}</Text>
                </View>
              ))}
            </View>
          </View>

          <Text style={styles.version}>v1.0.0 · Plasticon Mobile</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const ROLE_PILLS = [
  { label: 'Admin',      color: colors.roleAdmin      },
  { label: 'Engineer',   color: colors.roleEngineer   },
  { label: 'Accountant', color: colors.roleAccountant },
  { label: 'Worker',     color: colors.roleWorker     },
];

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.tabBar },
  flex: { flex: 1 },

  // ── Brand header ─────────────────────────────────────────────────
  header: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.tabBar,
  },
  logoWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    borderWidth: 1.5,
    borderColor: '#2D3F55',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  brandName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 3.5,
    marginBottom: 4,
  },
  brandTagline: {
    fontSize: 12,
    color: colors.tabInactive,
    letterSpacing: 0.5,
    fontWeight: '500',
    marginBottom: spacing.lg,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#2D3F55',
  },
  dotActive: {
    width: 18,
    backgroundColor: colors.accent,
  },

  // ── Form sheet ────────────────────────────────────────────────────
  formSheet: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  formContent: {
    padding: spacing.lg,
    paddingTop: spacing.md,
  },
  formHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },

  welcomeTitle: {
    ...typography.h1,
    marginBottom: 4,
  },
  welcomeSub: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginBottom: spacing.xl,
  },

  form: {
    marginBottom: spacing.xl,
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.dangerLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    flex: 1,
    ...typography.bodySmall,
    color: colors.danger,
  },

  signInBtn: {
    marginTop: spacing.sm,
    borderRadius: radius.lg,
  },

  // ── Role legend ───────────────────────────────────────────────────
  roleLegend: {
    marginBottom: spacing.xl,
  },
  legendTitle: {
    ...typography.sectionLabel,
    marginBottom: spacing.sm,
  },
  roleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  roleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  roleLabel: {
    fontSize: 11,
    fontWeight: '600',
  },

  version: {
    ...typography.caption,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
});
