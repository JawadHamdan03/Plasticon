import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  text: "Hello! I'm your Plasticon AI assistant. Ask me anything about production, attendance, quality checks, machinery, or any factory operations.",
};

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';
  return (
    <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot]}>
      {!isUser && (
        <View style={styles.botAvatar}>
          <Ionicons name="hardware-chip-outline" size={14} color={colors.primary} />
        </View>
      )}
      <View style={[styles.bubbleBody, isUser ? styles.bodyUser : styles.bodyBot]}>
        {msg.loading ? (
          <View style={styles.typingRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.typingText}>Thinking…</Text>
          </View>
        ) : (
          <Text style={[styles.bubbleText, isUser ? styles.textUser : styles.textBot]}>
            {msg.text}
          </Text>
        )}
      </View>
    </View>
  );
}

export function AssistantScreen() {
  const { user }  = useAuth();
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput]       = useState('');
  const [sending, setSending]   = useState(false);
  const listRef = useRef<FlatList<Message>>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setSending(true);

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text };
    const loadingMsg: Message = { id: 'loading', role: 'assistant', text: '', loading: true };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);

    try {
      const res = await ragApi.post<{ reply?: string; response?: string; answer?: string }>('/chat', {
        message: text,
        role:    user?.role?.toLowerCase() ?? 'worker',
      });

      const reply = res.reply ?? res.response ?? res.answer ?? 'I could not generate a response. Please try again.';

      setMessages((prev) => [
        ...prev.filter((m) => m.id !== 'loading'),
        { id: (Date.now() + 1).toString(), role: 'assistant', text: reply },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== 'loading'),
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: `Sorry, I couldn't reach the AI service. (${err.message ?? 'Network error'})`,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const clearChat = () => setMessages([WELCOME]);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIcon}>
            <Ionicons name="hardware-chip" size={18} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.headerTitle}>AI Assistant</Text>
            <Text style={styles.headerSub}>Plasticon Knowledge Base</Text>
          </View>
        </View>
        <TouchableOpacity onPress={clearChat} style={styles.clearBtn}>
          <Ionicons name="refresh-outline" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => <MessageBubble msg={item} />}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToBottom}
        />

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            placeholder="Ask about production, machinery…"
            placeholderTextColor={colors.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
            onSubmitEditing={send}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
            onPress={send}
            activeOpacity={0.8}
            disabled={!input.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={18} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: 12,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerIcon: {
    width: 36, height: 36, borderRadius: radius.sm,
    backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { ...typography.h4 },
  headerSub:   { ...typography.caption },
  clearBtn: { padding: 8 },

  messageList: { padding: spacing.md, paddingBottom: spacing.lg },

  bubble: { flexDirection: 'row', marginBottom: spacing.sm, alignItems: 'flex-end' },
  bubbleUser: { flexDirection: 'row-reverse' },
  bubbleBot:  { flexDirection: 'row' },

  botAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 8, marginBottom: 2,
  },

  bubbleBody: {
    maxWidth: '78%',
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: radius.lg,
    ...shadow.sm,
  },
  bodyUser: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  bodyBot: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: colors.border,
  },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  textUser:   { color: '#fff' },
  textBot:    { color: colors.text },

  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typingText: { ...typography.caption, color: colors.primary },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: spacing.md, paddingVertical: 10,
    backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.border,
    gap: spacing.sm,
  },
  textInput: {
    flex: 1,
    borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 15, color: colors.text,
    backgroundColor: colors.surfaceAlt,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: colors.textMuted },
});
