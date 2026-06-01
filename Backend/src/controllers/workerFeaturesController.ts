import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import {
  createElectricityAnomalyAlert,
  createKaizenSuggestion,
  createMachineStopAlert,
  createMaterialWasteLog,
  createMicroStop,
  createQualityIssueReport,
  deleteMyWorkerFeatureEntry,
  getAdminKaizenSuggestions,
  getAllMachineStopAlerts,
  getAdminWorkerToolsOverview,
  getMyDailyTargets,
  getMyElectricityAnomalyAlerts,
  getMyKaizenSuggestions,
  getMyMachineStopAlerts,
  getMyMaterialWasteLogs,
  getMyMicroStops,
  getMyQualityIssueReports,
  getMyShiftChecklists,
  reviewKaizenSuggestion,
  resolveMachineStopAlert,
  resolveAnyMachineStopAlert,
  saveDailyTargetProgress,
  saveShiftChecklist,
} from "../services/workerFeaturesServices";

const withUserId = (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: "Not authorized" });
    return null;
  }
  return userId;
};

const handle = async (
  res: Response,
  action: () => Promise<{ status: number; message?: string; data?: unknown }>,
) => {
  const result = await action();
  if (result.message) {
    res.status(result.status).json({ message: result.message });
    return;
  }
  res.status(result.status).json(result.data);
};

export const createMachineStopAlertHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const userId = withUserId(req, res);
  if (!userId) return;
  await handle(res, () => createMachineStopAlert(userId, req.body));
};

export const getMyMachineStopAlertsHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const userId = withUserId(req, res);
  if (!userId) return;
  await handle(res, () => getMyMachineStopAlerts(userId));
};

export const resolveMachineStopAlertHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const userId = withUserId(req, res);
  if (!userId) return;
  await handle(res, () =>
    resolveMachineStopAlert(userId, Number(req.params.id)),
  );
};

export const getAdminMachineStopAlertsHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const status = typeof req.query.status === "string" ? req.query.status as "open" | "resolved" | "all" : "all";
  const priority = typeof req.query.priority === "string" ? req.query.priority : undefined;
  await handle(res, () => getAllMachineStopAlerts({ status, priority }));
};

export const resolveAnyMachineStopAlertHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  await handle(res, () => resolveAnyMachineStopAlert(Number(req.params.id)));
};

export const saveShiftChecklistHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const userId = withUserId(req, res);
  if (!userId) return;
  await handle(res, () => saveShiftChecklist(userId, req.body));
};

export const getMyShiftChecklistsHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const userId = withUserId(req, res);
  if (!userId) return;
  await handle(res, () => getMyShiftChecklists(userId));
};

export const createMaterialWasteLogHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const userId = withUserId(req, res);
  if (!userId) return;
  await handle(res, () => createMaterialWasteLog(userId, req.body));
};

export const getMyMaterialWasteLogsHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const userId = withUserId(req, res);
  if (!userId) return;
  await handle(res, () => getMyMaterialWasteLogs(userId));
};

export const saveDailyTargetProgressHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const userId = withUserId(req, res);
  if (!userId) return;
  await handle(res, () => saveDailyTargetProgress(userId, req.body));
};

export const getMyDailyTargetsHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const userId = withUserId(req, res);
  if (!userId) return;
  await handle(res, () => getMyDailyTargets(userId));
};

export const createKaizenSuggestionHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const userId = withUserId(req, res);
  if (!userId) return;
  await handle(res, () => createKaizenSuggestion(userId, req.body));
};

export const getMyKaizenSuggestionsHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const userId = withUserId(req, res);
  if (!userId) return;
  await handle(res, () => getMyKaizenSuggestions(userId));
};

export const getAdminKaizenSuggestionsHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  await handle(res, () =>
    getAdminKaizenSuggestions(
      typeof req.query.reviewStatus === "string"
        ? req.query.reviewStatus
        : undefined,
    ),
  );
};

export const getAdminWorkerToolsOverviewHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const limit = Number(req.query.limit ?? 200);
  const feature =
    typeof req.query.feature === "string" ? req.query.feature : undefined;
  const workerName =
    typeof req.query.workerName === "string" ? req.query.workerName : undefined;
  const fromDate =
    typeof req.query.fromDate === "string" ? req.query.fromDate : undefined;
  const toDate =
    typeof req.query.toDate === "string" ? req.query.toDate : undefined;

  await handle(res, () =>
    getAdminWorkerToolsOverview({
      limit,
      feature,
      workerName,
      fromDate,
      toDate,
    }),
  );
};

export const reviewKaizenSuggestionHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const adminUserId = withUserId(req, res);
  if (!adminUserId) return;

  await handle(res, () =>
    reviewKaizenSuggestion(adminUserId, Number(req.params.id), req.body),
  );
};

export const createQualityIssueReportHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const userId = withUserId(req, res);
  if (!userId) return;

  const issueImage = req.file ? `prisma/pictures/${req.file.filename}` : null;

  await handle(res, () =>
    createQualityIssueReport(userId, {
      ...req.body,
      issueImage,
    }),
  );
};

export const getMyQualityIssueReportsHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const userId = withUserId(req, res);
  if (!userId) return;
  await handle(res, () => getMyQualityIssueReports(userId));
};

export const createMicroStopHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const userId = withUserId(req, res);
  if (!userId) return;
  await handle(res, () => createMicroStop(userId, req.body));
};

export const getMyMicroStopsHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const userId = withUserId(req, res);
  if (!userId) return;
  await handle(res, () => getMyMicroStops(userId));
};

export const createElectricityAnomalyAlertHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const userId = withUserId(req, res);
  if (!userId) return;
  await handle(res, () => createElectricityAnomalyAlert(userId, req.body));
};

export const getMyElectricityAnomalyAlertsHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const userId = withUserId(req, res);
  if (!userId) return;
  await handle(res, () => getMyElectricityAnomalyAlerts(userId));
};

export const deleteMyWorkerFeatureEntryHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const userId = withUserId(req, res);
  if (!userId) return;

  await handle(res, () =>
    deleteMyWorkerFeatureEntry(
      userId,
      String(req.params.feature ?? ""),
      Number(req.params.id),
    ),
  );
};
