import { Router } from "express";
import { UserRole } from "../config/generated/prisma/client";
import {
  getAllInvoicesHandler,
  createInvoiceHandler,
  recordInvoicePaymentHandler,
} from "../controllers/invoiceController";
import { authorizeRoles } from "../middleware/authMiddleware";

const router = Router();

const accountingRoles = [UserRole.ACCOUNTANT, UserRole.ADMIN];

// Get all invoices — ACCOUNTANT/ADMIN
router.get("/", authorizeRoles(accountingRoles), getAllInvoicesHandler);

// Create new invoice — ACCOUNTANT/ADMIN
router.post("/", authorizeRoles(accountingRoles), createInvoiceHandler);

// Record invoice payment — ACCOUNTANT/ADMIN
router.patch("/:id/payment", authorizeRoles(accountingRoles), recordInvoicePaymentHandler);

export default router;
