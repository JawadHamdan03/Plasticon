import { Router } from "express";
import {
    getProductionSettings,
    getSystemSettings,
    upsertProductionSetting,
    upsertSystemSettings,
} from "../controllers/settingsController";
import { authorizeRoles } from "../middleware/authMiddleware";
import { UserRole } from "../config/generated/prisma/client";

const router = Router();

router.get("/production", authorizeRoles([UserRole.ADMIN]), getProductionSettings);
router.put("/production/:productType", authorizeRoles([UserRole.ADMIN]), upsertProductionSetting);
router.get("/system", authorizeRoles([UserRole.ADMIN]), getSystemSettings);
router.put("/system", authorizeRoles([UserRole.ADMIN]), upsertSystemSettings);

export default router;
