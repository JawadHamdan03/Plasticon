import { Router } from "express";
import { UserRole } from "../config/generated/prisma/client";
import {
  getAllReportsHandler,
  createReportHandler,
  updateReportHandler,
  deleteReportHandler,
} from "../controllers/financialReportController";
import { authorizeRoles } from "../middleware/authMiddleware";

const router = Router();

const accountingRoles = [UserRole.ACCOUNTANT, UserRole.ADMIN];

// Get all reports — ACCOUNTANT/ADMIN
router.get("/", authorizeRoles(accountingRoles), getAllReportsHandler);

// Create new report — ACCOUNTANT/ADMIN
router.post("/", authorizeRoles(accountingRoles), createReportHandler);

// Update report — ACCOUNTANT/ADMIN
router.patch("/:id", authorizeRoles(accountingRoles), updateReportHandler);

// Delete report — ACCOUNTANT/ADMIN
router.delete("/:id", authorizeRoles(accountingRoles), deleteReportHandler);

export default router;
