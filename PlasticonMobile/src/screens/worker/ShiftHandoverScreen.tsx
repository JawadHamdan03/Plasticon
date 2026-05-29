import React, { useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ragApi } from '../../api/client';
import { Button, ScreenHeader } from '../../components';
import { colors, radius, shadow, spacing, typography } from '../../theme';

export function ShiftHandoverScreen() {
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
      setReport(res.reply ?? res.response ?? 'Could not generate report. Try again.');
    } catch (err: any) {
      setReport(`Error: ${err.message ?? 'Could not reach AI service.'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Shift Handover" subtitle="AI-generated handover report" showBack />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Info banner */}
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle-outline" size={18} color={colors.info} />
            <Text style={styles.infoText}>
              Add any notes from your shift. The AI will generate a structured handover report for the next team.
            </Text>
          </View>

          {/* Notes input */}
          <Text style={styles.label}>Shift Notes (optional)</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="E.g. Machine A stopped at 14:00, waste higher than usual on Line 3..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={5}
            value={notes}
            onChangeText={setNotes}
          />

          <Button onPress={generate} loading={loading} fullWidth size="lg" style={styles.btn}>
            Generate Report
          </Button>

          {/* Output */}
          {(loading || report) ? (
            <View style={styles.reportCard}>
              <View style={styles.reportHeader}>
                <Ionicons name="document-text" size={16} color={colors.primary} />
                <Text style={styles.reportTitle}>Handover Report</Text>
              </View>
              {loading ? (
                <View style={styles.generating}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={styles.generatingText}>Generating report…</Text>
                </View>
              ) : (
                <Text style={styles.reportText}>{report}</Text>
              )}
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: colors.background },
  flex:    { flex: 1 },
  content: { padding: spacing.md, paddingBottom: 40 },

  infoBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: colors.infoLight, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.lg,
    borderLeftWidth: 3, borderLeftColor: colors.info,
  },
  infoText: { ...typography.bodySmall, color: colors.info, flex: 1, lineHeight: 20 },

  label: { ...typography.caption, marginBottom: 6 },
  notesInput: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md,
    padding: spacing.md, fontSize: 15, color: colors.text,
    backgroundColor: colors.surface, height: 120, textAlignVertical: 'top',
    marginBottom: spacing.md,
  },
  btn: { marginBottom: spacing.lg },

  reportCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.md, ...shadow.sm,
    borderTopWidth: 3, borderTopColor: colors.primary,
  },
  reportHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.sm },
  reportTitle:  { ...typography.h4, color: colors.primary },
  generating:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: spacing.sm },
  generatingText: { ...typography.bodySmall, color: colors.primary },
  reportText:   { ...typography.body, lineHeight: 24, color: colors.text },
});
