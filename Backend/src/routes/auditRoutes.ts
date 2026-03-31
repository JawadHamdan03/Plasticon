import { Router } from "express";
import { authorizeRoles } from "../middleware/authMiddleware";
import { auditController } from "../controllers/auditController";

const auditRouter = Router();

/**
 * GET /audit/logs
 * Get all audit logs with pagination and filtering
 * Query params: userId, entityType, entityId, action, limit, offset, startDate, endDate
 * Access: ADMIN only
 */
auditRouter.get(
  "/logs",
  authorizeRoles(["ADMIN"]),
  auditController.getAuditLogsHandler
);

/**
 * GET /audit/summary
 * Get audit statistics and summary
 * Query params: days (default: 7, max: 90)
 * Access: ADMIN only
 */
auditRouter.get(
  "/summary",
  authorizeRoles(["ADMIN"]),
  auditController.getAuditSummaryHandler
);

/**
 * GET /audit/entity/:entityType/:entityId
 * Get audit history for a specific entity
 * Params: entityType, entityId
 * Query params: limit (default: 20, max: 100)
 * Access: ADMIN only
 */
auditRouter.get(
  "/entity/:entityType/:entityId",
  authorizeRoles(["ADMIN"]),
  auditController.getEntityAuditHistoryHandler
);

/**
 * GET /audit/user/:userId
 * Get audit history for a specific user's actions
 * Params: userId
 * Query params: limit (default: 50, max: 100)
 * Access: ADMIN or the user themselves
 */
auditRouter.get(
  "/user/:userId",
  auditController.getUserAuditHistoryHandler
);

/**
 * POST /audit/cleanup
 * Clean up old audit logs (maintenance operation)
 * Body: { daysToKeep: number (default: 90) }
 * Access: ADMIN only
 */
auditRouter.post(
  "/cleanup",
  authorizeRoles(["ADMIN"]),
  auditController.cleanupAuditLogsHandler
);

export default auditRouter;
