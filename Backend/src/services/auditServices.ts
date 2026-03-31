import { prisma } from "../config/lib/prisma";

/**
 * Action types for audit logging
 * Used to track different kinds of operations
 */
export enum AuditAction {
  // User Management
  USER_CREATED = "USER_CREATED",
  USER_UPDATED = "USER_UPDATED",
  USER_DELETED = "USER_DELETED",
  USER_ROLE_CHANGED = "USER_ROLE_CHANGED",
  USER_STATUS_CHANGED = "USER_STATUS_CHANGED",

  // Payroll
  PAYROLL_CREATED = "PAYROLL_CREATED",
  PAYROLL_UPDATED = "PAYROLL_UPDATED",
  PAYROLL_DELETED = "PAYROLL_DELETED",

  // Inventory
  INVENTORY_IN = "INVENTORY_IN",
  INVENTORY_OUT = "INVENTORY_OUT",
  INVENTORY_ADJUSTED = "INVENTORY_ADJUSTED",

  // Purchases
  PURCHASE_CREATED = "PURCHASE_CREATED",
  PURCHASE_UPDATED = "PURCHASE_UPDATED",
  PURCHASE_DELETED = "PURCHASE_DELETED",

  // Sales
  SALE_CREATED = "SALE_CREATED",
  SALE_UPDATED = "SALE_UPDATED",
  SALE_DELETED = "SALE_DELETED",

  // Production
  PRODUCTION_RECORD_CREATED = "PRODUCTION_RECORD_CREATED",
  PRODUCTION_RECORD_UPDATED = "PRODUCTION_RECORD_UPDATED",
  PRODUCTION_RECORD_DELETED = "PRODUCTION_RECORD_DELETED",

  // Machine Operations
  MACHINE_STATUS_CHANGED = "MACHINE_STATUS_CHANGED",
  MACHINE_CREATED = "MACHINE_CREATED",
  MACHINE_UPDATED = "MACHINE_UPDATED",
  MACHINE_DELETED = "MACHINE_DELETED",

  // Maintenance
  MAINTENANCE_CREATED = "MAINTENANCE_CREATED",
  MAINTENANCE_UPDATED = "MAINTENANCE_UPDATED",
  MAINTENANCE_DELETED = "MAINTENANCE_DELETED",

  // Quality Checks
  QUALITY_CHECK_CREATED = "QUALITY_CHECK_CREATED",
  QUALITY_CHECK_UPDATED = "QUALITY_CHECK_UPDATED",
  QUALITY_CHECK_DELETED = "QUALITY_CHECK_DELETED",

  // Attendance
  ATTENDANCE_CHECKED_IN = "ATTENDANCE_CHECKED_IN",
  ATTENDANCE_CHECKED_OUT = "ATTENDANCE_CHECKED_OUT",
  ATTENDANCE_UPDATED = "ATTENDANCE_UPDATED",

  // Settings
  SYSTEM_SETTINGS_UPDATED = "SYSTEM_SETTINGS_UPDATED",
  PRODUCTION_SETTINGS_UPDATED = "PRODUCTION_SETTINGS_UPDATED",

  // Chat/Communication
  CHAT_GROUP_CREATED = "CHAT_GROUP_CREATED",
  CHAT_GROUP_DELETED = "CHAT_GROUP_DELETED",
  CHAT_MEMBER_ADDED = "CHAT_MEMBER_ADDED",
  CHAT_MEMBER_REMOVED = "CHAT_MEMBER_REMOVED",

  // Authentication
  LOGIN = "LOGIN",
  LOGOUT = "LOGOUT",
  PASSWORD_CHANGED = "PASSWORD_CHANGED",
}

/**
 * Entity types for audit logging
 */
export enum AuditEntityType {
  USER = "User",
  PAYROLL = "Payroll",
  INVENTORY_TRANSACTION = "InventoryTransaction",
  PURCHASE = "Purchase",
  SALE = "Sale",
  PRODUCTION_RECORD = "ProductionRecord",
  MACHINE = "Machine",
  MAINTENANCE = "Maintenance",
  QUALITY_CHECK = "QualityCheck",
  ATTENDANCE = "Attendance",
  SYSTEM_SETTING = "SystemSetting",
  PRODUCTION_SETTING = "ProductionSetting",
  CHAT_GROUP = "ChatGroup",
  NOTIFICATION = "Notification",
}

interface AuditLogPayload {
  userId?: number | null;
  action: AuditAction | string;
  entityType: AuditEntityType | string;
  entityId?: number | null;
  changes?: Record<string, any> | null;
}

