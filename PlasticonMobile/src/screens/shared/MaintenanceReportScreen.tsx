import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../auth/AuthContext';
import { ragApi } from '../../api/client';
import { colors, radius, shadow, spacing, typography } from '../../theme';

interface Message {
  id:      string;
  role:    'user' | 'assistant';
  text:    string;
  loading?: boolean;
}

const QUICK_PROMPTS = [
  'Generate a weekly maintenance summary',
  'What machines need urgent attention?',
  'Show overdue maintenance tasks',
  'Analyze maintenance cost trends',
];

const WELCOME: Message = {
  id: 'welcome',
  role: 'assistant',
  text: "Maintenance Report AI ready.\n\nI can generate maintenance summaries, analyze equipment health trends, identify overdue tasks, and produce reports for management review.",
};

export function MaintenanceReportScreen() {
  const { user }   = useAuth();
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input,    setInput]    = useState('');
  const [sending,  setSending]  = useState(false);
  const listRef = useRef<FlatList<Message>>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || sending) return;
    setInput('');
    setSending(true);
    const userMsg:    Message = { id: Date.now().toString(), role: 'user', text: msg };
    const loadingMsg: Message = { id: 'loading', role: 'assistant', text: '', loading: true };
    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    try {
      const res = await ragApi.post<{ reply?: string; response?: string; answer?: string }>('/chat', {
        message: `[Maintenance Report] ${msg}`,
        role:    user?.role?.toLowerCase() ?? 'admin',
        context: 'maintenance_report',
      });
      const reply = res.reply ?? res.response ?? res.answer ?? 'Unable to generate report. Please try again.';
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== 'loading'),
        { id: (Date.now() + 1).toString(), role: 'assistant', text: reply },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== 'loading'),
        { id: (Date.now() + 1).toString(), role: 'assistant', text: `Service unavailable. (${err.message ?? 'Network error'})` },
      ]);
    } finally {
      setSending(false);
      scrollToBottom();
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="construct" size={18} color={colors.warning} />
        </View>
        <View>
          <Text style={styles.headerTitle}>Maintenance Report</Text>
          <Text style={styles.headerSub}>AI-generated maintenance insights</Text>
        </View>
        <TouchableOpacity onPress={() => setMessages([WELCOME])} style={styles.clearBtn}>
          <Ionicons name="refresh-outline" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={20}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToBottom}
          ListFooterComponent={
            messages.length <= 1 ? (
              <View style={styles.quickSection}>
                <Text style={styles.quickTitle}>Quick Reports</Text>
                <View style={styles.quickGrid}>
                  {QUICK_PROMPTS.map((q) => (
                    <TouchableOpacity key={q} style={styles.quickBtn} onPress={() => send(q)} activeOpacity={0.75}>
                      <Ionicons name="flash-outline" size={14} color={colors.warning} />
                      <Text style={styles.quickText}>{q}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : null
          }
          renderItem={({ item: msg }) => {
            const isUser = msg.role === 'user';
            return (
              <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot]}>
                {!isUser && (
                  <View style={styles.botAvatar}>
                    <Ionicons name="construct" size={13} color={colors.warning} />
                  </View>
                )}
                <View style={[styles.bubbleBody, isUser ? styles.bodyUser : styles.bodyBot]}>
                  {msg.loading ? (
                    <View style={styles.typingRow}><ActivityIndicator size="small" color={colors.warning} /><Text style={styles.typingText}>Generating report…</Text></View>
                  ) : (
                    <Text style={[styles.bubbleText, isUser && styles.textUser]}>{msg.text}</Text>
                  )}
                </View>
              </View>
            );
          }}
        />
        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            placeholder="Ask for a maintenance report…"
            placeholderTextColor={colors.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: colors.warning }, (!input.trim() || sending) && styles.sendDisabled]}
            onPress={() => send()}
            disabled={!input.trim() || sending}
            activeOpacity={0.8}
          >
            {sending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={18} color="#fff" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: colors.background },
  flex:         { flex: 1 },
  header:       { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerIcon:   { width: 36, height: 36, borderRadius: radius.sm, backgroundColor: `${colors.warning}15`, alignItems: 'center', justifyContent: 'center' },
  headerTitle:  { ...typography.h4 },
  headerSub:    { ...typography.caption },
  clearBtn:     { marginLeft: 'auto', padding: 8 },
  list:         { padding: spacing.md, paddingBottom: spacing.lg },
  quickSection: { marginTop: spacing.md },
  quickTitle:   { ...typography.caption, fontWeight: '700', color: colors.textMuted, marginBottom: spacing.sm },
  quickGrid:    { gap: spacing.sm },
  quickBtn:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: `${colors.warning}40`, ...shadow.sm },
  quickText:    { ...typography.bodySmall, flex: 1 },
  bubble:       { flexDirection: 'row', marginBottom: spacing.sm, alignItems: 'flex-end' },
  bubbleUser:   { flexDirection: 'row-reverse' },
  bubbleBot:    {},
  botAvatar:    { width: 28, height: 28, borderRadius: 14, backgroundColor: `${colors.warning}15`, alignItems: 'center', justifyContent: 'center', marginRight: 8, marginBottom: 2 },
  bubbleBody:   { maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.lg, ...shadow.sm },
  bodyUser:     { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bodyBot:      { backgroundColor: colors.surface, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.border },
  bubbleText:   { fontSize: 15, lineHeight: 22, color: colors.text },
  textUser:     { color: '#fff' },
  typingRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typingText:   { ...typography.caption, color: colors.warning },
  inputBar:     { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: spacing.md, paddingVertical: 10, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.sm },
  textInput:    { flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: colors.text, backgroundColor: colors.surfaceAlt, maxHeight: 100 },
  sendBtn:      { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { backgroundColor: colors.textMuted },
});
