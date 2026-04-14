import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { ModulePageShell } from "../components/ModulePageShell";
import { useAuth } from "../context/AuthContext";
import { useLocale } from "../context/LocaleContext";
import { API_BASE_URL, readApiError } from "../lib/api";

type ChatGroup = {
  id: number;
  name: string;
  description?: string | null;
  unreadCount?: number;
  lastMessage?: {
    id: number;
    content: string;
    createdAt: string;
  } | null;
};

type GroupRole = "ADMIN" | "MEMBER";

type GroupMember = {
  id: number;
  role: GroupRole;
  user: {
    id: number;
    fullName?: string;
    username?: string;
    role?: string;
  };
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
  sender?: {
    id: number;
    fullName?: string;
    username?: string;
    role?: string;
  };
};

type GroupMessagesResponse = {
  messages: GroupMessage[];
  nextCursor: number | null;
  hasMore: boolean;
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

type DirectMessageResponse = {
  groupId?: number;
};

type ShiftTarget = {
  shiftId: number;
  shiftName: string;
  membersCount: number;
};

type AudienceTarget = {
  key: "ALL_WORKERS" | "ALL_EMPLOYEES";
  label: string;
  membersCount: number;
};

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

const copy = {
  en: {
    title: "Team Chat",
    subtitle: "Chat with admin, workers, engineers, and accountants.",
    refresh: "Refresh",
    groups: "Groups",
    createGroup: "Create group",
    groupName: "Group name",
    groupDescription: "Description",
    initialMembers: "Initial member IDs (comma separated)",
    create: "Create",
    creating: "Creating...",
    membersByShift: "Members by shift",
    loadingMembers: "Loading members...",
    noMembersFound: "No members found.",
    targetType: "Target type",
    person: "Person",
    shift: "Shift",
    audience: "Audience",
    roleFilter: "Role filter",
    allRoles: "All roles",
    choosePerson: "Choose person",
    directRecipient: "Recipient",
    chooseShift: "Choose shift",
    chooseAudience: "Choose audience",
    chooseRecipient: "Choose recipient target",
    selectedRecipient: "Selected target",
    directMessage: "Targeted message",
    directMessagePlaceholder: "Write your message...",
    sendDirect: "Send",
    sending: "Sending...",
    sendToShift: "Send to shift",
    sendToAudience: "Send to audience",
    allWorkers: "All workers",
    allEmployees: "All employees",
    messages: "Messages",
    members: "Members",
    addMember: "Add member",
    userId: "User ID",
    memberRole: "Member role",
    member: "Member",
    remove: "Remove",
    groupDetailsLoading: "Loading group details...",
    selectGroup: "Select a group to start chatting.",
    noGroups: "No groups found.",
    noMessages: "No messages yet.",
    noMembers: "No members in this group.",
    loadingGroups: "Loading groups...",
    loadingMessages: "Loading messages...",
    markAsRead: "Mark as read",
    messagePlaceholder: "Write your message...",
    send: "Send",
    messageRequired: "Message content is required.",
    sendFailed: "Failed to send message.",
    loadFailed: "Failed to load chat data.",
  },
  ar: {
    title: "دردشة الفريق",
    subtitle: "تواصل مع الأدمن والعمال والمهندسين والمحاسبين.",
    refresh: "تحديث",
    groups: "المجموعات",
    createGroup: "إنشاء مجموعة",
    groupName: "اسم المجموعة",
    groupDescription: "الوصف",
    initialMembers: "معرّفات الأعضاء الأوائل (مفصولة بفاصلة)",
    create: "إنشاء",
    creating: "جارٍ الإنشاء...",
    membersByShift: "الأعضاء حسب الشفت",
    loadingMembers: "جارٍ تحميل الأعضاء...",
    noMembersFound: "لا يوجد أعضاء.",
    targetType: "نوع الهدف",
    person: "شخص",
    shift: "شفت",
    audience: "مجموعة عامة",
    roleFilter: "فلترة الدور",
    allRoles: "كل الأدوار",
    choosePerson: "اختر شخص",
    directRecipient: "المستلم",
    chooseShift: "اختر شفت",
    chooseAudience: "اختر مجموعة",
    chooseRecipient: "اختر هدف الإرسال",
    selectedRecipient: "الهدف المختار",
    directMessage: "رسالة موجهة",
    directMessagePlaceholder: "اكتب رسالتك...",
    sendDirect: "إرسال",
    sending: "جارٍ الإرسال...",
    sendToShift: "إرسال للشفت",
    sendToAudience: "إرسال لمجموعة عامة",
    allWorkers: "كل العمال",
    allEmployees: "كل الموظفين",
    messages: "الرسائل",
    members: "الأعضاء",
    addMember: "إضافة عضو",
    userId: "معرّف المستخدم",
    memberRole: "دور العضو",
    member: "عضو",
    remove: "إزالة",
    groupDetailsLoading: "جارٍ تحميل تفاصيل المجموعة...",
    selectGroup: "اختر مجموعة لبدء الدردشة.",
    noGroups: "لا توجد مجموعات.",
    noMessages: "لا توجد رسائل بعد.",
    noMembers: "لا يوجد أعضاء في هذه المجموعة.",
    loadingGroups: "جارٍ تحميل المجموعات...",
    loadingMessages: "جارٍ تحميل الرسائل...",
    markAsRead: "تعيين كمقروء",
    messagePlaceholder: "اكتب رسالتك...",
    send: "إرسال",
    messageRequired: "محتوى الرسالة مطلوب.",
    sendFailed: "فشل إرسال الرسالة.",
    loadFailed: "فشل تحميل بيانات الدردشة.",
  },
} as const;

async function fetchWithAuth(path: string, options?: RequestInit) {
  const token = window.localStorage.getItem("plasticon_token");
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options?.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
  });
}

