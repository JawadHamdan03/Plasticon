import { Request, Response } from "express";
import {
    getInventorySnapshot,
    getMonthlySalesSummary,
    getWeeklyProductionSummary,
} from "../services/reportServices";

export const getWeeklyProductionSummaryHandler = async (req: Request, res: Response) => {
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
        res.status(500).json({ message: "Failed to fetch weekly production summary" });
    }
};

export const getMonthlySalesSummaryHandler = async (req: Request, res: Response) => {
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

export const getInventorySnapshotHandler = async (req: Request, res: Response) => {
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