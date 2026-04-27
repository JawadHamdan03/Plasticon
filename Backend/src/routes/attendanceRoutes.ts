import { Router } from "express";
import {
  checkInHandler,
  checkOutHandler,
  createAttendanceForUserHandler,
  deleteAttendance,
  getAllAttendances,
  getMyAttendances,
  updateAttendance,
} from "../controllers/attendanceController";
import { authorizeRoles } from "../middleware/authMiddleware";
import { UserRole } from "../config/generated/prisma/client";

const router = Router();

router.post(
  "/",
  authorizeRoles([UserRole.ADMIN]),
  createAttendanceForUserHandler,
);

router.post(
  "/check-in",
  authorizeRoles([
    UserRole.WORKER,
    UserRole.ENGINEER,
    UserRole.ACCOUNTANT,
    UserRole.ADMIN,
  ]),
  checkInHandler,
);

router.post(
  "/check-out",
  authorizeRoles([
    UserRole.WORKER,
    UserRole.ENGINEER,
    UserRole.ACCOUNTANT,
    UserRole.ADMIN,
  ]),
  checkOutHandler,
);

router.get(
  "/me",
  authorizeRoles([
    UserRole.WORKER,
    UserRole.ENGINEER,
    UserRole.ACCOUNTANT,
    UserRole.ADMIN,
  ]),
  getMyAttendances,
);

router.get(
  "/all",
  authorizeRoles([UserRole.ADMIN, UserRole.ACCOUNTANT]),
  getAllAttendances,
);

router.put(
  "/:id",
  authorizeRoles([UserRole.ADMIN, UserRole.ACCOUNTANT]),
  updateAttendance,
);

router.delete(
  "/:id",
  authorizeRoles([UserRole.ADMIN, UserRole.ACCOUNTANT]),
  deleteAttendance,
);

export default router;
