import {
  GroupRole,
  NotificationType,
  UserRole,
} from "../config/generated/prisma/client";
import { prisma } from "../config/lib/prisma";
import { emitNotificationUnreadCountUpdate } from "../config/socket";
import { auditAsync } from "./auditHelper";
import { AuditAction, AuditEntityType } from "./auditServices";

type ServiceResult<T> = {
  status: number;
  message?: string;
  data?: T;
};

type CreateGroupPayload = {
  name?: string;
  description?: string;
  memberIds?: number[];
};

type AddMemberPayload = {
  userId?: number;
  role?: GroupRole;
};

type SendMessagePayload = {
  content?: string;
};

type DirectMessagePayload = {
  targetUserId?: number;
  content?: string;
};

type UnreadCountItem = {
  groupId: number;
  unreadCount: number;
};

type MemberDirectoryItem = {
  id: number;
  fullName: string;
  username: string;
  role: string;
  shiftId: number | null;
  shiftName: string;
};

type ShiftMemberBucket = {
  shiftId: number | null;
  shiftName: string;
  members: MemberDirectoryItem[];
};

type GlobalAudienceTarget = {
  key: "ALL_WORKERS" | "ALL_EMPLOYEES";
  label: string;
  membersCount: number;
};

type ShiftAudienceTarget = {
  shiftId: number;
  shiftName: string;
  membersCount: number;
};

type AdminChatTargets = {
  usersByShift: ShiftMemberBucket[];
  shifts: ShiftAudienceTarget[];
  audiences: GlobalAudienceTarget[];
};

type AdminSendPayload = {
  targetType?: "USER" | "SHIFT" | "AUDIENCE";
  targetUserId?: number;
  shiftId?: number;
  audienceKey?: "ALL_WORKERS" | "ALL_EMPLOYEES";
  content?: string;
};

const toPositiveInt = (value: unknown): number | null => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

const chatEligibleRoles = [
  "WORKER",
  "ENGINEER",
  "ACCOUNTANT",
  "ADMIN",
  "SALES_REP",
] as const;

const chatEligibleRoleValues: UserRole[] = [
  UserRole.WORKER,
  UserRole.ENGINEER,
  UserRole.ACCOUNTANT,
  UserRole.ADMIN,
];

const ensureGroupMember = async (groupId: number, userId: number) => {
  return prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
};

export const createChatGroup = async (
  userId: number,
  payload: CreateGroupPayload = {},
): Promise<ServiceResult<unknown>> => {
  const requester = await getUserBasicRole(userId);
  if (!requester || !requester.isActive || requester.deletedAt) {
    return { status: 401, message: "Not authorized" };
  }

  if (requester.role !== UserRole.ADMIN) {
    return { status: 403, message: "Only admin can create chat groups" };
  }

  const name = payload.name?.trim();
  if (!name) {
    return { status: 400, message: "name is required" };
  }

  const description = payload.description?.trim() || null;
  const incomingMemberIds = Array.isArray(payload.memberIds)
    ? payload.memberIds
    : [];
  const memberIds = [
    ...new Set(
      incomingMemberIds
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
  ].filter((id) => id !== userId);

  if (memberIds.length > 0) {
    const existingUsers = await prisma.user.findMany({
      where: { id: { in: memberIds } },
      select: { id: true },
    });

    if (existingUsers.length !== memberIds.length) {
      return { status: 404, message: "One or more users not found" };
    }
  }

  const group = await prisma.$transaction(async (tx) => {
    const createdGroup = await tx.chatGroup.create({
      data: {
        name,
        description,
        createdById: userId,
      },
    });

    await tx.groupMember.create({
      data: {
        groupId: createdGroup.id,
        userId,
        role: GroupRole.ADMIN,
        lastReadAt: new Date(),
      },
    });

    if (memberIds.length > 0) {
      await tx.groupMember.createMany({
        data: memberIds.map((memberId) => ({
          groupId: createdGroup.id,
          userId: memberId,
          role: GroupRole.MEMBER,
          lastReadAt: new Date(),
        })),
        skipDuplicates: true,
      });
    }

    return tx.chatGroup.findUnique({
      where: { id: createdGroup.id },
      include: {
        createdBy: {
          select: {
            id: true,
            fullName: true,
            username: true,
            role: true,
            profileImage: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                username: true,
                role: true,
                profileImage: true,
              },
            },
          },
          orderBy: { joinedAt: "asc" },
        },
      },
    });
  });

  auditAsync(
    userId,
    AuditAction.CHAT_GROUP_CREATED,
    AuditEntityType.CHAT_GROUP,
    group?.id,
    {
      name: group?.name,
      memberCount: (memberIds.length ?? 0) + 1,
    },
  );

  return { status: 201, data: group };
};

