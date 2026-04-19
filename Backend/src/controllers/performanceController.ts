import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import {
    getAllPerformances,
    getPerformanceByUser,
    createPerformance,
    calculatePerformance,
    deletePerformance,
} from "../services/performanceServices";

export const getAllPerformancesHandler = async (req: Request, res: Response) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 50;
        const result = await getAllPerformances(page, limit);
        res.status(result.status).json(result.data);
    } catch (error) {
        console.error("Get performances error:", error);
        res.status(500).json({ message: "Failed to fetch performances" });
    }
};

export const getPerformanceByUserHandler = async (req: Request, res: Response) => {
    try {
        const userId = Number(req.params.userId);
        const result = await getPerformanceByUser(userId);
        if (result.message) {
            res.status(result.status).json({ message: result.message });
            return;
        }
        res.status(result.status).json(result.data);
    } catch (error) {
        console.error("Get user performance error:", error);
        res.status(500).json({ message: "Failed to fetch user performance" });
    }
};

export const createPerformanceHandler = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const calculatedById = req.user?.id;
        if (!calculatedById) {
            res.status(401).json({ message: "Not authorized" });
            return;
        }
        const result = await createPerformance(calculatedById, req.body);
        if (result.message) {
            res.status(result.status).json({ message: result.message });
            return;
        }
        res.status(result.status).json(result.data);
    } catch (error) {
        console.error("Create performance error:", error);
        res.status(500).json({ message: "Failed to create performance record" });
    }
};

export const calculatePerformanceHandler = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const calculatedById = req.user?.id;
        if (!calculatedById) {
            res.status(401).json({ message: "Not authorized" });
            return;
        }
        const result = await calculatePerformance(calculatedById, req.body);
        if (result.message) {
            res.status(result.status).json({ message: result.message });
            return;
        }
        res.status(result.status).json(result.data);
    } catch (error) {
        console.error("Calculate performance error:", error);
        res.status(500).json({ message: "Failed to calculate performance" });
    }
};

export const deletePerformanceHandler = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const result = await deletePerformance(id);
        if (result.message && result.status !== 200) {
            res.status(result.status).json({ message: result.message });
            return;
        }
        res.status(result.status).json(result.data);
    } catch (error) {
        console.error("Delete performance error:", error);
        res.status(500).json({ message: "Failed to delete performance record" });
    }
};
