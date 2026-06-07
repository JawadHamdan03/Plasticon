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
import { useLocale } from '../../context/LocaleContext';

type Nav = NativeStackNavigationProp<AuthStackParamList>;

const ROLES = ['WORKER', 'ENGINEER', 'ACCOUNTANT'] as const;
type Role   = typeof ROLES[number];

export function RequestAccessScreen() {
  const navigation = useNavigation<Nav>();
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const [fullName,   setFullName]   = useState('');
  const [email,      setEmail]      = useState('');
  const [department, setDepartment] = useState('');
  const [reason,     setReason]     = useState('');
  const [role,       setRole]       = useState<Role>('WORKER');
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [submitted,  setSubmitted]  = useState(false);

  const ROLE_META: Record<Role, { label: string; desc: string; color: string }> = {
    WORKER:     { label: isAr ? 'عامل' : 'Worker',       desc: isAr ? 'الإنتاج والحضور' : 'Production & attendance',  color: colors.accent },
    ENGINEER:   { label: isAr ? 'مهندس' : 'Engineer',    desc: isAr ? 'الآلات والصيانة' : 'Machines & maintenance',   color: colors.info },
    ACCOUNTANT: { label: isAr ? 'محاسب' : 'Accountant',  desc: isAr ? 'المالية والفواتير' : 'Finance & invoices',     color: colors.success },
  };

  const submit = async () => {
    if (!fullName.trim() || !email.trim()) {
      setError(isAr ? 'الاسم الكامل والبريد الإلكتروني مطلوبان.' : 'Full name and email are required.');
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
      setError(e.message ?? (isAr ? 'فشل تقديم الطلب. يرجى المحاولة مرة أخرى.' : 'Failed to submit request. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.tabBar }]}>
        <View style={[styles.doneWrap, { backgroundColor: colors.background }]}>
          <View style={[styles.doneIcon, { backgroundColor: `${colors.success}15` }]}>
            <Ionicons name="checkmark-circle" size={44} color={colors.success} />
          </View>
          <Text style={[styles.doneTitle, { color: colors.text }]}>
            {isAr ? 'تم تقديم الطلب!' : 'Request submitted!'}
          </Text>
          <Text style={[styles.doneSub, { color: colors.textMuted }]}>
            {isAr
              ? 'تم إرسال طلب الوصول إلى المسؤول. سيتم إخطارك بالبريد الإلكتروني بمجرد مراجعته.'
              : "Your access request has been sent to an administrator. You'll be notified by email once it's reviewed."}
          </Text>
          <Button fullWidth onPress={() => navigation.navigate('Login')} style={styles.btn}>
            {isAr ? 'العودة لتسجيل الدخول' : 'Back to Sign In'}
          </Button>
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
            <Ionicons name="shield-checkmark" size={28} color={colors.accent} />
          </View>
          <Text style={styles.brandName}>{isAr ? 'طلب الوصول' : 'Request Access'}</Text>
          <Text style={[styles.brandSub, { color: colors.tabInactive }]}>
            {isAr ? 'سيراجع المسؤول طلبك' : 'An admin will review your request'}
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

          <Input label={`${isAr ? 'الاسم الكامل' : 'Full Name'} *`}      value={fullName}   onChangeText={setFullName}   placeholder="Mohamamd Esawi"                    icon="person-outline"   autoCapitalize="words" />
          <Input label={`${isAr ? 'البريد الإلكتروني' : 'Email Address'} *`} value={email}  onChangeText={setEmail}      placeholder="mhmd@plasticon.com"             icon="mail-outline"     keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
          <Input label={isAr ? 'القسم' : 'Department'}                    value={department} onChangeText={setDepartment} placeholder={isAr ? 'مثال: الإنتاج، المالية' : 'e.g. Production, Finance'} icon="business-outline" />

          {/* Role picker */}
          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
            {isAr ? 'الدور المطلوب *' : 'Requested Role *'}
          </Text>
          <View style={styles.roleGrid}>
            {ROLES.map((r) => {
              const m       = ROLE_META[r];
              const active  = role === r;
              return (
                <TouchableOpacity
                  key={r}
                  style={[styles.roleCard, { borderColor: active ? m.color : colors.border, backgroundColor: active ? `${m.color}10` : colors.surfaceAlt }]}
                  onPress={() => setRole(r)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.roleDot, { backgroundColor: active ? m.color : colors.border }]} />
                  <View>
                    <Text style={[styles.roleLabel, { color: active ? m.color : colors.text }]}>{m.label}</Text>
                    <Text style={[styles.roleDesc, { color: colors.textMuted }]}>{m.desc}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <Input
            label={isAr ? 'السبب (اختياري)' : 'Reason (optional)'}
            value={reason}
            onChangeText={setReason}
            placeholder={isAr ? 'اشرح باختصار لماذا تحتاج الوصول…' : 'Briefly explain why you need access…'}
            icon="chatbubble-outline"
            multiline
            numberOfLines={3}
          />

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: colors.dangerLight }]}>
              <Ionicons name="alert-circle-outline" size={15} color={colors.danger} />
              <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
            </View>
          ) : null}

          <Button onPress={submit} loading={loading} fullWidth size="lg" style={styles.btn}>
            {isAr ? 'تقديم الطلب' : 'Submit Request'}
          </Button>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textMuted }]}>
              {isAr ? 'لديك حساب بالفعل؟ ' : 'Already have an account? '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={[styles.footerLink, { color: colors.primary }]}>
                {isAr ? 'تسجيل الدخول' : 'Sign In'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1 },
  flex:        { flex: 1 },
  header:      { alignItems: 'center', paddingTop: spacing.lg, paddingBottom: spacing.xl },
  backBtn:     { position: 'absolute', left: spacing.md, top: spacing.lg, padding: 8 },
  logoWrap:    { width: 56, height: 56, borderRadius: 18, backgroundColor: '#1E293B', borderWidth: 1.5, borderColor: '#2D3F55', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  brandName:   { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  brandSub:    { fontSize: 12, marginTop: 3 },
  sheet:       { flex: 1, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  sheetContent: { padding: spacing.lg, paddingTop: spacing.md, paddingBottom: 40 },
  handle:      { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.lg },
  fieldLabel:  { ...typography.caption, marginBottom: 8, marginTop: 4 },
  roleGrid:    { gap: spacing.sm, marginBottom: spacing.md },
  roleCard:    { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1.5 },
  roleDot:     { width: 12, height: 12, borderRadius: 6 },
  roleLabel:   { ...typography.h4 },
  roleDesc:    { ...typography.caption, marginTop: 2 },
  errorBox:    { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  errorText:   { flex: 1, ...typography.bodySmall },
  btn:         { marginTop: spacing.sm, marginBottom: spacing.xl, borderRadius: radius.lg },
  footer:      { flexDirection: 'row', justifyContent: 'center', marginBottom: spacing.sm },
  footerText:  { ...typography.bodySmall },
  footerLink:  { ...typography.bodySmall, fontWeight: '700' },
  doneWrap:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  doneIcon:    { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  doneTitle:   { ...typography.h1, textAlign: 'center' },
  doneSub:     { ...typography.body, textAlign: 'center' },
});
