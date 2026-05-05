import { Router } from "express";
import { UserRole } from "../config/generated/prisma/client";
import {
  getAllWorkflowsHandler,
  createWorkflowHandler,
  updateWorkflowHandler,
  deleteWorkflowHandler,
} from "../controllers/approvalWorkflowController";
import { authorizeRoles } from "../middleware/authMiddleware";

const router = Router();

const accountingRoles = [UserRole.ACCOUNTANT, UserRole.ADMIN];

// Get all workflows — ACCOUNTANT/ADMIN
router.get("/", authorizeRoles(accountingRoles), getAllWorkflowsHandler);

// Create new workflow — ACCOUNTANT/ADMIN
router.post("/", authorizeRoles(accountingRoles), createWorkflowHandler);

// Update workflow — ACCOUNTANT/ADMIN
router.patch("/:id", authorizeRoles(accountingRoles), updateWorkflowHandler);

// Delete workflow — ACCOUNTANT/ADMIN
router.delete("/:id", authorizeRoles(accountingRoles), deleteWorkflowHandler);

export default router;
