import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import {
  auditServices,
  AuditEntityType,
  AuditAction,
} from "../services/auditServices";

/**
 * Get all audit logs with pagination and filtering
 */
async function getAuditLogsHandler(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user?.id) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // Only ADMIN can view audit logs
    if (req.user.role !== "ADMIN") {
      res.status(403).json({ error: "Forbidden - Admin access required" });
      return;
    }

    const {
      userId,
      entityType,
      entityId,
      action,
      limit = 50,
      offset = 0,
      startDate,
      endDate,
    } = req.query;

    const result = await auditServices.getAuditLogs({
      userId: userId ? parseInt(userId as string) : undefined,
      entityType: entityType as any,
      entityId: entityId ? parseInt(entityId as string) : undefined,
      action: action as string,
      limit: Math.min(parseInt(limit as string) || 50, 100),
      offset: parseInt(offset as string) || 0,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
}

/**
 * Get audit history for a specific entity
 */
async function getEntityAuditHistoryHandler(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user?.id) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // Only ADMIN can view audit logs
    if (req.user.role !== "ADMIN") {
      res.status(403).json({ error: "Forbidden - Admin access required" });
      return;
    }

    const { entityType, entityId } = req.params;
    const { limit = 20 } = req.query;

    if (!entityType || !entityId) {
      res.status(400).json({ error: "Missing entityType or entityId" });
      return;
    }

    const history = await auditServices.getEntityAuditHistory(
      entityType as string,
      parseInt(entityId as string),
      Math.min(parseInt(limit as string) || 20, 100)
    );

    res.status(200).json({ history });
  } catch (error) {
    console.error("Error fetching entity audit history:", error);
    res.status(500).json({ error: "Failed to fetch entity audit history" });
  }
}

/**
 * Get audit history for a specific user
 */
async function getUserAuditHistoryHandler(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user?.id) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // Only ADMIN can view other users' audit history, users can view their own
    const targetUserId = parseInt(req.params.userId as string);
    if (req.user.role !== "ADMIN" && req.user.id !== targetUserId) {
      res.status(403).json({ error: "Forbidden - Cannot view other users' audit history" });
      return;
    }

    const { limit = 50 } = req.query;

    const history = await auditServices.getUserAuditHistory(
      targetUserId,
      Math.min(parseInt(limit as string) || 50, 100)
    );

    res.status(200).json({ history });
  } catch (error) {
    console.error("Error fetching user audit history:", error);
    res.status(500).json({ error: "Failed to fetch user audit history" });
  }
}

/**
 * Get audit summary and statistics
 */
async function getAuditSummaryHandler(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user?.id) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // Only ADMIN can view audit summary
    if (req.user.role !== "ADMIN") {
      res.status(403).json({ error: "Forbidden - Admin access required" });
      return;
    }

    const { days = 7 } = req.query;

    const summary = await auditServices.getAuditSummary(
      Math.min(parseInt(days as string) || 7, 90)
    );

    res.status(200).json(summary);
  } catch (error) {
    console.error("Error fetching audit summary:", error);
    res.status(500).json({ error: "Failed to fetch audit summary" });
  }
}

/**
 * Clean up old audit logs (ADMIN only, typically for maintenance tasks)
 */
async function cleanupAuditLogsHandler(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user?.id) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // Only ADMIN can clean up audit logs
    if (req.user.role !== "ADMIN") {
      res.status(403).json({ error: "Forbidden - Admin access required" });
      return;
    }

    const { daysToKeep = 90 } = req.body;

    if (!Number.isInteger(daysToKeep) || daysToKeep < 1) {
      res.status(400).json({ error: "daysToKeep must be a positive integer" });
      return;
    }

    const deletedCount = await auditServices.cleanupOldAuditLogs(daysToKeep);

    res.status(200).json({
      message: `Deleted ${deletedCount} old audit logs (older than ${daysToKeep} days)`,
      deletedCount,
    });
  } catch (error) {
    console.error("Error cleaning up audit logs:", error);
    res.status(500).json({ error: "Failed to cleanup audit logs" });
  }
}

export const auditController = {
  getAuditLogsHandler,
  getEntityAuditHistoryHandler,
  getUserAuditHistoryHandler,
  getAuditSummaryHandler,
  cleanupAuditLogsHandler,
};
