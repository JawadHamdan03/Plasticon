import { beforeEach, describe, expect, it, vi } from "vitest";
import { GroupRole } from "../src/config/generated/prisma/client";

const { mockPrisma } = vi.hoisted(() => ({
    mockPrisma: {
        user: {
            findMany: vi.fn(),
            findUnique: vi.fn(),
        },
        chatGroup: {
            findMany: vi.fn(),
            findUnique: vi.fn(),
        },
        groupMember: {
            findUnique: vi.fn(),
            findMany: vi.fn(),
            create: vi.fn(),
            createMany: vi.fn(),
            delete: vi.fn(),
            update: vi.fn(),
        },
        groupMessage: {
            create: vi.fn(),
            findMany: vi.fn(),
            count: vi.fn(),
        },
        notification: {
            createMany: vi.fn(),
        },
        $transaction: vi.fn(),
    },
}));

vi.mock("../src/config/lib/prisma", () => ({
    prisma: mockPrisma,
}));

import {
    addGroupMember,
    createChatGroup,
    getGroupMessages,
    getUnreadCountsPerGroup,
    markGroupAsRead,
    sendGroupMessage,
} from "../src/services/chatServices";

describe("chatServices", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Mock getUserBasicRole by setting up prisma.user.findUnique to return valid user data
        mockPrisma.user.findUnique.mockResolvedValue({
            id: 1,
            role: "ADMIN",
            isActive: true,
            deletedAt: null,
        });
    });

    it("createChatGroup returns 400 when name is missing", async () => {
        const result = await createChatGroup(1, {});

        expect(result.status).toBe(400);
        expect(result.message).toBe("name is required");
    });

    it("createChatGroup creates group and creator membership", async () => {
        const tx = {
            chatGroup: {
                create: vi.fn().mockResolvedValue({ id: 10 }),
                findUnique: vi.fn().mockResolvedValue({ id: 10, name: "Ops", members: [] }),
            },
            groupMember: {
                create: vi.fn().mockResolvedValue({}),
                createMany: vi.fn().mockResolvedValue({ count: 2 }),
            },
        };

        mockPrisma.user.findMany.mockResolvedValue([{ id: 2 }, { id: 3 }]);
        mockPrisma.$transaction.mockImplementation(async (callback: (innerTx: unknown) => unknown) => callback(tx));

        const result = await createChatGroup(1, {
            name: "Ops",
            memberIds: [2, 3, 3, 1],
        });

        expect(result.status).toBe(201);
        expect(tx.chatGroup.create).toHaveBeenCalled();
        expect(tx.groupMember.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ userId: 1, role: GroupRole.ADMIN }),
            })
        );
        expect(tx.groupMember.createMany).toHaveBeenCalledWith(
            expect.objectContaining({
                data: [
                    expect.objectContaining({ userId: 2 }),
                    expect.objectContaining({ userId: 3 }),
                ],
            })
        );
    });

    it("addGroupMember blocks non-admin users", async () => {
        mockPrisma.groupMember.findUnique.mockResolvedValue({ groupId: 5, userId: 11, role: GroupRole.MEMBER });

        const result = await addGroupMember(11, 5, { userId: 99 });

        expect(result.status).toBe(403);
        expect(result.message).toBe("Only group admins can add members");
    });

    it("sendGroupMessage returns 400 when content missing", async () => {
        const result = await sendGroupMessage(1, 2, { content: "  " });

        expect(result.status).toBe(400);
        expect(result.message).toBe("content is required");
    });

    it("sendGroupMessage returns message and unread counts", async () => {
        mockPrisma.groupMember.findUnique
            .mockResolvedValueOnce({ groupId: 2, userId: 1, role: GroupRole.MEMBER })
            .mockResolvedValueOnce({ groupId: 2, userId: 1, lastReadAt: new Date("2026-03-01") })
            .mockResolvedValueOnce({ groupId: 2, userId: 2, lastReadAt: new Date("2026-03-01") });

        mockPrisma.groupMessage.count
            .mockResolvedValueOnce(0)
            .mockResolvedValueOnce(3);

        const tx = {
            groupMessage: {
                create: vi.fn().mockResolvedValue({ id: 77, groupId: 2, content: "hello" }),
            },
            chatGroup: {
                update: vi.fn().mockResolvedValue({}),
            },
            groupMember: {
                findMany: vi.fn().mockResolvedValue([{ userId: 1 }, { userId: 2 }]),
            },
        };

        mockPrisma.$transaction.mockImplementation(async (callback: (innerTx: unknown) => unknown) => callback(tx));

        const result = await sendGroupMessage(1, 2, { content: "hello" });

        expect(result.status).toBe(201);
        expect(result.data).toEqual(
            expect.objectContaining({
                id: 77,
                unreadCounts: [
                    { userId: 1, unreadCount: 0 },
                    { userId: 2, unreadCount: 3 },
                ],
            })
        );
    });

    it("getGroupMessages blocks non-members", async () => {
        mockPrisma.groupMember.findUnique.mockResolvedValue(null);

        const result = await getGroupMessages(3, 2, {});

        expect(result.status).toBe(403);
        expect(result.message).toBe("Access denied");
    });

    it("markGroupAsRead updates membership timestamp", async () => {
        mockPrisma.groupMember.findUnique.mockResolvedValue({ groupId: 2, userId: 9 });
        mockPrisma.groupMember.update.mockResolvedValue({});

        const result = await markGroupAsRead(9, 2);

        expect(result.status).toBe(200);
        expect(mockPrisma.groupMember.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    groupId_userId: {
                        groupId: 2,
                        userId: 9,
                    },
                },
            })
        );
        expect(result.data).toEqual(expect.objectContaining({ groupId: 2, unreadCount: 0 }));
    });

    it("getUnreadCountsPerGroup returns computed unread counts", async () => {
        mockPrisma.groupMember.findMany.mockResolvedValue([
            { groupId: 1, lastReadAt: new Date("2026-03-01") },
            { groupId: 2, lastReadAt: new Date("2026-03-01") },
        ]);
        mockPrisma.groupMessage.count
            .mockResolvedValueOnce(4)
            .mockResolvedValueOnce(0);

        const result = await getUnreadCountsPerGroup(5);

        expect(result.status).toBe(200);
        expect(result.data).toEqual([
            { groupId: 1, unreadCount: 4 },
            { groupId: 2, unreadCount: 0 },
        ]);
    });
});
