import { Router } from "express";
import {
    getAllPerformancesHandler,
    getPerformanceByUserHandler,
    createPerformanceHandler,
    calculatePerformanceHandler,
    deletePerformanceHandler,
} from "../controllers/performanceController";
import { authorizeRoles } from "../middleware/authMiddleware";
import { UserRole } from "../config/generated/prisma/client";

const router = Router();

router.get(
    "/",
    authorizeRoles([UserRole.ADMIN, UserRole.ACCOUNTANT]),
    getAllPerformancesHandler
);

router.get(
    "/:userId",
    authorizeRoles([UserRole.ADMIN, UserRole.ACCOUNTANT]),
    getPerformanceByUserHandler
);

router.post(
    "/",
    authorizeRoles([UserRole.ADMIN, UserRole.ACCOUNTANT]),
    createPerformanceHandler
);

router.post(
    "/calculate",
    authorizeRoles([UserRole.ADMIN, UserRole.ACCOUNTANT]),
    calculatePerformanceHandler
);

router.delete(
    "/:id",
    authorizeRoles([UserRole.ADMIN, UserRole.ACCOUNTANT]),
    deletePerformanceHandler
);

export default router;
