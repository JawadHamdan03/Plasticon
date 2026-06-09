import { Router } from "express";
import {
  createSettingsSnapshot,
  getAdminSettingsOverview,
  getElectricityShiftConsumptionReport,
  getProductionSettings,
  getSettingsSnapshots,
  getSettingsSnapshotTrend,
  getSystemSettings,
  deleteSettingsSnapshot,
  updateSettingsSnapshot,
  upsertProductionSetting,
  upsertSystemSettings,
  getNotificationRules,
  upsertNotificationRules,
} from "../controllers/settingsController";
import { authorizeRoles } from "../middleware/authMiddleware";
import { UserRole } from "../config/generated/prisma/client";
import { upload } from "../utils/uploadHandler";

const router = Router();

router.get(
  "/production",
  authorizeRoles([UserRole.ADMIN]),
  getProductionSettings,
);
router.put(
  "/production/:productType",
  authorizeRoles([UserRole.ADMIN]),
  upsertProductionSetting,
);
router.get("/system", authorizeRoles([UserRole.ADMIN]), getSystemSettings);
router.put("/system", authorizeRoles([UserRole.ADMIN]), upsertSystemSettings);
router.get(
  "/notification-rules",
  authorizeRoles([UserRole.ADMIN]),
  getNotificationRules,
);
router.put(
  "/notification-rules",
  authorizeRoles([UserRole.ADMIN]),
  upsertNotificationRules,
);
router.get(
  "/admin/overview",
  authorizeRoles([UserRole.ADMIN]),
  getAdminSettingsOverview,
);

router.post(
  "/snapshots",
  authorizeRoles([UserRole.WORKER, UserRole.ENGINEER, UserRole.ADMIN]),
  upload.fields([
    { name: "machineCounterImage", maxCount: 1 },
    { name: "electricityImage", maxCount: 1 },
  ]),
  createSettingsSnapshot,
);

router.get(
  "/snapshots/mine",
  authorizeRoles([UserRole.WORKER, UserRole.ENGINEER]),
  getSettingsSnapshots,
);

router.get(
  "/snapshots",
  authorizeRoles([UserRole.ADMIN]),
  getSettingsSnapshots,
);

router.put(
  "/snapshots/:id",
  authorizeRoles([UserRole.WORKER, UserRole.ENGINEER, UserRole.ADMIN]),
  upload.fields([
    { name: "machineCounterImage", maxCount: 1 },
    { name: "electricityImage", maxCount: 1 },
  ]),
  updateSettingsSnapshot,
);

router.delete(
  "/snapshots/:id",
  authorizeRoles([UserRole.WORKER, UserRole.ENGINEER, UserRole.ADMIN]),
  deleteSettingsSnapshot,
);

router.get(
  "/snapshots/trend",
  authorizeRoles([UserRole.ADMIN]),
  getSettingsSnapshotTrend,
);

router.get(
  "/snapshots/shift-consumption",
  authorizeRoles([UserRole.ADMIN]),
  getElectricityShiftConsumptionReport,
);

export default router;
