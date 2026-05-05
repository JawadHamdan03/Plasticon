import { Router } from "express";
import { UserRole } from "../config/generated/prisma/client";
import {
  getAllExpensesHandler,
  createExpenseHandler,
  approveExpenseHandler,
  deleteExpenseHandler,
} from "../controllers/expenseController";
import { authorizeRoles } from "../middleware/authMiddleware";

const router = Router();

const accountingRoles = [UserRole.ACCOUNTANT, UserRole.ADMIN];

// Get all expenses — ACCOUNTANT/ADMIN
router.get("/", authorizeRoles(accountingRoles), getAllExpensesHandler);

// Create new expense — ACCOUNTANT/ADMIN
router.post("/", authorizeRoles(accountingRoles), createExpenseHandler);

// Approve expense — ACCOUNTANT/ADMIN
router.patch("/:id/approve", authorizeRoles(accountingRoles), approveExpenseHandler);

// Delete expense — ACCOUNTANT/ADMIN
router.delete("/:id", authorizeRoles(accountingRoles), deleteExpenseHandler);

export default router;