export const getMyChatGroups = async (
  userId: number,
): Promise<ServiceResult<unknown>> => {
  const groups = await prisma.chatGroup.findMany({
    where: {
      members: {
        some: { userId },
      },
    },
    include: {
      createdBy: {
        select: {
          id: true,
          fullName: true,
          username: true,
          role: true,
          profileImage: true,
        },
      },
      _count: {
        select: { members: true, messages: true },
      },
      messages: {
        take: 1,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        include: {
          sender: {
            select: {
              id: true,
              fullName: true,
              username: true,
              role: true,
              profileImage: true,
            },
          },
        },
      },
      members: {
        where: { userId },
        select: { lastReadAt: true },
      },
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
  });

  const unreadCounts = await getUnreadCountsPerGroup(userId);
  const unreadMap = new Map(
    (unreadCounts.data as UnreadCountItem[] | undefined)?.map((item) => [
      item.groupId,
      item.unreadCount,
    ]) ?? [],
  );

  const mapped = groups.map((group) => {
    const lastMessage = group.messages[0] ?? null;
    const unreadCount = unreadMap.get(group.id) ?? 0;

    return {
      ...group,
      lastMessage,
      unreadCount,
      members: undefined,
      messages: undefined,
      myLastReadAt: group.members[0]?.lastReadAt ?? null,
    };
  });

  return { status: 200, data: mapped };
};

export const getChatGroupById = async (
  userId: number,
  groupIdInput: unknown,
): Promise<ServiceResult<unknown>> => {
  const groupId = toPositiveInt(groupIdInput);
  if (!groupId) {
    return { status: 400, message: "groupId must be a positive integer" };
  }

  const membership = await ensureGroupMember(groupId, userId);
  if (!membership) {
    return { status: 403, message: "Access denied" };
  }

  const group = await prisma.chatGroup.findUnique({
    where: { id: groupId },
    include: {
      createdBy: {
        select: {
          id: true,
          fullName: true,
          username: true,
          role: true,
          profileImage: true,
        },
      },
      members: {
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              username: true,
              role: true,
              profileImage: true,
            },
          },
        },
        orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
      },
      _count: {
        select: { messages: true },
      },
    },
  });

  if (!group) {
    return { status: 404, message: "Group not found" };
  }

  return { status: 200, data: group };
};

export const addGroupMember = async (
  requesterId: number,
  groupIdInput: unknown,
  payload: AddMemberPayload = {},
): Promise<ServiceResult<unknown>> => {
  const requester = await getUserBasicRole(requesterId);
  if (!requester || !requester.isActive || requester.deletedAt) {
    return { status: 401, message: "Not authorized" };
  }

  if (requester.role !== UserRole.ADMIN) {
    return { status: 403, message: "Only admin can manage chat groups" };
  }

  const groupId = toPositiveInt(groupIdInput);
  if (!groupId) {
    return { status: 400, message: "groupId must be a positive integer" };
  }

  const targetUserId = toPositiveInt(payload.userId);
  if (!targetUserId) {
    return {
      status: 400,
      message: "userId is required and must be a positive integer",
    };
  }

  const requesterMembership = await ensureGroupMember(groupId, requesterId);
  if (!requesterMembership || requesterMembership.role !== GroupRole.ADMIN) {
    return { status: 403, message: "Only group admins can add members" };
  }

  const group = await prisma.chatGroup.findUnique({ where: { id: groupId } });
  if (!group) {
    return { status: 404, message: "Group not found" };
  }

  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: {
      id: true,
      fullName: true,
      username: true,
      role: true,
      profileImage: true,
    },
  });
  if (!user) {
    return { status: 404, message: "User not found" };
  }

  const existingMember = await ensureGroupMember(groupId, targetUserId);
  if (existingMember) {
    return { status: 409, message: "User is already a member of this group" };
  }

  const memberRole =
    payload.role === GroupRole.ADMIN ? GroupRole.ADMIN : GroupRole.MEMBER;

  const member = await prisma.groupMember.create({
    data: {
      groupId,
      userId: targetUserId,
      role: memberRole,
      lastReadAt: new Date(),
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          username: true,
          role: true,
          profileImage: true,
        },
      },
      group: {
        select: { id: true, name: true },
      },
    },
  });

  auditAsync(
    requesterId,
    AuditAction.CHAT_MEMBER_ADDED,
    AuditEntityType.CHAT_GROUP,
    groupId,
    {
      targetUserId,
      role: memberRole,
    },
  );

  return { status: 201, data: member };
};

