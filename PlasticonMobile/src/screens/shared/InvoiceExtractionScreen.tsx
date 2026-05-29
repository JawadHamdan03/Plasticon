import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
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

const WELCOME: Message = {
  id: 'welcome',
  role: 'assistant',
  text: "Invoice Extraction AI ready.\n\nPaste invoice text or describe an invoice and I'll extract structured data: vendor, amounts, dates, line items, and payment terms.",
};

export function InvoiceExtractionScreen() {
  const { user }   = useAuth();
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input,    setInput]    = useState('');
  const [sending,  setSending]  = useState(false);
  const listRef = useRef<FlatList<Message>>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setSending(true);

    const userMsg:    Message = { id: Date.now().toString(), role: 'user', text };
    const loadingMsg: Message = { id: 'loading', role: 'assistant', text: '', loading: true };
    setMessages((prev) => [...prev, userMsg, loadingMsg]);

    try {
      const res = await ragApi.post<{ reply?: string; response?: string; answer?: string }>('/chat', {
        message: `[Invoice Extraction Task] ${text}`,
        role:    user?.role?.toLowerCase() ?? 'admin',
        context: 'invoice_extraction',
      });
      const reply = res.reply ?? res.response ?? res.answer ?? 'Unable to extract invoice data. Please try again.';
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
          <Ionicons name="document-text" size={18} color={colors.success} />
        </View>
        <View>
          <Text style={styles.headerTitle}>Invoice Extraction</Text>
          <Text style={styles.headerSub}>AI-powered invoice data extraction</Text>
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
          renderItem={({ item: msg }) => {
            const isUser = msg.role === 'user';
            return (
              <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot]}>
                {!isUser && (
                  <View style={styles.botAvatar}>
                    <Ionicons name="document-text" size={13} color={colors.success} />
                  </View>
                )}
                <View style={[styles.bubbleBody, isUser ? styles.bodyUser : styles.bodyBot]}>
                  {msg.loading ? (
                    <View style={styles.typingRow}>
                      <ActivityIndicator size="small" color={colors.success} />
                      <Text style={styles.typingText}>Extracting…</Text>
                    </View>
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
            placeholder="Paste invoice text or describe it…"
            placeholderTextColor={colors.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={2000}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || sending) && styles.sendDisabled]}
            onPress={send}
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
  safe:        { flex: 1, backgroundColor: colors.background },
  flex:        { flex: 1 },
  header:      { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerIcon:  { width: 36, height: 36, borderRadius: radius.sm, backgroundColor: `${colors.success}15`, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...typography.h4 },
  headerSub:   { ...typography.caption },
  clearBtn:    { marginLeft: 'auto', padding: 8 },
  list:        { padding: spacing.md, paddingBottom: spacing.lg },
  bubble:      { flexDirection: 'row', marginBottom: spacing.sm, alignItems: 'flex-end' },
  bubbleUser:  { flexDirection: 'row-reverse' },
  bubbleBot:   {},
  botAvatar:   { width: 28, height: 28, borderRadius: 14, backgroundColor: `${colors.success}15`, alignItems: 'center', justifyContent: 'center', marginRight: 8, marginBottom: 2 },
  bubbleBody:  { maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.lg, ...shadow.sm },
  bodyUser:    { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bodyBot:     { backgroundColor: colors.surface, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.border },
  bubbleText:  { fontSize: 15, lineHeight: 22, color: colors.text },
  textUser:    { color: '#fff' },
  typingRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typingText:  { ...typography.caption, color: colors.success },
  inputBar:    { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: spacing.md, paddingVertical: 10, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.sm },
  textInput:   { flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: colors.text, backgroundColor: colors.surfaceAlt, maxHeight: 120 },
  sendBtn:     { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { backgroundColor: colors.textMuted },
});
