import { Router } from "express";
import { UserRole } from "../config/generated/prisma/client";
import {
  getAllInvoicesHandler, getInvoiceByIdHandler, createInvoiceHandler,
  updateInvoiceHandler, recordInvoicePaymentHandler, deleteInvoiceHandler,
  confirmReceiptInvoiceHandler, uploadInvoiceFileHandler,
} from "../controllers/invoiceController";
import { authorizeRoles } from "../middleware/authMiddleware";
import { uploadInvoice } from "../utils/uploadHandler";

const router = Router();
const accountingRoles = [UserRole.ACCOUNTANT, UserRole.ADMIN];

router.get("/",          authorizeRoles(accountingRoles), getAllInvoicesHandler);
router.get("/:id",       authorizeRoles(accountingRoles), getInvoiceByIdHandler);
router.post("/",         authorizeRoles(accountingRoles), createInvoiceHandler);
router.put("/:id",       authorizeRoles(accountingRoles), updateInvoiceHandler);
router.patch("/:id/payment", authorizeRoles(accountingRoles), recordInvoicePaymentHandler);
router.patch("/:id/confirm", authorizeRoles(accountingRoles), confirmReceiptInvoiceHandler);
router.patch("/:id/upload",  authorizeRoles(accountingRoles), uploadInvoice.single("file"), uploadInvoiceFileHandler);
router.delete("/:id",    authorizeRoles(accountingRoles), deleteInvoiceHandler);

export default router;