export const removeGroupMember = async (
  requesterId: number,
  groupIdInput: unknown,
  targetUserIdInput: unknown,
): Promise<ServiceResult<unknown>> => {
  const requester = await getUserBasicRole(requesterId);
  if (!requester || !requester.isActive || requester.deletedAt) {
    return { status: 401, message: "Not authorized" };
  }

  if (requester.role !== UserRole.ADMIN) {
    return { status: 403, message: "Only admin can manage chat groups" };
  }

  const groupId = toPositiveInt(groupIdInput);
  if (!groupId) {
    return { status: 400, message: "groupId must be a positive integer" };
  }

  const targetUserId = toPositiveInt(targetUserIdInput);
  if (!targetUserId) {
    return { status: 400, message: "userId must be a positive integer" };
  }

  const requesterMembership = await ensureGroupMember(groupId, requesterId);
  if (!requesterMembership || requesterMembership.role !== GroupRole.ADMIN) {
    return { status: 403, message: "Only group admins can remove members" };
  }

  if (requesterId === targetUserId) {
    return { status: 400, message: "Group admins cannot remove themselves" };
  }

  const group = await prisma.chatGroup.findUnique({ where: { id: groupId } });
  if (!group) {
    return { status: 404, message: "Group not found" };
  }

  if (group.createdById === targetUserId) {
    return { status: 400, message: "Cannot remove the group creator" };
  }

  const targetMembership = await ensureGroupMember(groupId, targetUserId);
  if (!targetMembership) {
    return { status: 404, message: "User is not a member of this group" };
  }

  await prisma.groupMember.delete({
    where: {
      groupId_userId: {
        groupId,
        userId: targetUserId,
      },
    },
  });

  auditAsync(
    requesterId,
    AuditAction.CHAT_MEMBER_REMOVED,
    AuditEntityType.CHAT_GROUP,
    groupId,
    {
      targetUserId,
    },
  );

  return { status: 200, data: { message: "Member removed successfully" } };
};

export const sendGroupMessage = async (
  userId: number,
  groupIdInput: unknown,
  payload: SendMessagePayload = {},
): Promise<ServiceResult<unknown>> => {
  const groupId = toPositiveInt(groupIdInput);
  if (!groupId) {
    return { status: 400, message: "groupId must be a positive integer" };
  }

  const content = payload.content?.trim();
  if (!content) {
    return { status: 400, message: "content is required" };
  }

  if (content.length > 2000) {
    return { status: 400, message: "content must be 2000 characters or less" };
  }

  const membership = await ensureGroupMember(groupId, userId);
  if (!membership) {
    return { status: 403, message: "Access denied" };
  }

  const messageResult = await prisma.$transaction(async (tx) => {
    const createdMessage = await tx.groupMessage.create({
      data: {
        groupId,
        senderId: userId,
        content,
      },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            username: true,
            role: true,
            profileImage: true,
          },
        },
      },
    });

    await tx.chatGroup.update({
      where: { id: groupId },
      data: { updatedAt: new Date() },
    });

    const members = await tx.groupMember.findMany({
      where: { groupId },
      select: { userId: true },
    });

    return {
      message: createdMessage,
      memberUserIds: members.map((member) => member.userId),
    };
  });

  const unreadCounts = await Promise.all(
    messageResult.memberUserIds.map(async (memberUserId) => {
      const result = await getUnreadCountForGroup(memberUserId, groupId);
      return {
        userId: memberUserId,
        unreadCount: result,
      };
    }),
  );

  const recipientUserIds = messageResult.memberUserIds.filter(
    (memberUserId) => memberUserId !== userId,
  );

  if (recipientUserIds.length > 0) {
    await prisma.notification.createMany({
      data: recipientUserIds.map((recipientUserId) => ({
        userId: recipientUserId,
        title: "New chat message",
        message: content,
        type: NotificationType.CHAT_MESSAGE,
        chatGroupId: groupId,
      })),
    });

    recipientUserIds.forEach((recipientUserId) => {
      emitNotificationUnreadCountUpdate(recipientUserId, {
        refresh: true,
        chatGroupId: groupId,
      });
    });
  }

  return {
    status: 201,
    data: {
      ...messageResult.message,
      unreadCounts,
    },
  };
};

