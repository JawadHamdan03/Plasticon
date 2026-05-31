import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../auth/AuthContext';
import { Button } from '../../components/Button';
import { Input }  from '../../components/Input';
import { AuthStackParamList } from '../../navigation/types';
import { radius, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

type Nav = NativeStackNavigationProp<AuthStackParamList>;

export function LoginScreen() {
  const { login } = useAuth();
  const navigation = useNavigation<Nav>();
  const { colors } = useAppTheme();
  const { isAr } = useLocale();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const ROLE_PILLS = [
    { label: isAr ? 'مدير' : 'Admin',      color: colors.roleAdmin      },
    { label: isAr ? 'مهندس' : 'Engineer',   color: colors.roleEngineer   },
    { label: isAr ? 'محاسب' : 'Accountant', color: colors.roleAccountant },
    { label: isAr ? 'عامل' : 'Worker',     color: colors.roleWorker     },
  ];

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError(isAr ? 'يرجى إدخال البريد الإلكتروني وكلمة المرور.' : 'Please enter your email and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : (isAr ? 'فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.' : 'Login failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.tabBar }]} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* ── Brand header ─────────────────────────────────────────── */}
        <View style={[styles.header, { backgroundColor: colors.tabBar }]}>
          <View style={styles.logoWrap}>
            <Ionicons name="business" size={32} color={colors.accent} />
          </View>
          <Text style={styles.brandName}>PLASTICON</Text>
          <Text style={[styles.brandTagline, { color: colors.tabInactive }]}>
            {isAr ? 'نظام إدارة المصنع' : 'Factory Management System'}
          </Text>

          {/* Decorative dots */}
          <View style={styles.dots}>
            {[0, 1, 2, 3, 4].map((i) => (
              <View
                key={i}
                style={[styles.dot, i === 2 && { width: 18, backgroundColor: colors.accent }]}
              />
            ))}
          </View>
        </View>

        {/* ── Login form ───────────────────────────────────────────── */}
        <ScrollView
          style={[styles.formSheet, { backgroundColor: colors.background }]}
          contentContainerStyle={styles.formContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.formHandle, { backgroundColor: colors.border }]} />

          <Text style={[styles.welcomeTitle, { color: colors.text }]}>
            {isAr ? 'مرحباً بعودتك' : 'Welcome back'}
          </Text>
          <Text style={[styles.welcomeSub, { color: colors.textMuted }]}>
            {isAr ? 'تسجيل الدخول للمتابعة إلى لوحتك' : 'Sign in to continue to your dashboard'}
          </Text>

          <View style={styles.form}>
            <Input
              label={isAr ? 'البريد الإلكتروني' : 'Email address'}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="you@plasticon.com"
              icon="mail-outline"
            />

            <Input
              label={isAr ? 'كلمة المرور' : 'Password'}
              value={password}
              onChangeText={setPassword}
              isPassword
              placeholder={isAr ? 'أدخل كلمة المرور' : 'Enter your password'}
              icon="lock-closed-outline"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: colors.dangerLight }]}>
                <Ionicons name="alert-circle-outline" size={15} color={colors.danger} />
                <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
              </View>
            ) : null}

            <Button
              onPress={handleLogin}
              loading={loading}
              fullWidth
              size="lg"
              style={styles.signInBtn}
            >
              {isAr ? 'تسجيل الدخول' : 'Sign In'}
            </Button>
          </View>

          {/* Auth links */}
          <TouchableOpacity style={styles.forgotRow} onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={[styles.forgotLink, { color: colors.primary }]}>
              {isAr ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
            </Text>
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.textMuted }]}>{isAr ? 'أو' : 'or'}</Text>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
          </View>

          <View style={styles.altRow}>
            <TouchableOpacity style={[styles.altBtn, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]} onPress={() => navigation.navigate('Register')} activeOpacity={0.8}>
              <Ionicons name="person-add-outline" size={16} color={colors.primary} />
              <Text style={[styles.altBtnText, { color: colors.primary }]}>{isAr ? 'إنشاء حساب' : 'Create Account'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.altBtn, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]} onPress={() => navigation.navigate('RequestAccess')} activeOpacity={0.8}>
              <Ionicons name="shield-checkmark-outline" size={16} color={colors.success} />
              <Text style={[styles.altBtnText, { color: colors.success }]}>{isAr ? 'طلب الوصول' : 'Request Access'}</Text>
            </TouchableOpacity>
          </View>

          {/* Role legend */}
          <View style={styles.roleLegend}>
            <Text style={[styles.legendTitle, { color: colors.textMuted }]}>
              {isAr ? 'مستويات الوصول' : 'ACCESS LEVELS'}
            </Text>
            <View style={styles.roleRow}>
              {ROLE_PILLS.map((r) => (
                <View key={r.label} style={[styles.rolePill, { backgroundColor: `${r.color}18` }]}>
                  <View style={[styles.roleDot, { backgroundColor: r.color }]} />
                  <Text style={[styles.roleLabel, { color: r.color }]}>{r.label}</Text>
                </View>
              ))}
            </View>
          </View>

          <Text style={[styles.version, { color: colors.textMuted }]}>v1.0.0 · Plasticon Mobile</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },

  // ── Brand header ─────────────────────────────────────────────────
  header: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
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

  // ── Form sheet ────────────────────────────────────────────────────
  formSheet: {
    flex: 1,
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
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },

  welcomeTitle: {
    ...typography.h1,
    marginBottom: 4,
  },
  welcomeSub: {
    ...typography.bodySmall,
    marginBottom: spacing.xl,
  },

  form: {
    marginBottom: spacing.xl,
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    flex: 1,
    ...typography.bodySmall,
  },

  signInBtn: {
    marginTop: spacing.sm,
    borderRadius: radius.lg,
  },

  // ── Auth links ────────────────────────────────────────────────────
  forgotRow:   { alignItems: 'flex-end', marginBottom: spacing.lg },
  forgotLink:  { ...typography.bodySmall, fontWeight: '600' },
  dividerRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  divider:     { flex: 1, height: 1 },
  dividerText: { ...typography.caption },
  altRow:      { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
  altBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: radius.lg, borderWidth: 1.5 },
  altBtnText:  { fontSize: 13, fontWeight: '700' },

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
