import { prisma } from "../config/lib/prisma";
import { UserRole } from "../config/generated/prisma/client";
import { auditAsync } from "./auditHelper";
import { createNotification } from "./notificationServices";

export async function createOrUpdateInventory(
  engineerId: number,
  month: number,
  year: number,
  notes?: string,
) {
  const existing = await prisma.engineerInventory.findUnique({
    where: { engineerId_month_year: { engineerId, month, year } },
  });

  if (existing && existing.status === "SUBMITTED") {
    throw new Error("Cannot edit a submitted inventory report");
  }

  if (existing) {
    return prisma.engineerInventory.update({
      where: { id: existing.id },
      data: { notes, updatedAt: new Date() },
      include: { items: true },
    });
  }

  return prisma.engineerInventory.create({
    data: { engineerId, month, year, notes },
    include: { items: true },
  });
}

export async function addInventoryItem(
  engineerId: number,
  inventoryId: number,
  partName: string,
  quantity: number,
  imagePath?: string,
) {
  const inventory = await prisma.engineerInventory.findUnique({
    where: { id: inventoryId },
  });

  if (!inventory) throw new Error("Inventory not found");
  if (inventory.engineerId !== engineerId) throw new Error("Forbidden");
  if (inventory.status === "SUBMITTED") {
    throw new Error("Cannot edit a submitted inventory");
  }

  return prisma.engineerInventoryItem.create({
    data: { inventoryId, partName, quantity, imagePath },
  });
}

export async function updateInventoryItem(
  engineerId: number,
  itemId: number,
  partName?: string,
  quantity?: number,
  imagePath?: string,
) {
  const item = await prisma.engineerInventoryItem.findUnique({
    where: { id: itemId },
    include: { inventory: true },
  });

  if (!item) throw new Error("Item not found");
  if (item.inventory.engineerId !== engineerId) throw new Error("Forbidden");
  if (item.inventory.status === "SUBMITTED") {
    throw new Error("Cannot edit a submitted inventory");
  }

  return prisma.engineerInventoryItem.update({
    where: { id: itemId },
    data: {
      ...(partName !== undefined && { partName }),
      ...(quantity !== undefined && { quantity }),
      ...(imagePath !== undefined && { imagePath }),
    },
  });
}

export async function deleteInventoryItem(engineerId: number, itemId: number) {
  const item = await prisma.engineerInventoryItem.findUnique({
    where: { id: itemId },
    include: { inventory: true },
  });

  if (!item) throw new Error("Item not found");
  if (item.inventory.engineerId !== engineerId) throw new Error("Forbidden");
  if (item.inventory.status === "SUBMITTED") {
    throw new Error("Cannot delete from a submitted inventory");
  }

  return prisma.engineerInventoryItem.delete({ where: { id: itemId } });
}

export async function submitInventory(engineerId: number, inventoryId: number) {
  const inventory = await prisma.engineerInventory.findUnique({
    where: { id: inventoryId },
    include: { items: true, engineer: true },
  });

  if (!inventory) throw new Error("Inventory not found");
  if (inventory.engineerId !== engineerId) throw new Error("Forbidden");
  if (inventory.status === "SUBMITTED") {
    throw new Error("Already submitted");
  }
  if (inventory.items.length === 0) {
    throw new Error("Cannot submit an empty inventory");
  }

  const updated = await prisma.engineerInventory.update({
    where: { id: inventoryId },
    data: { status: "SUBMITTED", submittedAt: new Date() },
    include: { items: true, engineer: true },
  });

  const recipients = await prisma.user.findMany({
    where: { role: { in: [UserRole.ADMIN, UserRole.ACCOUNTANT] }, isActive: true },
    select: { id: true },
  });

  const monthLabel = new Date(inventory.year, inventory.month - 1).toLocaleString("en", { month: "long" });

  await createNotification(engineerId, {
    title: "New Engineer Inventory Report",
    message: `${inventory.engineer.fullName} submitted the parts inventory for ${monthLabel} ${inventory.year}. ${inventory.items.length} parts listed.`,
    type: "ENGINEER_INVENTORY" as any,
    targetType: "USER",
    userIds: recipients.map((r) => r.id),
  });

  auditAsync(engineerId, "ENGINEER_INVENTORY_SUBMITTED", "EngineerInventory", inventoryId);

  return updated;
}

export async function getMyInventories(engineerId: number) {
  return prisma.engineerInventory.findMany({
    where: { engineerId },
    include: {
      items: {
        include: { pricedBy: { select: { id: true, fullName: true } } },
      },
    },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
}

export async function getAllInventories() {
  return prisma.engineerInventory.findMany({
    include: {
      engineer: { select: { id: true, fullName: true, role: true } },
      items: {
        include: { pricedBy: { select: { id: true, fullName: true } } },
      },
    },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
}

export async function getInventoryById(id: number) {
  return prisma.engineerInventory.findUnique({
    where: { id },
    include: {
      engineer: { select: { id: true, fullName: true, role: true } },
      items: {
        include: { pricedBy: { select: { id: true, fullName: true } } },
      },
      reviewedBy: { select: { id: true, fullName: true } },
    },
  });
}

export async function setPriceForItem(
  accountantId: number,
  itemId: number,
  unitPrice: number,
) {
  const item = await prisma.engineerInventoryItem.findUnique({
    where: { id: itemId },
    include: { inventory: true },
  });

  if (!item) throw new Error("Item not found");
  if (item.inventory.status !== "SUBMITTED") {
    throw new Error("Inventory must be submitted before pricing");
  }

  return prisma.engineerInventoryItem.update({
    where: { id: itemId },
    data: { unitPrice, pricedById: accountantId, pricedAt: new Date() },
  });
}

export async function reviewInventory(
  reviewerId: number,
  inventoryId: number,
) {
  const inventory = await prisma.engineerInventory.findUnique({
    where: { id: inventoryId },
  });

  if (!inventory) throw new Error("Inventory not found");
  if (inventory.status !== "SUBMITTED") {
    throw new Error("Inventory must be submitted to be reviewed");
  }

  return prisma.engineerInventory.update({
    where: { id: inventoryId },
    data: {
      status: "REVIEWED",
      reviewedAt: new Date(),
      reviewedById: reviewerId,
    },
    include: { items: true, engineer: { select: { id: true, fullName: true } } },
  });
}
