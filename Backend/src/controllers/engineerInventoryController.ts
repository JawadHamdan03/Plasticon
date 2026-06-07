import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/authMiddleware";
import * as svc from "../services/engineerInventoryServices";
import { prisma } from "../config/lib/prisma";

export async function getTransferLogsHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const limit = Math.min(Number(req.query.limit) || 40, 100);
    const records = await prisma.maintenance.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        machine: { select: { id: true, name: true } },
        engineer: { select: { id: true, fullName: true } },
      },
    });
    const transfers = records.map((r) => ({
      id: r.id,
      itemName: r.partsUsed,
      fromLocation: r.machine?.name ?? `Machine #${r.machineId}`,
      toLocation: r.downtimeReason.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
      transferredBy: r.engineer ? { fullName: r.engineer.fullName } : null,
      transferDate: r.createdAt,
      notes: r.reportText ?? null,
      createdAt: r.createdAt,
    }));
    res.json({ transfers });
  } catch (error) {
    console.error("getTransferLogsHandler error:", error);
    res.status(500).json({ message: "Failed to fetch transfer logs" });
  }
}

export async function createOrUpdateInventoryHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  const engineerId = req.user!.id;
  const { month, year, notes } = req.body as {
    month?: number;
    year?: number;
    notes?: string;
  };

  const m = Number(month);
  const y = Number(year);

  if (!m || m < 1 || m > 12) {
    res.status(400).json({ message: "month must be 1-12" });
    return;
  }
  if (!y || y < 2020 || y > 2100) {
    res.status(400).json({ message: "Invalid year" });
    return;
  }

  try {
    const data = await svc.createOrUpdateInventory(engineerId, m, y, notes);
    res.status(200).json(data);
  } catch (err) {
    res
      .status(400)
      .json({ message: err instanceof Error ? err.message : "Error" });
  }
}

export async function addItemHandler(req: AuthenticatedRequest, res: Response) {
  const engineerId = req.user!.id;
  const inventoryId = Number(req.params.inventoryId);
  const { partName, quantity } = req.body as {
    partName?: string;
    quantity?: number;
  };

  if (!partName?.trim()) {
    res.status(400).json({ message: "partName is required" });
    return;
  }
  const qty = Number(quantity);
  if (!qty || qty < 1) {
    res.status(400).json({ message: "quantity must be >= 1" });
    return;
  }

  const imagePath = (req as any).file?.path ?? undefined;

  try {
    const item = await svc.addInventoryItem(
      engineerId,
      inventoryId,
      partName.trim(),
      qty,
      imagePath,
    );
    res.status(201).json(item);
  } catch (err) {
    res
      .status(400)
      .json({ message: err instanceof Error ? err.message : "Error" });
  }
}

export async function updateItemHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  const engineerId = req.user!.id;
  const itemId = Number(req.params.itemId);
  const { partName, quantity } = req.body as {
    partName?: string;
    quantity?: number;
  };

  const qty = quantity !== undefined ? Number(quantity) : undefined;
  const imagePath = (req as any).file?.path ?? undefined;

  try {
    const item = await svc.updateInventoryItem(
      engineerId,
      itemId,
      partName?.trim(),
      qty,
      imagePath,
    );
    res.status(200).json(item);
  } catch (err) {
    res
      .status(400)
      .json({ message: err instanceof Error ? err.message : "Error" });
  }
}

export async function deleteItemHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  const engineerId = req.user!.id;
  const itemId = Number(req.params.itemId);

  try {
    await svc.deleteInventoryItem(engineerId, itemId);
    res.status(200).json({ message: "Item deleted" });
  } catch (err) {
    res
      .status(400)
      .json({ message: err instanceof Error ? err.message : "Error" });
  }
}

export async function submitInventoryHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  const engineerId = req.user!.id;
  const inventoryId = Number(req.params.inventoryId);

  try {
    const data = await svc.submitInventory(engineerId, inventoryId);
    res.status(200).json(data);
  } catch (err) {
    res
      .status(400)
      .json({ message: err instanceof Error ? err.message : "Error" });
  }
}

export async function getMyInventoriesHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  const engineerId = req.user!.id;
  try {
    const data = await svc.getMyInventories(engineerId);
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
}

export async function getAllInventoriesHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const data = await svc.getAllInventories();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
}

export async function getInventoryByIdHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  const id = Number(req.params.id);
  try {
    const data = await svc.getInventoryById(id);
    if (!data) {
      res.status(404).json({ message: "Not found" });
      return;
    }
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
}

export async function setPriceHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  const accountantId = req.user!.id;
  const itemId = Number(req.params.itemId);
  const { unitPrice } = req.body as { unitPrice?: number };

  const price = Number(unitPrice);
  if (isNaN(price) || price < 0) {
    res.status(400).json({ message: "unitPrice must be a non-negative number" });
    return;
  }

  try {
    const item = await svc.setPriceForItem(accountantId, itemId, price);
    res.status(200).json(item);
  } catch (err) {
    res
      .status(400)
      .json({ message: err instanceof Error ? err.message : "Error" });
  }
}

export async function reviewInventoryHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  const reviewerId = req.user!.id;
  const inventoryId = Number(req.params.id);

  try {
    const data = await svc.reviewInventory(reviewerId, inventoryId);
    res.status(200).json(data);
  } catch (err) {
    res
      .status(400)
      .json({ message: err instanceof Error ? err.message : "Error" });
  }
}
