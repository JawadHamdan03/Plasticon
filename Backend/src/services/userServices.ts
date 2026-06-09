import { prisma } from "../config/lib/prisma";
import { UserRole } from "../config/generated/prisma/client";
import { auditAsync, getChangedFields } from "./auditHelper";
import { AuditAction, AuditEntityType } from "./auditServices";

type ServiceResult<T> = {
  status: number;
  message?: string;
  data?: T;
};

const USER_SAFE_SELECT = {
  id: true, fullName: true, username: true, email: true, phone: true,
  nationalId: true, role: true, isActive: true, deletedAt: true,
  shiftId: true, createdAt: true, updatedAt: true,
} as const;

export const getUsers = async (role?: string): Promise<ServiceResult<unknown>> => {
  const users = await prisma.user.findMany({
    where:   role ? { role: role as UserRole, deletedAt: null } : { deletedAt: null },
    select:  { ...USER_SAFE_SELECT, shift: { select: { id: true, name: true } } },
    orderBy: { id: "asc" },
  });
  return { status: 200, data: users };
};

export const getUserById = async (
  id: number,
): Promise<ServiceResult<unknown>> => {
  const user = await prisma.user.findFirst({
    where: { id },
    select: USER_SAFE_SELECT,
  });
  if (!user) {
    return { status: 404, message: "there is no user with this id" };
  }
  return { status: 200, data: user };
};

export const deleteUser = async (
  id: number,
  deletedByUserId?: number,
): Promise<ServiceResult<{ message: string }>> => {
  const user = await prisma.user.findFirst({ where: { id: id } });
  if (!user) {
    return { status: 404, message: "user with this id were not found" };
  }

  // Perform soft delete using the new deletedAt field
  await prisma.user.update({
    where: { id: id },
    data: { deletedAt: new Date() },
  });

  // Log the deletion
  auditAsync(
    deletedByUserId,
    AuditAction.USER_DELETED,
    AuditEntityType.USER,
    id,
    { fullName: user.fullName, username: user.username },
  );

  return { status: 200, data: { message: "Deleted successfully" } };
};

/**
 * Update user details with audit logging
 */
export const updateUser = async (
  id: number,
  updateData: any,
  updatedByUserId?: number,
): Promise<ServiceResult<unknown>> => {
  const user = await prisma.user.findFirst({ where: { id: id } });
  if (!user) {
    return { status: 404, message: "user with this id were not found" };
  }

  // Get changed fields
  const changes = getChangedFields(user, { ...user, ...updateData });

  // Update user
  const updatedUser = await prisma.user.update({
    where: { id: id },
    data: updateData,
  });

  // Log the update
  auditAsync(
    updatedByUserId,
    AuditAction.USER_UPDATED,
    AuditEntityType.USER,
    id,
    changes,
  );

  return { status: 200, data: updatedUser };
};

/**
 * Update user role with audit logging
 */
export const updateUserRole = async (
  id: number,
  newRole: string,
  updatedByUserId?: number,
): Promise<ServiceResult<unknown>> => {
  const user = await prisma.user.findFirst({ where: { id: id } });
  if (!user) {
    return { status: 404, message: "user with this id were not found" };
  }

  if (!Object.values(UserRole).includes(newRole as UserRole)) {
    return { status: 400, message: "Invalid role" };
  }

  const oldRole = user.role;

  const updatedUser = await prisma.user.update({
    where: { id: id },
    data: { role: newRole as any },
  });

  // Log role change as a special audit action
  auditAsync(
    updatedByUserId,
    AuditAction.USER_ROLE_CHANGED,
    AuditEntityType.USER,
    id,
    { oldRole, newRole },
  );

  return { status: 200, data: updatedUser };
};
