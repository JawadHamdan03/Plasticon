import { Router } from "express";
import {
  getDailyProductionSummaryHandler,
  getInventorySnapshotHandler,
  getMonthlySalesSummaryHandler,
  getWeeklyProductionSummaryHandler,
  getYearlySalesSummaryHandler,
} from "../controllers/reportController";
import { authorizeRoles } from "../middleware/authMiddleware";
import { UserRole } from "../config/generated/prisma/client";

const router = Router();

router.get(
  "/production/daily",
  authorizeRoles([UserRole.ACCOUNTANT, UserRole.ADMIN]),
  getDailyProductionSummaryHandler,
);

router.get(
  "/production/weekly",
  authorizeRoles([UserRole.ACCOUNTANT, UserRole.ADMIN]),
  getWeeklyProductionSummaryHandler,
);

router.get(
  "/sales/monthly",
  authorizeRoles([UserRole.ACCOUNTANT, UserRole.ADMIN]),
  getMonthlySalesSummaryHandler,
);

router.get(
  "/sales/yearly",
  authorizeRoles([UserRole.ACCOUNTANT, UserRole.ADMIN]),
  getYearlySalesSummaryHandler,
);

router.get(
  "/inventory/snapshot",
  authorizeRoles([UserRole.ACCOUNTANT, UserRole.ADMIN]),
  getInventorySnapshotHandler,
);

export default router;
