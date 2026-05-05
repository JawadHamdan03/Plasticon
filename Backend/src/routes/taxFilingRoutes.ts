import { Router } from "express";
import { UserRole } from "../config/generated/prisma/client";
import {
  getAllFilingsHandler,
  createFilingHandler,
  updateFilingHandler,
  deleteFilingHandler,
} from "../controllers/taxFilingController";
import { authorizeRoles } from "../middleware/authMiddleware";

const router = Router();

const accountingRoles = [UserRole.ACCOUNTANT, UserRole.ADMIN];

// Get all filings — ACCOUNTANT/ADMIN
router.get("/", authorizeRoles(accountingRoles), getAllFilingsHandler);

// Create new filing — ACCOUNTANT/ADMIN
router.post("/", authorizeRoles(accountingRoles), createFilingHandler);

// Update filing — ACCOUNTANT/ADMIN
router.patch("/:id", authorizeRoles(accountingRoles), updateFilingHandler);

// Delete filing — ACCOUNTANT/ADMIN
router.delete("/:id", authorizeRoles(accountingRoles), deleteFilingHandler);

export default router;