export function ChatPage() {
  const { locale } = useLocale();
  const { user } = useAuth();
  const t = copy[locale];
  const isAdmin = user?.role === "ADMIN";

  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedGroupDetail, setSelectedGroupDetail] =
    useState<ChatGroupDetail | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingGroupDetail, setLoadingGroupDetail] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [messageText, setMessageText] = useState("");
  const [membersByShift, setMembersByShift] = useState<ShiftMembersBucket[]>(
    [],
  );
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [shiftTargets, setShiftTargets] = useState<ShiftTarget[]>([]);
  const [audienceTargets, setAudienceTargets] = useState<AudienceTarget[]>([]);
  const [targetType, setTargetType] = useState<AdminTargetType>("USER");
  const [roleFilter, setRoleFilter] = useState<DirectoryRoleFilter>("ALL");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedShiftId, setSelectedShiftId] = useState<string>("");
  const [selectedAudienceKey, setSelectedAudienceKey] = useState<
    "" | AudienceTarget["key"]
  >("");
  const [selectedDirectRecipientId, setSelectedDirectRecipientId] =
    useState<string>("");
  const [directMessageText, setDirectMessageText] = useState("");
  const [sendingDirect, setSendingDirect] = useState(false);
  const [createGroupForm, setCreateGroupForm] = useState({
    name: "",
    description: "",
    memberIds: "",
  });
  const [addMemberForm, setAddMemberForm] = useState({
    userId: "",
    role: "MEMBER" as GroupRole,
  });

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) ?? null,
    [groups, selectedGroupId],
  );

  const flattenedMembers = useMemo(
    () =>
      membersByShift.flatMap((bucket) =>
        bucket.members.map((member) => ({
          ...member,
          displayLabel: `${member.fullName || member.username} (@${member.username}) - ${member.shiftName}`,
        })),
      ),
    [membersByShift],
  );

  const filteredMembers = useMemo(() => {
    if (roleFilter === "ALL") {
      return flattenedMembers;
    }
    return flattenedMembers.filter((member) => member.role === roleFilter);
  }, [flattenedMembers, roleFilter]);

  const selectedAdminTarget = useMemo<SelectedAdminTarget | null>(() => {
    if (targetType === "USER") {
      const userId = Number(selectedUserId);
      if (!Number.isInteger(userId) || userId <= 0) return null;
      const member = flattenedMembers.find((item) => item.id === userId);
      if (!member) return null;
      return {
        type: "USER",
        id: userId,
        label: member.fullName || member.username,
      };
    }

    if (targetType === "SHIFT") {
      const shiftId = Number(selectedShiftId);
      if (!Number.isInteger(shiftId) || shiftId <= 0) return null;
      const shift = shiftTargets.find((item) => item.shiftId === shiftId);
      if (!shift) return null;
      return {
        type: "SHIFT",
        id: shift.shiftId,
        label: `${shift.shiftName} (${shift.membersCount})`,
      };
    }

    if (targetType === "AUDIENCE") {
      if (!selectedAudienceKey) return null;
      const audience = audienceTargets.find(
        (item) => item.key === selectedAudienceKey,
      );
      if (!audience) return null;
      return {
        type: "AUDIENCE",
        id: audience.key,
        label:
          audience.key === "ALL_WORKERS"
            ? `${t.allWorkers} (${audience.membersCount})`
            : `${t.allEmployees} (${audience.membersCount})`,
      };
    }

    return null;
  }, [
    targetType,
    selectedUserId,
    selectedShiftId,
    selectedAudienceKey,
    flattenedMembers,
    shiftTargets,
    audienceTargets,
    t.allWorkers,
    t.allEmployees,
  ]);

  const selectedDirectRecipient = useMemo(() => {
    const userId = Number(selectedDirectRecipientId);
    if (!Number.isInteger(userId) || userId <= 0) return null;
    const member = flattenedMembers.find((item) => item.id === userId);
    return member ?? null;
  }, [selectedDirectRecipientId, flattenedMembers]);

  const loadGroups = async () => {
    setLoadingGroups(true);
    setErrorMessage("");
    try {
      const response = await fetchWithAuth("/chat/groups");
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }
      const data = (await response.json()) as ChatGroup[];
      setGroups(data);
      setSelectedGroupId((prev) => prev ?? data[0]?.id ?? null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t.loadFailed);
    } finally {
      setLoadingGroups(false);
    }
  };

  const loadMessages = async (groupId: number) => {
    setLoadingMessages(true);
    setErrorMessage("");
    try {
      const response = await fetchWithAuth(`/chat/groups/${groupId}/messages`);
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      const data = (await response.json()) as GroupMessagesResponse;
      const sorted = [...(data.messages ?? [])].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
      setMessages(sorted);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t.loadFailed);
    } finally {
      setLoadingMessages(false);
    }
  };

  const loadGroupDetail = async (groupId: number) => {
    setLoadingGroupDetail(true);
    try {
      const response = await fetchWithAuth(`/chat/groups/${groupId}`);
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }
      const data = (await response.json()) as ChatGroupDetail;
      setSelectedGroupDetail(data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t.loadFailed);
    } finally {
      setLoadingGroupDetail(false);
    }
  };

  const loadMembersDirectory = async () => {
    setLoadingMembers(true);
    try {
      if (!isAdmin) {
        const response = await fetchWithAuth(`/chat/members-by-shift`);
        if (!response.ok) {
          throw new Error(await readApiError(response));
        }

        setMembersByShift((await response.json()) as ShiftMembersBucket[]);
        setShiftTargets([]);
        setAudienceTargets([]);
        return;
      }

      const response = await fetchWithAuth(`/chat/admin/targets`);
      if (!response.ok) {
        if (response.status !== 404) {
          throw new Error(await readApiError(response));
        }

        // Backward compatibility when backend doesn't have /chat/admin/targets yet.
        const legacyResponse = await fetchWithAuth(`/chat/members-by-shift`);
        if (!legacyResponse.ok) {
          throw new Error(await readApiError(legacyResponse));
        }

        const legacyBuckets =
          (await legacyResponse.json()) as ShiftMembersBucket[];
        const usersByShift = legacyBuckets ?? [];

        const shifts = usersByShift
          .filter((bucket) => bucket.shiftId !== null)
          .map((bucket) => ({
            shiftId: bucket.shiftId as number,
            shiftName: bucket.shiftName,
            membersCount: bucket.members.length,
          }));

        const allMembers = usersByShift.flatMap((bucket) => bucket.members);
        const workersCount = allMembers.filter(
          (member) => member.role === "WORKER",
        ).length;

        setMembersByShift(usersByShift);
        setShiftTargets(shifts);
        setAudienceTargets([
          {
            key: "ALL_WORKERS",
            label: t.allWorkers,
            membersCount: workersCount,
          },
          {
            key: "ALL_EMPLOYEES",
            label: t.allEmployees,
            membersCount: allMembers.length,
          },
        ]);
        return;
      }

      const data = (await response.json()) as AdminTargetsResponse;
      setMembersByShift(data.usersByShift ?? []);
      setShiftTargets(data.shifts ?? []);
      setAudienceTargets(data.audiences ?? []);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t.loadFailed);
    } finally {
      setLoadingMembers(false);
    }
  };

  const markAsRead = async (groupId: number) => {
    await fetchWithAuth(`/chat/groups/${groupId}/mark-as-read`, {
      method: "PATCH",
    });
    setGroups((prev) =>
      prev.map((item) =>
        item.id === groupId ? { ...item, unreadCount: 0 } : item,
      ),
    );
  };

  useEffect(() => {
    void loadGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedGroupId) return;
    void loadMessages(selectedGroupId);
    void loadGroupDetail(selectedGroupId);
    void markAsRead(selectedGroupId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroupId]);

  useEffect(() => {
    void loadMembersDirectory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const handleCreateGroup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = createGroupForm.name.trim();
    if (!name) {
      setErrorMessage(t.messageRequired);
      return;
    }

    const memberIds = createGroupForm.memberIds
      .split(",")
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isInteger(value) && value > 0);

    setCreatingGroup(true);
    setErrorMessage("");
    try {
      const response = await fetchWithAuth("/chat/groups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description: createGroupForm.description.trim() || undefined,
          memberIds,
        }),
      });

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      const data = (await response.json()) as ChatGroup;
      setCreateGroupForm({ name: "", description: "", memberIds: "" });
      await loadGroups();
      if (data?.id) {
        setSelectedGroupId(data.id);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t.loadFailed);
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleAddMember = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedGroupId) return;

    const userId = Number(addMemberForm.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
      setErrorMessage(
        `${t.userId} ${locale === "ar" ? "غير صالح" : "is invalid"}`,
      );
      return;
    }

    setErrorMessage("");
    try {
      const response = await fetchWithAuth(
        `/chat/groups/${selectedGroupId}/members`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId, role: addMemberForm.role }),
        },
      );

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      setAddMemberForm({ userId: "", role: "MEMBER" });
      await loadGroupDetail(selectedGroupId);
      await loadGroups();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t.loadFailed);
    }
  };

  const handleRemoveMember = async (userId: number) => {
    if (!selectedGroupId) return;
    setErrorMessage("");
    try {
      const response = await fetchWithAuth(
        `/chat/groups/${selectedGroupId}/members/${userId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      await loadGroupDetail(selectedGroupId);
      await loadGroups();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t.loadFailed);
    }
  };

  const handleSendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedGroupId) return;

    const content = messageText.trim();
    if (!content) {
      setErrorMessage(t.messageRequired);
      return;
    }

    setErrorMessage("");
    try {
      const response = await fetchWithAuth(
        `/chat/groups/${selectedGroupId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ content }),
        },
      );

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      setMessageText("");
      await loadMessages(selectedGroupId);
      await loadGroups();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t.sendFailed);
    }
  };

  const handleSendDirectMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedAdminTarget) {
      setErrorMessage(t.chooseRecipient);
      return;
    }

    const content = directMessageText.trim();
    if (!content) {
      setErrorMessage(t.messageRequired);
      return;
    }

    setSendingDirect(true);
    setErrorMessage("");
    try {
      const body: Record<string, unknown> = {
        targetType: selectedAdminTarget.type,
        content,
      };

      if (selectedAdminTarget.type === "USER") {
        body.targetUserId = selectedAdminTarget.id;
      } else if (selectedAdminTarget.type === "SHIFT") {
        body.shiftId = selectedAdminTarget.id;
      } else {
        body.audienceKey = selectedAdminTarget.id;
      }

      const response = await fetchWithAuth("/chat/admin/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      const data = (await response.json()) as DirectMessageResponse;
      setDirectMessageText("");
      await loadGroups();
      await loadMembersDirectory();
      if (typeof data.groupId === "number") {
        setSelectedGroupId(data.groupId);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t.sendFailed);
    } finally {
      setSendingDirect(false);
    }
  };

  const handleSendPrivateMessage = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!selectedDirectRecipient) {
      setErrorMessage(t.chooseRecipient);
      return;
    }

    const content = directMessageText.trim();
    if (!content) {
      setErrorMessage(t.messageRequired);
      return;
    }

    setSendingDirect(true);
    setErrorMessage("");
    try {
      const response = await fetchWithAuth("/chat/direct", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetUserId: selectedDirectRecipient.id,
          content,
        }),
      });

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      const data = (await response.json()) as DirectMessageResponse;
      setDirectMessageText("");
      setSelectedDirectRecipientId("");
      await loadGroups();
      if (typeof data.groupId === "number") {
        setSelectedGroupId(data.groupId);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t.sendFailed);
    } finally {
      setSendingDirect(false);
    }
  };

  return (
    <ModulePageShell
      title={t.title}
      subtitle={t.subtitle}
      actions={
        <button
          type="button"
          className="auth-button"
          onClick={() => void loadGroups()}
        >
          {t.refresh}
        </button>
      }
    >
      <section className="module-grid">
        <article className="module-panel">
          <h2>{t.groups}</h2>
          {loadingGroups ? <p>{t.loadingGroups}</p> : null}
          <div className="module-list">
            {groups.length === 0 && !loadingGroups ? (
              <p className="module-empty">{t.noGroups}</p>
            ) : null}
            {groups.map((group) => (
              <button
                key={group.id}
                type="button"
                className="module-row"
                onClick={() => setSelectedGroupId(group.id)}
                style={{ textAlign: locale === "ar" ? "right" : "left" }}
              >
                <strong>{group.name}</strong>
                <span>{group.description || "-"}</span>
                <small>
                  {group.unreadCount ? `${group.unreadCount} unread` : " "}
                </small>
              </button>
            ))}
          </div>
        </article>

        <article className="module-panel">
          <h2>
            {t.messages}
            {selectedGroup ? ` - ${selectedGroup.name}` : ""}
          </h2>

          {!selectedGroupId ? (
            <p className="module-empty">{t.selectGroup}</p>
          ) : null}
          {loadingMessages ? <p>{t.loadingMessages}</p> : null}

          <div className="module-list">
            {!loadingMessages && selectedGroupId && messages.length === 0 ? (
              <p className="module-empty">{t.noMessages}</p>
            ) : null}

            {messages.map((message) => (
              <div key={message.id} className="module-row">
                <strong>
                  {message.sender?.fullName ||
                    message.sender?.username ||
                    `#${message.id}`}
                </strong>
                <span>{message.content}</span>
                <small>{new Date(message.createdAt).toLocaleString()}</small>
              </div>
            ))}
          </div>

          {selectedGroupId ? (
            <>
              <div
                className="admin-section__actions"
                style={{ justifyContent: "flex-start" }}
              >
                <button
                  type="button"
                  className="auth-button auth-button--ghost"
                  onClick={() => void markAsRead(selectedGroupId)}
                >
                  {t.markAsRead}
                </button>
              </div>

              <form
                className="module-form module-form--inline"
                onSubmit={handleSendMessage}
              >
                <label>
                  <input
                    type="text"
                    placeholder={t.messagePlaceholder}
                    value={messageText}
                    onChange={(event) => setMessageText(event.target.value)}
                  />
                </label>
                <button type="submit" className="auth-button">
                  {t.send}
                </button>
              </form>
            </>
          ) : null}
        </article>
      </section>

      {isAdmin ? (
        <section className="module-grid">
          <article className="module-panel">
            <h2>{t.membersByShift}</h2>

            {loadingMembers ? <p>{t.loadingMembers}</p> : null}

            <div className="module-list">
              {!loadingMembers && membersByShift.length === 0 ? (
                <p className="module-empty">{t.noMembersFound}</p>
              ) : null}

              {membersByShift.map((bucket) => (
                <div
                  key={`shift-${bucket.shiftId ?? "none"}`}
                  className="module-row"
                >
                  <strong>{bucket.shiftName}</strong>
                  <small>{bucket.members.length}</small>
                  <div className="module-list">
                    {bucket.members.map((member) => (
                      <div
                        key={member.id}
                        className="module-row"
                        style={{
                          textAlign: locale === "ar" ? "right" : "left",
                        }}
                      >
                        <strong>{member.fullName || member.username}</strong>
                        <span>
                          @{member.username} • {member.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="module-panel">
            <h2>{t.directMessage}</h2>
            <p>
              {t.selectedRecipient}: {selectedAdminTarget?.label || "-"}
            </p>

            <form className="module-form" onSubmit={handleSendDirectMessage}>
              <label>
                {t.targetType}
                <select
                  value={targetType}
                  onChange={(event) => {
                    const nextType = event.target.value as AdminTargetType;
                    setTargetType(nextType);
                    setSelectedUserId("");
                    setSelectedShiftId("");
                    setSelectedAudienceKey("");
                  }}
                >
                  <option value="USER">{t.person}</option>
                  <option value="SHIFT">{t.shift}</option>
                  <option value="AUDIENCE">{t.audience}</option>
                </select>
              </label>

              {targetType === "USER" ? (
                <>
                  <label>
                    {t.roleFilter}
                    <select
                      value={roleFilter}
                      onChange={(event) =>
                        setRoleFilter(event.target.value as DirectoryRoleFilter)
                      }
                    >
                      <option value="ALL">{t.allRoles}</option>
                      <option value="WORKER">{t.allWorkers}</option>
                      <option value="ENGINEER">ENGINEER</option>
                      <option value="ACCOUNTANT">ACCOUNTANT</option>
                    </select>
                  </label>
                  <label>
                    {t.choosePerson}
                    <select
                      value={selectedUserId}
                      onChange={(event) =>
                        setSelectedUserId(event.target.value)
                      }
                    >
                      <option value="">{t.choosePerson}</option>
                      {filteredMembers.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.displayLabel}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              ) : null}

              {targetType === "SHIFT" ? (
                <label>
                  {t.chooseShift}
                  <select
                    value={selectedShiftId}
                    onChange={(event) => setSelectedShiftId(event.target.value)}
                  >
                    <option value="">{t.chooseShift}</option>
                    {shiftTargets.map((target) => (
                      <option key={target.shiftId} value={target.shiftId}>
                        {`${target.shiftName} (${target.membersCount})`}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {targetType === "AUDIENCE" ? (
                <label>
                  {t.chooseAudience}
                  <select
                    value={selectedAudienceKey}
                    onChange={(event) =>
                      setSelectedAudienceKey(
                        event.target.value as "" | AudienceTarget["key"],
                      )
                    }
                  >
                    <option value="">{t.chooseAudience}</option>
                    {audienceTargets.map((target) => (
                      <option key={target.key} value={target.key}>
                        {target.key === "ALL_WORKERS"
                          ? `${t.allWorkers} (${target.membersCount})`
                          : `${t.allEmployees} (${target.membersCount})`}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <label>
                {t.directMessage}
                <input
                  type="text"
                  placeholder={t.directMessagePlaceholder}
                  value={directMessageText}
                  onChange={(event) => setDirectMessageText(event.target.value)}
                />
              </label>
              <button
                type="submit"
                className="auth-button"
                disabled={sendingDirect}
              >
                {sendingDirect ? t.sending : t.sendDirect}
              </button>
            </form>
          </article>
        </section>
      ) : null}

      {!isAdmin ? (
        <section className="module-grid">
          <article className="module-panel">
            <h2>{t.directMessage}</h2>
            <p>
              {t.selectedRecipient}:{" "}
              {selectedDirectRecipient?.displayLabel || "-"}
            </p>

            <form className="module-form" onSubmit={handleSendPrivateMessage}>
              <label>
                {t.directRecipient}
                <select
                  value={selectedDirectRecipientId}
                  onChange={(event) =>
                    setSelectedDirectRecipientId(event.target.value)
                  }
                >
                  <option value="">{t.chooseRecipient}</option>
                  {flattenedMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.displayLabel}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                {t.directMessage}
                <input
                  type="text"
                  placeholder={t.directMessagePlaceholder}
                  value={directMessageText}
                  onChange={(event) => setDirectMessageText(event.target.value)}
                />
              </label>

              <button
                type="submit"
                className="auth-button"
                disabled={sendingDirect}
              >
                {sendingDirect ? t.sending : t.sendDirect}
              </button>
            </form>
          </article>
        </section>
      ) : null}

      {isAdmin ? (
        <section className="module-grid">
          <article className="module-panel">
            <h2>{t.createGroup}</h2>
            <form className="module-form" onSubmit={handleCreateGroup}>
              <label>
                {t.groupName}
                <input
                  type="text"
                  value={createGroupForm.name}
                  onChange={(event) =>
                    setCreateGroupForm((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label>
                {t.groupDescription}
                <input
                  type="text"
                  value={createGroupForm.description}
                  onChange={(event) =>
                    setCreateGroupForm((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                {t.initialMembers}
                <input
                  type="text"
                  value={createGroupForm.memberIds}
                  onChange={(event) =>
                    setCreateGroupForm((prev) => ({
                      ...prev,
                      memberIds: event.target.value,
                    }))
                  }
                  placeholder="12, 25, 31"
                />
              </label>
              <button
                type="submit"
                className="auth-button"
                disabled={creatingGroup}
              >
                {creatingGroup ? t.creating : t.create}
              </button>
            </form>
          </article>

          <article className="module-panel">
            <h2>{t.members}</h2>
            {!selectedGroupId ? (
              <p className="module-empty">{t.selectGroup}</p>
            ) : null}
            {loadingGroupDetail ? <p>{t.groupDetailsLoading}</p> : null}

            {selectedGroupId ? (
              <form
                className="module-form module-form--inline"
                onSubmit={handleAddMember}
              >
                <label>
                  {t.userId}
                  <input
                    type="number"
                    min={1}
                    value={addMemberForm.userId}
                    onChange={(event) =>
                      setAddMemberForm((prev) => ({
                        ...prev,
                        userId: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label>
                  {t.memberRole}
                  <select
                    value={addMemberForm.role}
                    onChange={(event) =>
                      setAddMemberForm((prev) => ({
                        ...prev,
                        role: event.target.value as GroupRole,
                      }))
                    }
                  >
                    <option value="MEMBER">{t.member}</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </label>
                <button type="submit" className="auth-button">
                  {t.addMember}
                </button>
              </form>
            ) : null}

            <div className="module-list">
              {!loadingGroupDetail &&
              selectedGroupId &&
              (selectedGroupDetail?.members?.length ?? 0) === 0 ? (
                <p className="module-empty">{t.noMembers}</p>
              ) : null}

              {selectedGroupDetail?.members?.map((member) => (
                <div key={member.id} className="module-row">
                  <strong>
                    {member.user.fullName ||
                      member.user.username ||
                      `#${member.user.id}`}
                  </strong>
                  <span>
                    {member.role} • {member.user.role || "-"}
                  </span>
                  <div
                    className="admin-section__actions"
                    style={{ justifyContent: "flex-start" }}
                  >
                    <button
                      type="button"
                      className="auth-button auth-button--ghost"
                      onClick={() => void handleRemoveMember(member.user.id)}
                    >
                      {t.remove}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>
      ) : null}

      {errorMessage ? (
        <div className="auth-alert auth-alert--error">{errorMessage}</div>
      ) : null}
    </ModulePageShell>
  );
}
