import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
import { useLocale } from '../../context/LocaleContext';
  ActivityIndicator, FlatList, Keyboard, KeyboardAvoidingView,
  Modal, Platform, RefreshControl, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../api/client';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useCall, type CallType } from '../../context/CallContext';

interface ChatGroup {
  id: number;
  name: string;
  description?: string;
  unreadCount?: number;
  _count?: { members: number; messages: number };
  lastMessage?: {
    id: number;
    content: string;
    createdAt: string;
    sender?: { fullName: string };
  } | null;
}

interface GroupMessage {
  id: number;
  content: string;
  senderId: number;
  sender?: { id: number; fullName: string; username: string; role?: string };
  createdAt: string;
}

interface AdminTarget {
  usersByShift: { shiftId: number | null; shiftName: string; members: { id: number; fullName: string }[] }[];
  shifts:       { shiftId: number; shiftName: string; membersCount: number }[];
  audiences:    { key: string; label: string; membersCount: number }[];
}

function initials(name?: string) {
  if (!name) return '?';
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(iso: string, isAr: boolean) {
  const d = new Date(iso);
  const now = new Date();
  const today    = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const msgDay   = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = today - msgDay;
  if (diff === 0)         return 'اليوم';
  if (diff === 86400000)  return 'أمس';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// ─── Group card ───────────────────────────────────────────────────────────────

function GroupCard({ group, onPress }: { group: ChatGroup; onPress: () => void }) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const hasUnread = (group.unreadCount ?? 0) > 0;

  return (
    <TouchableOpacity
      style={[styles.groupCard, { backgroundColor: colors.surface }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.groupAvatar, { backgroundColor: `${colors.primary}20` }]}>
        <Ionicons name="people" size={20} color={colors.primary} />
      </View>
      <View style={styles.groupInfo}>
        <View style={styles.groupTop}>
          <Text style={[styles.groupName, { color: colors.text, fontWeight: hasUnread ? '700' : '600' }]} numberOfLines={1}>
            {group.name}
          </Text>
          {group.lastMessage && (
            <Text style={[styles.groupTime, { color: colors.textMuted }]}>
              {fmtTime(group.lastMessage.createdAt)}
            </Text>
          )}
        </View>
        <View style={styles.groupBottom}>
          <Text style={[styles.groupPreview, { color: colors.textMuted }]} numberOfLines={1}>
            {group.lastMessage
              ? `${group.lastMessage.sender?.fullName ?? ''}: ${group.lastMessage.content}`
              : ('لا توجد رسائل بعد')}
          </Text>
          {hasUnread && (
            <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.unreadBadgeText}>
                {(group.unreadCount ?? 0) > 99 ? '99+' : group.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Admin targeted message modal ─────────────────────────────────────────────

function AdminChatModal({
  visible, onClose, onSent,
}: { visible: boolean; onClose: () => void; onSent: () => void }) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const [targets,    setTargets]    = useState<AdminTarget | null>(null);
  const [targetType, setTargetType] = useState<'AUDIENCE' | 'USER' | 'SHIFT'>('AUDIENCE');
  const [targetUserId, setTargetUserId] = useState('');
  const [shiftId,    setShiftId]    = useState('');
  const [audienceKey,setAudienceKey]= useState('ALL_EMPLOYEES');
  const [content,    setContent]    = useState('');
  const [sending,    setSending]    = useState(false);

  useEffect(() => {
    if (!visible) return;
    api.get<AdminTarget>('/chat/admin/targets').then(r => setTargets(r)).catch(() => {});
  }, [visible]);

  const send = async () => {
    if (!content.trim()) return;
    setSending(true);
    try {
      const body: any = { targetType, content: content.trim() };
      if (targetType === 'USER'     && targetUserId) body.targetUserId = Number(targetUserId);
      if (targetType === 'SHIFT'    && shiftId)      body.shiftId      = Number(shiftId);
      if (targetType === 'AUDIENCE')                 body.audienceKey  = audienceKey;
      await api.post('/chat/admin/send', body);
      setContent('');
      onSent();
    } catch {} finally { setSending(false); }
  };

  const chip = (active: boolean) => ({
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full,
    backgroundColor: active ? colors.primary : colors.surfaceAlt,
    borderWidth: 1, borderColor: active ? colors.primary : colors.border,
    marginRight: 6,
  });
  const chipTxt = (active: boolean): any => ({
    fontSize: 12, fontWeight: '600', color: active ? '#fff' : colors.textMuted,
  });

  const allMembers = targets?.usersByShift.flatMap(b => b.members) ?? [];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <SafeAreaView style={[styles.sheet, { backgroundColor: colors.surface }]} edges={['bottom']}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>
              {'إرسال رسالة مستهدفة'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: spacing.md }} showsVerticalScrollIndicator={false}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{'الهدف'}</Text>
            <View style={{ flexDirection: 'row', marginBottom: spacing.md }}>
              {(['AUDIENCE', 'USER', 'SHIFT'] as const).map(t => (
                <TouchableOpacity key={t} style={chip(targetType === t)} onPress={() => setTargetType(t)}>
                  <Text style={chipTxt(targetType === t)}>
                    {t === 'AUDIENCE' ? ('الجمهور')
                      : t === 'USER'  ? ('مستخدم')
                      :                  ('وردية')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {targetType === 'AUDIENCE' && (targets?.audiences ?? []).length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
                <View style={{ flexDirection: 'row' }}>
                  {targets!.audiences.map(a => (
                    <TouchableOpacity key={a.key} style={chip(audienceKey === a.key)} onPress={() => setAudienceKey(a.key)}>
                      <Text style={chipTxt(audienceKey === a.key)}>{a.label} ({a.membersCount})</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            )}

            {targetType === 'USER' && allMembers.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
                <View style={{ flexDirection: 'row' }}>
                  {allMembers.map(u => (
                    <TouchableOpacity key={u.id} style={chip(targetUserId === String(u.id))} onPress={() => setTargetUserId(String(u.id))}>
                      <Text style={chipTxt(targetUserId === String(u.id))}>{u.fullName}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            )}

            {targetType === 'SHIFT' && (targets?.shifts ?? []).length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
                <View style={{ flexDirection: 'row' }}>
                  {targets!.shifts.map(s => (
                    <TouchableOpacity key={s.shiftId} style={chip(shiftId === String(s.shiftId))} onPress={() => setShiftId(String(s.shiftId))}>
                      <Text style={chipTxt(shiftId === String(s.shiftId))}>{s.shiftName} ({s.membersCount})</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            )}

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{'الرسالة *'}</Text>
            <TextInput
              style={[styles.input, styles.textarea, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
              value={content}
              onChangeText={setContent}
              placeholder={'اكتب رسالتك هنا'}
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { borderColor: colors.border, borderWidth: 1.5 }]} onPress={onClose}>
                <Text style={{ color: colors.textMuted, fontWeight: '600' }}>{'إلغاء'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { flex: 2, backgroundColor: colors.primary }]} onPress={send} disabled={sending}>
                {sending
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={{ color: '#fff', fontWeight: '700' }}>{'إرسال'}</Text>
                }
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

// ─── Create group modal ───────────────────────────────────────────────────────

function CreateGroupModal({
  visible, onClose, onCreate,
}: { visible: boolean; onClose: () => void; onCreate: () => void }) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const [name,    setName]    = useState('');
  const [desc,    setDesc]    = useState('');
  const [creating,setCreating]= useState(false);

  const create = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      await api.post('/chat/groups', { name: name.trim(), description: desc.trim() });
      setName(''); setDesc('');
      onCreate();
    } catch {} finally { setCreating(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <SafeAreaView style={[styles.sheet, { backgroundColor: colors.surface }]} edges={['bottom']}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>{'إنشاء مجموعة'}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <View style={{ padding: spacing.md }}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{'اسم المجموعة *'}</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
              value={name}
              onChangeText={setName}
              placeholder={'اسم المجموعة'}
              placeholderTextColor={colors.textMuted}
            />
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{'الوصف'}</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
              value={desc}
              onChangeText={setDesc}
              placeholder={'وصف اختياري'}
              placeholderTextColor={colors.textMuted}
            />
            <View style={[styles.modalActions, { marginTop: spacing.md }]}>
              <TouchableOpacity style={[styles.modalBtn, { borderColor: colors.border, borderWidth: 1.5 }]} onPress={onClose}>
                <Text style={{ color: colors.textMuted, fontWeight: '600' }}>{'إلغاء'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { flex: 2, backgroundColor: colors.primary }]} onPress={create} disabled={creating}>
                {creating
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={{ color: '#fff', fontWeight: '700' }}>{'إنشاء'}</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

// ─── Direct message modal ─────────────────────────────────────────────────────

function DirectMessageModal({
  visible, onClose, onSent,
}: { visible: boolean; onClose: () => void; onSent: () => void }) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const [users,    setUsers]    = useState<{ id: number; fullName: string }[]>([]);
  const [targetId, setTargetId] = useState('');
  const [content,  setContent]  = useState('');
  const [sending,  setSending]  = useState(false);

  useEffect(() => {
    if (!visible) return;
    api.get<any>('/chat/members-by-shift').then(r => {
      const list = r?.usersByShift
        ? (r.usersByShift as any[]).flatMap((b: any) => b.members as { id: number; fullName: string }[])
        : (Array.isArray(r) ? r : []);
      setUsers(list);
    }).catch(() => {});
  }, [visible]);

  const send = async () => {
    if (!targetId || !content.trim()) return;
    setSending(true);
    try {
      await api.post('/chat/direct', { targetUserId: Number(targetId), content: content.trim() });
      setContent(''); setTargetId('');
      onSent();
    } catch {} finally { setSending(false); }
  };

  const chip = (active: boolean) => ({
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full,
    backgroundColor: active ? colors.primary : colors.surfaceAlt,
    borderWidth: 1, borderColor: active ? colors.primary : colors.border,
    marginRight: 6,
  });
  const chipTxt = (active: boolean): any => ({
    fontSize: 11, fontWeight: '600', color: active ? '#fff' : colors.textMuted,
  });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <SafeAreaView style={[styles.sheet, { backgroundColor: colors.surface }]} edges={['bottom']}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>{'رسالة مباشرة'}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: spacing.md }} showsVerticalScrollIndicator={false}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{'إلى'}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
              <View style={{ flexDirection: 'row' }}>
                {users.map(u => (
                  <TouchableOpacity key={u.id} style={chip(targetId === String(u.id))} onPress={() => setTargetId(String(u.id))}>
                    <Text style={chipTxt(targetId === String(u.id))}>{u.fullName}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{'الرسالة *'}</Text>
            <TextInput
              style={[styles.input, styles.textarea, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
              value={content}
              onChangeText={setContent}
              placeholder={'اكتب رسالتك'}
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
            />

            <View style={[styles.modalActions, { marginTop: spacing.sm }]}>
              <TouchableOpacity style={[styles.modalBtn, { borderColor: colors.border, borderWidth: 1.5 }]} onPress={onClose}>
                <Text style={{ color: colors.textMuted, fontWeight: '600' }}>{'إلغاء'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { flex: 2, backgroundColor: colors.primary }]} onPress={send} disabled={sending}>
                {sending
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={{ color: '#fff', fontWeight: '700' }}>{'إرسال'}</Text>
                }
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

// ─── Call picker modal ────────────────────────────────────────────────────────

function CallPickerModal({
  members, callType, onSelect, onClose, colors: c, isAr,
}: {
  members: { id: number; fullName: string }[];
  callType: CallType;
  onSelect: (m: { id: number; fullName: string }) => void;
  onClose: () => void;
  colors: any;
  isAr: boolean;
}) {
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <SafeAreaView style={[styles.sheet, { backgroundColor: c.surface }]} edges={['bottom']}>
          <View style={[styles.sheetHandle, { backgroundColor: c.border }]} />
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: c.text }]}>
              {callType === 'video'
                ? ('مكالمة فيديو')
                : ('مكالمة صوتية')}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={c.textMuted} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.fieldLabel, { color: c.textSecondary, paddingHorizontal: spacing.md }]}>
            {'اختر شخصاً للاتصال به'}
          </Text>
          <ScrollView contentContainerStyle={{ padding: spacing.md }}>
            {members.map(m => (
              <TouchableOpacity
                key={m.id}
                style={[styles.memberRow, { borderColor: c.border }]}
                onPress={() => onSelect(m)}
                activeOpacity={0.75}
              >
                <View style={[styles.memberAvatar, { backgroundColor: `${c.primary}20` }]}>
                  <Text style={[styles.memberAvatarText, { color: c.primary }]}>{initials(m.fullName)}</Text>
                </View>
                <Text style={[styles.memberName, { color: c.text }]}>{m.fullName}</Text>
                <Ionicons name={callType === 'video' ? 'videocam' : 'call'} size={20} color={c.primary} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export function ChatScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [view,        setView]        = useState<'groups' | 'messages'>('groups');
  const [groups,      setGroups]      = useState<ChatGroup[]>([]);
  const [activeGroup, setActiveGroup] = useState<ChatGroup | null>(null);
  const [messages,    setMessages]    = useState<GroupMessage[]>([]);
  const [input,       setInput]       = useState('');
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingMsgs,   setLoadingMsgs]   = useState(false);
  const [sending,       setSending]       = useState(false);
  const [refreshing,    setRefreshing]    = useState(false);
  const [showAdminSend,   setShowAdminSend]   = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showDirect,      setShowDirect]      = useState(false);
  const [fabOpen,         setFabOpen]         = useState(false);
  const listRef = useRef<FlatList<GroupMessage>>(null);

  const { initiateCall } = useCall();
  const [groupMembers,    setGroupMembers]    = useState<{ id: number; fullName: string }[]>([]);
  const [showCallPicker,  setShowCallPicker]  = useState(false);
  const [pendingCallType, setPendingCallType] = useState<CallType>('voice');

  const loadGroups = useCallback(async () => {
    try {
      const res = await api.get<ChatGroup[]>('/chat/groups');
      setGroups(Array.isArray(res) ? res : []);
    } finally {
      setLoadingGroups(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void loadGroups(); }, [loadGroups]);

  const openGroup = async (group: ChatGroup) => {
    setActiveGroup(group);
    setView('messages');
    setLoadingMsgs(true);
    // Fetch member list for call picker
    api.get<any>(`/chat/groups/${group.id}`).then(r => {
      const members: { id: number; fullName: string }[] =
        (r?.members ?? []).map((m: any) => ({ id: m.user?.id ?? m.userId, fullName: m.user?.fullName ?? '' })).filter((m: any) => m.id);
      setGroupMembers(members);
    }).catch(() => {});
    try {
      const res = await api.get<any>(`/chat/groups/${group.id}/messages?limit=50`);
      const msgs: GroupMessage[] = res?.messages ?? (Array.isArray(res) ? res : []);
      setMessages([...msgs].reverse()); // API returns newest-first; reverse for chronological display
    } finally {
      setLoadingMsgs(false);
    }
    api.patch(`/chat/groups/${group.id}/mark-as-read`, {}).catch(() => {});
    setGroups(prev => prev.map(g => g.id === group.id ? { ...g, unreadCount: 0 } : g));
  };

  const goBack = () => {
    setView('groups');
    setActiveGroup(null);
    setMessages([]);
    setGroupMembers([]);
    void loadGroups();
  };

  const handleCall = (type: CallType) => {
    const others = groupMembers.filter(m => m.id !== user?.id);
    if (others.length === 0) return;
    if (others.length === 1) {
      void initiateCall(others[0].id, others[0].fullName, type);
    } else {
      setPendingCallType(type);
      setShowCallPicker(true);
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || sending || !activeGroup) return;
    setInput('');
    setSending(true);
    try {
      const res = await api.post<any>(`/chat/groups/${activeGroup.id}/messages`, { content: text });
      const newMsg: GroupMessage = res?.message ?? res;
      if (newMsg?.id) {
        setMessages(prev => [...prev, newMsg]);
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch {
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  function roleColor(role?: string) {
    switch ((role ?? '').toUpperCase()) {
      case 'ADMIN':      return colors.roleAdmin;
      case 'ENGINEER':   return colors.roleEngineer;
      case 'ACCOUNTANT': return colors.roleAccountant;
      default:           return colors.roleWorker;
    }
  }

  // ── Groups view ────────────────────────────────────────────────────────────
  if (view === 'groups') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={[styles.headerIcon, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="chatbubbles" size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{'المحادثات'}</Text>
            <Text style={[styles.headerSub, { color: colors.textMuted }]}>
              {groups.length} {'مجموعة'}
            </Text>
          </View>
        </View>

        {loadingGroups ? (
          <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
        ) : (
          <FlatList
            data={groups}
            keyExtractor={g => String(g.id)}
            renderItem={({ item }) => <GroupCard group={item} onPress={() => openGroup(item)} />}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => { setRefreshing(true); void loadGroups(); }}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="chatbubbles-outline" size={44} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  {'لا توجد مجموعات بعد'}
                </Text>
                <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
                  {'ينشئ المديرون مجموعات الدردشة'}
                </Text>
              </View>
            }
          />
        )}

        {/* FAB backdrop */}
        {fabOpen && (
          <TouchableOpacity
            style={styles.fabBackdrop}
            onPress={() => setFabOpen(false)}
            activeOpacity={1}
          />
        )}

        {/* FAB menu */}
        {fabOpen && (
          <View style={styles.fabMenu}>
            {isAdmin && (
              <TouchableOpacity
                style={[styles.fabItem, { backgroundColor: colors.surface }]}
                onPress={() => { setFabOpen(false); setShowCreateGroup(true); }}
              >
                <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                <Text style={[styles.fabItemText, { color: colors.text }]}>
                  {'إنشاء مجموعة'}
                </Text>
              </TouchableOpacity>
            )}
            {isAdmin && (
              <TouchableOpacity
                style={[styles.fabItem, { backgroundColor: colors.surface }]}
                onPress={() => { setFabOpen(false); setShowAdminSend(true); }}
              >
                <Ionicons name="megaphone-outline" size={18} color={colors.warning} />
                <Text style={[styles.fabItemText, { color: colors.text }]}>
                  {'رسالة مستهدفة'}
                </Text>
              </TouchableOpacity>
            )}
            {!isAdmin && (
              <TouchableOpacity
                style={[styles.fabItem, { backgroundColor: colors.surface }]}
                onPress={() => { setFabOpen(false); setShowDirect(true); }}
              >
                <Ionicons name="chatbubble-outline" size={18} color={colors.primary} />
                <Text style={[styles.fabItemText, { color: colors.text }]}>
                  {'رسالة مباشرة'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <TouchableOpacity
          style={[styles.fab, { backgroundColor: fabOpen ? colors.danger : colors.primary }]}
          onPress={() => setFabOpen(v => !v)}
          activeOpacity={0.85}
        >
          <Ionicons name={fabOpen ? 'close' : 'add'} size={26} color="#fff" />
        </TouchableOpacity>

        <AdminChatModal
          visible={showAdminSend}
          onClose={() => setShowAdminSend(false)}
          onSent={() => { setShowAdminSend(false); void loadGroups(); }}
        />
        <CreateGroupModal
          visible={showCreateGroup}
          onClose={() => setShowCreateGroup(false)}
          onCreate={() => { setShowCreateGroup(false); void loadGroups(); }}
        />
        <DirectMessageModal
          visible={showDirect}
          onClose={() => setShowDirect(false)}
          onSent={() => { setShowDirect(false); }}
        />
      </SafeAreaView>
    );
  }

  // ── Messages view ──────────────────────────────────────────────────────────
  // On Android, app.json sets softwareKeyboardLayoutMode="pan" which pans the
  // entire window up automatically — KeyboardAvoidingView is not needed and
  // conflicts with pan mode, causing the send button to stay hidden.
  // On iOS, we wrap with KeyboardAvoidingView + behavior="padding".
  const messagesContent = (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={[styles.headerIcon, { backgroundColor: `${colors.primary}20` }]}>
          <Ionicons name="people" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {activeGroup?.name}
          </Text>
          {activeGroup?._count && (
            <Text style={[styles.headerSub, { color: colors.textMuted }]}>
              {activeGroup._count.members} {'عضو'}
            </Text>
          )}
        </View>
        <TouchableOpacity style={styles.callBtn} onPress={() => handleCall('voice')} activeOpacity={0.7}>
          <Ionicons name="call" size={22} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.callBtn} onPress={() => handleCall('video')} activeOpacity={0.7}>
          <Ionicons name="videocam" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {loadingMsgs ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={m => String(m.id)}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {'لا توجد رسائل بعد. ابدأ المحادثة!'}
              </Text>
            </View>
          }
          renderItem={({ item: msg, index }) => {
            const me = msg.senderId === user?.id || msg.sender?.id === user?.id;
            const rc = roleColor(msg.sender?.role);
            const showDateSep = index === 0
              || fmtDate(msg.createdAt, false) !== fmtDate(messages[index - 1].createdAt, false);
            return (
              <>
                {showDateSep && (
                  <View style={styles.dateSep}>
                    <View style={[styles.dateLine, { backgroundColor: colors.border }]} />
                    <Text style={[styles.dateLabel, { color: colors.textMuted, backgroundColor: colors.background }]}>
                      {fmtDate(msg.createdAt, isAr)}
                    </Text>
                    <View style={[styles.dateLine, { backgroundColor: colors.border }]} />
                  </View>
                )}
                <View style={[styles.msgRow, me && styles.msgRowMe]}>
                  {!me && (
                    <View style={[styles.msgAvatar, { backgroundColor: `${rc}20` }]}>
                      <Text style={[styles.msgAvatarText, { color: rc }]}>{initials(msg.sender?.fullName)}</Text>
                    </View>
                  )}
                  <View style={[styles.msgBubble, me && styles.msgBubbleMe]}>
                    {!me && msg.sender && (
                      <Text style={[styles.msgSender, { color: rc }]}>
                        {msg.sender.fullName}{msg.sender.role ? ` · ${msg.sender.role}` : ''}
                      </Text>
                    )}
                    <View style={[
                      styles.msgBody,
                      me
                        ? [styles.msgBodyMe,   { backgroundColor: colors.primary }]
                        : [styles.msgBodyThem, { backgroundColor: colors.surface, borderColor: colors.border }],
                    ]}>
                      <Text style={[styles.msgText, { color: me ? '#fff' : colors.text }]}>
                        {msg.content}
                      </Text>
                    </View>
                    <Text style={[styles.msgTime, { color: colors.textMuted }, me && { textAlign: 'right' }]}>
                      {fmtTime(msg.createdAt)}
                    </Text>
                  </View>
                </View>
              </>
            );
          }}
        />
      )}

      <View style={[styles.inputBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TouchableOpacity style={styles.dismissBtn} onPress={() => Keyboard.dismiss()} activeOpacity={0.6}>
          <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
        </TouchableOpacity>
        <TextInput
          style={[styles.textInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
          placeholder={'اكتب رسالة…'}
          placeholderTextColor={colors.textMuted}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={2000}
        />
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: (!input.trim() || sending) ? colors.textMuted : colors.primary }]}
          onPress={send}
          disabled={!input.trim() || sending}
          activeOpacity={0.8}
        >
          {sending
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="send" size={18} color="#fff" />
          }
        </TouchableOpacity>
      </View>

      {showCallPicker && (
        <CallPickerModal
          members={groupMembers.filter(m => m.id !== user?.id)}
          callType={pendingCallType}
          onSelect={m => { setShowCallPicker(false); void initiateCall(m.id, m.fullName, pendingCallType); }}
          onClose={() => setShowCallPicker(false)}
          colors={colors}
          isAr={isAr}
        />
      )}
    </SafeAreaView>
  );

  return (
    <KeyboardAvoidingView
      style={styles.safe}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {messagesContent}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  flex:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header:      { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 12, borderBottomWidth: 1 },
  headerIcon:  { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...typography.h4 },
  headerSub:   { ...typography.caption },
  backBtn:     { padding: 4, marginRight: 4 },

  // Groups list
  list:         { padding: spacing.md, paddingBottom: 100 },
  groupCard:    { flexDirection: 'row', alignItems: 'center', borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, gap: spacing.sm, ...shadow.sm },
  groupAvatar:  { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  groupInfo:    { flex: 1 },
  groupTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  groupName:    { flex: 1, fontSize: 15 },
  groupTime:    { ...typography.caption, flexShrink: 0 },
  groupBottom:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  groupPreview: { ...typography.caption, flex: 1, marginRight: 8 },
  unreadBadge:  { minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  unreadBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  // Messages
  messageList: { padding: spacing.md, paddingBottom: spacing.lg },
  dateSep:     { flexDirection: 'row', alignItems: 'center', marginVertical: 12, gap: 8 },
  dateLine:    { flex: 1, height: 1 },
  dateLabel:   { ...typography.caption, paddingHorizontal: 8 },
  msgRow:      { flexDirection: 'row', marginBottom: 10, gap: 8 },
  msgRowMe:    { flexDirection: 'row-reverse' },
  msgAvatar:   { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end' },
  msgAvatarText:{ fontSize: 12, fontWeight: '700' },
  msgBubble:   { flex: 1, maxWidth: '80%' },
  msgBubbleMe: { alignItems: 'flex-end' },
  msgSender:   { ...typography.caption, fontWeight: '700', marginBottom: 3, marginLeft: 2 },
  msgBody:     { borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 10, ...shadow.sm },
  msgBodyThem: { borderBottomLeftRadius: 4, borderWidth: 1 },
  msgBodyMe:   { borderBottomRightRadius: 4 },
  msgText:     { fontSize: 15, lineHeight: 22 },
  msgTime:     { ...typography.caption, marginTop: 3, marginHorizontal: 4 },
  inputBar:    { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: spacing.sm, paddingVertical: 10, borderTopWidth: 1, gap: spacing.xs },
  dismissBtn:  { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  textInput:   { flex: 1, borderWidth: 1.5, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, maxHeight: 100 },
  sendBtn:     { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },

  // FAB
  fab:         { position: 'absolute', bottom: 28, right: 24, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', ...shadow.sm },
  fabBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent', zIndex: 1 },
  fabMenu:     { position: 'absolute', bottom: 92, right: 24, gap: 8, zIndex: 2 },
  fabItem:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderRadius: radius.md, ...shadow.sm },
  fabItemText: { fontSize: 14, fontWeight: '600' },

  // Shared modal
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:       { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  sheetTitle:  { ...typography.h3 },
  fieldLabel:  { ...typography.caption, fontWeight: '600', marginBottom: 6, marginTop: spacing.sm },
  input:       { borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, marginBottom: spacing.md },
  textarea:    { minHeight: 80, textAlignVertical: 'top' },
  modalActions:{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  modalBtn:    { flex: 1, paddingVertical: 12, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },

  // Call
  callBtn:         { padding: 8 },
  memberRow:       { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 12, borderBottomWidth: 1 },
  memberAvatar:    { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  memberAvatarText:{ fontSize: 13, fontWeight: '700' },
  memberName:      { flex: 1, fontSize: 15 },

  // Empty
  empty:     { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.sm },
  emptyText: { ...typography.bodySmall, textAlign: 'center' },
  emptyHint: { ...typography.caption, textAlign: 'center' },
});
