import React, { useState } from 'react';
import {
import { useLocale } from '../../context/LocaleContext';
  KeyboardAvoidingView, Platform, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api } from '../../api/client';
import { Button } from '../../components/Button';
import { Input }  from '../../components/Input';
import { AuthStackParamList } from '../../navigation/types';
import { radius, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';

type Nav = NativeStackNavigationProp<AuthStackParamList>;

export function ForgotPasswordScreen() {
  const navigation = useNavigation<Nav>();
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [sent,    setSent]    = useState(false);

  const submit = async () => {
    if (!email.trim()) { setError('يرجى إدخال بريدك الإلكتروني.'); return; }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      setSent(true);
    } catch (e: any) {
      setError(e.message ?? ('فشل إرسال بريد الاسترداد. يرجى المحاولة مرة أخرى.'));
    } finally {
      setLoading(false);
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
            <Ionicons name="key" size={28} color={colors.accent} />
          </View>
          <Text style={styles.brandName}>{'نسيت كلمة المرور؟'}</Text>
          <Text style={[styles.brandSub, { color: colors.tabInactive }]}>
            {isAr ? 'سنرسل رابط الاسترداد إلى بريدك' : "We'll send a reset link to your email"}
          </Text>
        </View>

        {/* Form sheet */}
        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {sent ? (
            <View style={styles.sentWrap}>
              <View style={[styles.sentIcon, { backgroundColor: `${colors.success}12` }]}>
                <Ionicons name="checkmark-circle" size={48} color={colors.success} />
              </View>
              <Text style={[styles.sentTitle, { color: colors.text }]}>
                {'تم الإرسال!'}
              </Text>
              <Text style={[styles.sentSub, { color: colors.textMuted }]}>
                {'تحقق من صندوق الوارد للحصول على رابط إعادة تعيين كلمة المرور.\nقد يستغرق بضع دقائق.'}
              </Text>
              <Button fullWidth onPress={() => navigation.navigate('ResetPassword', {})} style={styles.btn}>
                {'أدخل رمز الاسترداد'}
              </Button>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={[styles.backLink, { color: colors.primary }]}>
                  {'العودة لتسجيل الدخول'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.formWrap}>
              <Input
                label={'البريد الإلكتروني'}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="you@plasticon.com"
                icon="mail-outline"
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
                {'إرسال رابط الاسترداد'}
              </Button>

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
  safe:      { flex: 1 },
  flex:      { flex: 1 },
  header:    { alignItems: 'center', paddingTop: spacing.lg, paddingBottom: spacing.xl },
  backBtn:   { position: 'absolute', left: spacing.md, top: spacing.lg, padding: 8 },
  logoWrap:  { width: 56, height: 56, borderRadius: 18, backgroundColor: '#1E293B', borderWidth: 1.5, borderColor: '#2D3F55', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  brandName: { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  brandSub:  { fontSize: 12, marginTop: 3 },
  sheet:     { flex: 1, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: spacing.lg, paddingTop: spacing.md },
  handle:    { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.lg },
  formWrap:  {},
  errorBox:  { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  errorText: { flex: 1, ...typography.bodySmall },
  btn:       { marginTop: spacing.sm, marginBottom: spacing.xl, borderRadius: radius.lg },
  backRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  backLink:  { ...typography.bodySmall, fontWeight: '700' },
  sentWrap:  { alignItems: 'center', paddingTop: spacing.xl, gap: spacing.md },
  sentIcon:  { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center' },
  sentTitle: { ...typography.h1 },
  sentSub:   { ...typography.body, textAlign: 'center' },
});
