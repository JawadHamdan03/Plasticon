import { Router } from "express";
import {
    getAllRawMaterialsHandler,
    updateMaterialStockHandler,
    setAlertThresholdHandler,
} from "../controllers/rawMaterialAlertController";
import { authorizeRoles } from "../middleware/authMiddleware";
import { UserRole } from "../config/generated/prisma/client";

const router = Router();

router.get(
    "/",
    authorizeRoles([UserRole.ENGINEER, UserRole.ADMIN, UserRole.ACCOUNTANT]),
    getAllRawMaterialsHandler
);

router.patch(
    "/:id/stock",
    authorizeRoles([UserRole.ENGINEER, UserRole.ADMIN]),
    updateMaterialStockHandler
);

router.post(
    "/threshold",
    authorizeRoles([UserRole.ENGINEER, UserRole.ADMIN]),
    setAlertThresholdHandler
);

export default router;
