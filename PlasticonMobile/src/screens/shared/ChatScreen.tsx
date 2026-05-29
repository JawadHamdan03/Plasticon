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
import { api } from '../../api/client';
import { colors, radius, shadow, spacing, typography } from '../../theme';

interface ChatMessage {
  id:        string;
  userId?:   string;
  userName?: string;
  userRole?: string;
  message:   string;
  createdAt: string;
}

function initials(name?: string) {
  if (!name) return '?';
  return name.split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2);
}

function roleColor(role?: string) {
  if (!role) return colors.textMuted;
  switch (role.toUpperCase()) {
    case 'ADMIN':      return colors.roleAdmin;
    case 'ENGINEER':   return colors.roleEngineer;
    case 'ACCOUNTANT': return colors.roleAccountant;
    default:           return colors.roleWorker;
  }
}

export function ChatScreen() {
  const { user }  = useAuth();
  const [messages,   setMessages]   = useState<ChatMessage[]>([]);
  const [input,      setInput]      = useState('');
  const [loading,    setLoading]    = useState(true);
  const [sending,    setSending]    = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get<ChatMessage[] | { messages: ChatMessage[] }>('/chat');
      const msgs = Array.isArray(res) ? res : (res.messages ?? []);
      setMessages(msgs.slice(-100));
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setSending(true);
    try {
      const sent = await api.post<ChatMessage>('/chat', { message: text });
      setMessages((prev) => [...prev, sent]);
    } catch {
      // failed silently — user retains their typed message
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  const isMe = (msg: ChatMessage) => msg.userId === user?.id;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="chatbubbles" size={18} color={colors.primary} />
        </View>
        <View>
          <Text style={styles.headerTitle}>Team Chat</Text>
          <Text style={styles.headerSub}>Company-wide conversation</Text>
        </View>
        <TouchableOpacity onPress={load} style={styles.refreshBtn}>
          <Ionicons name="refresh-outline" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="chatbubbles-outline" size={44} color={colors.textMuted} />
                <Text style={styles.emptyText}>No messages yet. Start the conversation!</Text>
              </View>
            }
            renderItem={({ item: msg }) => {
              const me = isMe(msg);
              const rc = roleColor(msg.userRole);
              return (
                <View style={[styles.row, me && styles.rowMe]}>
                  {!me && (
                    <View style={[styles.avatar, { backgroundColor: `${rc}20` }]}>
                      <Text style={[styles.avatarText, { color: rc }]}>{initials(msg.userName)}</Text>
                    </View>
                  )}
                  <View style={styles.bubble}>
                    {!me && (
                      <Text style={[styles.bubbleName, { color: rc }]}>
                        {msg.userName ?? 'Unknown'}{msg.userRole ? ` · ${msg.userRole}` : ''}
                      </Text>
                    )}
                    <View style={[styles.bubbleBody, me ? styles.bodyMe : styles.bodyThem]}>
                      <Text style={[styles.bubbleText, me && styles.textMe]}>{msg.message}</Text>
                    </View>
                    <Text style={[styles.timestamp, me && { textAlign: 'right' }]}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </View>
              );
            }}
          />

          <View style={styles.inputBar}>
            <TextInput
              style={styles.textInput}
              placeholder="Type a message…"
              placeholderTextColor={colors.textMuted}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={500}
              returnKeyType="send"
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!input.trim() || sending) && styles.sendDisabled]}
              onPress={send}
              disabled={!input.trim() || sending}
              activeOpacity={0.8}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={18} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: colors.background },
  flex:        { flex: 1 },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: 12,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerIcon:  { width: 36, height: 36, borderRadius: radius.sm, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...typography.h4 },
  headerSub:   { ...typography.caption },
  refreshBtn:  { marginLeft: 'auto', padding: 8 },
  messageList: { padding: spacing.md, paddingBottom: spacing.lg },
  empty:       { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.sm },
  emptyText:   { ...typography.bodySmall, color: colors.textMuted, textAlign: 'center' },
  row:         { flexDirection: 'row', marginBottom: spacing.sm, gap: 8 },
  rowMe:       { flexDirection: 'row-reverse' },
  avatar:      { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end' },
  avatarText:  { fontSize: 12, fontWeight: '700' },
  bubble:      { flex: 1, maxWidth: '80%' },
  bubbleName:  { ...typography.caption, fontWeight: '700', marginBottom: 3, marginLeft: 2 },
  bubbleBody:  { borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 10, ...shadow.sm },
  bodyThem:    { backgroundColor: colors.surface, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.border },
  bodyMe:      { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleText:  { fontSize: 15, lineHeight: 22, color: colors.text },
  textMe:      { color: '#fff' },
  timestamp:   { ...typography.caption, marginTop: 3, marginHorizontal: 4 },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: spacing.md, paddingVertical: 10,
    backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.border,
    gap: spacing.sm,
  },
  textInput: {
    flex: 1, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 15, color: colors.text, backgroundColor: colors.surfaceAlt, maxHeight: 100,
  },
  sendBtn:     { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { backgroundColor: colors.textMuted },
});
