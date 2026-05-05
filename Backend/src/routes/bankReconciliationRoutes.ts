import { Router } from "express";
import { UserRole } from "../config/generated/prisma/client";
import {
  getAllReconciliationsHandler,
  createReconciliationHandler,
  updateReconciliationHandler,
  deleteReconciliationHandler,
} from "../controllers/bankReconciliationController";
import { authorizeRoles } from "../middleware/authMiddleware";

const router = Router();

const accountingRoles = [UserRole.ACCOUNTANT, UserRole.ADMIN];

// Get all reconciliations — ACCOUNTANT/ADMIN
router.get("/", authorizeRoles(accountingRoles), getAllReconciliationsHandler);

// Create new reconciliation — ACCOUNTANT/ADMIN
router.post("/", authorizeRoles(accountingRoles), createReconciliationHandler);

// Update reconciliation — ACCOUNTANT/ADMIN
router.patch("/:id", authorizeRoles(accountingRoles), updateReconciliationHandler);

// Delete reconciliation — ACCOUNTANT/ADMIN
router.delete("/:id", authorizeRoles(accountingRoles), deleteReconciliationHandler);

export default router;
