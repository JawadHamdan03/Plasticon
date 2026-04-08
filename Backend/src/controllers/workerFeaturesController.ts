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
