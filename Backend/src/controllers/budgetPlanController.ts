import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import {
  getAllBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
} from "../services/budgetPlanServices";

export const getAllBudgetsHandler = async (
  _req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const result = await getAllBudgets();
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Get budgets error:", error);
    res.status(500).json({ message: "Failed to fetch budgets" });
  }
};

export const createBudgetHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const createdById = req.user?.id;
    if (!createdById) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    const result = await createBudget(createdById, req.body);
    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Create budget error:", error);
    res.status(500).json({ message: "Failed to create budget" });
  }
};

export const updateBudgetHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: "id must be a positive integer" });
      return;
    }

    const result = await updateBudget(id, req.body);
    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Update budget error:", error);
    res.status(500).json({ message: "Failed to update budget" });
  }
};

export const deleteBudgetHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: "id must be a positive integer" });
      return;
    }

    const result = await deleteBudget(id);
    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }
    res.status(200).json({ message: "Budget deleted successfully" });
  } catch (error) {
    console.error("Delete budget error:", error);
    res.status(500).json({ message: "Failed to delete budget" });
  }
};
