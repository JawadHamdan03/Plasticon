import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Modal, RefreshControl, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

interface QualityIssue {
  id:          number;
  description: string;
  severity?:   string;
  product?:    string;
  status?:     string;
  createdAt:   string;
}

const SEVERITIES = ['low', 'medium', 'high', 'critical'];

export function QualityIssuesScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();

  const SEVERITY_COLOR: Record<string, string> = {
    low:      colors.success,
    medium:   colors.warning,
    high:     colors.danger,
    critical: '#9B0000',
  };

  const SEVERITY_LABEL: Record<string, string> = isAr ? {
    low: 'منخفض', medium: 'متوسط', high: 'عالي', critical: 'حرج',
  } : {
    low: 'low', medium: 'medium', high: 'high', critical: 'critical',
  };

  const [issues,     setIssues]     = useState<QualityIssue[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal,      setModal]      = useState(false);
  const [desc,       setDesc]       = useState('');
  const [product,    setProduct]    = useState('');
  const [severity,   setSeverity]   = useState('medium');
  const [saving,     setSaving]     = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<QualityIssue[] | { data: QualityIssue[] }>('/worker-tools/quality-issues/mine');
      setIssues(Array.isArray(res) ? res : (res.data ?? []));
    } catch { setIssues([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const submit = async () => {
    if (!desc.trim()) { Alert.alert(isAr ? 'مطلوب' : 'Required', isAr ? 'اشرح مشكلة الجودة.' : 'Describe the quality issue.'); return; }
    setSaving(true);
    try {
      await api.post('/worker-tools/quality-issues', {
        description: desc.trim(),
        product:     product.trim() || undefined,
        severity,
      });
      setModal(false); setDesc(''); setProduct(''); setSeverity('medium');
      setLoading(true); void load();
    } catch (e: any) {
      Alert.alert(isAr ? 'خطأ' : 'Error', e.message ?? (isAr ? 'فشل الإبلاغ عن المشكلة.' : 'Failed to report issue.'));
    } finally { setSaving(false); }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={isAr ? 'مشاكل الجودة' : 'Quality Issues'} subtitle={`${issues.length} ${isAr ? 'مسجل' : 'reported'}`} showBack />
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.warning} /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.warning} />}
        >
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.warning }]} onPress={() => setModal(true)} activeOpacity={0.8}>
            <Ionicons name="alert-circle" size={20} color="#fff" />
            <Text style={styles.addText}>{isAr ? 'الإبلاغ عن مشكلة جودة' : 'Report Quality Issue'}</Text>
          </TouchableOpacity>

          {issues.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="shield-checkmark-outline" size={48} color={colors.success} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>{isAr ? 'لا توجد مشاكل جودة مسجلة' : 'No quality issues reported'}</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {issues.map((issue, idx) => {
                const sevColor = SEVERITY_COLOR[issue.severity?.toLowerCase() ?? 'medium'] ?? colors.warning;
                return (
                  <View key={`${issue.id}-${idx}`} style={[styles.card, { backgroundColor: colors.surface, borderLeftColor: sevColor }]}>
                    <View style={styles.cardTop}>
                      <Text style={[styles.cardDesc, { color: colors.text }]} numberOfLines={2}>{issue.description}</Text>
                      {issue.severity && (
                        <View style={[styles.badge, { backgroundColor: `${sevColor}20` }]}>
                          <Text style={[styles.badgeText, { color: sevColor }]}>{SEVERITY_LABEL[issue.severity.toLowerCase()] ?? issue.severity}</Text>
                        </View>
                      )}
                    </View>
                    {issue.product && <Text style={[styles.product, { color: colors.primary }]}>{issue.product}</Text>}
                    <View style={styles.cardFooter}>
                      {issue.status && <Text style={[styles.status, { color: colors.textMuted }]}>{issue.status}</Text>}
                      <Text style={[styles.dateText, { color: colors.textMuted }]}>{new Date(issue.createdAt).toLocaleDateString()}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}

      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>{isAr ? 'الإبلاغ عن مشكلة جودة' : 'Report Quality Issue'}</Text>
            <Text style={[styles.label, { color: colors.textMuted }]}>{isAr ? 'درجة الخطورة' : 'Severity'}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
              {SEVERITIES.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.pill, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }, severity === s && { backgroundColor: SEVERITY_COLOR[s], borderColor: SEVERITY_COLOR[s] }]}
                  onPress={() => setSeverity(s)}
                >
                  <Text style={[styles.pillText, { color: colors.text }, severity === s && { color: '#fff' }]}>{SEVERITY_LABEL[s]}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={[styles.label, { color: colors.textMuted }]}>{isAr ? 'المنتج / المنطقة' : 'Product / Area'}</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
              placeholder={isAr ? 'مثال: أنبوب PVC، خط 2' : 'e.g. PVC Pipe, Line 2'}
              placeholderTextColor={colors.textMuted}
              value={product}
              onChangeText={setProduct}
            />
            <Text style={[styles.label, { color: colors.textMuted }]}>{isAr ? 'الوصف *' : 'Description *'}</Text>
            <TextInput
              style={[styles.input, styles.inputMulti, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
              placeholder={isAr ? 'اشرح مشكلة الجودة بالتفصيل…' : 'Describe the quality issue in detail…'}
              placeholderTextColor={colors.textMuted}
              value={desc}
              onChangeText={setDesc}
              multiline
              numberOfLines={4}
            />
            <View style={styles.actions}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => setModal(false)}>
                <Text style={[styles.cancelText, { color: colors.textMuted }]}>{isAr ? 'إلغاء' : 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.submitBtn, { backgroundColor: SEVERITY_COLOR[severity] }]} onPress={submit} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitText}>{isAr ? 'إبلاغ' : 'Report'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:          { flex: 1 },
  center:        { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content:       { padding: spacing.md, paddingBottom: 40 },
  addBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: radius.lg, paddingVertical: 12, marginBottom: spacing.md },
  addText:       { ...typography.bodySmall, fontWeight: '700', color: '#fff' },
  empty:         { alignItems: 'center', paddingVertical: 60, gap: spacing.sm },
  emptyText:     { ...typography.bodySmall },
  list:          { gap: spacing.sm },
  card:          { borderRadius: radius.lg, padding: spacing.md, borderLeftWidth: 3, ...shadow.sm },
  cardTop:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm, marginBottom: 4 },
  cardDesc:      { ...typography.bodySmall, flex: 1 },
  badge:         { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm },
  badgeText:     { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  product:       { ...typography.caption, fontWeight: '600', marginBottom: 4 },
  cardFooter:    { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  status:        { ...typography.caption, textTransform: 'capitalize' },
  dateText:      { ...typography.caption },
  overlay:       { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:         { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: 40 },
  handle:        { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  sheetTitle:    { ...typography.h2, marginBottom: spacing.md },
  label:         { ...typography.caption, marginBottom: 6 },
  input:         { borderWidth: 1.5, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: 15, marginBottom: spacing.md },
  inputMulti:    { height: 96, textAlignVertical: 'top' },
  pill:          { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1.5, marginRight: spacing.sm },
  pillText:      { fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },
  actions:       { flexDirection: 'row', gap: spacing.sm },
  cancelBtn:     { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: radius.md, borderWidth: 1.5 },
  cancelText:    { fontWeight: '700' },
  submitBtn:     { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: radius.md },
  submitText:    { fontWeight: '700', color: '#fff' },
});
