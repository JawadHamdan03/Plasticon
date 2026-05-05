import { Router } from "express";
import { UserRole } from "../config/generated/prisma/client";
import {
  getAllMaintenanceSchedulesHandler,
  createMaintenanceScheduleHandler,
  updateMaintenanceScheduleHandler,
  deleteMaintenanceScheduleHandler,
} from "../controllers/maintenanceScheduleController";
import { authorizeRoles } from "../middleware/authMiddleware";

const router = Router();

const engineerRoles = [UserRole.ENGINEER, UserRole.ADMIN];

// Get all maintenance schedules — ENGINEER/ADMIN
router.get("/", authorizeRoles(engineerRoles), getAllMaintenanceSchedulesHandler);

// Create new maintenance schedule — ENGINEER/ADMIN
router.post("/", authorizeRoles(engineerRoles), createMaintenanceScheduleHandler);

// Update maintenance schedule — ENGINEER/ADMIN
router.patch("/:id", authorizeRoles(engineerRoles), updateMaintenanceScheduleHandler);

// Delete maintenance schedule — ENGINEER/ADMIN
router.delete("/:id", authorizeRoles(engineerRoles), deleteMaintenanceScheduleHandler);

export default router;
