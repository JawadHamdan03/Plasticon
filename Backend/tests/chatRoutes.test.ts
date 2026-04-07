import express, { NextFunction, Request, Response } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { controllerMocks } = vi.hoisted(() => ({
  controllerMocks: {
    createChatGroupHandler: vi.fn((_: Request, res: Response) =>
      res.status(201).json({ route: "create-group" }),
    ),
    getMyChatGroupsHandler: vi.fn((_: Request, res: Response) =>
      res.status(200).json({ route: "get-groups" }),
    ),
    getUnreadCountsPerGroupHandler: vi.fn((_: Request, res: Response) =>
      res.status(200).json({ route: "unread-counts" }),
    ),
    getChatMembersByShiftHandler: vi.fn((_: Request, res: Response) =>
      res.status(200).json({ route: "members-by-shift" }),
    ),
    getChatGroupByIdHandler: vi.fn((req: Request, res: Response) =>
      res.status(200).json({ route: "get-group", groupId: req.params.groupId }),
    ),
    addGroupMemberHandler: vi.fn((req: Request, res: Response) =>
      res
        .status(201)
        .json({ route: "add-member", groupId: req.params.groupId }),
    ),
    getAdminChatTargetsHandler: vi.fn((_: Request, res: Response) =>
      res.status(200).json({ route: "admin-targets" }),
    ),
    removeGroupMemberHandler: vi.fn((req: Request, res: Response) =>
      res
        .status(200)
        .json({ route: "remove-member", userId: req.params.userId }),
    ),
    sendGroupMessageHandler: vi.fn((req: Request, res: Response) =>
      res
        .status(201)
        .json({ route: "send-message", content: req.body.content }),
    ),
    sendDirectMessageHandler: vi.fn((req: Request, res: Response) =>
      res
        .status(201)
        .json({ route: "direct-message", content: req.body.content }),
    ),
    sendAdminMessageHandler: vi.fn((req: Request, res: Response) =>
      res
        .status(201)
        .json({ route: "admin-message", content: req.body.content }),
    ),
    getGroupMessagesHandler: vi.fn((req: Request, res: Response) =>
      res
        .status(200)
        .json({ route: "get-messages", limit: req.query.limit ?? null }),
    ),
    markGroupAsReadHandler: vi.fn((req: Request, res: Response) =>
      res
        .status(200)
        .json({ route: "mark-as-read", groupId: req.params.groupId }),
    ),
  },
}));

vi.mock("../src/middleware/authMiddleware", () => ({
  authorizeRoles: () => {
    return (req: Request, _res: Response, next: NextFunction) => {
      (req as Request & { user?: { id: number; role: string } }).user = {
        id: 1,
        role: "ADMIN",
      };
      next();
    };
  },
}));

vi.mock("../src/controllers/chatController", () => controllerMocks);

import chatRoutes from "../src/routes/chatRoutes";

describe("chatRoutes endpoints", () => {
  const app = express();
  app.use(express.json());
  app.use("/chat", chatRoutes);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("POST /chat/groups", async () => {
    const res = await request(app).post("/chat/groups").send({ name: "Ops" });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ route: "create-group" });
    expect(controllerMocks.createChatGroupHandler).toHaveBeenCalled();
  });

  it("GET /chat/groups", async () => {
    const res = await request(app).get("/chat/groups");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ route: "get-groups" });
    expect(controllerMocks.getMyChatGroupsHandler).toHaveBeenCalled();
  });

  it("GET /chat/groups/unread-counts", async () => {
    const res = await request(app).get("/chat/groups/unread-counts");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ route: "unread-counts" });
    expect(controllerMocks.getUnreadCountsPerGroupHandler).toHaveBeenCalled();
    expect(controllerMocks.getChatGroupByIdHandler).not.toHaveBeenCalled();
  });

  it("GET /chat/groups/:groupId", async () => {
    const res = await request(app).get("/chat/groups/12");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ route: "get-group", groupId: "12" });
    expect(controllerMocks.getChatGroupByIdHandler).toHaveBeenCalled();
  });

  it("POST /chat/groups/:groupId/members", async () => {
    const res = await request(app)
      .post("/chat/groups/4/members")
      .send({ userId: 11 });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ route: "add-member", groupId: "4" });
    expect(controllerMocks.addGroupMemberHandler).toHaveBeenCalled();
  });

  it("DELETE /chat/groups/:groupId/members/:userId", async () => {
    const res = await request(app).delete("/chat/groups/4/members/11");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ route: "remove-member", userId: "11" });
    expect(controllerMocks.removeGroupMemberHandler).toHaveBeenCalled();
  });

  it("POST /chat/groups/:groupId/messages", async () => {
    const res = await request(app)
      .post("/chat/groups/8/messages")
      .send({ content: "hello from test" });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      route: "send-message",
      content: "hello from test",
    });
    expect(controllerMocks.sendGroupMessageHandler).toHaveBeenCalled();
  });

  it("GET /chat/groups/:groupId/messages", async () => {
    const res = await request(app).get("/chat/groups/8/messages?limit=10");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ route: "get-messages", limit: "10" });
    expect(controllerMocks.getGroupMessagesHandler).toHaveBeenCalled();
  });

  it("PATCH /chat/groups/:groupId/mark-as-read", async () => {
    const res = await request(app)
      .patch("/chat/groups/8/mark-as-read")
      .send({});

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ route: "mark-as-read", groupId: "8" });
    expect(controllerMocks.markGroupAsReadHandler).toHaveBeenCalled();
  });
});
