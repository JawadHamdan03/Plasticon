import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import {
  getAllReconciliations,
  createReconciliation,
  updateReconciliation,
  deleteReconciliation,
} from "../services/bankReconciliationServices";

export const getAllReconciliationsHandler = async (
  _req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const result = await getAllReconciliations();
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Get reconciliations error:", error);
    res.status(500).json({ message: "Failed to fetch reconciliations" });
  }
};

export const createReconciliationHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const reconciledById = req.user?.id;
    if (!reconciledById) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    const result = await createReconciliation(reconciledById, req.body);
    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Create reconciliation error:", error);
    res.status(500).json({ message: "Failed to create reconciliation" });
  }
};

export const updateReconciliationHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: "id must be a positive integer" });
      return;
    }

    const result = await updateReconciliation(id, req.body);
    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Update reconciliation error:", error);
    res.status(500).json({ message: "Failed to update reconciliation" });
  }
};

export const deleteReconciliationHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: "id must be a positive integer" });
      return;
    }

    const result = await deleteReconciliation(id);
    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }
    res.status(200).json({ message: "Reconciliation deleted successfully" });
  } catch (error) {
    console.error("Delete reconciliation error:", error);
    res.status(500).json({ message: "Failed to delete reconciliation" });
  }
};