export const getGroupMessages = async (
  userId: number,
  groupIdInput: unknown,
  query: { limit?: unknown; cursor?: unknown },
): Promise<ServiceResult<unknown>> => {
  const groupId = toPositiveInt(groupIdInput);
  if (!groupId) {
    return { status: 400, message: "groupId must be a positive integer" };
  }

  const membership = await ensureGroupMember(groupId, userId);
  if (!membership) {
    return { status: 403, message: "Access denied" };
  }

  const parsedLimit = Number(query.limit);
  const limit =
    Number.isInteger(parsedLimit) && parsedLimit > 0
      ? Math.min(parsedLimit, 100)
      : 30;

  const parsedCursor = toPositiveInt(query.cursor);

  const messages = await prisma.groupMessage.findMany({
    where: { groupId },
    take: limit + 1,
    ...(parsedCursor
      ? {
          cursor: { id: parsedCursor },
          skip: 1,
        }
      : {}),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: {
      sender: {
        select: {
          id: true,
          fullName: true,
          username: true,
          role: true,
          profileImage: true,
        },
      },
    },
  });

  const hasMore = messages.length > limit;
  const normalizedMessages = hasMore ? messages.slice(0, limit) : messages;
  const nextCursor = hasMore
    ? (normalizedMessages[normalizedMessages.length - 1]?.id ?? null)
    : null;

  return {
    status: 200,
    data: {
      messages: normalizedMessages,
      nextCursor,
      hasMore,
    },
  };
};

export const markGroupAsRead = async (
  userId: number,
  groupIdInput: unknown,
): Promise<ServiceResult<unknown>> => {
  const groupId = toPositiveInt(groupIdInput);
  if (!groupId) {
    return { status: 400, message: "groupId must be a positive integer" };
  }

  const membership = await ensureGroupMember(groupId, userId);
  if (!membership) {
    return { status: 403, message: "Access denied" };
  }

  const lastReadAt = new Date();

  await prisma.groupMember.update({
    where: {
      groupId_userId: {
        groupId,
        userId,
      },
    },
    data: { lastReadAt },
  });

  return {
    status: 200,
    data: {
      groupId,
      lastReadAt,
      unreadCount: 0,
    },
  };
};

const getUnreadCountForGroup = async (
  userId: number,
  groupId: number,
): Promise<number> => {
  const membership = await prisma.groupMember.findUnique({
    where: {
      groupId_userId: {
        groupId,
        userId,
      },
    },
    select: { lastReadAt: true },
  });

  if (!membership) {
    return 0;
  }

  return prisma.groupMessage.count({
    where: {
      groupId,
      senderId: { not: userId },
      createdAt: {
        gt: membership.lastReadAt,
      },
    },
  });
};

export const getUnreadCountsPerGroup = async (
  userId: number,
): Promise<ServiceResult<UnreadCountItem[]>> => {
  const memberships = await prisma.groupMember.findMany({
    where: { userId },
    select: { groupId: true, lastReadAt: true },
  });

  const counts = await Promise.all(
    memberships.map(async (membership) => {
      const unreadCount = await prisma.groupMessage.count({
        where: {
          groupId: membership.groupId,
          senderId: { not: userId },
          createdAt: {
            gt: membership.lastReadAt,
          },
        },
      });

      return {
        groupId: membership.groupId,
        unreadCount,
      };
    }),
  );

  return { status: 200, data: counts };
};

