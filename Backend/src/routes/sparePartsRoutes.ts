import { Router } from "express";
import { UserRole } from "../config/generated/prisma/client";
import {
  getAllSparePartsHandler,
  createSparePartHandler,
  updateSparePartQuantityHandler,
} from "../controllers/sparePartsController";
import { authorizeRoles } from "../middleware/authMiddleware";

const router = Router();

const engineerRoles = [UserRole.ENGINEER, UserRole.ADMIN];

// Get all spare parts — ENGINEER/ADMIN
router.get("/", authorizeRoles(engineerRoles), getAllSparePartsHandler);

// Create new spare part — ENGINEER/ADMIN
router.post("/", authorizeRoles(engineerRoles), createSparePartHandler);

// Update spare part quantity — ENGINEER/ADMIN
router.patch("/:id", authorizeRoles(engineerRoles), updateSparePartQuantityHandler);

export default router;
