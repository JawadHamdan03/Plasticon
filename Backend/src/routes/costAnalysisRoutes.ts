import { Router } from "express";
import { UserRole } from "../config/generated/prisma/client";
import {
  getAllAnalysesHandler,
  createAnalysisHandler,
  updateAnalysisHandler,
  deleteAnalysisHandler,
} from "../controllers/costAnalysisController";
import { authorizeRoles } from "../middleware/authMiddleware";

const router = Router();

const accountingRoles = [UserRole.ACCOUNTANT, UserRole.ADMIN];

// Get all analyses — ACCOUNTANT/ADMIN
router.get("/", authorizeRoles(accountingRoles), getAllAnalysesHandler);

// Create new analysis — ACCOUNTANT/ADMIN
router.post("/", authorizeRoles(accountingRoles), createAnalysisHandler);

// Update analysis — ACCOUNTANT/ADMIN
router.patch("/:id", authorizeRoles(accountingRoles), updateAnalysisHandler);

// Delete analysis — ACCOUNTANT/ADMIN
router.delete("/:id", authorizeRoles(accountingRoles), deleteAnalysisHandler);

export default router;