export const getChatMembersByShift = async (
  requesterId: number,
  query: { search?: unknown },
): Promise<ServiceResult<ShiftMemberBucket[]>> => {
  const search = String(query.search ?? "").trim();

  // Fetch requester's role and shift for access filtering
  const requester = await prisma.user.findUnique({
    where: { id: requesterId },
    select: { id: true, role: true, shiftId: true },
  });
  if (!requester) return { status: 404, message: "User not found" };

  // Build recipient filter based on requester's role:
  //   WORKER / ENGINEER → ADMIN + ACCOUNTANT + same-shift WORKER + same-shift ENGINEER
  //   ACCOUNTANT        → everyone (no extra restriction)
  //   ADMIN             → everyone (ADMIN typically uses /admin/targets, but handle gracefully)
  const roleRestricted =
    requester.role === UserRole.WORKER || requester.role === UserRole.ENGINEER;

  const roleShiftFilter = roleRestricted
    ? {
        OR: [
          { role: { in: [UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.SALES_REP] as any[] } },
          {
            role: { in: [UserRole.WORKER, UserRole.ENGINEER] as any[] },
            shiftId: requester.shiftId ?? -1,
          },
        ],
      }
    : {};

  const searchFilter = search
    ? {
        OR: [
          { fullName: { contains: search, mode: "insensitive" as const } },
          { username: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      role: { in: chatEligibleRoles as unknown as any[] },
      ...roleShiftFilter,
      ...(search ? { AND: [searchFilter] } : {}),
    },
    select: {
      id: true,
      fullName: true,
      username: true,
      role: true,
      shiftId: true,
      shift: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: [{ shiftId: "asc" }, { fullName: "asc" }, { username: "asc" }],
  });

  const bucketsMap = new Map<string, ShiftMemberBucket>();

  users
    .filter((member) => member.id !== requesterId)
    .forEach((member) => {
      const shiftId = member.shift?.id ?? member.shiftId ?? null;
      const shiftName = member.shift?.name ?? "Unassigned";
      const key = `${shiftId ?? "none"}`;

      if (!bucketsMap.has(key)) {
        bucketsMap.set(key, {
          shiftId,
          shiftName,
          members: [],
        });
      }

      bucketsMap.get(key)?.members.push({
        id: member.id,
        fullName: member.fullName,
        username: member.username,
        role: member.role,
        shiftId,
        shiftName,
      });
    });

  const buckets = Array.from(bucketsMap.values()).sort((a, b) => {
    if (a.shiftId === null && b.shiftId !== null) return 1;
    if (a.shiftId !== null && b.shiftId === null) return -1;
    return a.shiftName.localeCompare(b.shiftName);
  });

  return { status: 200, data: buckets };
};

export const sendDirectMessage = async (
  requesterId: number,
  payload: DirectMessagePayload = {},
): Promise<ServiceResult<unknown>> => {
  const targetUserId = toPositiveInt(payload.targetUserId);
  if (!targetUserId) {
    return {
      status: 400,
      message: "targetUserId is required and must be a positive integer",
    };
  }

  if (targetUserId === requesterId) {
    return { status: 400, message: "Cannot send direct message to yourself" };
  }

  const content = payload.content?.trim();
  if (!content) {
    return { status: 400, message: "content is required" };
  }

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, isActive: true, deletedAt: true },
  });

  if (!target || !target.isActive || target.deletedAt) {
    return { status: 404, message: "Target user not found" };
  }

  const candidateGroups = await prisma.chatGroup.findMany({
    where: {
      members: {
        some: { userId: requesterId },
      },
      AND: [
        {
          members: {
            some: { userId: targetUserId },
          },
        },
      ],
    },
    include: {
      _count: {
        select: { members: true },
      },
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
  });

  let directGroupId = candidateGroups.find(
    (group) => group._count.members === 2,
  )?.id;

  if (!directGroupId) {
    const createdGroup = await prisma.chatGroup.create({
      data: {
        name: `Direct ${requesterId}-${targetUserId}`,
        description: "Direct conversation",
        createdById: requesterId,
      },
    });

    await prisma.groupMember.createMany({
      data: [
        {
          groupId: createdGroup.id,
          userId: requesterId,
          role: GroupRole.ADMIN,
          lastReadAt: new Date(),
        },
        {
          groupId: createdGroup.id,
          userId: targetUserId,
          role: GroupRole.MEMBER,
          lastReadAt: new Date(),
        },
      ],
      skipDuplicates: true,
    });

    directGroupId = createdGroup.id;
  }

  const messageResult = await sendGroupMessage(requesterId, directGroupId, {
    content,
  });
  if (messageResult.message) {
    return messageResult;
  }

  return {
    status: 201,
    data: {
      ...(messageResult.data as Record<string, unknown>),
      groupId: directGroupId,
      targetUserId,
    },
  };
};

