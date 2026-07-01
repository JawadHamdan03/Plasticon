import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import {
  Send, Search, Plus, Users, X, ChevronRight,
  MessageCircle, RefreshCw, UserPlus, Trash2, LogOut
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useLocale } from "../../context/LocaleContext";
import { API_BASE_URL, readApiError } from "../../lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────
type ChatGroup = {
  id: number;
  name: string;
  description?: string | null;
  unreadCount?: number;
  lastMessage?: { id: number; content: string; createdAt: string } | null;
};
type GroupRole = "ADMIN" | "MEMBER";
type GroupMember = {
  id: number;
  role: GroupRole;
  user: { id: number; fullName?: string; username?: string; role?: string };
};
type ChatGroupDetail = {
  id: number;
  name: string;
  description?: string | null;
  members?: GroupMember[];
};
type GroupMessage = {
  id: number;
  content: string;
  createdAt: string;
  sender?: { id: number; fullName?: string; username?: string; role?: string };
};
type DirectoryMember = {
  id: number;
  fullName: string;
  username: string;
  role: string;
  shiftId: number | null;
  shiftName: string;
};
type ShiftMembersBucket = {
  shiftId: number | null;
  shiftName: string;
  members: DirectoryMember[];
};
type ShiftTarget = { shiftId: number; shiftName: string; membersCount: number };
type AudienceTarget = { key: "ALL_WORKERS" | "ALL_EMPLOYEES"; label: string; membersCount: number };
type AdminTargetsResponse = {
  usersByShift: ShiftMembersBucket[];
  shifts: ShiftTarget[];
  audiences: AudienceTarget[];
};
type SelectedAdminTarget =
  | { type: "USER"; id: number; label: string }
  | { type: "SHIFT"; id: number; label: string }
  | { type: "AUDIENCE"; id: AudienceTarget["key"]; label: string };
type AdminTargetType = "USER" | "SHIFT" | "AUDIENCE";
type DirectoryRoleFilter = "ALL" | "WORKER" | "ENGINEER" | "ACCOUNTANT";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  "#f97316","#3b82f6","#8b5cf6","#10b981","#ef4444",
  "#f59e0b","#06b6d4","#ec4899","#84cc16","#6366f1",
];

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function Avatar({ name, size = 38 }: { name: string; size?: number }) {
  const bg = avatarColor(name || "?");
  const ini = initials(name || "?");
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: size, height: size, borderRadius: "50%", background: bg,
      color: "#fff", fontWeight: 700, fontSize: size * 0.38, flexShrink: 0,
      userSelect: "none",
    }}>
      {ini}
    </span>
  );
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (d.getFullYear() === now.getFullYear())
    return d.toLocaleDateString([], { day: "numeric", month: "short" });
  return d.toLocaleDateString([], { day: "numeric", month: "short", year: "2-digit" });
}

function fmtDateSep(iso: string, locale: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return "اليوم";
  const yest = new Date(now); yest.setDate(now.getDate() - 1);
  if (d.toDateString() === yest.toDateString())
    return "أمس";
  return d.toLocaleDateString("ar-SA", { day: "numeric", month: "long", year: "numeric" });
}

