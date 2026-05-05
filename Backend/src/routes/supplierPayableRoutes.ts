import { Router } from "express";
import { UserRole } from "../config/generated/prisma/client";
import {
  getAllPayablesHandler,
  createPayableHandler,
  updatePayableHandler,
  deletePayableHandler,
} from "../controllers/supplierPayableController";
import { authorizeRoles } from "../middleware/authMiddleware";

const router = Router();

const accountingRoles = [UserRole.ACCOUNTANT, UserRole.ADMIN];

// Get all payables — ACCOUNTANT/ADMIN
router.get("/", authorizeRoles(accountingRoles), getAllPayablesHandler);

// Create new payable — ACCOUNTANT/ADMIN
router.post("/", authorizeRoles(accountingRoles), createPayableHandler);

// Update payable — ACCOUNTANT/ADMIN
router.patch("/:id", authorizeRoles(accountingRoles), updatePayableHandler);

// Delete payable — ACCOUNTANT/ADMIN
router.delete("/:id", authorizeRoles(accountingRoles), deletePayableHandler);

export default router;

