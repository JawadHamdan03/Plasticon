import React, { useState } from 'react';
import {
  KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
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
type Route = RouteProp<AuthStackParamList, 'ResetPassword'>;

export function ResetPasswordScreen() {
  const navigation = useNavigation<Nav>();
  const route      = useRoute<Route>();
  const { colors } = useAppTheme();

  const [token,    setToken]    = useState(route.params?.token ?? '');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [done,     setDone]     = useState(false);

  const submit = async () => {
    if (!token.trim()) { setError('يرجى إدخال رمز الاسترداد.'); return; }
    if (!password)     { setError('يرجى إدخال كلمة مرور جديدة.'); return; }
    if (password !== confirm) { setError('كلمتا المرور غير متطابقتين.'); return; }
    if (password.length < 6)  { setError('يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.'); return; }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token: token.trim(), password });
      setDone(true);
    } catch (e: any) {
      setError(e.message ?? ('فشل إعادة تعيين كلمة المرور. قد تكون الرابط منتهية الصلاحية.'));
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
            <Ionicons name="lock-open" size={28} color={colors.accent} />
          </View>
          <Text style={styles.brandName}>{'إعادة تعيين كلمة المرور'}</Text>
          <Text style={[styles.brandSub, { color: colors.tabInactive }]}>
            {'أدخل الرمز من بريدك الإلكتروني'}
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

          {done ? (
            <View style={styles.doneWrap}>
              <View style={[styles.doneIcon, { backgroundColor: `${colors.success}12` }]}>
                <Ionicons name="checkmark-circle" size={48} color={colors.success} />
              </View>
              <Text style={[styles.doneTitle, { color: colors.text }]}>
                {'تم إعادة تعيين كلمة المرور!'}
              </Text>
              <Text style={[styles.doneSub, { color: colors.textMuted }]}>
                {'تم تحديث كلمة مرورك بنجاح. يمكنك الآن تسجيل الدخول بكلمة مرورك الجديدة.'}
              </Text>
              <Button fullWidth onPress={() => navigation.navigate('Login')} style={styles.btn}>
                {'العودة لتسجيل الدخول'}
              </Button>
            </View>
          ) : (
            <>
              <Input
                label={'رمز الاسترداد'}
                value={token}
                onChangeText={setToken}
                placeholder={'الصق الرمز من بريدك الإلكتروني'}
                icon="key-outline"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Input
                label={'كلمة المرور الجديدة'}
                value={password}
                onChangeText={setPassword}
                placeholder={'الحد الأدنى 6 أحرف'}
                icon="lock-closed-outline"
                isPassword
              />
              <Input
                label={'تأكيد كلمة المرور الجديدة'}
                value={confirm}
                onChangeText={setConfirm}
                placeholder={'كرر كلمة المرور الجديدة'}
                icon="shield-checkmark-outline"
                isPassword
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
                {'إعادة تعيين كلمة المرور'}
              </Button>

              <TouchableOpacity style={styles.backRow} onPress={() => navigation.navigate('Login')}>
                <Ionicons name="arrow-back" size={16} color={colors.primary} />
                <Text style={[styles.backLink, { color: colors.primary }]}>
                  {'العودة لتسجيل الدخول'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:       { flex: 1 },
  flex:       { flex: 1 },
  header:     { alignItems: 'center', paddingTop: spacing.lg, paddingBottom: spacing.xl },
  backBtn:    { position: 'absolute', left: spacing.md, top: spacing.lg, padding: 8 },
  logoWrap:   { width: 56, height: 56, borderRadius: 18, backgroundColor: '#1E293B', borderWidth: 1.5, borderColor: '#2D3F55', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  brandName:  { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  brandSub:   { fontSize: 12, marginTop: 3 },
  sheet:      { flex: 1, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  sheetContent: { padding: spacing.lg, paddingTop: spacing.md, paddingBottom: 40 },
  handle:     { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.lg },
  errorBox:   { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  errorText:  { flex: 1, ...typography.bodySmall },
  btn:        { marginTop: spacing.sm, marginBottom: spacing.xl, borderRadius: radius.lg },
  backRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  backLink:   { ...typography.bodySmall, fontWeight: '700' },
  doneWrap:   { alignItems: 'center', paddingTop: spacing.xl, gap: spacing.md },
  doneIcon:   { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center' },
  doneTitle:  { ...typography.h1 },
  doneSub:    { ...typography.body, textAlign: 'center' },
});
