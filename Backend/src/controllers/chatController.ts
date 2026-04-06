import { Response } from "express";
import {
  emitChatMessageToGroup,
  emitUnreadCountUpdate,
} from "../config/socket";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import {
  addGroupMember,
  createChatGroup,
  getAdminChatTargets,
  getChatMembersByShift,
  getChatGroupById,
  getGroupMessages,
  getMyChatGroups,
  getUnreadCountsPerGroup,
  markGroupAsRead,
  removeGroupMember,
  sendAdminMessage,
  sendDirectMessage,
  sendGroupMessage,
} from "../services/chatServices";

export const createChatGroupHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    const result = await createChatGroup(userId, req.body ?? {});

    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }

    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Create chat group error:", error);
    res.status(500).json({ message: "Failed to create chat group" });
  }
};

export const getMyChatGroupsHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    const result = await getMyChatGroups(userId);
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Get my chat groups error:", error);
    res.status(500).json({ message: "Failed to fetch chat groups" });
  }
};

export const getChatGroupByIdHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    const result = await getChatGroupById(userId, req.params.groupId);

    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }

    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Get chat group error:", error);
    res.status(500).json({ message: "Failed to fetch chat group" });
  }
};

export const addGroupMemberHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    const result = await addGroupMember(
      userId,
      req.params.groupId,
      req.body ?? {},
    );

    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }

    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Add group member error:", error);
    res.status(500).json({ message: "Failed to add member" });
  }
};

export const removeGroupMemberHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    const result = await removeGroupMember(
      userId,
      req.params.groupId,
      req.params.userId,
    );

    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }

    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Remove group member error:", error);
    res.status(500).json({ message: "Failed to remove member" });
  }
};

export const sendGroupMessageHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    const result = await sendGroupMessage(
      userId,
      req.params.groupId,
      req.body ?? {},
    );

    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }

    const data = result.data as
      | {
          groupId?: number;
          unreadCounts?: Array<{ userId: number; unreadCount: number }>;
        }
      | undefined;

    if (typeof data?.groupId === "number") {
      emitChatMessageToGroup(data.groupId, result.data);
    }

    if (Array.isArray(data?.unreadCounts)) {
      data.unreadCounts.forEach((item) => {
        emitUnreadCountUpdate(item.userId, {
          groupId: data.groupId,
          unreadCount: item.unreadCount,
        });
      });
    }

    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Send group message error:", error);
    res.status(500).json({ message: "Failed to send message" });
  }
};

export const getGroupMessagesHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    const result = await getGroupMessages(userId, req.params.groupId, {
      limit: req.query.limit,
      cursor: req.query.cursor,
    });

    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }

    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Get group messages error:", error);
    res.status(500).json({ message: "Failed to fetch messages" });
  }
};

export const markGroupAsReadHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    const result = await markGroupAsRead(userId, req.params.groupId);

    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }

    emitUnreadCountUpdate(userId, {
      groupId: req.params.groupId,
      unreadCount: 0,
    });

    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Mark group as read error:", error);
    res.status(500).json({ message: "Failed to mark group as read" });
  }
};

export const getUnreadCountsPerGroupHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    const result = await getUnreadCountsPerGroup(userId);
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Get unread counts error:", error);
    res.status(500).json({ message: "Failed to fetch unread counts" });
  }
};

export const getChatMembersByShiftHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    const result = await getChatMembersByShift(userId, {
      search: req.query.search,
    });

    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Get chat members by shift error:", error);
    res.status(500).json({ message: "Failed to fetch chat members" });
  }
};

export const sendDirectMessageHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    const result = await sendDirectMessage(userId, req.body ?? {});

    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }

    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Send direct message error:", error);
    res.status(500).json({ message: "Failed to send direct message" });
  }
};

export const getAdminChatTargetsHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    const result = await getAdminChatTargets(userId);
    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }

    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Get admin chat targets error:", error);
    res.status(500).json({ message: "Failed to fetch admin chat targets" });
  }
};

export const sendAdminMessageHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    const result = await sendAdminMessage(userId, req.body ?? {});
    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }

    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Send admin message error:", error);
    res.status(500).json({ message: "Failed to send admin message" });
  }
};
