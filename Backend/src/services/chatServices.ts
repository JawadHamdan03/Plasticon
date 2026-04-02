import { GroupRole, NotificationType } from "../config/generated/prisma/client";
import { prisma } from "../config/lib/prisma";
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

type UnreadCountItem = {
    groupId: number;
    unreadCount: number;
};

const toPositiveInt = (value: unknown): number | null => {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        return null;
    }
    return parsed;
};

const ensureGroupMember = async (groupId: number, userId: number) => {
    return prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId, userId } },
    });
};

export const createChatGroup = async (
    userId: number,
    payload: CreateGroupPayload = {}
): Promise<ServiceResult<unknown>> => {
    const name = payload.name?.trim();
    if (!name) {
        return { status: 400, message: "name is required" };
    }

    const description = payload.description?.trim() || null;
    const incomingMemberIds = Array.isArray(payload.memberIds) ? payload.memberIds : [];
    const memberIds = [...new Set(incomingMemberIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))]
        .filter((id) => id !== userId);

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
                    select: { id: true, fullName: true, username: true, role: true, profileImage: true },
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

    auditAsync(userId, AuditAction.CHAT_GROUP_CREATED, AuditEntityType.CHAT_GROUP, group?.id ?? null, {
        name: group?.name,
        memberCount: (memberIds.length ?? 0) + 1,
    });

    return { status: 201, data: group };
};

export const getMyChatGroups = async (userId: number): Promise<ServiceResult<unknown>> => {
    const groups = await prisma.chatGroup.findMany({
        where: {
            members: {
                some: { userId },
            },
        },
        include: {
            createdBy: {
                select: { id: true, fullName: true, username: true, role: true, profileImage: true },
            },
            _count: {
                select: { members: true, messages: true },
            },
            messages: {
                take: 1,
                orderBy: [{ createdAt: "desc" }, { id: "desc" }],
                include: {
                    sender: {
                        select: { id: true, fullName: true, username: true, role: true, profileImage: true },
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
        (unreadCounts.data as UnreadCountItem[] | undefined)?.map((item) => [item.groupId, item.unreadCount]) ?? []
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
    groupIdInput: unknown
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
                select: { id: true, fullName: true, username: true, role: true, profileImage: true },
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
    payload: AddMemberPayload = {}
): Promise<ServiceResult<unknown>> => {
    const groupId = toPositiveInt(groupIdInput);
    if (!groupId) {
        return { status: 400, message: "groupId must be a positive integer" };
    }

    const targetUserId = toPositiveInt(payload.userId);
    if (!targetUserId) {
        return { status: 400, message: "userId is required and must be a positive integer" };
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
        select: { id: true, fullName: true, username: true, role: true, profileImage: true },
    });
    if (!user) {
        return { status: 404, message: "User not found" };
    }

    const existingMember = await ensureGroupMember(groupId, targetUserId);
    if (existingMember) {
        return { status: 409, message: "User is already a member of this group" };
    }

    const memberRole = payload.role === GroupRole.ADMIN ? GroupRole.ADMIN : GroupRole.MEMBER;

    const member = await prisma.groupMember.create({
        data: {
            groupId,
            userId: targetUserId,
            role: memberRole,
            lastReadAt: new Date(),
        },
        include: {
            user: {
                select: { id: true, fullName: true, username: true, role: true, profileImage: true },
            },
            group: {
                select: { id: true, name: true },
            },
        },
    });

    auditAsync(requesterId, AuditAction.CHAT_MEMBER_ADDED, AuditEntityType.CHAT_GROUP, groupId, {
        targetUserId,
        role: memberRole,
    });

    return { status: 201, data: member };
};

export const removeGroupMember = async (
    requesterId: number,
    groupIdInput: unknown,
    targetUserIdInput: unknown
): Promise<ServiceResult<unknown>> => {
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

    auditAsync(requesterId, AuditAction.CHAT_MEMBER_REMOVED, AuditEntityType.CHAT_GROUP, groupId, {
        targetUserId,
    });

    return { status: 200, data: { message: "Member removed successfully" } };
};

export const sendGroupMessage = async (
    userId: number,
    groupIdInput: unknown,
    payload: SendMessagePayload = {}
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
                    select: { id: true, fullName: true, username: true, role: true, profileImage: true },
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
        })
    );

    const recipientUserIds = messageResult.memberUserIds.filter((memberUserId) => memberUserId !== userId);

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
    query: { limit?: unknown; cursor?: unknown }
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
    const limit = Number.isInteger(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 100) : 30;

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
                select: { id: true, fullName: true, username: true, role: true, profileImage: true },
            },
        },
    });

    const hasMore = messages.length > limit;
    const normalizedMessages = hasMore ? messages.slice(0, limit) : messages;
    const nextCursor = hasMore ? normalizedMessages[normalizedMessages.length - 1]?.id ?? null : null;

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
    groupIdInput: unknown
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

const getUnreadCountForGroup = async (userId: number, groupId: number): Promise<number> => {
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

export const getUnreadCountsPerGroup = async (userId: number): Promise<ServiceResult<UnreadCountItem[]>> => {
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
        })
    );

    return { status: 200, data: counts };
};