const getUserBasicRole = async (userId: number) => {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, isActive: true, deletedAt: true },
  });
};

const ensureAutoAudienceGroup = async (
  requesterId: number,
  groupName: string,
  groupDescription: string,
  recipients: number[],
): Promise<number> => {
  const uniqueRecipients = [
    ...new Set(recipients.filter((id) => Number.isInteger(id) && id > 0)),
  ].filter((id) => id !== requesterId);

  let group = await prisma.chatGroup.findFirst({
    where: {
      createdById: requesterId,
      name: groupName,
    },
    select: { id: true },
    orderBy: [{ id: "desc" }],
  });

  if (!group) {
    const createdGroup = await prisma.chatGroup.create({
      data: {
        name: groupName,
        description: groupDescription,
        createdById: requesterId,
      },
      select: { id: true },
    });
    group = createdGroup;
  }

  const groupId = group.id;
  const desiredMembers = new Set<number>([requesterId, ...uniqueRecipients]);

  const existingMembers = await prisma.groupMember.findMany({
    where: { groupId },
    select: { userId: true, role: true },
  });

  const existingMemberIds = new Set(
    existingMembers.map((member) => member.userId),
  );

  const toAdd = Array.from(desiredMembers).filter(
    (userId) => !existingMemberIds.has(userId),
  );
  if (toAdd.length > 0) {
    await prisma.groupMember.createMany({
      data: toAdd.map((userId) => ({
        groupId,
        userId,
        role: userId === requesterId ? GroupRole.ADMIN : GroupRole.MEMBER,
        lastReadAt: new Date(),
      })),
      skipDuplicates: true,
    });
  }

  const requesterMembership = existingMembers.find(
    (member) => member.userId === requesterId,
  );
  if (requesterMembership && requesterMembership.role !== GroupRole.ADMIN) {
    await prisma.groupMember.update({
      where: {
        groupId_userId: { groupId, userId: requesterId },
      },
      data: { role: GroupRole.ADMIN },
    });
  }

  const toRemove = existingMembers
    .map((member) => member.userId)
    .filter((userId) => !desiredMembers.has(userId) && userId !== requesterId);

  if (toRemove.length > 0) {
    await prisma.groupMember.deleteMany({
      where: {
        groupId,
        userId: { in: toRemove },
      },
    });
  }

  return groupId;
};

export const getAdminChatTargets = async (
  requesterId: number,
): Promise<ServiceResult<AdminChatTargets>> => {
  const requester = await getUserBasicRole(requesterId);
  if (!requester || !requester.isActive || requester.deletedAt) {
    return { status: 401, message: "Not authorized" };
  }

  if (requester.role !== UserRole.ADMIN) {
    return { status: 403, message: "Only admin can access chat targets" };
  }

  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      role: { in: chatEligibleRoleValues },
      id: { not: requesterId },
    },
    select: {
      id: true,
      fullName: true,
      username: true,
      role: true,
      shiftId: true,
      shift: {
        select: { id: true, name: true },
      },
    },
    orderBy: [{ shiftId: "asc" }, { fullName: "asc" }, { username: "asc" }],
  });

  const byShift = new Map<string, ShiftMemberBucket>();
  const shiftTargetMap = new Map<number, ShiftAudienceTarget>();

  users.forEach((member) => {
    const shiftId = member.shift?.id ?? member.shiftId ?? null;
    const shiftName = member.shift?.name ?? "Unassigned";
    const bucketKey = `${shiftId ?? "none"}`;

    if (!byShift.has(bucketKey)) {
      byShift.set(bucketKey, {
        shiftId,
        shiftName,
        members: [],
      });
    }

    byShift.get(bucketKey)?.members.push({
      id: member.id,
      fullName: member.fullName,
      username: member.username,
      role: member.role,
      shiftId,
      shiftName,
    });

    if (shiftId !== null) {
      const current = shiftTargetMap.get(shiftId) ?? {
        shiftId,
        shiftName,
        membersCount: 0,
      };
      current.membersCount += 1;
      shiftTargetMap.set(shiftId, current);
    }
  });

  const workersCount = users.filter(
    (member) => member.role === UserRole.WORKER,
  ).length;
  const employeesCount = users.length;

  return {
    status: 200,
    data: {
      usersByShift: Array.from(byShift.values()).sort((a, b) => {
        if (a.shiftId === null && b.shiftId !== null) return 1;
        if (a.shiftId !== null && b.shiftId === null) return -1;
        return a.shiftName.localeCompare(b.shiftName);
      }),
      shifts: Array.from(shiftTargetMap.values()).sort((a, b) =>
        a.shiftName.localeCompare(b.shiftName),
      ),
      audiences: [
        {
          key: "ALL_WORKERS",
          label: "All Workers",
          membersCount: workersCount,
        },
        {
          key: "ALL_EMPLOYEES",
          label: "All Employees",
          membersCount: employeesCount,
        },
      ],
    },
  };
};

