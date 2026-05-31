import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
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
import { api, ragApi } from '../../api/client';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

interface Anomaly {
  id:          string;
  type:        string;
  description: string;
  severity?:   'low' | 'medium' | 'high' | 'critical';
  machine?:    string;
  detectedAt?: string;
}

interface Message {
  id:       string;
  role:     'user' | 'assistant';
  text:     string;
  loading?: boolean;
}

type Tab = 'alerts' | 'chat';

export function AnomalyDetectionScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const { user } = useAuth();

  function sevColor(s?: string) {
    if (s === 'critical') return colors.danger;
    if (s === 'high')     return colors.warning;
    if (s === 'medium')   return colors.info;
    return colors.success;
  }

  const WELCOME: Message = {
    id: 'welcome',
    role: 'assistant',
    text: isAr
      ? 'كشف الشذوذات بالذكاء الاصطناعي.\n\nأراقب بيانات الإنتاج بحثاً عن أنماط غير عادية. اسألني لتحليل آلات محددة أو فترات زمنية.'
      : "Anomaly Detection AI active.\n\nI monitor production data for unusual patterns. Ask me to analyze specific machines, time ranges, or describe an issue you've observed.",
  };

  const [tab,       setTab]       = useState<Tab>('alerts');
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [messages,  setMessages]  = useState<Message[]>([WELCOME]);
  const [input,     setInput]     = useState('');
  const [sending,   setSending]   = useState(false);
  const listRef = useRef<FlatList<Message>>(null);

  const loadAnomalies = useCallback(async () => {
    try {
      const res = await api.get<any>('/machine-health');
      const raw = Array.isArray(res) ? res : ((res as any).records ?? []);
      const issues = raw.filter((r: any) => r.operationalStatus !== 'OPERATIONAL');
      setAnomalies(issues.map((r: any) => ({
        id:          String(r.id),
        type:        r.operationalStatus,
        description: r.notes ?? `Efficiency: ${r.efficiencyRating ?? 0}% · Downtime: ${r.downtimePercentage ?? 0}%`,
        severity:    r.operationalStatus === 'BROKEN'      ? 'critical' :
                     r.operationalStatus === 'MAINTENANCE' ? 'high'     :
                     r.operationalStatus === 'OFFLINE'     ? 'medium'   : 'low',
        machine:    r.machine?.name,
        detectedAt: r.recordedAt,
      })));
    } catch {
      setAnomalies([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void loadAnomalies(); }, [loadAnomalies]);

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
        message: `[Anomaly Detection] ${text}`,
        role:    user?.role?.toLowerCase() ?? 'admin',
        context: 'anomaly_detection',
      });
      const reply = res.reply ?? res.response ?? res.answer ?? (isAr ? 'لا تحليل متاح.' : 'No analysis available.');
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== 'loading'),
        { id: (Date.now() + 1).toString(), role: 'assistant', text: reply },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== 'loading'),
        { id: (Date.now() + 1).toString(), role: 'assistant', text: `${isAr ? 'الخدمة غير متاحة. ' : 'Service unavailable. '}(${err.message ?? 'Network error'})` },
      ]);
    } finally {
      setSending(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const critical = anomalies.filter((a) => a.severity === 'critical' || a.severity === 'high').length;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[styles.headerIcon, { backgroundColor: `${colors.danger}15` }]}>
          <Ionicons name="warning" size={18} color={colors.danger} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{isAr ? 'كشف الشذوذات' : 'Anomaly Detection'}</Text>
          <Text style={[styles.headerSub, { color: colors.textMuted }]}>{loading ? (isAr ? 'جارٍ التحميل…' : 'Loading…') : `${anomalies.length} ${isAr ? 'مكتشف' : 'detected'} · ${critical} ${isAr ? 'حرج' : 'critical'}`}</Text>
        </View>
      </View>

      <View style={[styles.tabs, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={[styles.tabBtn, tab === 'alerts' && { borderBottomColor: colors.danger, borderBottomWidth: 2 }]} onPress={() => setTab('alerts')}>
          <Ionicons name="alert-circle" size={16} color={tab === 'alerts' ? colors.danger : colors.textMuted} />
          <Text style={[styles.tabLabel, { color: tab === 'alerts' ? colors.danger : colors.textMuted }]}>{isAr ? 'التنبيهات' : 'Alerts'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, tab === 'chat' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]} onPress={() => setTab('chat')}>
          <Ionicons name="chatbubble-ellipses" size={16} color={tab === 'chat' ? colors.primary : colors.textMuted} />
          <Text style={[styles.tabLabel, { color: tab === 'chat' ? colors.primary : colors.textMuted }]}>{isAr ? 'تحليل الذكاء الاصطناعي' : 'AI Analysis'}</Text>
        </TouchableOpacity>
      </View>

      {tab === 'alerts' ? (
        loading ? (
          <View style={styles.center}><ActivityIndicator size="large" color={colors.danger} /></View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void loadAnomalies(); }} tintColor={colors.danger} />}
          >
            {anomalies.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="checkmark-circle" size={44} color={colors.success} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>{isAr ? 'لا توجد شذوذات مكتشفة' : 'No anomalies detected'}</Text>
              </View>
            ) : (
              <View style={styles.list}>
                {anomalies.map((a, idx) => {
                  const sc = sevColor(a.severity);
                  return (
                    <View key={`${a.id}-${idx}`} style={[styles.alertCard, { backgroundColor: colors.surface, borderLeftColor: sc }]}>
                      <View style={styles.alertTop}>
                        <Text style={[styles.alertType, { color: sc }]}>{a.type}</Text>
                        {a.severity && (
                          <View style={[styles.badge, { backgroundColor: `${sc}15` }]}>
                            <Text style={[styles.badgeText, { color: sc }]}>{a.severity.toUpperCase()}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.alertDesc, { color: colors.text }]}>{a.description}</Text>
                      <Text style={[styles.alertMeta, { color: colors.textMuted }]}>
                        {a.machine ? `${a.machine} · ` : ''}{a.detectedAt ? new Date(a.detectedAt).toLocaleString() : ''}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        )
      ) : (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={20}>
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            renderItem={({ item: msg }) => {
              const isUser = msg.role === 'user';
              return (
                <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot]}>
                  {!isUser && (
                    <View style={[styles.botAvatar, { backgroundColor: `${colors.danger}15` }]}>
                      <Ionicons name="warning" size={13} color={colors.danger} />
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
                        <ActivityIndicator size="small" color={colors.danger} />
                        <Text style={[styles.typingText, { color: colors.danger }]}>{isAr ? 'جارٍ التحليل…' : 'Analyzing…'}</Text>
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
              placeholder={isAr ? 'اسأل عن الشذوذات أو الاتجاهات…' : 'Ask about anomalies or trends…'}
              placeholderTextColor={colors.textMuted}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: colors.primary }, (!input.trim() || sending) && { backgroundColor: colors.textMuted }]}
              onPress={send}
              disabled={!input.trim() || sending}
              activeOpacity={0.8}
            >
              {sending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={18} color="#fff" />}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1 },
  flex:        { flex: 1 },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:      { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 12, borderBottomWidth: 1 },
  headerIcon:  { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  headerText:  { flex: 1 },
  headerTitle: { ...typography.h4 },
  headerSub:   { ...typography.caption },
  tabs:        { flexDirection: 'row', borderBottomWidth: 1 },
  tabBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  tabLabel:    { ...typography.caption, fontWeight: '700' },
  content:     { padding: spacing.md, paddingBottom: 40 },
  empty:       { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.sm },
  emptyText:   { ...typography.bodySmall },
  list:        { padding: spacing.md, gap: spacing.sm },
  alertCard:   { borderRadius: radius.lg, padding: spacing.md, borderLeftWidth: 3, ...shadow.sm },
  alertTop:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  alertType:   { ...typography.h4 },
  badge:       { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm },
  badgeText:   { fontSize: 10, fontWeight: '800' },
  alertDesc:   { ...typography.bodySmall, marginBottom: 4 },
  alertMeta:   { ...typography.caption },
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
