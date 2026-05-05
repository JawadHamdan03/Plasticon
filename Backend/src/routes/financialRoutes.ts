import { Router } from "express";
import { UserRole } from "../config/generated/prisma/client";
import {
  getFinancialDashboardHandler,
  getFinancialSettingsHandler,
  updateFinancialSettingsHandler,
} from "../controllers/financialController";
import { authorizeRoles } from "../middleware/authMiddleware";

const router = Router();

const accountingRoles = [UserRole.ACCOUNTANT, UserRole.ADMIN];

// Get financial dashboard KPIs — ACCOUNTANT/ADMIN
router.get("/dashboard", authorizeRoles(accountingRoles), getFinancialDashboardHandler);

// Get financial settings — ACCOUNTANT/ADMIN
router.get("/settings", authorizeRoles(accountingRoles), getFinancialSettingsHandler);

// Update financial settings — ACCOUNTANT/ADMIN
router.put("/settings", authorizeRoles(accountingRoles), updateFinancialSettingsHandler);

export default router;
