import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import {
  getAllSparePartRequests,
  getMySparePartRequests,
  createSparePartRequest,
  updateSparePartRequest,
  setSparePartPrice,
  markSparePartReceived,
  deleteSparePartRequest,
} from "../services/sparePartRequestServices";

export const getAllSparePartRequestsHandler = async (
  _req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const result = await getAllSparePartRequests();
    if (result.message && result.status !== 200) {
      res.status(result.status).json({ message: result.message });
      return;
    }
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Get all spare part requests error:", error);
    res.status(500).json({ message: "Failed to fetch spare part requests" });
  }
};

export const getMySparePartRequestsHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const engineerId = req.user?.id;
    if (!engineerId) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    const result = await getMySparePartRequests(engineerId);
    if (result.message && result.status !== 200) {
      res.status(result.status).json({ message: result.message });
      return;
    }
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Get my spare part requests error:", error);
    res.status(500).json({ message: "Failed to fetch spare part requests" });
  }
};

export const createSparePartRequestHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const engineerId = req.user?.id;
    if (!engineerId) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    const { partName, machineId, quantity, notes, supplierName, supplierCountry } = req.body;
    const imagePath = req.file?.filename ?? undefined;

    const result = await createSparePartRequest(
      engineerId,
      partName,
      Number(machineId),
      Number(quantity),
      imagePath,
      notes,
      supplierName,
      supplierCountry,
    );

    if (result.message && result.status !== 201) {
      res.status(result.status).json({ message: result.message });
      return;
    }
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Create spare part request error:", error);
    res.status(500).json({ message: "Failed to create spare part request" });
  }
};

export const updateSparePartRequestHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const engineerId = req.user?.id;
    if (!engineerId) { res.status(401).json({ message: "Not authorized" }); return; }
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ message: "Invalid id" }); return; }
    const { partName, quantity, notes, supplierName } = req.body;
    const result = await updateSparePartRequest(id, engineerId, {
      partName, quantity: quantity != null ? Number(quantity) : undefined, notes, supplierName,
    });
    if (result.message && result.status !== 200) { res.status(result.status).json({ message: result.message }); return; }
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Update spare part request error:", error);
    res.status(500).json({ message: "Failed to update spare part request" });
  }
};

export const setSparePartPriceHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const pricedById = req.user?.id;
    if (!pricedById) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: "id must be a positive integer" });
      return;
    }

    const { unitPrice } = req.body;

    const result = await setSparePartPrice(id, Number(unitPrice), pricedById);
    if (result.message && result.status !== 200) {
      res.status(result.status).json({ message: result.message });
      return;
    }
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Set spare part price error:", error);
    res.status(500).json({ message: "Failed to set price" });
  }
};

export const markSparePartReceivedHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const engineerId = req.user?.id;
    if (!engineerId) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: "id must be a positive integer" });
      return;
    }

    const result = await markSparePartReceived(id, engineerId);
    if (result.message && result.status !== 200) {
      res.status(result.status).json({ message: result.message });
      return;
    }
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Mark spare part received error:", error);
    res.status(500).json({ message: "Failed to mark as received" });
  }
};

export const deleteSparePartRequestHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: "id must be a positive integer" });
      return;
    }

    const result = await deleteSparePartRequest(id);
    if (result.message && result.status !== 200) {
      res.status(result.status).json({ message: result.message });
      return;
    }
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Delete spare part request error:", error);
    res.status(500).json({ message: "Failed to delete spare part request" });
  }
};
