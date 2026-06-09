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

const salesCreateRoles = [UserRole.ACCOUNTANT, UserRole.ADMIN, UserRole.SALES_REP];
const salesViewRoles   = [UserRole.ACCOUNTANT, UserRole.ADMIN, UserRole.ENGINEER, UserRole.SALES_REP];

router.post(
  "/",
  authorizeRoles(salesCreateRoles),
  uploadInvoice.single("invoiceFile"),
  createSaleHandler,
);
router.get(
  "/all",
  authorizeRoles(salesViewRoles),
  getAllSalesHandler,
);
router.get(
  "/me",
  authorizeRoles(salesCreateRoles),
  getMySalesHandler,
);
router.get(
  "/customers",
  authorizeRoles(salesCreateRoles),
  getCustomerOptionsHandler,
);
router.get(
  "/admin/overview",
  authorizeRoles([UserRole.ADMIN]),
  getSalesAdminOverviewHandler,
);
router.put(
  "/:id",
  authorizeRoles(salesCreateRoles),
  uploadInvoice.single("invoiceFile"),
  updateSaleHandler,
);
router.delete(
  "/:id",
  authorizeRoles(salesCreateRoles),
  deleteSaleHandler,
);

export default router;
