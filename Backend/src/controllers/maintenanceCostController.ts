import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import {
    getAllMaintenanceCosts,
    getCostsByMachine,
    createMaintenanceCost,
    updateMaintenanceCost,
    deleteMaintenanceCost,
} from "../services/maintenanceCostServices";

export const getAllMaintenanceCostsHandler = async (_req: Request, res: Response) => {
    try {
        const result = await getAllMaintenanceCosts();
        res.status(result.status).json(result.data);
    } catch (error) {
        console.error("Get maintenance costs error:", error);
        res.status(500).json({ message: "Failed to fetch maintenance costs" });
    }
};

export const getCostsByMachineHandler = async (req: Request, res: Response) => {
    try {
        const machineId = Number(req.params.machineId);
        const result = await getCostsByMachine(machineId);
        if (result.message && result.status !== 200) {
            res.status(result.status).json({ message: result.message });
            return;
        }
        res.status(result.status).json(result.data);
    } catch (error) {
        console.error("Get costs by machine error:", error);
        res.status(500).json({ message: "Failed to fetch machine costs" });
    }
};

export const createMaintenanceCostHandler = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: "Not authorized" });
            return;
        }
        const result = await createMaintenanceCost(userId, req.body);
        if (result.message) {
            res.status(result.status).json({ message: result.message });
            return;
        }
        res.status(result.status).json(result.data);
    } catch (error) {
        console.error("Create maintenance cost error:", error);
        res.status(500).json({ message: "Failed to create maintenance cost" });
    }
};

export const updateMaintenanceCostHandler = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const result = await updateMaintenanceCost(id, req.body);
        if (result.message) {
            res.status(result.status).json({ message: result.message });
            return;
        }
        res.status(result.status).json(result.data);
    } catch (error) {
        console.error("Update maintenance cost error:", error);
        res.status(500).json({ message: "Failed to update maintenance cost" });
    }
};

export const deleteMaintenanceCostHandler = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const result = await deleteMaintenanceCost(id);
        if (result.message && result.status !== 200) {
            res.status(result.status).json({ message: result.message });
            return;
        }
        res.status(result.status).json(result.data);
    } catch (error) {
        console.error("Delete maintenance cost error:", error);
        res.status(500).json({ message: "Failed to delete maintenance cost" });
    }
};
