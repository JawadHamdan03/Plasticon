import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import {
  getFinancialDashboard,
  getFinancialSettings,
  updateFinancialSettings,
} from "../services/financialServices";

export const getFinancialDashboardHandler = async (
  _req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const result = await getFinancialDashboard();
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Get financial dashboard error:", error);
    res.status(500).json({ message: "Failed to fetch financial dashboard" });
  }
};

export const getFinancialSettingsHandler = async (
  _req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const result = await getFinancialSettings();
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Get financial settings error:", error);
    res.status(500).json({ message: "Failed to fetch financial settings" });
  }
};

export const updateFinancialSettingsHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const updatedById = req.user?.id;
    if (!updatedById) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    const result = await updateFinancialSettings(updatedById, req.body);
    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Update financial settings error:", error);
    res.status(500).json({ message: "Failed to update financial settings" });
  }
};
