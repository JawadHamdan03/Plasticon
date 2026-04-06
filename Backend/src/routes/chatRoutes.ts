import { Router } from "express";
import { UserRole } from "../config/generated/prisma/client";
import {
  addGroupMemberHandler,
  createChatGroupHandler,
  getAdminChatTargetsHandler,
  getChatMembersByShiftHandler,
  getChatGroupByIdHandler,
  getGroupMessagesHandler,
  getMyChatGroupsHandler,
  getUnreadCountsPerGroupHandler,
  markGroupAsReadHandler,
  removeGroupMemberHandler,
  sendAdminMessageHandler,
  sendDirectMessageHandler,
  sendGroupMessageHandler,
} from "../controllers/chatController";
import { authorizeRoles } from "../middleware/authMiddleware";

const router = Router();

const allChatRoles = [
  UserRole.WORKER,
  UserRole.ENGINEER,
  UserRole.ACCOUNTANT,
  UserRole.ADMIN,
];

router.post("/groups", authorizeRoles(allChatRoles), createChatGroupHandler);
router.get("/groups", authorizeRoles(allChatRoles), getMyChatGroupsHandler);
router.get(
  "/members-by-shift",
  authorizeRoles(allChatRoles),
  getChatMembersByShiftHandler,
);
router.get(
  "/groups/unread-counts",
  authorizeRoles(allChatRoles),
  getUnreadCountsPerGroupHandler,
);
router.get(
  "/groups/:groupId",
  authorizeRoles(allChatRoles),
  getChatGroupByIdHandler,
);
router.post(
  "/direct",
  authorizeRoles([UserRole.ADMIN]),
  sendDirectMessageHandler,
);
router.get(
  "/admin/targets",
  authorizeRoles([UserRole.ADMIN]),
  getAdminChatTargetsHandler,
);
router.post(
  "/admin/send",
  authorizeRoles([UserRole.ADMIN]),
  sendAdminMessageHandler,
);

router.post(
  "/groups/:groupId/members",
  authorizeRoles(allChatRoles),
  addGroupMemberHandler,
);
router.delete(
  "/groups/:groupId/members/:userId",
  authorizeRoles(allChatRoles),
  removeGroupMemberHandler,
);

router.post(
  "/groups/:groupId/messages",
  authorizeRoles(allChatRoles),
  sendGroupMessageHandler,
);
router.get(
  "/groups/:groupId/messages",
  authorizeRoles(allChatRoles),
  getGroupMessagesHandler,
);
router.patch(
  "/groups/:groupId/mark-as-read",
  authorizeRoles(allChatRoles),
  markGroupAsReadHandler,
);

export default router;
