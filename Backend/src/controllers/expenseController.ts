import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import {
  getAllExpenses,
  createExpense,
  approveExpense,
  deleteExpense,
} from "../services/expenseServices";

export const getAllExpensesHandler = async (
  _req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const result = await getAllExpenses();
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Get expenses error:", error);
    res.status(500).json({ message: "Failed to fetch expenses" });
  }
};

export const createExpenseHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const submittedById = req.user?.id;
    if (!submittedById) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    const result = await createExpense(submittedById, req.body);
    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Create expense error:", error);
    res.status(500).json({ message: "Failed to create expense" });
  }
};

export const deleteExpenseHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: "id must be a positive integer" });
      return;
    }

    const result = await deleteExpense(id);
    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }
    res.status(200).json({ message: "Expense deleted successfully" });
  } catch (error) {
    console.error("Delete expense error:", error);
    res.status(500).json({ message: "Failed to delete expense" });
  }
};

export const approveExpenseHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const approvedById = req.user?.id;
    if (!approvedById) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: "id must be a positive integer" });
      return;
    }

    const result = await approveExpense(id, approvedById, req.body);
    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Approve expense error:", error);
    res.status(500).json({ message: "Failed to approve expense" });
  }
};
