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

const ROLES = ['WORKER', 'ENGINEER', 'ACCOUNTANT'] as const;
type Role   = typeof ROLES[number];

const ROLE_META: Record<Role, { label: string; desc: string; color: string }> = {
  WORKER:     { label: 'Worker',     desc: 'Production & attendance',  color: colors.accent },
  ENGINEER:   { label: 'Engineer',   desc: 'Machines & maintenance',   color: colors.info },
  ACCOUNTANT: { label: 'Accountant', desc: 'Finance & invoices',       color: colors.success },
};

export function RequestAccessScreen() {
  const navigation = useNavigation<Nav>();
  const [fullName,   setFullName]   = useState('');
  const [email,      setEmail]      = useState('');
  const [department, setDepartment] = useState('');
  const [reason,     setReason]     = useState('');
  const [role,       setRole]       = useState<Role>('WORKER');
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [submitted,  setSubmitted]  = useState(false);

  const submit = async () => {
    if (!fullName.trim() || !email.trim()) {
      setError('Full name and email are required.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.post('/registration-requests', {
        fullName:      fullName.trim(),
        email:         email.trim().toLowerCase(),
        requestedRole: role,
        department:    department.trim() || undefined,
        reason:        reason.trim() || undefined,
      });
      setSubmitted(true);
    } catch (e: any) {
      setError(e.message ?? 'Failed to submit request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.doneWrap}>
          <View style={styles.doneIcon}>
            <Ionicons name="checkmark-circle" size={44} color={colors.success} />
          </View>
          <Text style={styles.doneTitle}>Request submitted!</Text>
          <Text style={styles.doneSub}>
            Your access request has been sent to an administrator. You'll be notified by email once it's reviewed.
          </Text>
          <Button fullWidth onPress={() => navigation.navigate('Login')} style={styles.btn}>
            Back to Sign In
          </Button>
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
            <Ionicons name="shield-checkmark" size={28} color={colors.accent} />
          </View>
          <Text style={styles.brandName}>Request Access</Text>
          <Text style={styles.brandSub}>An admin will review your request</Text>
        </View>

        {/* Form sheet */}
        <ScrollView
          style={styles.sheet}
          contentContainerStyle={styles.sheetContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.handle} />

          <Input label="Full Name *"    value={fullName}   onChangeText={setFullName}   placeholder="John Smith"        icon="person-outline"   autoCapitalize="words" />
          <Input label="Email Address *" value={email}     onChangeText={setEmail}      placeholder="you@plasticon.com" icon="mail-outline"     keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
          <Input label="Department"     value={department} onChangeText={setDepartment} placeholder="e.g. Production, Finance" icon="business-outline" />

          {/* Role picker */}
          <Text style={styles.fieldLabel}>Requested Role *</Text>
          <View style={styles.roleGrid}>
            {ROLES.map((r) => {
              const m       = ROLE_META[r];
              const active  = role === r;
              return (
                <TouchableOpacity
                  key={r}
                  style={[styles.roleCard, active && { borderColor: m.color, backgroundColor: `${m.color}10` }]}
                  onPress={() => setRole(r)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.roleDot, { backgroundColor: active ? m.color : colors.border }]} />
                  <View>
                    <Text style={[styles.roleLabel, active && { color: m.color }]}>{m.label}</Text>
                    <Text style={styles.roleDesc}>{m.desc}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <Input
            label="Reason (optional)"
            value={reason}
            onChangeText={setReason}
            placeholder="Briefly explain why you need access…"
            icon="chatbubble-outline"
            multiline
            numberOfLines={3}
          />

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={15} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Button onPress={submit} loading={loading} fullWidth size="lg" style={styles.btn}>
            Submit Request
          </Button>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: colors.tabBar },
  flex:        { flex: 1 },
  header:      { alignItems: 'center', paddingTop: spacing.lg, paddingBottom: spacing.xl, backgroundColor: colors.tabBar },
  backBtn:     { position: 'absolute', left: spacing.md, top: spacing.lg, padding: 8 },
  logoWrap:    { width: 56, height: 56, borderRadius: 18, backgroundColor: '#1E293B', borderWidth: 1.5, borderColor: '#2D3F55', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  brandName:   { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  brandSub:    { fontSize: 12, color: colors.tabInactive, marginTop: 3 },
  sheet:       { flex: 1, backgroundColor: colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  sheetContent: { padding: spacing.lg, paddingTop: spacing.md, paddingBottom: 40 },
  handle:      { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.lg },
  fieldLabel:  { ...typography.caption, marginBottom: 8, marginTop: 4 },
  roleGrid:    { gap: spacing.sm, marginBottom: spacing.md },
  roleCard:    { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surfaceAlt },
  roleDot:     { width: 12, height: 12, borderRadius: 6 },
  roleLabel:   { ...typography.h4 },
  roleDesc:    { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  errorBox:    { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.dangerLight, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  errorText:   { flex: 1, ...typography.bodySmall, color: colors.danger },
  btn:         { marginTop: spacing.sm, marginBottom: spacing.xl, borderRadius: radius.lg },
  footer:      { flexDirection: 'row', justifyContent: 'center', marginBottom: spacing.sm },
  footerText:  { ...typography.bodySmall, color: colors.textMuted },
  footerLink:  { ...typography.bodySmall, color: colors.primary, fontWeight: '700' },
  doneWrap:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md, backgroundColor: colors.background },
  doneIcon:    { width: 80, height: 80, borderRadius: 40, backgroundColor: `${colors.success}15`, alignItems: 'center', justifyContent: 'center' },
  doneTitle:   { ...typography.h1, textAlign: 'center' },
  doneSub:     { ...typography.body, color: colors.textMuted, textAlign: 'center' },
});
