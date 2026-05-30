import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import {
  createElectricityReading,
  deleteElectricityReading,
  getElectricityReadings,
  getElectricityReport,
  getCurrentKwhPrice,
  getKwhPriceHistory,
  setKwhPrice,
  updateElectricityReading,
} from "../services/electricityServices";

export const getCurrentKwhPriceHandler = async (_req: AuthenticatedRequest, res: Response) => {
  const result = await getCurrentKwhPrice();
  res.status(result.status).json(result.data ?? { message: result.message });
};

export const getKwhPriceHistoryHandler = async (_req: AuthenticatedRequest, res: Response) => {
  const result = await getKwhPriceHistory();
  res.status(result.status).json(result.data);
};

export const setKwhPriceHandler = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }
  const { price, notes } = req.body as Record<string, unknown>;
  const result = await setKwhPrice(userId, price, notes);
  res.status(result.status).json(result.data ?? { message: result.message });
};

export const createReadingHandler = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }
  const imagePath = req.file?.filename ?? undefined;
  const result = await createElectricityReading(userId, { ...req.body as Record<string, unknown>, imagePath });
  res.status(result.status).json(result.data ?? { message: result.message });
};

export const getReadingsHandler = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const role = req.user?.role;
  if (!userId || !role) { res.status(401).json({ message: "Unauthorized" }); return; }
  const result = await getElectricityReadings(
    req.query as Record<string, unknown>,
    role,
    userId,
  );
  res.status(result.status).json(result.data);
};

export const getReportHandler = async (req: AuthenticatedRequest, res: Response) => {
  const result = await getElectricityReport(req.query as Record<string, unknown>);
  res.status(result.status).json(result.data ?? { message: result.message });
};

export const deleteReadingHandler = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const role = req.user?.role;
  if (!userId || !role) { res.status(401).json({ message: "Unauthorized" }); return; }
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ message: "Invalid id" }); return; }
  const result = await deleteElectricityReading(id, userId, role);
  res.status(result.status).json({ message: result.message });
};

export const updateReadingHandler = async (req: AuthenticatedRequest, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ message: "Invalid id" }); return; }
  const result = await updateElectricityReading(id, req.body as Record<string, unknown>);
  res.status(result.status).json(result.data ?? { message: result.message });
};
