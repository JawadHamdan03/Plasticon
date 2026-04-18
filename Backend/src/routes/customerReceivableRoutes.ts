import { Router } from "express";
import { UserRole } from "../config/generated/prisma/client";
import {
  getAllReceivablesHandler,
  createReceivableHandler,
  updateReceivableHandler,
  deleteReceivableHandler,
} from "../controllers/customerReceivableController";
import { authorizeRoles } from "../middleware/authMiddleware";

const router = Router();

const accountingRoles = [UserRole.ACCOUNTANT, UserRole.ADMIN];

// Get all receivables — ACCOUNTANT/ADMIN
router.get("/", authorizeRoles(accountingRoles), getAllReceivablesHandler);

// Create new receivable — ACCOUNTANT/ADMIN
router.post("/", authorizeRoles(accountingRoles), createReceivableHandler);

// Update receivable — ACCOUNTANT/ADMIN
router.patch("/:id", authorizeRoles(accountingRoles), updateReceivableHandler);

// Delete receivable — ACCOUNTANT/ADMIN
router.delete("/:id", authorizeRoles(accountingRoles), deleteReceivableHandler);

export default router;

