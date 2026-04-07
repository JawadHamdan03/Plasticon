import { Request, Response } from "express";
import {
  getDashboardAnalytics,
  getQuickStats,
} from "../services/dashboardServices";

export const dashboardController = {
  getAnalyticsHandler: async (req: Request, res: Response) => {
    const result = await getDashboardAnalytics();
    res
      .status(result.status)
      .json(result.message ? { message: result.message } : result.data);
  },

  getQuickStatsHandler: async (req: Request, res: Response) => {
    const result = await getQuickStats();
    res
      .status(result.status)
      .json(result.message ? { message: result.message } : result.data);
  },
};
