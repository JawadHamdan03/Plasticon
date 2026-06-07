import { Request, Response } from "express";
import { ProductType } from "../config/generated/prisma/client";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import { emitSnapshotCreated } from "../config/socket";
import {
  createSettingsSnapshot as createSettingsSnapshotService,
  deleteSettingsSnapshot as deleteSettingsSnapshotService,
  getAdminSettingsOverview as getAdminSettingsOverviewService,
  getElectricityShiftConsumptionReport as getElectricityShiftConsumptionReportService,
  getProductionSettings as getProductionSettingsService,
  getSettingsSnapshots as getSettingsSnapshotsService,
  getSettingsSnapshotTrend as getSettingsSnapshotTrendService,
  getSystemSettings as getSystemSettingsService,
  updateSettingsSnapshot as updateSettingsSnapshotService,
  upsertProductionSetting as upsertProductionSettingService,
  upsertSystemSettings as upsertSystemSettingsService,
} from "../services/settingsServices";
import {
  getNotificationRulesSettings,
  upsertNotificationRulesSettings,
} from "../services/notificationRuleSettings";

export const getProductionSettings = async (_req: Request, res: Response) => {
  const result = await getProductionSettingsService();
  res.status(result.status).json(result.data);
};

export const upsertProductionSetting = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const productType = req.params.productType as ProductType;
  const { piecesPerCarton } = req.body;

  const result = await upsertProductionSettingService(
    productType,
    piecesPerCarton,
    req.user?.id,
  );

  if (result.message) {
    res.status(result.status).json({ message: result.message });
    return;
  }

  res.status(result.status).json(result.data);
};

export const getSystemSettings = async (_req: Request, res: Response) => {
  const result = await getSystemSettingsService();
  res.status(result.status).json(result.data);
};

export const upsertSystemSettings = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const result = await upsertSystemSettingsService(req.body, req.user?.id);

  if (result.message) {
    res.status(result.status).json({ message: result.message });
    return;
  }

  res.status(result.status).json(result.data);
};

export const getAdminSettingsOverview = async (
  _req: Request,
  res: Response,
) => {
  const result = await getAdminSettingsOverviewService();
  res.status(result.status).json(result.data);
};

export const createSettingsSnapshot = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const files = (req.files ?? {}) as {
      machineCounterImage?: Express.Multer.File[];
      electricityImage?: Express.Multer.File[];
    };

    const machineCounterImagePath = files.machineCounterImage?.[0]
      ? `prisma/pictures/${files.machineCounterImage[0].filename}`
      : null;

    const electricityImagePath = files.electricityImage?.[0]
      ? `prisma/pictures/${files.electricityImage[0].filename}`
      : null;

    const result = await createSettingsSnapshotService(
      {
        machineLabel: String(req.body?.machineLabel ?? ""),
        machineCounter: Number(req.body?.machineCounter),
        electricityKwh: Number(req.body?.electricityKwh),
        notes: typeof req.body?.notes === "string" ? req.body.notes : "",
        machineCounterImage: machineCounterImagePath,
        electricityImage: electricityImagePath,
      },
      req.user?.id,
    );

    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }

    emitSnapshotCreated({ snapshot: result.data });
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("create settings snapshot error:", error);
    res.status(500).json({ message: "Failed to save settings snapshot" });
  }
};

export const updateSettingsSnapshot = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const files = (req.files ?? {}) as {
      machineCounterImage?: Express.Multer.File[];
      electricityImage?: Express.Multer.File[];
    };

    const machineCounterImagePath = files.machineCounterImage?.[0]
      ? `prisma/pictures/${files.machineCounterImage[0].filename}`
      : undefined;

    const electricityImagePath = files.electricityImage?.[0]
      ? `prisma/pictures/${files.electricityImage[0].filename}`
      : undefined;

    const result = await updateSettingsSnapshotService(
      Number(req.params.id),
      {
        machineLabel:
          typeof req.body?.machineLabel === "string"
            ? req.body.machineLabel
            : undefined,
        machineCounter:
          req.body?.machineCounter !== undefined
            ? Number(req.body.machineCounter)
            : undefined,
        electricityKwh:
          req.body?.electricityKwh !== undefined
            ? Number(req.body.electricityKwh)
            : undefined,
        notes: typeof req.body?.notes === "string" ? req.body.notes : undefined,
        machineCounterImage: machineCounterImagePath,
        electricityImage: electricityImagePath,
      },
      req.user?.id,
      req.user?.role === "ADMIN",
    );

    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }

    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("update settings snapshot error:", error);
    res.status(500).json({ message: "Failed to update settings snapshot" });
  }
};

export const deleteSettingsSnapshot = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const result = await deleteSettingsSnapshotService(
      Number(req.params.id),
      req.user?.id,
      req.user?.role === "ADMIN",
    );

    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }

    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("delete settings snapshot error:", error);
    res.status(500).json({ message: "Failed to delete settings snapshot" });
  }
};

export const getSettingsSnapshots = async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const isMineRoute = req.path.endsWith("/mine");

  const result = await getSettingsSnapshotsService(
    req.query.limit,
    req.query.from,
    req.query.to,
    isMineRoute ? authReq.user?.id : undefined,
  );
  res.status(result.status).json(result.data);
};

export const getSettingsSnapshotTrend = async (req: Request, res: Response) => {
  const result = await getSettingsSnapshotTrendService(
    req.query.range,
    req.query.limit,
    req.query.from,
    req.query.to,
  );
  res.status(result.status).json(result.data);
};

export const getElectricityShiftConsumptionReport = async (
  req: Request,
  res: Response,
) => {
  const result = await getElectricityShiftConsumptionReportService(
    req.query.fromDate,
    req.query.toDate,
  );

  if (result.message) {
    res.status(result.status).json({ message: result.message });
    return;
  }

  res.status(result.status).json(result.data);
};

export const getNotificationRules = async (_req: Request, res: Response) => {
  const data = await getNotificationRulesSettings();
  res.status(200).json(data);
};

export const upsertNotificationRules = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const data = await upsertNotificationRulesSettings(req.body, req.user?.id);
  res.status(200).json(data);
};
