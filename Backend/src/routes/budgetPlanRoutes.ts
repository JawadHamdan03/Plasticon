import { Router } from "express";
import { UserRole } from "../config/generated/prisma/client";
import {
  getAllBudgetsHandler,
  createBudgetHandler,
  updateBudgetHandler,
  deleteBudgetHandler,
} from "../controllers/budgetPlanController";
import { authorizeRoles } from "../middleware/authMiddleware";

const router = Router();

const accountingRoles = [UserRole.ACCOUNTANT, UserRole.ADMIN];

// Get all budgets — ACCOUNTANT/ADMIN
router.get("/", authorizeRoles(accountingRoles), getAllBudgetsHandler);

// Create new budget — ACCOUNTANT/ADMIN
router.post("/", authorizeRoles(accountingRoles), createBudgetHandler);

// Update budget — ACCOUNTANT/ADMIN
router.patch("/:id", authorizeRoles(accountingRoles), updateBudgetHandler);

// Delete budget — ACCOUNTANT/ADMIN
router.delete("/:id", authorizeRoles(accountingRoles), deleteBudgetHandler);

export default router;
