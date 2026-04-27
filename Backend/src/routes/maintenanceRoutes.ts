import { Router } from "express";
import {
  createMaintenanceHandler,
  getAllMaintenancesHandler,
  getMyMaintenancesHandler,
} from "../controllers/maintenanceController";
import { authorizeRoles } from "../middleware/authMiddleware";
import { UserRole } from "../config/generated/prisma/client";

const router = Router();

router.post(
  "/",
  authorizeRoles([UserRole.WORKER, UserRole.ENGINEER]),
  createMaintenanceHandler,
);

router.get(
  "/me",
  authorizeRoles([UserRole.WORKER, UserRole.ENGINEER]),
  getMyMaintenancesHandler,
);

// GET /maintenance  — all authenticated roles can read
router.get(
  "/all",
  authorizeRoles([UserRole.WORKER, UserRole.ENGINEER, UserRole.ACCOUNTANT, UserRole.ADMIN]),
  getAllMaintenancesHandler,
);

router.get(
  "/",
  authorizeRoles([UserRole.WORKER, UserRole.ENGINEER, UserRole.ACCOUNTANT, UserRole.ADMIN]),
  getAllMaintenancesHandler,
);

export default router;
