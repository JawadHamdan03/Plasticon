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
import { colors, radius, spacing, typography } from '../../theme';

type Nav   = NativeStackNavigationProp<AuthStackParamList>;
type Route = RouteProp<AuthStackParamList, 'VerifyEmail'>;

export function VerifyEmailScreen() {
  const navigation = useNavigation<Nav>();
  const route      = useRoute<Route>();
  const email      = route.params?.email ?? '';

  const [token,    setToken]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [resending, setResending] = useState(false);
  const [error,    setError]    = useState('');
  const [verified, setVerified] = useState(false);

  const submit = async () => {
    if (!token.trim()) { setError('Please enter your verification code.'); return; }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/verify-email', { token: token.trim() });
      setVerified(true);
    } catch (e: any) {
      setError(e.message ?? 'Invalid or expired code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (!email) { setError('Email address not available. Please register again.'); return; }
    setResending(true);
    try {
      await api.post('/auth/resend-verification', { email });
    } catch {
      // Fail silently — user may not notice
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Brand header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.logoWrap}>
            <Ionicons name="mail-open" size={28} color={colors.accent} />
          </View>
          <Text style={styles.brandName}>Verify Email</Text>
          <Text style={styles.brandSub}>Check your inbox for the code</Text>
        </View>

        {/* Form sheet */}
        <View style={styles.sheet}>
          <View style={styles.handle} />

          {verified ? (
            <View style={styles.doneWrap}>
              <View style={styles.doneIcon}>
                <Ionicons name="checkmark-circle" size={48} color={colors.success} />
              </View>
              <Text style={styles.doneTitle}>Email verified!</Text>
              <Text style={styles.doneSub}>Your account is now active. You can sign in.</Text>
              <Button fullWidth onPress={() => navigation.navigate('Login')} style={styles.btn}>
                Sign In
              </Button>
            </View>
          ) : (
            <View>
              {email ? (
                <View style={styles.emailHint}>
                  <Ionicons name="mail-outline" size={16} color={colors.primary} />
                  <Text style={styles.emailHintText}>Sent to <Text style={styles.emailBold}>{email}</Text></Text>
                </View>
              ) : null}

              <Input
                label="Verification Code"
                value={token}
                onChangeText={setToken}
                placeholder="Enter the code from your email"
                icon="key-outline"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="default"
                returnKeyType="done"
                onSubmitEditing={submit}
              />

              {error ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle-outline" size={15} color={colors.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <Button onPress={submit} loading={loading} fullWidth size="lg" style={styles.btn}>
                Verify Email
              </Button>

              <View style={styles.resendRow}>
                <Text style={styles.resendLabel}>Didn't receive it? </Text>
                <TouchableOpacity onPress={resend} disabled={resending}>
                  <Text style={[styles.resendLink, resending && { opacity: 0.5 }]}>
                    {resending ? 'Sending…' : 'Resend email'}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.backRow} onPress={() => navigation.navigate('Login')}>
                <Ionicons name="arrow-back" size={16} color={colors.primary} />
                <Text style={styles.backLink}>Back to Sign In</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: colors.tabBar },
  flex:          { flex: 1 },
  header:        { alignItems: 'center', paddingTop: spacing.lg, paddingBottom: spacing.xl, backgroundColor: colors.tabBar },
  backBtn:       { position: 'absolute', left: spacing.md, top: spacing.lg, padding: 8 },
  logoWrap:      { width: 56, height: 56, borderRadius: 18, backgroundColor: '#1E293B', borderWidth: 1.5, borderColor: '#2D3F55', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  brandName:     { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  brandSub:      { fontSize: 12, color: colors.tabInactive, marginTop: 3 },
  sheet:         { flex: 1, backgroundColor: colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: spacing.lg, paddingTop: spacing.md },
  handle:        { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.lg },
  emailHint:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: `${colors.primary}10`, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  emailHintText: { ...typography.bodySmall, color: colors.primary, flex: 1 },
  emailBold:     { fontWeight: '700' },
  errorBox:      { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.dangerLight, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  errorText:     { flex: 1, ...typography.bodySmall, color: colors.danger },
  btn:           { marginTop: spacing.sm, marginBottom: spacing.md, borderRadius: radius.lg },
  resendRow:     { flexDirection: 'row', justifyContent: 'center', marginBottom: spacing.md },
  resendLabel:   { ...typography.bodySmall, color: colors.textMuted },
  resendLink:    { ...typography.bodySmall, color: colors.primary, fontWeight: '700' },
  backRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  backLink:      { ...typography.bodySmall, color: colors.primary, fontWeight: '700' },
  doneWrap:      { alignItems: 'center', paddingTop: spacing.xl, gap: spacing.md },
  doneIcon:      { width: 90, height: 90, borderRadius: 45, backgroundColor: `${colors.success}12`, alignItems: 'center', justifyContent: 'center' },
  doneTitle:     { ...typography.h1 },
  doneSub:       { ...typography.body, color: colors.textMuted, textAlign: 'center' },
});
