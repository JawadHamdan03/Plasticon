import React, { useCallback, useRef, useState } from 'react';
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
  id:      string;
  role:    'user' | 'assistant';
  text:    string;
  loading?: boolean;
}

const QUICK_PROMPTS_EN = [
  'Generate a weekly maintenance summary',
  'What machines need urgent attention?',
  'Show overdue maintenance tasks',
  'Analyze maintenance cost trends',
];

const QUICK_PROMPTS_AR = [
  'إنشاء ملخص صيانة أسبوعي',
  'ما الآلات التي تحتاج عناية عاجلة؟',
  'عرض مهام الصيانة المتأخرة',
  'تحليل اتجاهات تكاليف الصيانة',
];

const WELCOME_EN = "Maintenance Report AI ready.\n\nI can generate maintenance summaries, analyze equipment health trends, identify overdue tasks, and produce reports for management review.";
const WELCOME_AR = 'تقرير الصيانة بالذكاء الاصطناعي جاهز.\n\nيمكنني إنشاء ملخصات الصيانة، تحليل اتجاهات صحة المعدات، تحديد المهام المتأخرة، وإنتاج تقارير للمراجعة الإدارية.';

export function MaintenanceReportScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const { user } = useAuth();

  const WELCOME: Message = { id: 'welcome', role: 'assistant', text: isAr ? WELCOME_AR : WELCOME_EN };
  const QUICK_PROMPTS = isAr ? QUICK_PROMPTS_AR : QUICK_PROMPTS_EN;

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
      const reply = res.reply ?? res.response ?? res.answer ?? ('تعذّر إنشاء التقرير. حاول مجدداً.');
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== 'loading'),
        { id: (Date.now() + 1).toString(), role: 'assistant', text: reply },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== 'loading'),
        { id: (Date.now() + 1).toString(), role: 'assistant', text: `${'الخدمة غير متاحة. '}(${err.message ?? 'Network error'})` },
      ]);
    } finally {
      setSending(false);
      scrollToBottom();
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[styles.headerIcon, { backgroundColor: `${colors.warning}15` }]}>
          <Ionicons name="construct" size={18} color={colors.warning} />
        </View>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{'تقرير الصيانة'}</Text>
          <Text style={[styles.headerSub, { color: colors.textMuted }]}>{'رؤى صيانة مولدة بالذكاء الاصطناعي'}</Text>
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
                <Text style={[styles.quickTitle, { color: colors.textMuted }]}>{'تقارير سريعة'}</Text>
                <View style={styles.quickGrid}>
                  {QUICK_PROMPTS.map((q) => (
                    <TouchableOpacity
                      key={q}
                      style={[styles.quickBtn, { backgroundColor: colors.surface, borderColor: `${colors.warning}40` }]}
                      onPress={() => send(q)}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="flash-outline" size={14} color={colors.warning} />
                      <Text style={[styles.quickText, { color: colors.text }]}>{q}</Text>
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
                  <View style={[styles.botAvatar, { backgroundColor: `${colors.warning}15` }]}>
                    <Ionicons name="construct" size={13} color={colors.warning} />
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
                      <ActivityIndicator size="small" color={colors.warning} />
                      <Text style={[styles.typingText, { color: colors.warning }]}>{'جارٍ إنشاء التقرير…'}</Text>
                    </View>
                  ) : (
                    <Text style={[styles.bubbleText, { color: colors.text }, isUser && styles.textUser]}>{msg.text}</Text>
                  )}
                </View>
              </View>
            );
          }}
        />
        <View style={[styles.inputBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <TextInput
            style={[styles.textInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
            placeholder={'اسأل عن تقرير صيانة…'}
            placeholderTextColor={colors.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: colors.warning }, (!input.trim() || sending) && { backgroundColor: colors.textMuted }]}
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
  safe:        { flex: 1 },
  flex:        { flex: 1 },
  header:      { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 12, borderBottomWidth: 1 },
  headerIcon:  { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...typography.h4 },
  headerSub:   { ...typography.caption },
  clearBtn:    { marginLeft: 'auto', padding: 8 },
  list:        { padding: spacing.md, paddingBottom: spacing.lg },
  quickSection: { marginTop: spacing.md },
  quickTitle:   { ...typography.caption, fontWeight: '700', marginBottom: spacing.sm },
  quickGrid:    { gap: spacing.sm },
  quickBtn:     { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, ...shadow.sm },
  quickText:    { ...typography.bodySmall, flex: 1 },
  bubble:      { flexDirection: 'row', marginBottom: spacing.sm, alignItems: 'flex-end' },
  bubbleUser:  { flexDirection: 'row-reverse' },
  bubbleBot:   {},
  botAvatar:   { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 8, marginBottom: 2 },
  bubbleBody:  { maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.lg, ...shadow.sm },
  bodyUser:    { borderBottomRightRadius: 4 },
  bodyBot:     { borderBottomLeftRadius: 4, borderWidth: 1 },
  bubbleText:  { fontSize: 15, lineHeight: 22 },
  textUser:    { color: '#fff' },
  typingRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typingText:  { ...typography.caption },
  inputBar:    { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: spacing.md, paddingVertical: 10, borderTopWidth: 1, gap: spacing.sm },
  textInput:   { flex: 1, borderWidth: 1.5, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, maxHeight: 100 },
  sendBtn:     { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
