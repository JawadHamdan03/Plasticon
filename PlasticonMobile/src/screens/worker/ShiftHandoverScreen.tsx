import React, { useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ragApi } from '../../api/client';
import { Button, ScreenHeader } from '../../components';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

export function ShiftHandoverScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const [notes, setNotes]     = useState('');
  const [report, setReport]   = useState('');
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    setReport('');
    try {
      const res = await ragApi.post<{ reply?: string; response?: string }>('/chat', {
        message: `Generate a professional shift handover report in the following format:
1. Work Completed
2. Machines Used
3. Issues / Incidents
4. Pending Tasks for Next Shift
5. Safety Notes

Additional notes from operator: ${notes.trim() || 'None provided.'}

Please use the Plasticon factory context and keep it concise and structured.`,
        role: 'worker',
      });
      setReport(res.reply ?? res.response ?? (isAr ? 'تعذر إنشاء التقرير. حاول مرة أخرى.' : 'Could not generate report. Try again.'));
    } catch (err: any) {
      setReport(`${isAr ? 'خطأ: ' : 'Error: '}${err.message ?? (isAr ? 'تعذر الوصول إلى خدمة الذكاء الاصطناعي.' : 'Could not reach AI service.')}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={isAr ? 'تسليم الوردية' : 'Shift Handover'} subtitle={isAr ? 'تقرير تسليم بالذكاء الاصطناعي' : 'AI-generated handover report'} showBack />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={[styles.infoBanner, { backgroundColor: colors.infoLight, borderLeftColor: colors.info }]}>
            <Ionicons name="information-circle-outline" size={18} color={colors.info} />
            <Text style={[styles.infoText, { color: colors.info }]}>
              {isAr
                ? 'أضف ملاحظات من وردية عملك. سيُنشئ الذكاء الاصطناعي تقرير تسليم منظماً للفريق التالي.'
                : 'Add any notes from your shift. The AI will generate a structured handover report for the next team.'}
            </Text>
          </View>

          <Text style={[styles.label, { color: colors.textMuted }]}>{isAr ? 'ملاحظات الوردية (اختياري)' : 'Shift Notes (optional)'}</Text>
          <TextInput
            style={[styles.notesInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
            placeholder={isAr ? 'مثال: توقفت آلة A الساعة 14:00، هدر أعلى من المعتاد في خط 3...' : 'E.g. Machine A stopped at 14:00, waste higher than usual on Line 3...'}
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={5}
            value={notes}
            onChangeText={setNotes}
          />

          <Button onPress={generate} loading={loading} fullWidth size="lg" style={styles.btn}>
            {isAr ? 'إنشاء التقرير' : 'Generate Report'}
          </Button>

          {(loading || report) ? (
            <View style={[styles.reportCard, { backgroundColor: colors.surface, borderTopColor: colors.primary }]}>
              <View style={styles.reportHeader}>
                <Ionicons name="document-text" size={16} color={colors.primary} />
                <Text style={[styles.reportTitle, { color: colors.primary }]}>{isAr ? 'تقرير التسليم' : 'Handover Report'}</Text>
              </View>
              {loading ? (
                <View style={styles.generating}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={[styles.generatingText, { color: colors.primary }]}>{isAr ? 'جارٍ إنشاء التقرير…' : 'Generating report…'}</Text>
                </View>
              ) : (
                <Text style={[styles.reportText, { color: colors.text }]}>{report}</Text>
              )}
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1 },
  flex:    { flex: 1 },
  content: { padding: spacing.md, paddingBottom: 40 },

  infoBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.lg,
    borderLeftWidth: 3,
  },
  infoText: { ...typography.bodySmall, flex: 1, lineHeight: 20 },

  label: { ...typography.caption, marginBottom: 6 },
  notesInput: {
    borderWidth: 1.5, borderRadius: radius.md,
    padding: spacing.md, fontSize: 15,
    height: 120, textAlignVertical: 'top',
    marginBottom: spacing.md,
  },
  btn: { marginBottom: spacing.lg },

  reportCard: {
    borderRadius: radius.lg,
    padding: spacing.md, ...shadow.sm,
    borderTopWidth: 3,
  },
  reportHeader:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.sm },
  reportTitle:    { ...typography.h4 },
  generating:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: spacing.sm },
  generatingText: { ...typography.bodySmall },
  reportText:     { ...typography.body, lineHeight: 24 },
});
