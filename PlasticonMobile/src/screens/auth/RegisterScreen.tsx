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
import { colors, radius, spacing, typography } from '../../theme';

type Nav = NativeStackNavigationProp<AuthStackParamList>;

export function RegisterScreen() {
  const navigation = useNavigation<Nav>();
  const [fullName,  setFullName]  = useState('');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState(false);

  const submit = async () => {
    if (!fullName.trim() || !email.trim() || !password || !confirm) {
      setError('All fields are required.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
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
      setError(e.message ?? 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.successWrap}>
          <View style={styles.successIcon}>
            <Ionicons name="mail" size={36} color={colors.success} />
          </View>
          <Text style={styles.successTitle}>Check your email</Text>
          <Text style={styles.successSub}>
            We sent a verification link to{'\n'}
            <Text style={styles.successEmail}>{email}</Text>
          </Text>
          <Button fullWidth onPress={() => navigation.navigate('VerifyEmail', { email })} style={styles.successBtn}>
            Enter Verification Code
          </Button>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.link}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Brand header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.logoWrap}>
            <Ionicons name="person-add" size={28} color={colors.accent} />
          </View>
          <Text style={styles.brandName}>Create Account</Text>
          <Text style={styles.brandSub}>Join the Plasticon team</Text>
        </View>

        {/* Form sheet */}
        <ScrollView
          style={styles.sheet}
          contentContainerStyle={styles.sheetContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.handle} />

          <Input label="Full Name"      value={fullName} onChangeText={setFullName} placeholder="John Smith"        icon="person-outline"      autoCapitalize="words" />
          <Input label="Email Address"  value={email}    onChangeText={setEmail}    placeholder="you@plasticon.com" icon="mail-outline"         keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
          <Input label="Password"       value={password} onChangeText={setPassword} placeholder="Min. 6 characters" icon="lock-closed-outline"  isPassword />
          <Input label="Confirm Password" value={confirm} onChangeText={setConfirm} placeholder="Repeat password"  icon="shield-checkmark-outline" isPassword returnKeyType="done" onSubmitEditing={submit} />

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={15} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Button onPress={submit} loading={loading} fullWidth size="lg" style={styles.btn}>
            Create Account
          </Button>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.footer}>
            <Text style={styles.footerText}>Need access approval? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('RequestAccess')}>
              <Text style={styles.footerLink}>Request Access</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: colors.tabBar },
  flex:         { flex: 1 },
  header:       { alignItems: 'center', paddingTop: spacing.lg, paddingBottom: spacing.xl, backgroundColor: colors.tabBar },
  backBtn:      { position: 'absolute', left: spacing.md, top: spacing.lg, padding: 8 },
  logoWrap:     { width: 56, height: 56, borderRadius: 18, backgroundColor: '#1E293B', borderWidth: 1.5, borderColor: '#2D3F55', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  brandName:    { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  brandSub:     { fontSize: 12, color: colors.tabInactive, marginTop: 3 },
  sheet:        { flex: 1, backgroundColor: colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  sheetContent: { padding: spacing.lg, paddingTop: spacing.md, paddingBottom: 40 },
  handle:       { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.lg },
  errorBox:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.dangerLight, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  errorText:    { flex: 1, ...typography.bodySmall, color: colors.danger },
  btn:          { marginTop: spacing.sm, marginBottom: spacing.xl, borderRadius: radius.lg },
  footer:       { flexDirection: 'row', justifyContent: 'center', marginBottom: spacing.sm },
  footerText:   { ...typography.bodySmall, color: colors.textMuted },
  footerLink:   { ...typography.bodySmall, color: colors.primary, fontWeight: '700' },
  successWrap:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md, backgroundColor: colors.background },
  successIcon:  { width: 80, height: 80, borderRadius: 40, backgroundColor: `${colors.success}15`, alignItems: 'center', justifyContent: 'center' },
  successTitle: { ...typography.h1, textAlign: 'center' },
  successSub:   { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  successEmail: { fontWeight: '700', color: colors.text },
  successBtn:   { marginTop: spacing.md },
  link:         { ...typography.bodySmall, color: colors.primary, fontWeight: '700', marginTop: spacing.sm },
});
