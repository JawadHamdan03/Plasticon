import { Router } from "express";
import { authorizeRoles } from "../middleware/authMiddleware";
import { UserRole } from "../config/generated/prisma/client";
import {
  getDashboard,
  getCustomers,
  createCustomerHandler,
  assignCustomer,
  createQuotationHandler,
  getQuotations,
  patchQuotationStatus,
  deleteQuotationHandler,
  createVisitHandler,
  getVisits,
  deleteVisitHandler,
  upsertTarget,
  getTargets,
  patchTargetAchieved,
} from "../controllers/salesRepController";

const router = Router();
// Only SALES_REP can create; admin and accountant are read-only viewers
const salesRoles    = [UserRole.SALES_REP];
const adminOnly     = [UserRole.ADMIN];
const reviewRoles   = [UserRole.SALES_REP, UserRole.ADMIN, UserRole.ACCOUNTANT];
// SALES_REP can move their own quotation to SENT; ACCOUNTANT can accept/reject
const approveRoles  = [UserRole.SALES_REP, UserRole.ACCOUNTANT];

// Dashboard
router.get("/dashboard", authorizeRoles(reviewRoles), getDashboard);

// Customers — only SALES_REP can create/assign; everyone can view
router.post("/customers",             authorizeRoles(salesRoles),          createCustomerHandler);
router.get("/customers",              authorizeRoles(reviewRoles),         getCustomers);
router.patch("/customers/:id/assign", authorizeRoles(salesRoles),          assignCustomer);

// Quotations — only SALES_REP can create; SALES_REP+ACCOUNTANT can change status; only ADMIN can delete
router.post("/quotations",             authorizeRoles(salesRoles),         createQuotationHandler);
router.get("/quotations",              authorizeRoles(reviewRoles),        getQuotations);
router.patch("/quotations/:id/status", authorizeRoles(approveRoles),       patchQuotationStatus);
router.delete("/quotations/:id",       authorizeRoles(adminOnly),          deleteQuotationHandler);

// Customer visits — only SALES_REP can create; everyone can view; only ADMIN can delete
router.post("/visits",       authorizeRoles(salesRoles),  createVisitHandler);
router.get("/visits",        authorizeRoles(reviewRoles), getVisits);
router.delete("/visits/:id", authorizeRoles(adminOnly),   deleteVisitHandler);

// Sales targets — only SALES_REP can set/update; everyone can view
router.post("/targets",               authorizeRoles(salesRoles),  upsertTarget);
router.get("/targets",                authorizeRoles(reviewRoles), getTargets);
router.patch("/targets/:id/achieved", authorizeRoles(salesRoles),  patchTargetAchieved);

export default router;
