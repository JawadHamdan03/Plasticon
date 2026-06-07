import { prisma } from "../config/lib/prisma";
import {
  emitNotificationToUser,
  emitNotificationUnreadCountUpdate,
} from "../config/socket";
import { sendPushToUsers } from "./pushService";

type ServiceResult<T> = {
  status: number;
  message?: string;
  data?: T;
};

const userSelect = { id: true, fullName: true, username: true };

const pushNotifications = async (userIds: number[], title: string, message: string) => {
  if (userIds.length === 0) return;
  const notes = await prisma.$transaction(
    userIds.map(userId =>
      prisma.notification.create({ data: { userId, title, message, type: "SYSTEM_MESSAGE" } }),
    ),
  );
  notes.forEach(n => {
    emitNotificationToUser(n.userId, n);
    emitNotificationUnreadCountUpdate(n.userId, { refresh: true });
  });

  sendPushToUsers(userIds, title, message).catch(() => undefined);
};
const machineSelect = { id: true, name: true, type: true };
const pricedBySelect = { id: true, fullName: true };

export const getAllSparePartRequests = async (): Promise<ServiceResult<unknown>> => {
  try {
    const requests = await prisma.sparePartRequest.findMany({
      include: {
        engineer: { select: userSelect },
        machine: { select: machineSelect },
        pricedBy: { select: pricedBySelect },
      },
      orderBy: { createdAt: "desc" },
    });
    return { status: 200, data: requests };
  } catch (error) {
    console.error("Get all spare part requests error:", error);
    return { status: 500, message: "Failed to fetch spare part requests" };
  }
};

export const getMySparePartRequests = async (
  engineerId: number,
): Promise<ServiceResult<unknown>> => {
  try {
    const requests = await prisma.sparePartRequest.findMany({
      where: { engineerId },
      include: {
        engineer: { select: userSelect },
        machine: { select: machineSelect },
        pricedBy: { select: pricedBySelect },
      },
      orderBy: { createdAt: "desc" },
    });
    return { status: 200, data: requests };
  } catch (error) {
    console.error("Get my spare part requests error:", error);
    return { status: 500, message: "Failed to fetch spare part requests" };
  }
};

export const createSparePartRequest = async (
  engineerId: number,
  partName: string,
  machineId: number,
  quantity: number,
  imagePath?: string,
  notes?: string,
  supplierName?: string,
  supplierCountry?: string,
): Promise<ServiceResult<unknown>> => {
  try {
    if (!partName || !partName.trim()) {
      return { status: 400, message: "partName is required" };
    }

    if (!machineId || !Number.isInteger(machineId) || machineId <= 0) {
      return { status: 400, message: "Valid machineId is required" };
    }

    if (!quantity || !Number.isInteger(quantity) || quantity <= 0) {
      return { status: 400, message: "quantity must be a positive integer" };
    }

    const machine = await prisma.machine.findUnique({
      where: { id: machineId },
      select: { id: true },
    });

    if (!machine) {
      return { status: 404, message: "Machine not found" };
    }

    const request = await prisma.sparePartRequest.create({
      data: {
        engineerId,
        machineId,
        partName: partName.trim(),
        quantity,
        imagePath: imagePath ?? null,
        notes: notes?.trim() ?? null,
        supplierName: supplierName?.trim() ?? null,
        supplierCountry: supplierCountry?.trim() ?? null,
        status: "PENDING",
      },
      include: {
        engineer: { select: userSelect },
        machine: { select: machineSelect },
        pricedBy: { select: pricedBySelect },
      },
    });

    // Notify all admins and accountants about the new request (fire-and-forget)
    void (async () => {
      const targets = await prisma.user.findMany({
        where: { role: { in: ["ADMIN", "ACCOUNTANT"] }, isActive: true, deletedAt: null },
        select: { id: true },
      });
      const engineerName = (request.engineer as { fullName?: string })?.fullName ?? `Engineer #${engineerId}`;
      const machineName = (request.machine as { name?: string })?.name ?? `Machine #${machineId}`;
      await pushNotifications(
        targets.map(u => u.id),
        "New Spare Part Request",
        `${engineerName} requested "${partName.trim()}" ×${quantity} for ${machineName}.`,
      );
    })();

    return { status: 201, data: request };
  } catch (error) {
    console.error("Create spare part request error:", error);
    return { status: 500, message: "Failed to create spare part request" };
  }
};

