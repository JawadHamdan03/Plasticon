import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import {
    createQualityCheck,
    getAllQualityChecks,
    getMyQualityChecks,
    resolveQualityCheck,
    deleteQualityCheck,
} from "../services/qualityServices";

export const createQualityCheckHandler = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: "Not authorized" });
            return;
        }

        const result = await createQualityCheck(userId, req.body);

        if (result.message) {
            res.status(result.status).json({ message: result.message });
            return;
        }

        res.status(result.status).json(result.data);
    } catch (error) {
        console.error("Create quality check error:", error);
        res.status(500).json({ message: "Failed to create quality check" });
    }
};

export const getMyQualityChecksHandler = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: "Not authorized" });
            return;
        }

        const result = await getMyQualityChecks(userId);
        res.status(result.status).json(result.data);
    } catch (error) {
        console.error("Get my quality checks error:", error);
        res.status(500).json({ message: "Failed to fetch quality checks" });
    }
};

export const getAllQualityChecksHandler = async (_req: Request, res: Response) => {
    try {
        const result = await getAllQualityChecks();
        res.status(result.status).json(result.data);
    } catch (error) {
        console.error("Get all quality checks error:", error);
        res.status(500).json({ message: "Failed to fetch quality checks" });
    }
};

export const resolveQualityCheckHandler = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) { res.status(401).json({ message: "Not authorized" }); return; }
        const result = await resolveQualityCheck(userId, Number(req.params.id));
        if (result.message && result.status !== 200) { res.status(result.status).json({ message: result.message }); return; }
        res.status(result.status).json(result.data ?? { message: result.message });
    } catch (error) {
        console.error("Resolve quality check error:", error);
        res.status(500).json({ message: "Failed to resolve quality check" });
    }
};

export const deleteQualityCheckHandler = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) { res.status(401).json({ message: "Not authorized" }); return; }
        const result = await deleteQualityCheck(userId, Number(req.params.id), req.user?.role);
        res.status(result.status).json({ message: result.message });
    } catch (error) {
        console.error("Delete quality check error:", error);
        res.status(500).json({ message: "Failed to delete quality check" });
    }
};
