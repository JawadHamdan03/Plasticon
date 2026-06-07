import { Router } from "express";
import {
  getAttendanceActivityReportHandler,
  getDailyProductionSummaryHandler,
  getInventoryActivityReportHandler,
  getInventorySnapshotHandler,
  getMonthlySalesSummaryHandler,
  getPayrollActivityReportHandler,
  getProductionActivityReportHandler,
  getWeeklyProductionSummaryHandler,
  getYearlySalesSummaryHandler,
} from "../controllers/reportController";
import { authorizeRoles } from "../middleware/authMiddleware";
import { UserRole } from "../config/generated/prisma/client";

const router = Router();

router.get(
  "/production/activity",
  authorizeRoles([UserRole.ACCOUNTANT, UserRole.ADMIN]),
  getProductionActivityReportHandler,
);

router.get(
  "/production/daily",
  authorizeRoles([UserRole.ACCOUNTANT, UserRole.ADMIN]),
  getDailyProductionSummaryHandler,
);

router.get(
  "/production/weekly",
  authorizeRoles([UserRole.ACCOUNTANT, UserRole.ADMIN, UserRole.ENGINEER]),
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
  "/inventory/activity",
  authorizeRoles([UserRole.ACCOUNTANT, UserRole.ADMIN]),
  getInventoryActivityReportHandler,
);

router.get(
  "/inventory/snapshot",
  authorizeRoles([UserRole.ACCOUNTANT, UserRole.ADMIN]),
  getInventorySnapshotHandler,
);

router.get(
  "/attendance/activity",
  authorizeRoles([UserRole.ACCOUNTANT, UserRole.ADMIN]),
  getAttendanceActivityReportHandler,
);

router.get(
  "/payroll/activity",
  authorizeRoles([UserRole.ACCOUNTANT, UserRole.ADMIN]),
  getPayrollActivityReportHandler,
);

export default router;
