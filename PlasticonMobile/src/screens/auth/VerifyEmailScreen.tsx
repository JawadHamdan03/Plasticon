import React, { useState } from 'react';
import {
  KeyboardAvoidingView, Platform, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api } from '../../api/client';
import { Button } from '../../components/Button';
import { Input }  from '../../components/Input';
import { AuthStackParamList } from '../../navigation/types';
import { radius, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';

type Nav   = NativeStackNavigationProp<AuthStackParamList>;
type Route = RouteProp<AuthStackParamList, 'VerifyEmail'>;

export function VerifyEmailScreen() {
  const navigation = useNavigation<Nav>();
  const route      = useRoute<Route>();
  const email      = route.params?.email ?? '';
  const { colors } = useAppTheme();

  const [token,    setToken]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [resending, setResending] = useState(false);
  const [error,    setError]    = useState('');
  const [verified, setVerified] = useState(false);

  const submit = async () => {
    if (!token.trim()) { setError('يرجى إدخال رمز التحقق.'); return; }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/verify-email', { token: token.trim() });
      setVerified(true);
    } catch (e: any) {
      setError(e.message ?? 'رمز غير صالح أو منتهي الصلاحية. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (!email) { setError('البريد الإلكتروني غير متوفر. يرجى التسجيل مرة أخرى.'); return; }
    setResending(true);
    try {
      await api.post('/auth/resend-verification', { email });
    } catch {
      // Fail silently
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.tabBar }]} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Brand header */}
        <View style={[styles.header, { backgroundColor: colors.tabBar }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.logoWrap}>
            <Ionicons name="mail-open" size={28} color={colors.accent} />
          </View>
          <Text style={styles.brandName}>{'التحقق من البريد'}</Text>
          <Text style={[styles.brandSub, { color: colors.tabInactive }]}>
            {'تحقق من بريدك الوارد للحصول على الرمز'}
          </Text>
        </View>

        {/* Form sheet */}
        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {verified ? (
            <View style={styles.doneWrap}>
              <View style={[styles.doneIcon, { backgroundColor: `${colors.success}12` }]}>
                <Ionicons name="checkmark-circle" size={48} color={colors.success} />
              </View>
              <Text style={[styles.doneTitle, { color: colors.text }]}>
                {'تم التحقق من البريد!'}
              </Text>
              <Text style={[styles.doneSub, { color: colors.textMuted }]}>
                {'حسابك نشط الآن. يمكنك تسجيل الدخول.'}
              </Text>
              <Button fullWidth onPress={() => navigation.navigate('Login')} style={styles.btn}>
                {'تسجيل الدخول'}
              </Button>
            </View>
          ) : (
            <View>
              {email ? (
                <View style={[styles.emailHint, { backgroundColor: `${colors.primary}10` }]}>
                  <Ionicons name="mail-outline" size={16} color={colors.primary} />
                  <Text style={[styles.emailHintText, { color: colors.primary }]}>
                    {'أرسل إلى '}<Text style={styles.emailBold}>{email}</Text>
                  </Text>
                </View>
              ) : null}

              <Input
                label={'رمز التحقق'}
                value={token}
                onChangeText={setToken}
                placeholder={'أدخل الرمز من بريدك الإلكتروني'}
                icon="key-outline"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="default"
                returnKeyType="done"
                onSubmitEditing={submit}
              />

              {error ? (
                <View style={[styles.errorBox, { backgroundColor: colors.dangerLight }]}>
                  <Ionicons name="alert-circle-outline" size={15} color={colors.danger} />
                  <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
                </View>
              ) : null}

              <Button onPress={submit} loading={loading} fullWidth size="lg" style={styles.btn}>
                {'التحقق من البريد'}
              </Button>

              <View style={styles.resendRow}>
                <Text style={[styles.resendLabel, { color: colors.textMuted }]}>
                  {'لم تستلمه؟ '}
                </Text>
                <TouchableOpacity onPress={resend} disabled={resending}>
                  <Text style={[styles.resendLink, { color: colors.primary }, resending && { opacity: 0.5 }]}>
                    {resending ? 'جاري الإرسال…' : 'إعادة إرسال'}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.backRow} onPress={() => navigation.navigate('Login')}>
                <Ionicons name="arrow-back" size={16} color={colors.primary} />
                <Text style={[styles.backLink, { color: colors.primary }]}>
                  {'العودة لتسجيل الدخول'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:          { flex: 1 },
  flex:          { flex: 1 },
  header:        { alignItems: 'center', paddingTop: spacing.lg, paddingBottom: spacing.xl },
  backBtn:       { position: 'absolute', left: spacing.md, top: spacing.lg, padding: 8 },
  logoWrap:      { width: 56, height: 56, borderRadius: 18, backgroundColor: '#1E293B', borderWidth: 1.5, borderColor: '#2D3F55', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  brandName:     { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  brandSub:      { fontSize: 12, marginTop: 3 },
  sheet:         { flex: 1, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: spacing.lg, paddingTop: spacing.md },
  handle:        { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.lg },
  emailHint:     { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  emailHintText: { ...typography.bodySmall, flex: 1 },
  emailBold:     { fontWeight: '700' },
  errorBox:      { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  errorText:     { flex: 1, ...typography.bodySmall },
  btn:           { marginTop: spacing.sm, marginBottom: spacing.md, borderRadius: radius.lg },
  resendRow:     { flexDirection: 'row', justifyContent: 'center', marginBottom: spacing.md },
  resendLabel:   { ...typography.bodySmall },
  resendLink:    { ...typography.bodySmall, fontWeight: '700' },
  backRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  backLink:      { ...typography.bodySmall, fontWeight: '700' },
  doneWrap:      { alignItems: 'center', paddingTop: spacing.xl, gap: spacing.md },
  doneIcon:      { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center' },
  doneTitle:     { ...typography.h1 },
  doneSub:       { ...typography.body, textAlign: 'center' },
});
