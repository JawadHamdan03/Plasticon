import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import {
    getAllRawMaterials,
    updateMaterialStock,
    setAlertThreshold,
} from "../services/rawMaterialAlertServices";

export const getAllRawMaterialsHandler = async (_req: Request, res: Response) => {
    try {
        const result = await getAllRawMaterials();
        res.status(result.status).json(result.data);
    } catch (error) {
        console.error("Get raw materials error:", error);
        res.status(500).json({ message: "Failed to fetch raw materials" });
    }
};

export const updateMaterialStockHandler = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const id = Number(req.params.id);
        const result = await updateMaterialStock(id, req.body);
        if (result.message) {
            res.status(result.status).json({ message: result.message });
            return;
        }
        res.status(result.status).json(result.data);
    } catch (error) {
        console.error("Update material stock error:", error);
        res.status(500).json({ message: "Failed to update material stock" });
    }
};

export const setAlertThresholdHandler = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { materialId, minQuantity } = req.body;
        const result = await setAlertThreshold(Number(materialId), Number(minQuantity));
        if (result.message) {
            res.status(result.status).json({ message: result.message });
            return;
        }
        res.status(result.status).json(result.data);
    } catch (error) {
        console.error("Set alert threshold error:", error);
        res.status(500).json({ message: "Failed to set alert threshold" });
    }
};