interface AuditQueryOptions {
  userId?: number;
  entityType?: AuditEntityType | string;
  entityId?: number;
  action?: AuditAction | string;
  limit?: number;
  offset?: number;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Log an audit entry for a sensitive operation
 */
async function logAudit(payload: AuditLogPayload) {
  try {
    const audit = await prisma.auditLog.create({
      data: {
        userId: payload.userId,
        action: payload.action,
        entityType: payload.entityType,
        entityId: payload.entityId,
        changes: payload.changes ? JSON.stringify(payload.changes) : null,
      },
    });

    return audit;
  } catch (error) {
    console.error("Error logging audit entry:", error);
    throw new Error("Failed to create audit log entry");
  }
}

/**
 * Get audit logs with optional filters
 */
async function getAuditLogs(options: AuditQueryOptions = {}) {
  try {
    const where: any = {};

    if (options.userId) {
      where.userId = options.userId;
    }

    if (options.entityType) {
      where.entityType = options.entityType;
    }

    if (options.entityId) {
      where.entityId = options.entityId;
    }

    if (options.action) {
      where.action = options.action;
    }

    if (options.startDate || options.endDate) {
      where.createdAt = {};
      if (options.startDate) {
        where.createdAt.gte = options.startDate;
      }
      if (options.endDate) {
        where.createdAt.lte = options.endDate;
      }
    }

    const limit = Math.min(options.limit || 50, 100);
    const offset = options.offset || 0;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              username: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    };
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    throw new Error("Failed to fetch audit logs");
  }
}

/**
 * Get audit history for a specific entity
 */
async function getEntityAuditHistory(
  entityType: AuditEntityType | string,
  entityId: number,
  limit = 20
) {
  try {
    const history = await prisma.auditLog.findMany({
      where: {
        entityType,
        entityId,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            username: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return history;
  } catch (error) {
    console.error("Error fetching entity audit history:", error);
    throw new Error("Failed to fetch entity audit history");
  }
}

/**
 * Get audit history for a specific user's actions
 */
async function getUserAuditHistory(userId: number, limit = 50) {
  try {
    const history = await prisma.auditLog.findMany({
      where: {
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return history;
  } catch (error) {
    console.error("Error fetching user audit history:", error);
    throw new Error("Failed to fetch user audit history");
  }
}

/**
 * Helper function to compare objects and return changes
 */
function getChanges(
  before: Record<string, any>,
  after: Record<string, any>
): Record<string, any> | null {
  const changes: Record<string, any> = {};

  // Check for modified or new fields
  for (const key in after) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      changes[key] = {
        before: before[key],
        after: after[key],
      };
    }
  }

  // Check for deleted fields
  for (const key in before) {
    if (!(key in after)) {
      changes[key] = {
        before: before[key],
        after: null,
      };
    }
  }

  return Object.keys(changes).length > 0 ? changes : null;
}

/**
 * Clean up old audit logs (older than specified days)
 * Useful for maintenance and data retention policies
 */
async function cleanupOldAuditLogs(daysToKeep = 90): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    return result.count;
  } catch (error) {
    console.error("Error cleaning up old audit logs:", error);
    throw new Error("Failed to cleanup audit logs");
  }
}

/**
 * Get summary statistics for audit logs
 */
async function getAuditSummary(days = 7) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [
      totalLogs,
      actionCounts,
      topUsers,
      entityTypeCounts,
    ] = await Promise.all([
      prisma.auditLog.count({
        where: {
          createdAt: { gte: startDate },
        },
      }),
      prisma.auditLog.groupBy({
        by: ["action"],
        where: {
          createdAt: { gte: startDate },
        },
        _count: true,
      }),
      prisma.auditLog.groupBy({
        by: ["userId"],
        where: {
          createdAt: { gte: startDate },
          userId: { not: null },
        },
        orderBy: { _count: { action: "desc" } },
        take: 5,
        _count: true,
      }),
      prisma.auditLog.groupBy({
        by: ["entityType"],
        where: {
          createdAt: { gte: startDate },
        },
        _count: true,
      }),
    ]);

    return {
      totalLogs,
      actionCounts,
      topUsers,
      entityTypeCounts,
      period: `${days} days`,
    };
  } catch (error) {
    console.error("Error getting audit summary:", error);
    throw new Error("Failed to get audit summary");
  }
}

export const auditServices = {
  logAudit,
  getAuditLogs,
  getEntityAuditHistory,
  getUserAuditHistory,
  getChanges,
  cleanupOldAuditLogs,
  getAuditSummary,
  AuditAction,
  AuditEntityType,
};
