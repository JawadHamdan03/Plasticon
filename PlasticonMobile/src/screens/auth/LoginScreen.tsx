import React, { useState } from 'react';
import {
  Image,
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

const plasticonLogin = require('../../../assets/plasticonLogin.png') as number;

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
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* ── Logo ─────────────────────────────────────────────────── */}
        <View style={styles.heroWrap}>
          <Image source={plasticonLogin} style={styles.heroImg} resizeMode="cover" />
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
            <Button onPress={handleLogin} loading={loading} fullWidth size="lg" style={styles.signInBtn}>
              {isAr ? 'تسجيل الدخول' : 'Sign In'}
            </Button>
          </View>

          <TouchableOpacity style={styles.forgotRow} onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={[styles.forgotLink, { color: colors.primary }]}>
              {isAr ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.requestBtn, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}
            onPress={() => navigation.navigate('RequestAccess')}
            activeOpacity={0.8}
          >
            <Ionicons name="shield-checkmark-outline" size={16} color={colors.success} />
            <Text style={[styles.requestBtnText, { color: colors.success }]}>
              {isAr ? 'طلب الوصول' : 'Request Access'}
            </Text>
          </TouchableOpacity>

          <Text style={[styles.version, { color: colors.textMuted }]}>v1.0.0 · Plasticon Mobile</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },

  heroWrap: {
    width: '100%',
    height: 280,
    overflow: 'hidden',
  },
  heroImg: {
    width: '100%',
    height: '100%',
  },

  formSheet:   { flex: 1, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  formContent: { padding: spacing.lg, paddingTop: spacing.md },
  formHandle:  { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.lg },

  welcomeTitle: { ...typography.h1, marginBottom: 4 },
  welcomeSub:   { ...typography.bodySmall, marginBottom: spacing.xl },
  form:         { marginBottom: spacing.lg },

  errorBox:  { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  errorText: { flex: 1, ...typography.bodySmall },

  signInBtn:  { marginTop: spacing.sm, borderRadius: radius.lg },
  forgotRow:  { alignItems: 'flex-end', marginBottom: spacing.lg },
  forgotLink: { ...typography.bodySmall, fontWeight: '600' },

  requestBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: radius.lg, borderWidth: 1.5, marginBottom: spacing.xl },
  requestBtnText: { fontSize: 14, fontWeight: '700' },

  version: { ...typography.caption, textAlign: 'center', marginBottom: spacing.lg },
});
