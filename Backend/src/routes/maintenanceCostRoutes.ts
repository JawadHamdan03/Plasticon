import { Router } from "express";
import {
    getAllMaintenanceCostsHandler,
    getCostsByMachineHandler,
    createMaintenanceCostHandler,
    updateMaintenanceCostHandler,
    deleteMaintenanceCostHandler,
} from "../controllers/maintenanceCostController";
import { authorizeRoles } from "../middleware/authMiddleware";
import { UserRole } from "../config/generated/prisma/client";

const router = Router();

router.get(
    "/",
    authorizeRoles([UserRole.ENGINEER, UserRole.ADMIN, UserRole.ACCOUNTANT]),
    getAllMaintenanceCostsHandler
);

router.get(
    "/by-machine/:machineId",
    authorizeRoles([UserRole.ENGINEER, UserRole.ADMIN, UserRole.ACCOUNTANT]),
    getCostsByMachineHandler
);

router.post(
    "/",
    authorizeRoles([UserRole.ENGINEER, UserRole.ADMIN]),
    createMaintenanceCostHandler
);

router.patch(
    "/:id",
    authorizeRoles([UserRole.ENGINEER, UserRole.ADMIN]),
    updateMaintenanceCostHandler
);

router.delete(
    "/:id",
    authorizeRoles([UserRole.ENGINEER, UserRole.ADMIN]),
    deleteMaintenanceCostHandler
);

export default router;
