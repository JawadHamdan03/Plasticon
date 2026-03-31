import { Router } from "express";
import { UserRole } from "../config/generated/prisma/client";
import {
    calculatePayrollHandler,
    getAllPayrollsHandler,
    getMyPayrollsHandler,
    getPayrollByIdHandler,
    deletePayrollHandler,
} from "../controllers/payrollController";
import { authorizeRoles } from "../middleware/authMiddleware";

const router = Router();

const accountingRoles = [UserRole.ACCOUNTANT, UserRole.ADMIN];
const allRoles = [UserRole.WORKER, UserRole.ENGINEER, UserRole.ACCOUNTANT, UserRole.ADMIN];

// Calculate payroll from attendance for a user — ACCOUNTANT/ADMIN only
// Body: { userId, month, hourlyRate, overtimeRate }
router.post("/calculate", authorizeRoles(accountingRoles), calculatePayrollHandler);

// Get all payrolls — ACCOUNTANT/ADMIN
router.get("/", authorizeRoles(accountingRoles), getAllPayrollsHandler);

// Get my own payrolls — all roles
router.get("/me", authorizeRoles(allRoles), getMyPayrollsHandler);

// Get single payroll by id — ACCOUNTANT/ADMIN
router.get("/:id", authorizeRoles(accountingRoles), getPayrollByIdHandler);

// Delete payroll — ADMIN only
router.delete("/:id", authorizeRoles([UserRole.ADMIN]), deletePayrollHandler);

export default router;
