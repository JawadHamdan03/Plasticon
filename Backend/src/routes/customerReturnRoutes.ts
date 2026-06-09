import { Router } from "express";
import { UserRole } from "../config/generated/prisma/client";
import {
  getAllCustomerReturnsHandler, createCustomerReturnHandler,
  updateCustomerReturnHandler, deleteCustomerReturnHandler,
} from "../controllers/customerReturnController";
import { authorizeRoles } from "../middleware/authMiddleware";
import { uploadInvoice } from "../utils/uploadHandler";

const router = Router();
const allowedRoles = [UserRole.ACCOUNTANT, UserRole.ADMIN];

router.get("/",      authorizeRoles(allowedRoles), getAllCustomerReturnsHandler);
router.post("/",     authorizeRoles(allowedRoles), uploadInvoice.single("invoicePdf"), createCustomerReturnHandler);
router.put("/:id",   authorizeRoles(allowedRoles), uploadInvoice.single("invoicePdf"), updateCustomerReturnHandler);
router.delete("/:id", authorizeRoles(allowedRoles), deleteCustomerReturnHandler);

export default router;
