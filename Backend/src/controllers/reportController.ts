import { Request, Response } from "express";
import {
  getAttendanceActivityReport,
  getDailyProductionSummary,
  getInventorySnapshot,
  getInventoryActivityReport,
  getMonthlySalesSummary,
  getPayrollActivityReport,
  getProductionActivityReport,
  getWeeklyProductionSummary,
  getYearlySalesSummary,
} from "../services/reportServices";

const readPeriodQuery = (req: Request) => ({
  period: typeof req.query.period === "string" ? req.query.period : undefined,
  date: typeof req.query.date === "string" ? req.query.date : undefined,
  month: typeof req.query.month === "string" ? req.query.month : undefined,
  year: typeof req.query.year === "string" ? req.query.year : undefined,
});

export const getDailyProductionSummaryHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    const result = await getDailyProductionSummary({
      date: typeof req.query.date === "string" ? req.query.date : undefined,
    });

    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }

    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Daily production summary error:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch daily production summary" });
  }
};

export const getProductionActivityReportHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    const result = await getProductionActivityReport(readPeriodQuery(req));
    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Production activity report error:", error);
    res.status(500).json({ message: "Failed to fetch production report" });
  }
};

export const getInventoryActivityReportHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    const result = await getInventoryActivityReport(readPeriodQuery(req));
    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Inventory activity report error:", error);
    res.status(500).json({ message: "Failed to fetch inventory report" });
  }
};

export const getAttendanceActivityReportHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    const result = await getAttendanceActivityReport(readPeriodQuery(req));
    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Attendance activity report error:", error);
    res.status(500).json({ message: "Failed to fetch attendance report" });
  }
};

export const getPayrollActivityReportHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    const result = await getPayrollActivityReport(readPeriodQuery(req));
    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Payroll activity report error:", error);
    res.status(500).json({ message: "Failed to fetch payroll report" });
  }
};

export const getWeeklyProductionSummaryHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    const result = await getWeeklyProductionSummary({
      date: typeof req.query.date === "string" ? req.query.date : undefined,
    });

    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }

    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Weekly production summary error:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch weekly production summary" });
  }
};

export const getMonthlySalesSummaryHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    const result = await getMonthlySalesSummary({
      month: typeof req.query.month === "string" ? req.query.month : undefined,
    });

    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }

    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Monthly sales summary error:", error);
    res.status(500).json({ message: "Failed to fetch monthly sales summary" });
  }
};

export const getInventorySnapshotHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    const result = await getInventorySnapshot({
      lowStockThreshold:
        typeof req.query.lowStockThreshold === "string"
          ? req.query.lowStockThreshold
          : undefined,
    });

    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }

    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Inventory snapshot error:", error);
    res.status(500).json({ message: "Failed to fetch inventory snapshot" });
  }
};

export const getYearlySalesSummaryHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    const result = await getYearlySalesSummary({
      year: typeof req.query.year === "string" ? req.query.year : undefined,
    });

    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }

    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Yearly sales summary error:", error);
    res.status(500).json({ message: "Failed to fetch yearly sales summary" });
  }
};
