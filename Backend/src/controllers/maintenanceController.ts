import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import {
    createMaintenance,
    getAllMaintenances,
    getMyMaintenances,
} from "../services/maintenanceServices";

export const createMaintenanceHandler = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: "Not authorized" });
            return;
        }

        const result = await createMaintenance(userId, req.body);

        if (result.message) {
            res.status(result.status).json({ message: result.message });
            return;
        }

        res.status(result.status).json(result.data);
    } catch (error) {
        console.error("Create maintenance error:", error);
        res.status(500).json({ message: "Failed to create maintenance record" });
    }
};

export const getMyMaintenancesHandler = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: "Not authorized" });
            return;
        }

        const result = await getMyMaintenances(userId);
        res.status(result.status).json(result.data);
    } catch (error) {
        console.error("Get my maintenances error:", error);
        res.status(500).json({ message: "Failed to fetch maintenance records" });
    }
};

export const getAllMaintenancesHandler = async (_req: Request, res: Response) => {
    try {
        const result = await getAllMaintenances();
        res.status(result.status).json(result.data);
    } catch (error) {
        console.error("Get all maintenances error:", error);
        res.status(500).json({ message: "Failed to fetch maintenance records" });
    }
};
