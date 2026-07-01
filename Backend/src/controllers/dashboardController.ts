import { Request, Response } from "express";
import {
  getDashboardAnalytics,
  getDashboardCharts,
  getDashboardOverview,
  getQuickStats,
} from "../services/dashboardServices";

export const dashboardController = {
  getAnalyticsHandler: async (req: Request, res: Response) => {
    const result = await getDashboardAnalytics();
    res
      .status(result.status)
      .json(result.message ? { message: result.message } : result.data);
  },

  getOverviewHandler: async (req: Request, res: Response) => {
    const result = await getDashboardOverview();
    res.status(result.status).json(result.message ? { message: result.message } : result.data);
  },

  getQuickStatsHandler: async (req: Request, res: Response) => {
    const result = await getQuickStats();
    res
      .status(result.status)
      .json(result.message ? { message: result.message } : result.data);
  },

  getChartsHandler: async (req: Request, res: Response) => {
    const days = Math.max(1, Math.min(365, Math.floor(Number(req.query.days) || 7)));
    const result = await getDashboardCharts(days);
    res.status(result.status).json(result.message ? { message: result.message } : result.data);
  },
};
