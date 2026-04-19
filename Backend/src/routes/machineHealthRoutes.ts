import { Router } from "express";
import { UserRole } from "../config/generated/prisma/client";
import {
  getAllMachineHealthHandler,
  getMachineHealthHistoryHandler,
  createMachineHealthRecordHandler,
  updateMachineHealthRecordHandler,
  deleteMachineHealthRecordHandler,
} from "../controllers/machineHealthController";
import { authorizeRoles } from "../middleware/authMiddleware";

const router = Router();

const engineerRoles = [UserRole.ENGINEER, UserRole.ADMIN];

// Get all machine health records — ENGINEER/ADMIN
router.get("/", authorizeRoles(engineerRoles), getAllMachineHealthHandler);

// Get health history for a specific machine — ENGINEER/ADMIN
router.get("/:machineId", authorizeRoles(engineerRoles), getMachineHealthHistoryHandler);

// Create new health record — ENGINEER/ADMIN
router.post("/", authorizeRoles(engineerRoles), createMachineHealthRecordHandler);

// Update health record — ENGINEER/ADMIN
router.patch("/:id", authorizeRoles(engineerRoles), updateMachineHealthRecordHandler);

// Delete health record — ENGINEER/ADMIN
router.delete("/:id", authorizeRoles(engineerRoles), deleteMachineHealthRecordHandler);

export default router;
