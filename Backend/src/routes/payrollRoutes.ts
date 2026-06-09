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
  getSalaryConfigsHandler,
  updateSalaryConfigHandler,
  calculateDailyPayrollHandler,
  calculateDailyPayrollsForDateHandler,
  confirmDailyPayrollHandler,
  getDailyPayrollsHandler,
  getMyDailyPayrollsHandler,
  getUserSalariesHandler,
  setUserMonthlySalaryHandler,
  markAttendanceLeaveHandler,
  getDeductionRulesHandler,
  updateDeductionRuleHandler,
  calculateMonthlyPayrollForAllHandler,
} from "../controllers/payrollController";
import { authorizeRoles } from "../middleware/authMiddleware";

const router = Router();

const accountingRoles = [UserRole.ACCOUNTANT, UserRole.ADMIN];
const allRoles = [
  UserRole.WORKER,
  UserRole.ENGINEER,
  UserRole.ACCOUNTANT,
  UserRole.ADMIN,
  UserRole.SALES_REP,
];

// Calculate payroll from attendance for a user — ACCOUNTANT/ADMIN only
// Body: { userId, month, hourlyRate, overtimeRate }
router.post(
  "/calculate",
  authorizeRoles(accountingRoles),
  calculatePayrollHandler,
);

// Bulk monthly payroll: calculate for ALL active users in a month
// Body: { month: "YYYY-MM" }
router.post(
  "/monthly/calculate",
  authorizeRoles(accountingRoles),
  calculateMonthlyPayrollForAllHandler,
);

// ── Salary Config (must be before /:id) ──
router.get("/salary-config", authorizeRoles(allRoles), getSalaryConfigsHandler);
router.put("/salary-config", authorizeRoles([UserRole.ADMIN]), updateSalaryConfigHandler);

// ── Per-user salary overrides ──
router.get("/admin/user-salaries", authorizeRoles(accountingRoles), getUserSalariesHandler);
router.put("/admin/user-salaries/:userId", authorizeRoles([UserRole.ADMIN]), setUserMonthlySalaryHandler);

// ── Mark attendance leave type ──
router.patch("/admin/attendance/:id/leave", authorizeRoles([UserRole.ADMIN]), markAttendanceLeaveHandler);

// ── Deduction Rules ──
router.get("/admin/deduction-rules", authorizeRoles(accountingRoles), getDeductionRulesHandler);
router.put("/admin/deduction-rules/:type", authorizeRoles([UserRole.ADMIN]), updateDeductionRuleHandler);

// ── Daily Payroll (must be before /:id) ──
router.get("/daily", authorizeRoles(accountingRoles), getDailyPayrollsHandler);
router.get("/daily/me", authorizeRoles(allRoles), getMyDailyPayrollsHandler);
router.post("/daily/calculate", authorizeRoles(accountingRoles), calculateDailyPayrollHandler);
router.post("/daily/calculate-date", authorizeRoles(accountingRoles), calculateDailyPayrollsForDateHandler);
router.post("/daily/:id/confirm", authorizeRoles(accountingRoles), confirmDailyPayrollHandler);

// ── Admin overview (must be before /:id) ──
router.get("/admin/overview", authorizeRoles(accountingRoles), getPayrollAdminOverviewHandler);

// ── My payrolls (must be before /:id) ──
router.get("/me", authorizeRoles(allRoles), getMyPayrollsHandler);

// ── All payrolls ──
router.get("/", authorizeRoles(accountingRoles), getAllPayrollsHandler);

// ── Single payroll by id (last — catches anything remaining) ──
router.get("/:id", authorizeRoles(accountingRoles), getPayrollByIdHandler);
router.put("/:id", authorizeRoles(accountingRoles), updatePayrollHandler);
router.delete("/:id", authorizeRoles(accountingRoles), deletePayrollHandler);

export default router;
