import { prisma } from "../config/lib/prisma";
import {
  NotificationType,
  UserRole,
} from "../config/generated/prisma/client";
import { emitNotificationUnreadCountUpdate } from "../config/socket";
import { auditAsync } from "./auditHelper";
import { AuditAction, AuditEntityType } from "./auditServices";

type ServiceResult<T> = {
  status: number;
  message?: string;
  data?: T;
};

const VALID_ISSUE_TYPES = ["DIMENSIONAL", "SURFACE_DEFECT", "MATERIAL_FAULT", "WEIGHT_ISSUE", "COLOR_ISSUE", "OTHER"] as const;
const VALID_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

type CreateQualityCheckPayload = {
  machineId?: number;
  shiftId?: number;
  issueType?: string;
  severity?: string;
  description?: string;
};

export const createQualityCheck = async (
  engineerId: number,
  payload: CreateQualityCheckPayload,
): Promise<ServiceResult<unknown>> => {
  const machineId = Number(payload.machineId);

  if (!Number.isInteger(machineId) || machineId <= 0) {
    return { status: 400, message: "machineId is required and must be a positive integer" };
  }

  const issueType = (payload.issueType ?? "OTHER").trim().toUpperCase();
  if (!VALID_ISSUE_TYPES.includes(issueType as typeof VALID_ISSUE_TYPES[number])) {
    return { status: 400, message: `issueType must be one of: ${VALID_ISSUE_TYPES.join(", ")}` };
  }

  const severity = (payload.severity ?? "MEDIUM").trim().toUpperCase();
  if (!VALID_SEVERITIES.includes(severity as typeof VALID_SEVERITIES[number])) {
    return { status: 400, message: `severity must be one of: ${VALID_SEVERITIES.join(", ")}` };
  }

  const description = payload.description?.trim() || null;

  const user = await prisma.user.findUnique({ where: { id: engineerId }, select: { id: true, shiftId: true } });
  if (!user) return { status: 404, message: "User not found" };

  const machine = await prisma.machine.findUnique({ where: { id: machineId }, select: { id: true, name: true, type: true } });
  if (!machine) return { status: 404, message: "Machine not found" };

  const resolvedShiftId = payload.shiftId ?? user.shiftId;
  if (!resolvedShiftId) {
    return { status: 400, message: "shiftId is required when user has no assigned shift" };
  }

  const shift = await prisma.shift.findUnique({ where: { id: Number(resolvedShiftId) } });
  if (!shift) return { status: 404, message: "Shift not found" };

  const qualityCheck = await prisma.qualityCheck.create({
    data: {
      machineId: machine.id,
      engineerId,
      shiftId: Number(resolvedShiftId),
      issueType,
      severity,
      description,
    },
    include: {
      machine: { select: { id: true, name: true, type: true } },
      shift: true,
    },
  });

  auditAsync(engineerId, AuditAction.QUALITY_CHECK_CREATED, AuditEntityType.QUALITY_CHECK, qualityCheck.id, {
    machineId: machine.id,
    machineName: machine.name,
    issueType,
    severity,
  });

  if (severity === "HIGH" || severity === "CRITICAL") {
    const adminUsers = await prisma.user.findMany({ where: { role: UserRole.ADMIN }, select: { id: true } });
    if (adminUsers.length > 0) {
      await prisma.notification.createMany({
        data: adminUsers.map((admin) => ({
          userId: admin.id,
          title: "Quality issue detected",
          message: `A ${severity.toLowerCase()} severity ${issueType.toLowerCase().replace(/_/g, " ")} issue was recorded on ${machine.name}.`,
          type: NotificationType.QUALITY_ISSUE,
          machineId: machine.id,
        })),
      });
      adminUsers.forEach((admin) => { emitNotificationUnreadCountUpdate(admin.id, { refresh: true }); });
    }
  }

  return { status: 201, data: qualityCheck };
};

export const getMyQualityChecks = async (
  engineerId: number,
): Promise<ServiceResult<unknown>> => {
  const records = await prisma.qualityCheck.findMany({
    where: { engineerId },
    include: {
      machine: { select: { id: true, name: true, type: true } },
      shift: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return { status: 200, data: records };
};

export const getAllQualityChecks = async (): Promise<
  ServiceResult<unknown>
> => {
  const records = await prisma.qualityCheck.findMany({
    include: {
      engineer: {
        select: {
          id: true,
          fullName: true,
          username: true,
          role: true,
        },
      },
      machine: { select: { id: true, name: true, type: true } },
      shift: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return { status: 200, data: records };
};

export const resolveQualityCheck = async (
  engineerId: number,
  id: number,
): Promise<ServiceResult<unknown>> => {
  const check = await prisma.qualityCheck.findUnique({ where: { id } });
  if (!check) return { status: 404, message: "Quality check not found" };
  if (check.engineerId !== engineerId) return { status: 403, message: "Not authorized" };
  if (check.resolvedAt) return { status: 400, message: "Already resolved" };

  const updated = await prisma.qualityCheck.update({
    where: { id },
    data: { resolvedAt: new Date() },
    include: { machine: { select: { id: true, name: true } }, engineer: { select: { id: true, fullName: true } } },
  });

  auditAsync(engineerId, AuditAction.QUALITY_CHECK_UPDATED, AuditEntityType.QUALITY_CHECK, id, { action: "resolved" });

  return { status: 200, data: updated };
};

export const deleteQualityCheck = async (
  callerId: number,
  id: number,
  callerRole?: string,
): Promise<ServiceResult<unknown>> => {
  const check = await prisma.qualityCheck.findUnique({ where: { id } });
  if (!check) return { status: 404, message: "Quality check not found" };
  const isAdmin = callerRole === UserRole.ADMIN;
  if (!isAdmin && check.engineerId !== callerId) return { status: 403, message: "Not authorized" };

  await prisma.qualityCheck.delete({ where: { id } });
  auditAsync(callerId, AuditAction.QUALITY_CHECK_DELETED, AuditEntityType.QUALITY_CHECK, id, {});

  return { status: 200, message: "Deleted" };
};