export const sendAdminMessage = async (
  requesterId: number,
  payload: AdminSendPayload = {},
): Promise<ServiceResult<unknown>> => {
  const requester = await getUserBasicRole(requesterId);
  if (!requester || !requester.isActive || requester.deletedAt) {
    return { status: 401, message: "Not authorized" };
  }

  if (requester.role !== UserRole.ADMIN) {
    return { status: 403, message: "Only admin can send targeted messages" };
  }

  const content = payload.content?.trim();
  if (!content) {
    return { status: 400, message: "content is required" };
  }

  const targetType = payload.targetType;
  if (targetType === "USER") {
    return sendDirectMessage(requesterId, {
      targetUserId: payload.targetUserId,
      content,
    });
  }

  let recipientIds: number[] = [];
  let groupName = "";
  let groupDescription = "";

  if (targetType === "SHIFT") {
    const shiftId = toPositiveInt(payload.shiftId);
    if (!shiftId) {
      return { status: 400, message: "shiftId is required for SHIFT target" };
    }

    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      select: { id: true, name: true },
    });
    if (!shift) {
      return { status: 404, message: "Shift not found" };
    }

    const users = await prisma.user.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        shiftId,
        role: { in: chatEligibleRoleValues },
      },
      select: { id: true },
    });

    recipientIds = users
      .map((user) => user.id)
      .filter((id) => id !== requesterId);
    groupName = `[AUTO] Shift #${shift.id} - ${shift.name}`;
    groupDescription = "Auto-managed shift broadcast group";
  } else if (targetType === "AUDIENCE") {
    if (
      payload.audienceKey !== "ALL_WORKERS" &&
      payload.audienceKey !== "ALL_EMPLOYEES"
    ) {
      return {
        status: 400,
        message: "audienceKey must be ALL_WORKERS or ALL_EMPLOYEES",
      };
    }

    const whereRole =
      payload.audienceKey === "ALL_WORKERS"
        ? { role: UserRole.WORKER }
        : { role: { in: chatEligibleRoleValues } };

    const users = await prisma.user.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        ...whereRole,
      },
      select: { id: true },
    });

    recipientIds = users
      .map((user) => user.id)
      .filter((id) => id !== requesterId);
    groupName =
      payload.audienceKey === "ALL_WORKERS"
        ? "[AUTO] All Workers"
        : "[AUTO] All Employees";
    groupDescription = "Auto-managed global broadcast group";
  } else {
    return {
      status: 400,
      message: "targetType must be USER, SHIFT, or AUDIENCE",
    };
  }

  if (recipientIds.length === 0) {
    return { status: 404, message: "No recipients found for selected target" };
  }

  const groupId = await ensureAutoAudienceGroup(
    requesterId,
    groupName,
    groupDescription,
    recipientIds,
  );

  const result = await sendGroupMessage(requesterId, groupId, { content });
  if (result.message) {
    return result;
  }

  return {
    status: 201,
    data: {
      ...(result.data as Record<string, unknown>),
      groupId,
      targetType,
    },
  };
};
