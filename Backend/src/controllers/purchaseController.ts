import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import {
    createPurchase,
    getAllPurchases,
    getMyPurchases,
} from "../services/purchaseServices";

export const createPurchaseHandler = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: "Not authorized" });
            return;
        }

        const result = await createPurchase(userId, req.body ?? {});

        if (result.message) {
            res.status(result.status).json({ message: result.message });
            return;
        }

        res.status(result.status).json(result.data);
    } catch (error) {
        console.error("Create purchase error:", error);
        res.status(500).json({ message: "Failed to create purchase" });
    }
};

export const getAllPurchasesHandler = async (_req: AuthenticatedRequest, res: Response) => {
    try {
        const result = await getAllPurchases();
        res.status(result.status).json(result.data);
    } catch (error) {
        console.error("Get all purchases error:", error);
        res.status(500).json({ message: "Failed to fetch purchases" });
    }
};

export const getMyPurchasesHandler = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: "Not authorized" });
            return;
        }

        const result = await getMyPurchases(userId);
        res.status(result.status).json(result.data);
    } catch (error) {
        console.error("Get my purchases error:", error);
        res.status(500).json({ message: "Failed to fetch my purchases" });
    }
};
