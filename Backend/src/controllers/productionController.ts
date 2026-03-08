import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import {
    createProductionRecord,
    getAllProductionRecords,
    getMyProductionRecords,
} from "../services/productionServices";

export const createProductionHandler = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: "Not authorized" });
            return;
        }

        const result = await createProductionRecord(userId, req.body);

        if (result.message) {
            res.status(result.status).json({ message: result.message });
            return;
        }

        res.status(result.status).json(result.data);
    } catch (error) {
        console.error("Create production error:", error);
        res.status(500).json({ message: "Failed to create production record" });
    }
};

export const getMyProductionHandler = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: "Not authorized" });
            return;
        }

        const result = await getMyProductionRecords(userId);
        res.status(result.status).json(result.data);
    } catch (error) {
        console.error("Get my production error:", error);
        res.status(500).json({ message: "Failed to fetch production records" });
    }
};

export const getAllProductionHandler = async (_req: Request, res: Response) => {
    try {
        const result = await getAllProductionRecords();
        res.status(result.status).json(result.data);
    } catch (error) {
        console.error("Get all production error:", error);
        res.status(500).json({ message: "Failed to fetch production records" });
    }
};
