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

export function ShiftHandoverScreen() {
  const { colors } = useAppTheme();
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
      setReport(res.reply ?? res.response ?? ('تعذر إنشاء التقرير. حاول مرة أخرى.'));
    } catch (err: any) {
      setReport(`${'خطأ: '}${err.message ?? ('تعذر الوصول إلى خدمة الذكاء الاصطناعي.')}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={'تسليم الوردية'} subtitle={'تقرير تسليم بالذكاء الاصطناعي'} showBack />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={[styles.infoBanner, { backgroundColor: colors.infoLight, borderLeftColor: colors.info }]}>
            <Ionicons name="information-circle-outline" size={18} color={colors.info} />
            <Text style={[styles.infoText, { color: colors.info }]}>
              {'أضف ملاحظات من وردية عملك. سيُنشئ الذكاء الاصطناعي تقرير تسليم منظماً للفريق التالي.'}
            </Text>
          </View>

          <Text style={[styles.label, { color: colors.textMuted }]}>{'ملاحظات الوردية (اختياري)'}</Text>
          <TextInput
            style={[styles.notesInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
            placeholder={'مثال: توقفت آلة A الساعة 14:00، هدر أعلى من المعتاد في خط 3...'}
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={5}
            value={notes}
            onChangeText={setNotes}
          />

          <Button onPress={generate} loading={loading} fullWidth size="lg" style={styles.btn}>
            {'إنشاء التقرير'}
          </Button>

          {(loading || report) ? (
            <View style={[styles.reportCard, { backgroundColor: colors.surface, borderTopColor: colors.primary }]}>
              <View style={styles.reportHeader}>
                <Ionicons name="document-text" size={16} color={colors.primary} />
                <Text style={[styles.reportTitle, { color: colors.primary }]}>{'تقرير التسليم'}</Text>
              </View>
              {loading ? (
                <View style={styles.generating}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={[styles.generatingText, { color: colors.primary }]}>{'جارٍ إنشاء التقرير…'}</Text>
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
