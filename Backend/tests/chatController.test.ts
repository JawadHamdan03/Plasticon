import { beforeEach, describe, expect, it, vi } from "vitest";

const { serviceMocks, socketMocks } = vi.hoisted(() => ({
    serviceMocks: {
        createChatGroup: vi.fn(),
        getMyChatGroups: vi.fn(),
        getChatGroupById: vi.fn(),
        addGroupMember: vi.fn(),
        removeGroupMember: vi.fn(),
        sendGroupMessage: vi.fn(),
        getGroupMessages: vi.fn(),
        markGroupAsRead: vi.fn(),
        getUnreadCountsPerGroup: vi.fn(),
    },
    socketMocks: {
        emitChatMessageToGroup: vi.fn(),
        emitUnreadCountUpdate: vi.fn(),
    },
}));

vi.mock("../src/services/chatServices", () => serviceMocks);
vi.mock("../src/config/socket", () => socketMocks);

import {
    createChatGroupHandler,
    getUnreadCountsPerGroupHandler,
    markGroupAsReadHandler,
    sendGroupMessageHandler,
} from "../src/controllers/chatController";

const createResponseMock = () => {
    const res = {
        status: vi.fn(),
        json: vi.fn(),
    };

    res.status.mockReturnValue(res);
    return res;
};

describe("chatController", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("createChatGroupHandler returns 401 when request user missing", async () => {
        const req = { body: {} } as any;
        const res = createResponseMock();

        await createChatGroupHandler(req, res as any);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: "Not authorized" });
    });

    it("createChatGroupHandler returns 201 on success", async () => {
        const req = { user: { id: 2 }, body: { name: "Ops" } } as any;
        const res = createResponseMock();
        serviceMocks.createChatGroup.mockResolvedValue({ status: 201, data: { id: 9 } });

        await createChatGroupHandler(req, res as any);

        expect(serviceMocks.createChatGroup).toHaveBeenCalledWith(2, { name: "Ops" });
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({ id: 9 });
    });

    it("sendGroupMessageHandler emits realtime updates", async () => {
        const req = {
            user: { id: 5 },
            params: { groupId: "2" },
            body: { content: "hello" },
        } as any;
        const res = createResponseMock();

        serviceMocks.sendGroupMessage.mockResolvedValue({
            status: 201,
            data: {
                id: 88,
                groupId: 2,
                unreadCounts: [
                    { userId: 5, unreadCount: 0 },
                    { userId: 7, unreadCount: 1 },
                ],
            },
        });

        await sendGroupMessageHandler(req, res as any);

        expect(socketMocks.emitChatMessageToGroup).toHaveBeenCalledWith(2, expect.objectContaining({ id: 88 }));
        expect(socketMocks.emitUnreadCountUpdate).toHaveBeenCalledTimes(2);
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it("markGroupAsReadHandler emits unread reset event", async () => {
        const req = {
            user: { id: 3 },
            params: { groupId: "10" },
        } as any;
        const res = createResponseMock();

        serviceMocks.markGroupAsRead.mockResolvedValue({
            status: 200,
            data: { groupId: 10, unreadCount: 0 },
        });

        await markGroupAsReadHandler(req, res as any);

        expect(serviceMocks.markGroupAsRead).toHaveBeenCalledWith(3, "10");
        expect(socketMocks.emitUnreadCountUpdate).toHaveBeenCalledWith(3, {
            groupId: "10",
            unreadCount: 0,
        });
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it("getUnreadCountsPerGroupHandler returns service payload", async () => {
        const req = { user: { id: 4 } } as any;
        const res = createResponseMock();

        serviceMocks.getUnreadCountsPerGroup.mockResolvedValue({
            status: 200,
            data: [{ groupId: 1, unreadCount: 2 }],
        });

        await getUnreadCountsPerGroupHandler(req, res as any);

        expect(serviceMocks.getUnreadCountsPerGroup).toHaveBeenCalledWith(4);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith([{ groupId: 1, unreadCount: 2 }]);
    });
});
