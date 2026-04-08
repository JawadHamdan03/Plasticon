import { Router } from "express";
import {
  createSettingsSnapshot,
  getAdminSettingsOverview,
  getElectricityShiftConsumptionReport,
  getProductionSettings,
  getSettingsSnapshots,
  getSettingsSnapshotTrend,
  getSystemSettings,
  upsertProductionSetting,
  upsertSystemSettings,
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
  "/admin/overview",
  authorizeRoles([UserRole.ADMIN]),
  getAdminSettingsOverview,
);

router.post(
  "/snapshots",
  authorizeRoles([UserRole.WORKER]),
  upload.fields([
    { name: "machineCounterImage", maxCount: 1 },
    { name: "electricityImage", maxCount: 1 },
  ]),
  createSettingsSnapshot,
);

router.get(
  "/snapshots/mine",
  authorizeRoles([UserRole.WORKER]),
  getSettingsSnapshots,
);

router.get(
  "/snapshots",
  authorizeRoles([UserRole.ADMIN]),
  getSettingsSnapshots,
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
