import { Router } from "express";
import {
  createSaleHandler,
  deleteSaleHandler,
  getAllSalesHandler,
  getCustomerOptionsHandler,
  getSalesAdminOverviewHandler,
  getMySalesHandler,
  updateSaleHandler,
} from "../controllers/saleController";
import { authorizeRoles } from "../middleware/authMiddleware";
import { UserRole } from "../config/generated/prisma/client";
import { uploadInvoice } from "../utils/uploadHandler";

const router = Router();

router.post(
  "/",
  authorizeRoles([UserRole.ACCOUNTANT, UserRole.ADMIN]),
  uploadInvoice.single("invoiceFile"),
  createSaleHandler,
);
router.get(
  "/all",
  authorizeRoles([UserRole.ACCOUNTANT, UserRole.ADMIN]),
  getAllSalesHandler,
);
router.get(
  "/me",
  authorizeRoles([UserRole.ACCOUNTANT, UserRole.ADMIN]),
  getMySalesHandler,
);
router.get(
  "/customers",
  authorizeRoles([UserRole.ACCOUNTANT, UserRole.ADMIN]),
  getCustomerOptionsHandler,
);
router.get(
  "/admin/overview",
  authorizeRoles([UserRole.ADMIN]),
  getSalesAdminOverviewHandler,
);
router.put(
  "/:id",
  authorizeRoles([UserRole.ACCOUNTANT, UserRole.ADMIN]),
  uploadInvoice.single("invoiceFile"),
  updateSaleHandler,
);
router.delete(
  "/:id",
  authorizeRoles([UserRole.ACCOUNTANT, UserRole.ADMIN]),
  deleteSaleHandler,
);

export default router;
