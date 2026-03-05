import { Router } from "express";
import {
    checkInHandler,
    checkOutHandler,
    getAllAttendances,
    getMyAttendances,
} from "../controllers/attendanceController";
import { authorizeRoles } from "../middleware/authMiddleware";
import { UserRole } from "../config/generated/prisma/client";

const router = Router();

router.post(
    "/check-in",
    authorizeRoles([UserRole.WORKER, UserRole.ENGINEER, UserRole.ACCOUNTANT, UserRole.ADMIN]),
    checkInHandler
);

router.post(
    "/check-out",
    authorizeRoles([UserRole.WORKER, UserRole.ENGINEER, UserRole.ACCOUNTANT, UserRole.ADMIN]),
    checkOutHandler
);

router.get(
    "/me",
    authorizeRoles([UserRole.WORKER, UserRole.ENGINEER, UserRole.ACCOUNTANT, UserRole.ADMIN]),
    getMyAttendances
);

router.get("/all", authorizeRoles([UserRole.ADMIN]), getAllAttendances);

export default router;
