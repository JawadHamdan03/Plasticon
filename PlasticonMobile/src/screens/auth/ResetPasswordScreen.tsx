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
import { colors, radius, spacing, typography } from '../../theme';

type Nav   = NativeStackNavigationProp<AuthStackParamList>;
type Route = RouteProp<AuthStackParamList, 'ResetPassword'>;

export function ResetPasswordScreen() {
  const navigation = useNavigation<Nav>();
  const route      = useRoute<Route>();

  const [token,    setToken]    = useState(route.params?.token ?? '');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [done,     setDone]     = useState(false);

  const submit = async () => {
    if (!token.trim()) { setError('Please enter the reset code from your email.'); return; }
    if (!password)     { setError('Please enter a new password.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 6)  { setError('Password must be at least 6 characters.'); return; }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token: token.trim(), password });
      setDone(true);
    } catch (e: any) {
      setError(e.message ?? 'Failed to reset password. The link may have expired.');
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
            <Ionicons name="lock-open" size={28} color={colors.accent} />
          </View>
          <Text style={styles.brandName}>Reset Password</Text>
          <Text style={styles.brandSub}>Enter the code from your email</Text>
        </View>

        {/* Form sheet */}
        <ScrollView
          style={styles.sheet}
          contentContainerStyle={styles.sheetContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.handle} />

          {done ? (
            <View style={styles.doneWrap}>
              <View style={styles.doneIcon}>
                <Ionicons name="checkmark-circle" size={48} color={colors.success} />
              </View>
              <Text style={styles.doneTitle}>Password reset!</Text>
              <Text style={styles.doneSub}>Your password has been updated successfully. You can now sign in with your new password.</Text>
              <Button fullWidth onPress={() => navigation.navigate('Login')} style={styles.btn}>
                Back to Sign In
              </Button>
            </View>
          ) : (
            <>
              <Input
                label="Reset Code"
                value={token}
                onChangeText={setToken}
                placeholder="Paste the code from your email"
                icon="key-outline"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Input
                label="New Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Min. 6 characters"
                icon="lock-closed-outline"
                isPassword
              />
              <Input
                label="Confirm New Password"
                value={confirm}
                onChangeText={setConfirm}
                placeholder="Repeat new password"
                icon="shield-checkmark-outline"
                isPassword
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
                Reset Password
              </Button>

              <TouchableOpacity style={styles.backRow} onPress={() => navigation.navigate('Login')}>
                <Ionicons name="arrow-back" size={16} color={colors.primary} />
                <Text style={styles.backLink}>Back to Sign In</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: colors.tabBar },
  flex:       { flex: 1 },
  header:     { alignItems: 'center', paddingTop: spacing.lg, paddingBottom: spacing.xl, backgroundColor: colors.tabBar },
  backBtn:    { position: 'absolute', left: spacing.md, top: spacing.lg, padding: 8 },
  logoWrap:   { width: 56, height: 56, borderRadius: 18, backgroundColor: '#1E293B', borderWidth: 1.5, borderColor: '#2D3F55', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  brandName:  { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  brandSub:   { fontSize: 12, color: colors.tabInactive, marginTop: 3 },
  sheet:      { flex: 1, backgroundColor: colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  sheetContent: { padding: spacing.lg, paddingTop: spacing.md, paddingBottom: 40 },
  handle:     { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.lg },
  errorBox:   { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.dangerLight, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  errorText:  { flex: 1, ...typography.bodySmall, color: colors.danger },
  btn:        { marginTop: spacing.sm, marginBottom: spacing.xl, borderRadius: radius.lg },
  backRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  backLink:   { ...typography.bodySmall, color: colors.primary, fontWeight: '700' },
  doneWrap:   { alignItems: 'center', paddingTop: spacing.xl, gap: spacing.md },
  doneIcon:   { width: 90, height: 90, borderRadius: 45, backgroundColor: `${colors.success}12`, alignItems: 'center', justifyContent: 'center' },
  doneTitle:  { ...typography.h1 },
  doneSub:    { ...typography.body, color: colors.textMuted, textAlign: 'center' },
});
