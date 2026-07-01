import React, { useState } from 'react';
import {
  KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
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

export function RegisterScreen() {
  const navigation = useNavigation<Nav>();
  const { colors } = useAppTheme();
  const [fullName,  setFullName]  = useState('');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState(false);

  const submit = async () => {
    if (!fullName.trim() || !email.trim() || !password || !confirm) {
      setError('جميع الحقول مطلوبة.');
      return;
    }
    if (password !== confirm) {
      setError('كلمتا المرور غير متطابقتين.');
      return;
    }
    if (password.length < 6) {
      setError('يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/register', {
        fullName: fullName.trim(),
        email:    email.trim().toLowerCase(),
        password,
      });
      setSuccess(true);
    } catch (e: any) {
      setError(e.message ?? ('فشل التسجيل. يرجى المحاولة مرة أخرى.'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.tabBar }]}>
        <View style={[styles.successWrap, { backgroundColor: colors.background }]}>
          <View style={[styles.successIcon, { backgroundColor: `${colors.success}15` }]}>
            <Ionicons name="mail" size={36} color={colors.success} />
          </View>
          <Text style={[styles.successTitle, { color: colors.text }]}>
            {'تحقق من بريدك الإلكتروني'}
          </Text>
          <Text style={[styles.successSub, { color: colors.textMuted }]}>
            {'أرسلنا رابط تحقق إلى'}{'\n'}
            <Text style={[styles.successEmail, { color: colors.text }]}>{email}</Text>
          </Text>
          <Button fullWidth onPress={() => navigation.navigate('VerifyEmail', { email })} style={styles.successBtn}>
            {'أدخل رمز التحقق'}
          </Button>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={[styles.link, { color: colors.primary }]}>
              {'العودة لتسجيل الدخول'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.tabBar }]} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Brand header */}
        <View style={[styles.header, { backgroundColor: colors.tabBar }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.logoWrap}>
            <Ionicons name="person-add" size={28} color={colors.accent} />
          </View>
          <Text style={styles.brandName}>{'إنشاء حساب'}</Text>
          <Text style={[styles.brandSub, { color: colors.tabInactive }]}>
            {'انضم إلى فريق بلاستيكون'}
          </Text>
        </View>

        {/* Form sheet */}
        <ScrollView
          style={[styles.sheet, { backgroundColor: colors.background }]}
          contentContainerStyle={styles.sheetContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <Input label={'الاسم الكامل'}           value={fullName} onChangeText={setFullName} placeholder="John Smith"        icon="person-outline"           autoCapitalize="words" />
          <Input label={'البريد الإلكتروني'}   value={email}    onChangeText={setEmail}    placeholder="you@plasticon.com" icon="mail-outline"             keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
          <Input label={'كلمة المرور'}              value={password} onChangeText={setPassword} placeholder={'الحد الأدنى 6 أحرف'} icon="lock-closed-outline"  isPassword />
          <Input label={'تأكيد كلمة المرور'} value={confirm} onChangeText={setConfirm}  placeholder={'كرر كلمة المرور'} icon="shield-checkmark-outline" isPassword returnKeyType="done" onSubmitEditing={submit} />

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: colors.dangerLight }]}>
              <Ionicons name="alert-circle-outline" size={15} color={colors.danger} />
              <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
            </View>
          ) : null}

          <Button onPress={submit} loading={loading} fullWidth size="lg" style={styles.btn}>
            {'إنشاء حساب'}
          </Button>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textMuted }]}>
              {'لديك حساب بالفعل؟ '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={[styles.footerLink, { color: colors.primary }]}>
                {'تسجيل الدخول'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textMuted }]}>
              {'تحتاج موافقة للوصول؟ '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('RequestAccess')}>
              <Text style={[styles.footerLink, { color: colors.primary }]}>
                {'طلب الوصول'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1 },
  flex:         { flex: 1 },
  header:       { alignItems: 'center', paddingTop: spacing.lg, paddingBottom: spacing.xl },
  backBtn:      { position: 'absolute', left: spacing.md, top: spacing.lg, padding: 8 },
  logoWrap:     { width: 56, height: 56, borderRadius: 18, backgroundColor: '#1E293B', borderWidth: 1.5, borderColor: '#2D3F55', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  brandName:    { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  brandSub:     { fontSize: 12, marginTop: 3 },
  sheet:        { flex: 1, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  sheetContent: { padding: spacing.lg, paddingTop: spacing.md, paddingBottom: 40 },
  handle:       { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.lg },
  errorBox:     { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  errorText:    { flex: 1, ...typography.bodySmall },
  btn:          { marginTop: spacing.sm, marginBottom: spacing.xl, borderRadius: radius.lg },
  footer:       { flexDirection: 'row', justifyContent: 'center', marginBottom: spacing.sm },
  footerText:   { ...typography.bodySmall },
  footerLink:   { ...typography.bodySmall, fontWeight: '700' },
  successWrap:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  successIcon:  { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  successTitle: { ...typography.h1, textAlign: 'center' },
  successSub:   { ...typography.body, textAlign: 'center' },
  successEmail: { fontWeight: '700' },
  successBtn:   { marginTop: spacing.md },
  link:         { ...typography.bodySmall, fontWeight: '700', marginTop: spacing.sm },
});
