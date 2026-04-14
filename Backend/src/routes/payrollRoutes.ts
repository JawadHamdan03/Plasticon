import { Router } from "express";
import { UserRole } from "../config/generated/prisma/client";
import {
  calculatePayrollHandler,
  getPayrollAdminOverviewHandler,
  getAllPayrollsHandler,
  getMyPayrollsHandler,
  getPayrollByIdHandler,
  updatePayrollHandler,
  deletePayrollHandler,
} from "../controllers/payrollController";
import { authorizeRoles } from "../middleware/authMiddleware";

const router = Router();

const accountingRoles = [UserRole.ACCOUNTANT, UserRole.ADMIN];
const allRoles = [
  UserRole.WORKER,
  UserRole.ENGINEER,
  UserRole.ACCOUNTANT,
  UserRole.ADMIN,
];

// Calculate payroll from attendance for a user — ACCOUNTANT/ADMIN only
// Body: { userId, month, hourlyRate, overtimeRate }
router.post(
  "/calculate",
  authorizeRoles(accountingRoles),
  calculatePayrollHandler,
);

// Get all payrolls — ACCOUNTANT/ADMIN
router.get("/", authorizeRoles(accountingRoles), getAllPayrollsHandler);

// Admin payroll overview
router.get(
  "/admin/overview",
  authorizeRoles(accountingRoles),
  getPayrollAdminOverviewHandler,
);

// Get my own payrolls — all roles
router.get("/me", authorizeRoles(allRoles), getMyPayrollsHandler);

// Get single payroll by id — ACCOUNTANT/ADMIN
router.get("/:id", authorizeRoles(accountingRoles), getPayrollByIdHandler);

// Update payroll — ACCOUNTANT/ADMIN
router.put("/:id", authorizeRoles(accountingRoles), updatePayrollHandler);

// Delete payroll — ADMIN only
router.delete("/:id", authorizeRoles(accountingRoles), deletePayrollHandler);

export default router;