async function fetchApi(path: string, opts?: RequestInit) {
  return fetch(`${API_BASE_URL}${path}`, { ...opts, credentials: "include" });
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function ChatPage() {
  const { locale } = useLocale();
  const { user } = useAuth();
  const isAr = locale === "ar";
  const isAdmin = user?.role === "ADMIN";
  const currentUserId = user?.id ?? null;

  // Groups & selection
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [groupSearch, setGroupSearch] = useState("");
  const [loadingGroups, setLoadingGroups] = useState(false);

  // Messages
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Group detail / members panel
  const [selectedGroupDetail, setSelectedGroupDetail] = useState<ChatGroupDetail | null>(null);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Mobile: show sidebar vs thread
  const [mobileView, setMobileView] = useState<"sidebar" | "thread">("sidebar");

  // Admin: send direct / broadcast
  const [showAdminPanel, setShowAdminPanel] = useState<"none" | "new-group" | "direct">("none");
  const [membersByShift, setMembersByShift] = useState<ShiftMembersBucket[]>([]);
  const [shiftTargets, setShiftTargets] = useState<ShiftTarget[]>([]);
  const [audienceTargets, setAudienceTargets] = useState<AudienceTarget[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [targetType, setTargetType] = useState<AdminTargetType>("USER");
  const [roleFilter, setRoleFilter] = useState<DirectoryRoleFilter>("ALL");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedShiftId, setSelectedShiftId] = useState("");
  const [selectedAudienceKey, setSelectedAudienceKey] = useState<"" | AudienceTarget["key"]>("");
  const [directMessageText, setDirectMessageText] = useState("");
  const [sendingDirect, setSendingDirect] = useState(false);
  type NewGroupType = "SHIFT" | "ENGINEERS" | "ACCOUNTANTS" | "ACC_ENG" | "WORKERS" | "CUSTOM";
  const [createGroupForm, setCreateGroupForm] = useState<{
    name: string; description: string;
    groupType: NewGroupType; shiftId: string; selectedMemberIds: number[];
  }>({ name: "", description: "", groupType: "SHIFT", shiftId: "", selectedMemberIds: [] });
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [addMemberForm, setAddMemberForm] = useState({ userId: "", role: "MEMBER" as GroupRole });

  // Non-admin: direct message
  const [showDMPanel, setShowDMPanel] = useState(false);
  const [dmRecipientId, setDmRecipientId] = useState("");
  const [dmText, setDmText] = useState("");
  const [sendingDM, setSendingDM] = useState(false);
  const [flatMembers, setFlatMembers] = useState<Array<{ id: number; label: string }>>([]);

  const [error, setError] = useState("");

  // ── Derived ──
  const selectedGroup = useMemo(() => groups.find((g) => g.id === selectedGroupId) ?? null, [groups, selectedGroupId]);

  const filteredGroups = useMemo(() => {
    const q = groupSearch.trim().toLowerCase();
    return q ? groups.filter((g) => g.name.toLowerCase().includes(q)) : groups;
  }, [groups, groupSearch]);

  const selectedAdminTarget: SelectedAdminTarget | null = useMemo(() => {
    if (targetType === "USER" && selectedUserId) {
      const all = membersByShift.flatMap((b) => b.members);
      const found = all.find((m) => String(m.id) === selectedUserId);
      return found ? { type: "USER", id: found.id, label: `${found.fullName} (@${found.username})` } : null;
    }
    if (targetType === "SHIFT" && selectedShiftId) {
      const found = shiftTargets.find((s) => String(s.shiftId) === selectedShiftId);
      return found ? { type: "SHIFT", id: found.shiftId, label: found.shiftName } : null;
    }
    if (targetType === "AUDIENCE" && selectedAudienceKey) {
      const found = audienceTargets.find((a) => a.key === selectedAudienceKey);
      return found ? { type: "AUDIENCE", id: found.key, label: found.key === "ALL_WORKERS" ? ("كل العمال") : ("كل الموظفين") } : null;
    }
    return null;
  }, [targetType, selectedUserId, selectedShiftId, selectedAudienceKey, membersByShift, shiftTargets, audienceTargets, isAr]);

  const filteredMembers = useMemo(() => {
    const all = membersByShift.flatMap((b) => b.members);
    const filtered = roleFilter === "ALL" ? all : all.filter((m) => m.role === roleFilter);
    return filtered.map((m) => ({ id: m.id, displayLabel: `${m.fullName} — @${m.username} (${m.role})` }));
  }, [membersByShift, roleFilter]);

  const newGroupCandidates = useMemo(() => {
    const all = membersByShift.flatMap((b) => b.members);
    switch (createGroupForm.groupType) {
      case "SHIFT":
        return createGroupForm.shiftId
          ? (membersByShift.find((b) => String(b.shiftId) === createGroupForm.shiftId)?.members ?? [])
          : [];
      case "ENGINEERS":   return all.filter((m) => m.role === "ENGINEER");
      case "ACCOUNTANTS": return all.filter((m) => m.role === "ACCOUNTANT");
      case "ACC_ENG":     return all.filter((m) => m.role === "ACCOUNTANT" || m.role === "ENGINEER");
      case "WORKERS":     return all.filter((m) => m.role === "WORKER");
      default:            return all;
    }
  }, [createGroupForm.groupType, createGroupForm.shiftId, membersByShift]);

  // ── Data loading ──
  const loadGroups = useCallback(async () => {
    setLoadingGroups(true);
    setError("");
    try {
      const res = await fetchApi("/chat/groups");
      if (!res.ok) throw new Error(await readApiError(res));
      setGroups((await res.json()) as ChatGroup[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load groups");
    } finally {
      setLoadingGroups(false);
    }
  }, []);

  const loadMessages = useCallback(async (groupId: number) => {
    setLoadingMessages(true);
    try {
      const res = await fetchApi(`/chat/groups/${groupId}/messages`);
      if (!res.ok) throw new Error(await readApiError(res));
      const data = (await res.json()) as { messages: GroupMessage[] };
      setMessages(data.messages ?? []);
    } catch { setMessages([]); }
    finally { setLoadingMessages(false); }
  }, []);

  const loadGroupDetail = useCallback(async (groupId: number) => {
    setLoadingDetail(true);
    try {
      const res = await fetchApi(`/chat/groups/${groupId}`);
      if (!res.ok) throw new Error(await readApiError(res));
      setSelectedGroupDetail((await res.json()) as ChatGroupDetail);
    } catch { setSelectedGroupDetail(null); }
    finally { setLoadingDetail(false); }
  }, []);

  const loadMembersDirectory = useCallback(async () => {
    setLoadingMembers(true);
    try {
      const res = await fetchApi("/chat/admin/targets");
      if (!res.ok) return;
      const data = (await res.json()) as AdminTargetsResponse;
      setMembersByShift(data.usersByShift ?? []);
      setShiftTargets(data.shifts ?? []);
      setAudienceTargets(data.audiences ?? []);
      const flat = (data.usersByShift ?? []).flatMap((b) =>
        b.members.map((m) => ({ id: m.id, label: `${m.fullName} (@${m.username}) — ${m.role}` }))
      );
      setFlatMembers(flat);
    } catch { /* silent */ }
    finally { setLoadingMembers(false); }
  }, []);

  useEffect(() => {
    void loadGroups();
    if (isAdmin) void loadMembersDirectory();
    else {
      // load recipients for non-admin DM — filtered by role/shift on backend
      fetchApi("/chat/members-by-shift").then(async (r) => {
        if (!r.ok) return;
        const buckets = (await r.json()) as ShiftMembersBucket[];
        setFlatMembers(buckets.flatMap((b) =>
          b.members.map((m) => ({ id: m.id, label: `${m.fullName} (@${m.username})` }))
        ));
      }).catch(() => {});
    }
  }, [loadGroups, isAdmin, loadMembersDirectory]);

  useEffect(() => {
    if (!selectedGroupId) return;
    void loadMessages(selectedGroupId);
    void loadGroupDetail(selectedGroupId);
  }, [selectedGroupId, loadMessages, loadGroupDetail]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, [messageText]);

  // ── Actions ──
  const markAsRead = async (groupId: number) => {
    await fetchApi(`/chat/groups/${groupId}/mark-as-read`, { method: "PATCH" });
    setGroups((prev) => prev.map((g) => g.id === groupId ? { ...g, unreadCount: 0 } : g));
  };

  const handleSelectGroup = (id: number) => {
    setSelectedGroupId(id);
    setMobileView("thread");
    void markAsRead(id);
    setShowInfoPanel(false);
  };

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    const content = messageText.trim();
    if (!content || !selectedGroupId) return;
    setSending(true);
    const optimisticId = -Date.now();
    const optimistic: GroupMessage = {
      id: optimisticId, content, createdAt: new Date().toISOString(),
      sender: { id: currentUserId!, fullName: user?.name, username: user?.username ?? undefined },
    };
    setMessages((prev) => [...prev, optimistic]);
    setMessageText("");
    try {
      const res = await fetchApi(`/chat/groups/${selectedGroupId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      const saved = (await res.json()) as GroupMessage;
      setMessages((prev) => prev.map((m) => m.id === optimisticId ? saved : m));
      void loadGroups();
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setError(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage(e as unknown as FormEvent);
    }
  };

  const handleCreateGroup = async (e: FormEvent) => {
    e.preventDefault();
    if (!createGroupForm.name.trim()) return;
    setCreatingGroup(true);
    try {
      const memberIds = createGroupForm.selectedMemberIds;
      const res = await fetchApi("/chat/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: createGroupForm.name.trim(), description: createGroupForm.description.trim() || undefined, memberIds }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      setCreateGroupForm({ name: "", description: "", groupType: "SHIFT", shiftId: "", selectedMemberIds: [] });
      setShowAdminPanel("none");
      await loadGroups();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create group");
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleSendDirectAdmin = async (e: FormEvent) => {
    e.preventDefault();
    const content = directMessageText.trim();
    if (!content || !selectedAdminTarget) return;
    setSendingDirect(true);
    try {
      const body: Record<string, unknown> = { content, targetType: selectedAdminTarget.type };
      if (selectedAdminTarget.type === "USER") body.targetUserId = selectedAdminTarget.id;
      else if (selectedAdminTarget.type === "SHIFT") body.shiftId = selectedAdminTarget.id;
      else body.audienceKey = selectedAdminTarget.id;
      const res = await fetchApi("/chat/admin/send", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      const data = (await res.json()) as { groupId?: number };
      setDirectMessageText(""); setSelectedUserId(""); setSelectedShiftId(""); setSelectedAudienceKey("");
      setShowAdminPanel("none");
      await loadGroups();
      if (typeof data.groupId === "number") handleSelectGroup(data.groupId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send");
    } finally { setSendingDirect(false); }
  };

  const handleSendDM = async (e: FormEvent) => {
    e.preventDefault();
    const content = dmText.trim();
    if (!content || !dmRecipientId) return;
    setSendingDM(true);
    try {
      const res = await fetchApi("/chat/direct", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: Number(dmRecipientId), content }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      const data = (await res.json()) as { groupId?: number };
      setDmText(""); setDmRecipientId(""); setShowDMPanel(false);
      await loadGroups();
      if (typeof data.groupId === "number") handleSelectGroup(data.groupId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send");
    } finally { setSendingDM(false); }
  };

  const handleAddMember = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedGroupId || !addMemberForm.userId) return;
    const res = await fetchApi(`/chat/groups/${selectedGroupId}/members`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: Number(addMemberForm.userId), role: addMemberForm.role }),
    });
    if (res.ok) { setAddMemberForm({ userId: "", role: "MEMBER" }); void loadGroupDetail(selectedGroupId); }
  };

  const handleRemoveMember = async (userId: number) => {
    if (!selectedGroupId) return;
    await fetchApi(`/chat/groups/${selectedGroupId}/members/${userId}`, { method: "DELETE" });
    void loadGroupDetail(selectedGroupId);
  };

  // ── Group by date for date separators ──
  const groupedMessages = useMemo(() => {
    const groups: Array<{ dateKey: string; messages: GroupMessage[] }> = [];
    for (const msg of messages) {
      const dk = new Date(msg.createdAt).toDateString();
      const last = groups[groups.length - 1];
      if (last?.dateKey === dk) last.messages.push(msg);
      else groups.push({ dateKey: dk, messages: [msg] });
    }
    return groups;
  }, [messages]);

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="cm-root" dir="rtl">

      {/* ── SIDEBAR ── */}
      <aside className={`cm-sidebar${mobileView === "thread" ? " cm-sidebar--hidden-mobile" : ""}`}>
        {/* Sidebar header */}
        <div className="cm-sidebar__head">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: ".5rem" }}>
            <h1 className="cm-sidebar__title">{"المحادثات"}</h1>
            <div style={{ display: "flex", gap: ".25rem" }}>
              <button type="button" className="cm-icon-btn" title={"تحديث"} onClick={() => void loadGroups()}>
                <RefreshCw size={16} />
              </button>
              {isAdmin && (
                <>
                  <button type="button" className="cm-icon-btn" title={"مجموعة جديدة"}
                    onClick={() => setShowAdminPanel(showAdminPanel === "new-group" ? "none" : "new-group")}>
                    <Plus size={16} />
                  </button>
                  <button type="button" className="cm-icon-btn" title={"رسالة مباشرة"}
                    onClick={() => setShowAdminPanel(showAdminPanel === "direct" ? "none" : "direct")}>
                    <MessageCircle size={16} />
                  </button>
                </>
              )}
              {!isAdmin && (
                <button type="button" className="cm-icon-btn" title={"رسالة جديدة"}
                  onClick={() => setShowDMPanel((v) => !v)}>
                  <MessageCircle size={16} />
                </button>
              )}
            </div>
          </div>
          <div className="cm-search-wrap">
            <Search size={14} className="cm-search-icon" />
            <input
              type="search"
              className="cm-search"
              placeholder={"ابحث في المحادثات…"}
              value={groupSearch}
              onChange={(e) => setGroupSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Admin: create group panel */}
        {isAdmin && showAdminPanel === "new-group" && (
          <div className="cm-admin-panel">
            <div className="cm-admin-panel__head">
              <strong>{"مجموعة جديدة"}</strong>
              <button type="button" className="cm-icon-btn" onClick={() => setShowAdminPanel("none")}><X size={14} /></button>
            </div>
            <form onSubmit={(e) => void handleCreateGroup(e)} style={{ display: "flex", flexDirection: "column", gap: ".5rem" }}>
              {/* Group name */}
              <input className="cm-form-input" placeholder={"اسم المجموعة *"} required
                value={createGroupForm.name} onChange={(e) => setCreateGroupForm((p) => ({ ...p, name: e.target.value }))} />
              <input className="cm-form-input" placeholder={"وصف اختياري"}
                value={createGroupForm.description} onChange={(e) => setCreateGroupForm((p) => ({ ...p, description: e.target.value }))} />

              {/* Group type */}
              <select className="cm-form-input" value={createGroupForm.groupType}
                onChange={(e) => {
                  const groupType = e.target.value as typeof createGroupForm.groupType;
                  const all = membersByShift.flatMap((b) => b.members);
                  let autoIds: number[] = [];
                  if (groupType === "ENGINEERS")   autoIds = all.filter((m) => m.role === "ENGINEER").map((m) => m.id);
                  if (groupType === "ACCOUNTANTS") autoIds = all.filter((m) => m.role === "ACCOUNTANT").map((m) => m.id);
                  if (groupType === "ACC_ENG")     autoIds = all.filter((m) => m.role === "ACCOUNTANT" || m.role === "ENGINEER").map((m) => m.id);
                  if (groupType === "WORKERS")     autoIds = all.filter((m) => m.role === "WORKER").map((m) => m.id);
                  setCreateGroupForm((p) => ({ ...p, groupType, shiftId: "", selectedMemberIds: autoIds }));
                }}>
                <option value="SHIFT">{"مجموعة شفت"}</option>
                <option value="ENGINEERS">{"كل المهندسين"}</option>
                <option value="ACCOUNTANTS">{"كل المحاسبين"}</option>
                <option value="ACC_ENG">{"محاسبون + مهندسون"}</option>
                <option value="WORKERS">{"كل العمال"}</option>
                <option value="CUSTOM">{"مخصص"}</option>
              </select>

              {/* Shift selector */}
              {createGroupForm.groupType === "SHIFT" && (
                <select className="cm-form-input" value={createGroupForm.shiftId}
                  onChange={(e) => {
                    const shiftId = e.target.value;
                    const members = membersByShift.find((b) => String(b.shiftId) === shiftId)?.members ?? [];
                    setCreateGroupForm((p) => ({ ...p, shiftId, selectedMemberIds: members.map((m) => m.id) }));
                  }}>
                  <option value="">{"اختر شفت…"}</option>
                  {shiftTargets.map((s) => (
                    <option key={s.shiftId} value={s.shiftId}>{s.shiftName} ({s.membersCount})</option>
                  ))}
                </select>
              )}

              {/* Member checklist */}
              {newGroupCandidates.length > 0 && (
                <div style={{ maxHeight: 160, overflowY: "auto", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", padding: ".4rem .5rem", display: "flex", flexDirection: "column", gap: ".25rem" }}>
                  {/* Select-all row */}
                  <label style={{ display: "flex", alignItems: "center", gap: ".4rem", fontSize: ".75rem", fontWeight: 600, color: "var(--text-secondary)", paddingBottom: ".25rem", borderBottom: "1px solid var(--border-default)", cursor: "pointer" }}>
                    <input type="checkbox"
                      checked={newGroupCandidates.every((m) => createGroupForm.selectedMemberIds.includes(m.id))}
                      onChange={(e) => setCreateGroupForm((p) => ({
                        ...p,
                        selectedMemberIds: e.target.checked ? newGroupCandidates.map((m) => m.id) : [],
                      }))}
                    />
                    {"تحديد الكل"} ({newGroupCandidates.length})
                  </label>
                  {newGroupCandidates.map((m) => (
                    <label key={m.id} style={{ display: "flex", alignItems: "center", gap: ".4rem", fontSize: ".78rem", cursor: "pointer" }}>
                      <input type="checkbox"
                        checked={createGroupForm.selectedMemberIds.includes(m.id)}
                        onChange={(e) => setCreateGroupForm((p) => ({
                          ...p,
                          selectedMemberIds: e.target.checked
                            ? [...p.selectedMemberIds, m.id]
                            : p.selectedMemberIds.filter((id) => id !== m.id),
                        }))}
                      />
                      <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {m.fullName}
                      </span>
                      <span style={{ fontSize: ".68rem", color: "var(--text-secondary)", flexShrink: 0 }}>{m.role}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* Selection counter */}
              {createGroupForm.selectedMemberIds.length > 0 && (
                <p style={{ fontSize: ".73rem", color: "var(--text-secondary)", margin: 0 }}>
                  {createGroupForm.selectedMemberIds.length} {"عضو محدد"}
                </p>
              )}

              <button type="submit" className="cm-send-btn"
                disabled={creatingGroup || !createGroupForm.name.trim() || createGroupForm.selectedMemberIds.length === 0}
                style={{ alignSelf: "flex-end" }}>
                {creatingGroup ? ("جارٍ…") : ("إنشاء")}
              </button>
            </form>
          </div>
        )}

        {/* Admin: direct/broadcast panel */}
        {isAdmin && showAdminPanel === "direct" && (
          <div className="cm-admin-panel">
            <div className="cm-admin-panel__head">
              <strong>{"رسالة موجهة"}</strong>
              <button type="button" className="cm-icon-btn" onClick={() => setShowAdminPanel("none")}><X size={14} /></button>
            </div>
            <form onSubmit={(e) => void handleSendDirectAdmin(e)} style={{ display: "flex", flexDirection: "column", gap: ".5rem" }}>
              <select className="cm-form-input" value={targetType}
                onChange={(e) => { setTargetType(e.target.value as AdminTargetType); setSelectedUserId(""); setSelectedShiftId(""); setSelectedAudienceKey(""); }}>
                <option value="USER">{"شخص"}</option>
                <option value="SHIFT">{"شفت"}</option>
                <option value="AUDIENCE">{"مجموعة عامة"}</option>
              </select>
              {targetType === "USER" && (
                <>
                  <select className="cm-form-input" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as DirectoryRoleFilter)}>
                    <option value="ALL">{"كل الأدوار"}</option>
                    <option value="WORKER">عامل</option>
                    <option value="ENGINEER">مهندس</option>
                    <option value="ACCOUNTANT">محاسب</option>
                  </select>
                  <select className="cm-form-input" value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}>
                    <option value="">{"اختر شخصاً…"}</option>
                    {filteredMembers.map((m) => <option key={m.id} value={m.id}>{m.displayLabel}</option>)}
                  </select>
                </>
              )}
              {targetType === "SHIFT" && (
                <select className="cm-form-input" value={selectedShiftId} onChange={(e) => setSelectedShiftId(e.target.value)}>
                  <option value="">{"اختر شفت…"}</option>
                  {shiftTargets.map((s) => <option key={s.shiftId} value={s.shiftId}>{s.shiftName} ({s.membersCount})</option>)}
                </select>
              )}
              {targetType === "AUDIENCE" && (
                <select className="cm-form-input" value={selectedAudienceKey} onChange={(e) => setSelectedAudienceKey(e.target.value as "" | AudienceTarget["key"])}>
                  <option value="">{"اختر مجموعة…"}</option>
                  {audienceTargets.map((a) => <option key={a.key} value={a.key}>{a.key === "ALL_WORKERS" ? ("كل العمال") : ("كل الموظفين")} ({a.membersCount})</option>)}
                </select>
              )}
              {selectedAdminTarget && (
                <div style={{ fontSize: ".78rem", color: "var(--text-secondary)", padding: ".3rem .5rem", background: "var(--bg-subtle)", borderRadius: "var(--radius-md)" }}>
                  → {selectedAdminTarget.label}
                </div>
              )}
              <textarea className="cm-form-input" rows={2} style={{ resize: "none" }}
                placeholder={"اكتب رسالتك…"}
                value={directMessageText} onChange={(e) => setDirectMessageText(e.target.value)} />
              <button type="submit" className="cm-send-btn" disabled={sendingDirect || !selectedAdminTarget || !directMessageText.trim()} style={{ alignSelf: "flex-end" }}>
                {sendingDirect ? ("جارٍ…") : <><Send size={13} /> {"إرسال"}</>}
              </button>
            </form>
          </div>
        )}

        {/* Non-admin: DM panel */}
        {!isAdmin && showDMPanel && (
          <div className="cm-admin-panel">
            <div className="cm-admin-panel__head">
              <strong>{"رسالة جديدة"}</strong>
              <button type="button" className="cm-icon-btn" onClick={() => setShowDMPanel(false)}><X size={14} /></button>
            </div>
            <form onSubmit={(e) => void handleSendDM(e)} style={{ display: "flex", flexDirection: "column", gap: ".5rem" }}>
              <select className="cm-form-input" value={dmRecipientId} onChange={(e) => setDmRecipientId(e.target.value)}>
                <option value="">{"اختر المستلم…"}</option>
                {flatMembers.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
              <textarea className="cm-form-input" rows={2} style={{ resize: "none" }}
                placeholder={"اكتب رسالتك…"}
                value={dmText} onChange={(e) => setDmText(e.target.value)} />
              <button type="submit" className="cm-send-btn" disabled={sendingDM || !dmRecipientId || !dmText.trim()} style={{ alignSelf: "flex-end" }}>
                <Send size={13} /> {"إرسال"}
              </button>
            </form>
          </div>
        )}

        {/* Group list */}
        <div className="cm-group-list">
          {loadingGroups && (
            <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
              <RefreshCw size={20} style={{ animation: "spin 1s linear infinite" }} />
            </div>
          )}
          {!loadingGroups && filteredGroups.length === 0 && (
            <div style={{ padding: "2rem 1rem", textAlign: "center", color: "var(--text-muted)" }}>
              <MessageCircle size={32} style={{ margin: "0 auto .75rem", display: "block", opacity: .4 }} />
              <p style={{ margin: 0, fontSize: ".85rem" }}>{"لا توجد محادثات"}</p>
            </div>
          )}
          {filteredGroups.map((g) => {
            const isActive = g.id === selectedGroupId;
            const preview = g.lastMessage?.content ?? g.description ?? "";
            return (
              <button key={g.id} type="button" className={`cm-group-item${isActive ? " cm-group-item--active" : ""}`}
                onClick={() => handleSelectGroup(g.id)}>
                <Avatar name={g.name} size={44} />
                <div className="cm-group-item__body">
                  <div className="cm-group-item__top">
                    <span className="cm-group-item__name">{g.name}</span>
                    {g.lastMessage && <span className="cm-group-item__time">{fmtTime(g.lastMessage.createdAt)}</span>}
                  </div>
                  <div className="cm-group-item__bottom">
                    <span className="cm-group-item__preview">{preview || ("لا توجد رسائل")}</span>
                    {(g.unreadCount ?? 0) > 0 && <span className="cm-unread-badge">{g.unreadCount}</span>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* ── THREAD ── */}
      <main className={`cm-thread${mobileView === "sidebar" ? " cm-thread--hidden-mobile" : ""}`}>
        {!selectedGroupId ? (
          <div className="cm-empty-state">
            <MessageCircle size={64} style={{ opacity: .2, marginBottom: "1rem" }} />
            <p style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text-muted)" }}>
              {"اختر محادثة لتبدأ"}
            </p>
          </div>
        ) : (
          <>
            {/* Thread header */}
            <div className="cm-thread-head">
              <button type="button" className="cm-back-btn" onClick={() => setMobileView("sidebar")}>
                <ChevronRight size={20} style={{ transform: "rotate(0deg)" }} />
              </button>
              <Avatar name={selectedGroup?.name ?? "?"} size={40} />
              <div className="cm-thread-head__info">
                <strong className="cm-thread-head__name">{selectedGroup?.name}</strong>
                <span className="cm-thread-head__sub">
                  {selectedGroupDetail?.members
                    ? `${selectedGroupDetail.members.length} ${"عضو"}`
                    : selectedGroup?.description ?? ""}
                </span>
              </div>
              <div style={{ display: "flex", gap: ".25rem", marginLeft: "auto" }}>
                <button type="button" className="cm-icon-btn" onClick={() => void loadMessages(selectedGroupId)} title={"تحديث"}>
                  <RefreshCw size={16} />
                </button>
                <button type="button" className="cm-icon-btn" onClick={() => setShowInfoPanel((v) => !v)} title={"تفاصيل"}>
                  <Users size={16} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="cm-messages">
              {loadingMessages && (
                <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                  <RefreshCw size={20} style={{ animation: "spin 1s linear infinite" }} />
                </div>
              )}
              {!loadingMessages && messages.length === 0 && (
                <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                  <p>{"لا توجد رسائل بعد. ابدأ المحادثة!"}</p>
                </div>
              )}

              {groupedMessages.map(({ dateKey, messages: dayMsgs }) => (
                <div key={dateKey}>
                  {/* Date separator */}
                  <div className="cm-date-sep">
                    <span>{fmtDateSep(dayMsgs[0].createdAt, locale)}</span>
                  </div>

                  {dayMsgs.map((msg, idx) => {
                    const isMine = currentUserId !== null && msg.sender?.id === currentUserId;
                    const senderName = isMine
                      ? ("أنت")
                      : (msg.sender?.fullName ?? msg.sender?.username ?? "?");
                    const prevMsg = dayMsgs[idx - 1];
                    const showSender = !isMine && (
                      !prevMsg || prevMsg.sender?.id !== msg.sender?.id
                    );
                    const isLast = idx === dayMsgs.length - 1 ||
                      dayMsgs[idx + 1]?.sender?.id !== msg.sender?.id;

                    return (
                      <div key={msg.id} className={`cm-bubble-row${isMine ? " cm-bubble-row--mine" : ""}`}>
                        {/* Avatar for others (only on last in sequence) */}
                        {!isMine && (
                          <div className="cm-bubble-avatar">
                            {isLast ? <Avatar name={senderName} size={32} /> : <span style={{ width: 32 }} />}
                          </div>
                        )}
                        <div className="cm-bubble-col">
                          {showSender && (
                            <span className="cm-sender-name">{senderName}</span>
                          )}
                          <div className={`cm-bubble${isMine ? " cm-bubble--mine" : ""}${isLast ? (isMine ? " cm-bubble--tail-mine" : " cm-bubble--tail") : ""}`}>
                            <p className="cm-bubble__text">{msg.content}</p>
                            <span className="cm-bubble__time">{fmtTime(msg.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Composer */}
            <form className="cm-composer" onSubmit={(e) => void handleSendMessage(e)}>
              <textarea
                ref={textareaRef}
                className="cm-composer__input"
                placeholder={"اكتب رسالتك… (Enter للإرسال، Shift+Enter لسطر جديد)"}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
              />
              <button type="submit" className="cm-composer__send" disabled={sending || !messageText.trim()}>
                <Send size={18} />
              </button>
            </form>
          </>
        )}
      </main>

      {/* ── INFO PANEL ── */}
      {showInfoPanel && selectedGroupId && (
        <aside className="cm-info-panel">
          <div className="cm-info-panel__head">
            <strong>{"تفاصيل المجموعة"}</strong>
            <button type="button" className="cm-icon-btn" onClick={() => setShowInfoPanel(false)}><X size={15} /></button>
          </div>
          <div style={{ padding: "1rem" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: ".5rem", marginBottom: "1.5rem" }}>
              <Avatar name={selectedGroup?.name ?? "?"} size={64} />
              <strong style={{ fontSize: "1rem" }}>{selectedGroup?.name}</strong>
              {selectedGroup?.description && <p style={{ margin: 0, fontSize: ".8rem", color: "var(--text-secondary)", textAlign: "center" }}>{selectedGroup.description}</p>}
            </div>

            <p style={{ fontSize: ".75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: ".5rem" }}>
              {"الأعضاء"} {selectedGroupDetail?.members ? `(${selectedGroupDetail.members.length})` : ""}
            </p>
            {loadingDetail && <p style={{ fontSize: ".85rem", color: "var(--text-muted)" }}>{"جاري التحميل…"}</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: ".5rem", marginBottom: "1rem" }}>
              {selectedGroupDetail?.members?.map((m) => (
                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: ".6rem" }}>
                  <Avatar name={m.user.fullName ?? m.user.username ?? "?"} size={32} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: ".85rem", fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {m.user.fullName ?? m.user.username}
                    </p>
                    <p style={{ margin: 0, fontSize: ".75rem", color: "var(--text-muted)" }}>{m.user.role} · {m.role}</p>
                  </div>
                  {isAdmin && m.user.id !== currentUserId && (
                    <button type="button" className="cm-icon-btn" style={{ color: "var(--clr-danger)" }}
                      onClick={() => void handleRemoveMember(m.user.id)} title={"إزالة"}>
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {isAdmin && (
              <>
                <p style={{ fontSize: ".75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: ".5rem" }}>
                  {"إضافة عضو"}
                </p>
                <form onSubmit={(e) => void handleAddMember(e)} style={{ display: "flex", flexDirection: "column", gap: ".4rem" }}>
                  <input className="cm-form-input" type="number" min={1} placeholder={"معرّف المستخدم"}
                    value={addMemberForm.userId} onChange={(e) => setAddMemberForm((p) => ({ ...p, userId: e.target.value }))} required />
                  <select className="cm-form-input" value={addMemberForm.role} onChange={(e) => setAddMemberForm((p) => ({ ...p, role: e.target.value as GroupRole }))}>
                    <option value="MEMBER">عضو</option>
                    <option value="ADMIN">مدير</option>
                  </select>
                  <button type="submit" className="cm-send-btn" style={{ alignSelf: "flex-end" }}>
                    <UserPlus size={13} /> {"إضافة"}
                  </button>
                </form>
              </>
            )}
          </div>
        </aside>
      )}

      {/* Error toast */}
      {error && (
        <div className="cm-error-toast" onClick={() => setError("")}>
          {error}
          <button type="button" style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: "0 0 0 .5rem" }}>
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

// Silence unused import warning
const _unused = { LogOut, ChevronRight };
void _unused;
