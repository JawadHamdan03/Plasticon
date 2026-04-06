import { Router } from "express";
import {
  createSaleHandler,
  getAllSalesHandler,
  getSalesAdminOverviewHandler,
  getMySalesHandler,
} from "../controllers/saleController";
import { authorizeRoles } from "../middleware/authMiddleware";
import { UserRole } from "../config/generated/prisma/client";

const router = Router();

router.post(
  "/",
  authorizeRoles([UserRole.ACCOUNTANT, UserRole.ADMIN]),
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
  "/admin/overview",
  authorizeRoles([UserRole.ADMIN]),
  getSalesAdminOverviewHandler,
);

export default router;
