import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import {
  getAllPayables,
  createPayable,
  updatePayable,
  deletePayable,
} from "../services/supplierPayableServices";

export const getAllPayablesHandler = async (
  _req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const result = await getAllPayables();
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Get payables error:", error);
    res.status(500).json({ message: "Failed to fetch payables" });
  }
};

export const createPayableHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const result = await createPayable(req.body);
    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Create payable error:", error);
    res.status(500).json({ message: "Failed to create payable" });
  }
};

export const updatePayableHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: "id must be a positive integer" });
      return;
    }

    const result = await updatePayable(id, req.body);
    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Update payable error:", error);
    res.status(500).json({ message: "Failed to update payable" });
  }
};

export const deletePayableHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: "id must be a positive integer" });
      return;
    }

    const result = await deletePayable(id);
    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }
    res.status(200).json({ message: "Payable deleted successfully" });
  } catch (error) {
    console.error("Delete payable error:", error);
    res.status(500).json({ message: "Failed to delete payable" });
  }
};
