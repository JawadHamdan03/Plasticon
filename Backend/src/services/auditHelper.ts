import { auditServices, AuditAction, AuditEntityType } from "../services/auditServices";

/**
 * Helper function to wrap service operations with automatic audit logging
 * Usage: await auditWrapper(userId, AuditAction.USER_CREATED, AuditEntityType.USER, serviceFunction, entityId, changes)
 */
export async function auditWrapper<T>(
  userId: number | undefined,
  action: AuditAction | string,
  entityType: AuditEntityType | string,
  serviceFunction: () => Promise<T>,
  entityId?: number,
  changes?: Record<string, any> | null
): Promise<T> {
  try {
    // Execute the service function
    const result = await serviceFunction();

    // Log the audit entry
    await auditServices.logAudit({
      userId,
      action,
      entityType,
      entityId,
      changes,
    });

    return result;
  } catch (error) {
    // Still log the audit entry even if operation fails
    await auditServices.logAudit({
      userId,
      action: `${action}_FAILED`,
      entityType,
      entityId,
      changes: {
        ...changes,
        error: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }
}

/**
 * Async audit logging without waiting for completion
 * Use this for non-critical operations where logging delay is acceptable
 */
export function auditAsync(
  userId: number | undefined,
  action: AuditAction | string,
  entityType: AuditEntityType | string,
  entityId?: number,
  changes?: Record<string, any> | null
): void {
  // Fire and forget - don't await
  auditServices.logAudit({
    userId: userId || null,
    action,
    entityType,
    entityId,
    changes,
  }).catch((error) => {
    console.error("Failed to log audit (async):", error);
  });
}

/**
 * Compare two objects and extract differences
 * Useful for tracking what changed in an update operation
 */
export function getChangedFields(before: any, after: any): Record<string, any> | null {
  return auditServices.getChanges(before, after);
}

export default {
  auditWrapper,
  auditAsync,
  getChangedFields,
};
