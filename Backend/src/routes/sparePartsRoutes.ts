import { Router } from "express";
import { UserRole } from "../config/generated/prisma/client";
import {
  getAllSparePartsHandler,
  createSparePartHandler,
  updateSparePartQuantityHandler,
  deleteSparePartHandler,
} from "../controllers/sparePartsController";
import { authorizeRoles } from "../middleware/authMiddleware";

const router = Router();

const engineerRoles = [UserRole.ENGINEER, UserRole.ADMIN];

// Get all spare parts — ENGINEER/ADMIN
router.get("/", authorizeRoles(engineerRoles), getAllSparePartsHandler);

// Create new spare part — ENGINEER/ADMIN
router.post("/", authorizeRoles(engineerRoles), createSparePartHandler);

// Update spare part — ENGINEER/ADMIN
router.patch("/:id", authorizeRoles(engineerRoles), updateSparePartQuantityHandler);

// Delete spare part — ENGINEER/ADMIN
router.delete("/:id", authorizeRoles(engineerRoles), deleteSparePartHandler);

export default router;
