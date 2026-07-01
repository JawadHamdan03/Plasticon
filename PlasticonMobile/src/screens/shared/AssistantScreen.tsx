import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
import { useLocale } from '../../context/LocaleContext';
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
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';

interface Message {
  id:       string;
  role:     'user' | 'assistant';
  text:     string;
  loading?: boolean;
}

const WELCOME_EN = "Hello! I'm your Plasticon AI assistant. Ask me anything about production, attendance, quality checks, machinery, or any factory operations.";
const WELCOME_AR = "مرحباً! أنا مساعدك الذكي في بلاستيكون. اسألني عن أي شيء يتعلق بالإنتاج، الحضور، فحوصات الجودة، الآلات، أو أي عمليات مصنعية.";

function MessageBubble({ msg }: { msg: Message }) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const isUser = msg.role === 'user';
  return (
    <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot]}>
      {!isUser && (
        <View style={[styles.botAvatar, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="hardware-chip-outline" size={14} color={colors.primary} />
        </View>
      )}
      <View style={[
        styles.bubbleBody,
        isUser
          ? [styles.bodyUser, { backgroundColor: colors.primary }]
          : [styles.bodyBot, { backgroundColor: colors.surface, borderColor: colors.border }],
      ]}>
        {msg.loading ? (
          <View style={styles.typingRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.typingText, { color: colors.primary }]}>{'جارٍ التفكير…'}</Text>
          </View>
        ) : (
          <Text style={[styles.bubbleText, isUser ? styles.textUser : { color: colors.text }]}>
            {msg.text}
          </Text>
        )}
      </View>
    </View>
  );
}

export function AssistantScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const { user } = useAuth();

  const welcome: Message = { id: 'welcome', role: 'assistant', text: isAr ? WELCOME_AR : WELCOME_EN };

  const [messages, setMessages] = useState<Message[]>([welcome]);
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

    const userMsg: Message    = { id: Date.now().toString(), role: 'user', text };
    const loadingMsg: Message = { id: 'loading', role: 'assistant', text: '', loading: true };
    setMessages((prev) => [...prev, userMsg, loadingMsg]);

    try {
      const res = await ragApi.post<{ reply?: string; response?: string; answer?: string }>('/chat', {
        message: text,
        role:    user?.role?.toLowerCase() ?? 'worker',
      });
      const reply = res.reply ?? res.response ?? res.answer ?? ('تعذر إنشاء رد. حاول مجدداً.');
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
          text: isAr
            ? `عذراً، تعذر الوصول إلى الخدمة. (${err.message ?? 'خطأ في الشبكة'})`
            : `Sorry, I couldn't reach the AI service. (${err.message ?? 'Network error'})`,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const clearChat = () => setMessages([{ id: 'welcome', role: 'assistant', text: isAr ? WELCOME_AR : WELCOME_EN }]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <View style={[styles.headerIcon, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="hardware-chip" size={18} color={colors.primary} />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{'المساعد الذكي'}</Text>
            <Text style={[styles.headerSub, { color: colors.textMuted }]}>{'قاعدة معرفة بلاستيكون'}</Text>
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

        <View style={[styles.inputBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <TextInput
            style={[styles.textInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
            placeholder={'اسأل عن الإنتاج، الآلات…'}
            placeholderTextColor={colors.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
            onSubmitEditing={send}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: colors.primary }, (!input.trim() || sending) && { backgroundColor: colors.textMuted }]}
            onPress={send}
            activeOpacity={0.8}
            disabled={!input.trim() || sending}
          >
            {sending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={18} color="#fff" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },

  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 12, borderBottomWidth: 1 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerIcon: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...typography.h4 },
  headerSub:   { ...typography.caption },
  clearBtn:    { padding: 8 },

  messageList: { padding: spacing.md, paddingBottom: spacing.lg },

  bubble:     { flexDirection: 'row', marginBottom: spacing.sm, alignItems: 'flex-end' },
  bubbleUser: { flexDirection: 'row-reverse' },
  bubbleBot:  { flexDirection: 'row' },

  botAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 8, marginBottom: 2 },

  bubbleBody: { maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.lg, ...shadow.sm },
  bodyUser:   { borderBottomRightRadius: 4 },
  bodyBot:    { borderBottomLeftRadius: 4, borderWidth: 1 },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  textUser:   { color: '#fff' },

  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typingText: { ...typography.caption },

  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: spacing.md, paddingVertical: 10, borderTopWidth: 1, gap: spacing.sm },
  textInput: { flex: 1, borderWidth: 1.5, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, maxHeight: 100 },
  sendBtn:   { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
