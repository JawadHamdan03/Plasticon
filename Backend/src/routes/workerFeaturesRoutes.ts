import { Router } from "express";
import { authorizeRoles } from "../middleware/authMiddleware";
import { UserRole } from "../config/generated/prisma/client";
import { upload } from "../utils/uploadHandler";
import {
  createElectricityAnomalyAlertHandler,
  createKaizenSuggestionHandler,
  createMachineStopAlertHandler,
  createMaterialWasteLogHandler,
  createMicroStopHandler,
  createQualityIssueReportHandler,
  getMyDailyTargetsHandler,
  getAdminKaizenSuggestionsHandler,
  getMyElectricityAnomalyAlertsHandler,
  getMyKaizenSuggestionsHandler,
  getMyMachineStopAlertsHandler,
  getMyMaterialWasteLogsHandler,
  getMyMicroStopsHandler,
  getMyQualityIssueReportsHandler,
  getMyShiftChecklistsHandler,
  reviewKaizenSuggestionHandler,
  resolveMachineStopAlertHandler,
  saveDailyTargetProgressHandler,
  saveShiftChecklistHandler,
} from "../controllers/workerFeaturesController";

const router = Router();
const workerOnly = authorizeRoles([UserRole.WORKER]);
const adminOnly = authorizeRoles([UserRole.ADMIN]);

router.post("/machine-stop-alerts", workerOnly, createMachineStopAlertHandler);
router.get(
  "/machine-stop-alerts/mine",
  workerOnly,
  getMyMachineStopAlertsHandler,
);
router.patch(
  "/machine-stop-alerts/:id/resolve",
  workerOnly,
  resolveMachineStopAlertHandler,
);

router.post("/shift-checklists", workerOnly, saveShiftChecklistHandler);
router.get("/shift-checklists/mine", workerOnly, getMyShiftChecklistsHandler);

router.post("/material-waste", workerOnly, createMaterialWasteLogHandler);
router.get("/material-waste/mine", workerOnly, getMyMaterialWasteLogsHandler);

router.post("/daily-targets", workerOnly, saveDailyTargetProgressHandler);
router.get("/daily-targets/mine", workerOnly, getMyDailyTargetsHandler);

router.post("/kaizen", workerOnly, createKaizenSuggestionHandler);
router.get("/kaizen/mine", workerOnly, getMyKaizenSuggestionsHandler);
router.get("/admin/kaizen", adminOnly, getAdminKaizenSuggestionsHandler);
router.patch(
  "/admin/kaizen/:id/review",
  adminOnly,
  reviewKaizenSuggestionHandler,
);

router.post(
  "/quality-issues",
  workerOnly,
  upload.single("issueImage"),
  createQualityIssueReportHandler,
);
router.get("/quality-issues/mine", workerOnly, getMyQualityIssueReportsHandler);

router.post("/micro-stops", workerOnly, createMicroStopHandler);
router.get("/micro-stops/mine", workerOnly, getMyMicroStopsHandler);

router.post(
  "/electricity-anomaly-alerts",
  workerOnly,
  createElectricityAnomalyAlertHandler,
);
router.get(
  "/electricity-anomaly-alerts/mine",
  workerOnly,
  getMyElectricityAnomalyAlertsHandler,
);

export default router;