export const setSparePartPrice = async (
  id: number,
  unitPrice: number,
  pricedById: number,
): Promise<ServiceResult<unknown>> => {
  try {
    if (unitPrice === undefined || unitPrice === null) {
      return { status: 400, message: "unitPrice is required" };
    }

    if (typeof unitPrice !== "number" || unitPrice <= 0) {
      return { status: 400, message: "unitPrice must be a positive number" };
    }

    const existing = await prisma.sparePartRequest.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return { status: 404, message: "Spare part request not found" };
    }

    const updated = await prisma.sparePartRequest.update({
      where: { id },
      data: {
        unitPrice,
        pricedById,
        pricedAt: new Date(),
      },
      include: {
        engineer: { select: userSelect },
        machine: { select: machineSelect },
        pricedBy: { select: pricedBySelect },
      },
    });

    // Notify the engineer that their request has been priced (fire-and-forget)
    void (async () => {
      const engineerId = (updated as { engineerId?: number }).engineerId;
      const pName = (updated as { partName?: string }).partName ?? `#${id}`;
      if (engineerId) {
        await pushNotifications(
          [engineerId],
          "Spare Part Priced",
          `Your request for "${pName}" has been priced at $${unitPrice.toFixed(2)} per unit.`,
        );
      }
    })();

    return { status: 200, data: updated };
  } catch (error) {
    console.error("Set spare part price error:", error);
    return { status: 500, message: "Failed to set price" };
  }
};

export const markSparePartReceived = async (
  id: number,
  engineerId: number,
): Promise<ServiceResult<unknown>> => {
  try {
    const existing = await prisma.sparePartRequest.findUnique({
      where: { id },
      select: { id: true, engineerId: true, status: true },
    });

    if (!existing) {
      return { status: 404, message: "Spare part request not found" };
    }

    if (existing.engineerId !== engineerId) {
      return { status: 403, message: "You can only mark your own requests as received" };
    }

    if (existing.status === "RECEIVED") {
      return { status: 400, message: "Request is already marked as received" };
    }

    const updated = await prisma.sparePartRequest.update({
      where: { id },
      data: {
        status: "RECEIVED",
        receivedAt: new Date(),
      },
      include: {
        engineer: { select: userSelect },
        machine: { select: machineSelect },
        pricedBy: { select: pricedBySelect },
      },
    });

    return { status: 200, data: updated };
  } catch (error) {
    console.error("Mark spare part received error:", error);
    return { status: 500, message: "Failed to mark as received" };
  }
};

export const updateSparePartRequest = async (
  id: number,
  engineerId: number,
  data: { partName?: string; quantity?: number; notes?: string; supplierName?: string },
): Promise<ServiceResult<unknown>> => {
  try {
    const existing = await prisma.sparePartRequest.findUnique({
      where: { id },
      select: { id: true, engineerId: true, status: true },
    });
    if (!existing) return { status: 404, message: "Spare part request not found" };
    if (existing.engineerId !== engineerId) return { status: 403, message: "Not authorized" };
    if (existing.status === "RECEIVED") return { status: 400, message: "Cannot edit a received request" };

    const updated = await prisma.sparePartRequest.update({
      where: { id },
      data: {
        ...(data.partName?.trim() ? { partName: data.partName.trim() } : {}),
        ...(data.quantity != null && data.quantity > 0 ? { quantity: data.quantity } : {}),
        ...(data.notes !== undefined ? { notes: data.notes?.trim() || null } : {}),
        ...(data.supplierName !== undefined ? { supplierName: data.supplierName?.trim() || null } : {}),
      },
      include: {
        engineer: { select: userSelect },
        machine: { select: machineSelect },
        pricedBy: { select: pricedBySelect },
      },
    });
    return { status: 200, data: updated };
  } catch (error) {
    console.error("Update spare part request error:", error);
    return { status: 500, message: "Failed to update spare part request" };
  }
};

export const deleteSparePartRequest = async (
  id: number,
): Promise<ServiceResult<unknown>> => {
  try {
    const existing = await prisma.sparePartRequest.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return { status: 404, message: "Spare part request not found" };
    }

    await prisma.sparePartRequest.delete({ where: { id } });

    return { status: 200, data: { message: "Deleted successfully" } };
  } catch (error) {
    console.error("Delete spare part request error:", error);
    return { status: 500, message: "Failed to delete spare part request" };
  }
};
