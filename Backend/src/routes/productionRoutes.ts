import { Router } from "express";
import {
  createProductionHandler,
  deleteProductionHandler,
  getDailyRawDeductionsHandler,
  getProductionAdminOverviewHandler,
  getAllProductionHandler,
  getMyProductionHandler,
  updateProductionHandler,
} from "../controllers/productionController";
import { authorizeRoles } from "../middleware/authMiddleware";
import { UserRole } from "../config/generated/prisma/client";
import { upload } from "../utils/uploadHandler";

const router = Router();

router.post(
  "/",
  authorizeRoles([UserRole.WORKER, UserRole.ENGINEER]),
  upload.single("document"),
  createProductionHandler,
);

router.get(
  "/me",
  authorizeRoles([
    UserRole.WORKER,
    UserRole.ENGINEER,
    UserRole.ACCOUNTANT,
    UserRole.ADMIN,
  ]),
  getMyProductionHandler,
);

router.get(
  "/all",
  authorizeRoles([UserRole.ACCOUNTANT, UserRole.ENGINEER, UserRole.ADMIN]),
  getAllProductionHandler,
);

router.get(
  "/admin/overview",
  authorizeRoles([UserRole.ADMIN]),
  getProductionAdminOverviewHandler,
);

router.get(
  "/admin/raw-deductions-daily",
  authorizeRoles([UserRole.ADMIN]),
  getDailyRawDeductionsHandler,
);

router.patch(
  "/:id",
  authorizeRoles([UserRole.WORKER, UserRole.ENGINEER, UserRole.ADMIN]),
  updateProductionHandler,
);

router.delete(
  "/:id",
  authorizeRoles([UserRole.WORKER, UserRole.ENGINEER, UserRole.ADMIN]),
  deleteProductionHandler,
);

export default router;
