import { Router } from "express";
import {
  checkInHandler,
  checkOutHandler,
  createAttendanceForUserHandler,
  deleteAttendance,
  getAllAttendances,
  getAttendanceSettingsHandler,
  getMyAttendances,
  updateAttendance,
  updateAttendanceSettingsHandler,
} from "../controllers/attendanceController";
import { authorizeRoles } from "../middleware/authMiddleware";
import { UserRole } from "../config/generated/prisma/client";

const router = Router();

// Static routes before /:id
router.get(
  "/settings",
  authorizeRoles([UserRole.ADMIN, UserRole.ACCOUNTANT]),
  getAttendanceSettingsHandler,
);

router.put(
  "/settings",
  authorizeRoles([UserRole.ADMIN, UserRole.ACCOUNTANT]),
  updateAttendanceSettingsHandler,
);

router.post(
  "/",
  authorizeRoles([UserRole.ADMIN, UserRole.ACCOUNTANT]),
  createAttendanceForUserHandler,
);

router.post(
  "/check-in",
  authorizeRoles([
    UserRole.WORKER,
    UserRole.ENGINEER,
    UserRole.ACCOUNTANT,
    UserRole.ADMIN,
    UserRole.SALES_REP,
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
    UserRole.SALES_REP,
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
    UserRole.SALES_REP,
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
