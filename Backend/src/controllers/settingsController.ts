import { Request, Response } from "express";
import { ProductType } from "../config/generated/prisma/client";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import {
    getProductionSettings as getProductionSettingsService,
    getSystemSettings as getSystemSettingsService,
    upsertProductionSetting as upsertProductionSettingService,
    upsertSystemSettings as upsertSystemSettingsService,
} from "../services/settingsServices";

export const getProductionSettings = async (_req: Request, res: Response) => {
    const result = await getProductionSettingsService();
    res.status(result.status).json(result.data);
};

export const upsertProductionSetting = async (req: AuthenticatedRequest, res: Response) => {
    const productType = req.params.productType as ProductType;
    const { piecesPerCarton } = req.body;

    const result = await upsertProductionSettingService(
        productType,
        piecesPerCarton,
        req.user?.id
    );

    if (result.message) {
        res.status(result.status).json({ message: result.message });
        return;
    }

    res.status(result.status).json(result.data);
};

export const getSystemSettings = async (_req: Request, res: Response) => {
    const result = await getSystemSettingsService();
    res.status(result.status).json(result.data);
};

export const upsertSystemSettings = async (req: AuthenticatedRequest, res: Response) => {
    const result = await upsertSystemSettingsService(req.body, req.user?.id);

    if (result.message) {
        res.status(result.status).json({ message: result.message });
        return;
    }

    res.status(result.status).json(result.data);
};
