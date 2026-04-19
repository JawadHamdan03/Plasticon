import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import {
  getAllSpareParts,
  createSparePart,
  updateSparePartQuantity,
  deleteSparePart,
} from "../services/sparePartsServices";

export const getAllSparePartsHandler = async (
  _req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const result = await getAllSpareParts();
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Get spare parts error:", error);
    res.status(500).json({ message: "Failed to fetch spare parts" });
  }
};

export const createSparePartHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const result = await createSparePart(req.body);
    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Create spare part error:", error);
    res.status(500).json({ message: "Failed to create spare part" });
  }
};

export const updateSparePartQuantityHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: "id must be a positive integer" });
      return;
    }

    const result = await updateSparePartQuantity(id, req.body);
    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Update spare part error:", error);
    res.status(500).json({ message: "Failed to update spare part" });
  }
};

export const deleteSparePartHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: "id must be a positive integer" });
      return;
    }
    const result = await deleteSparePart(id);
    if (result.message && result.status !== 200) {
      res.status(result.status).json({ message: result.message });
      return;
    }
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Delete spare part error:", error);
    res.status(500).json({ message: "Failed to delete spare part" });
  }
};
