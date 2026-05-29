import React, { useState } from 'react';
import {
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
import { colors, radius, spacing, typography } from '../../theme';

type Nav = NativeStackNavigationProp<AuthStackParamList>;

export function ForgotPasswordScreen() {
  const navigation = useNavigation<Nav>();
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [sent,    setSent]    = useState(false);

  const submit = async () => {
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      setSent(true);
    } catch (e: any) {
      setError(e.message ?? 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
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
            <Ionicons name="key" size={28} color={colors.accent} />
          </View>
          <Text style={styles.brandName}>Forgot Password?</Text>
          <Text style={styles.brandSub}>We'll send a reset link to your email</Text>
        </View>

        {/* Form sheet */}
        <View style={styles.sheet}>
          <View style={styles.handle} />

          {sent ? (
            <View style={styles.sentWrap}>
              <View style={styles.sentIcon}>
                <Ionicons name="checkmark-circle" size={48} color={colors.success} />
              </View>
              <Text style={styles.sentTitle}>Email sent!</Text>
              <Text style={styles.sentSub}>
                Check your inbox for a password reset link.{'\n'}
                It may take a few minutes to arrive.
              </Text>
              <Button fullWidth onPress={() => navigation.navigate('ResetPassword', {})} style={styles.btn}>
                Enter Reset Code
              </Button>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.backLink}>Back to Sign In</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.formWrap}>
              <Input
                label="Email address"
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
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle-outline" size={15} color={colors.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <Button onPress={submit} loading={loading} fullWidth size="lg" style={styles.btn}>
                Send Reset Link
              </Button>

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
  safe:      { flex: 1, backgroundColor: colors.tabBar },
  flex:      { flex: 1 },
  header:    { alignItems: 'center', paddingTop: spacing.lg, paddingBottom: spacing.xl, backgroundColor: colors.tabBar },
  backBtn:   { position: 'absolute', left: spacing.md, top: spacing.lg, padding: 8 },
  logoWrap:  { width: 56, height: 56, borderRadius: 18, backgroundColor: '#1E293B', borderWidth: 1.5, borderColor: '#2D3F55', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  brandName: { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  brandSub:  { fontSize: 12, color: colors.tabInactive, marginTop: 3 },
  sheet:     { flex: 1, backgroundColor: colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: spacing.lg, paddingTop: spacing.md },
  handle:    { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.lg },
  formWrap:  {},
  errorBox:  { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.dangerLight, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  errorText: { flex: 1, ...typography.bodySmall, color: colors.danger },
  btn:       { marginTop: spacing.sm, marginBottom: spacing.xl, borderRadius: radius.lg },
  backRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  backLink:  { ...typography.bodySmall, color: colors.primary, fontWeight: '700' },
  sentWrap:  { alignItems: 'center', paddingTop: spacing.xl, gap: spacing.md },
  sentIcon:  { width: 90, height: 90, borderRadius: 45, backgroundColor: `${colors.success}12`, alignItems: 'center', justifyContent: 'center' },
  sentTitle: { ...typography.h1 },
  sentSub:   { ...typography.body, color: colors.textMuted, textAlign: 'center' },
});
