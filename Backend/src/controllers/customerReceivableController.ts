import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import {
  getAllReceivables,
  createReceivable,
  updateReceivable,
  deleteReceivable,
} from "../services/customerReceivableServices";

export const getAllReceivablesHandler = async (
  _req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const result = await getAllReceivables();
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Get receivables error:", error);
    res.status(500).json({ message: "Failed to fetch receivables" });
  }
};

export const createReceivableHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const result = await createReceivable(req.body);
    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Create receivable error:", error);
    res.status(500).json({ message: "Failed to create receivable" });
  }
};

export const updateReceivableHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: "id must be a positive integer" });
      return;
    }

    const result = await updateReceivable(id, req.body);
    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Update receivable error:", error);
    res.status(500).json({ message: "Failed to update receivable" });
  }
};

export const deleteReceivableHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: "id must be a positive integer" });
      return;
    }

    const result = await deleteReceivable(id);
    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }
    res.status(200).json({ message: "Receivable deleted successfully" });
  } catch (error) {
    console.error("Delete receivable error:", error);
    res.status(500).json({ message: "Failed to delete receivable" });
  }
};
