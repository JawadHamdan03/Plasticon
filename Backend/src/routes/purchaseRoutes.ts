import { Router } from "express";
import {
  createPurchaseHandler,
  deletePurchaseHandler,
  getAllPurchasesHandler,
  getMyPurchasesHandler,
  getSupplierOptionsHandler,
  updatePurchaseHandler,
} from "../controllers/purchaseController";
import { authorizeRoles } from "../middleware/authMiddleware";
import { UserRole } from "../config/generated/prisma/client";
import { uploadInvoice } from "../utils/uploadHandler";

const router = Router();

router.post(
  "/",
  authorizeRoles([UserRole.ACCOUNTANT, UserRole.ADMIN]),
  uploadInvoice.single("invoiceFile"),
  createPurchaseHandler,
);
router.get(
  "/all",
  authorizeRoles([UserRole.ACCOUNTANT, UserRole.ADMIN]),
  getAllPurchasesHandler,
);
router.get(
  "/me",
  authorizeRoles([UserRole.ACCOUNTANT, UserRole.ADMIN]),
  getMyPurchasesHandler,
);
router.get(
  "/suppliers",
  authorizeRoles([UserRole.ACCOUNTANT, UserRole.ADMIN]),
  getSupplierOptionsHandler,
);
router.put(
  "/:id",
  authorizeRoles([UserRole.ACCOUNTANT, UserRole.ADMIN]),
  uploadInvoice.single("invoiceFile"),
  updatePurchaseHandler,
);
router.delete(
  "/:id",
  authorizeRoles([UserRole.ACCOUNTANT, UserRole.ADMIN]),
  deletePurchaseHandler,
);

export default router;
