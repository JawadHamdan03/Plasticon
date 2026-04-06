import { Router } from "express";
import {
  createProductionHandler,
  getProductionAdminOverviewHandler,
  getAllProductionHandler,
  getMyProductionHandler,
} from "../controllers/productionController";
import { authorizeRoles } from "../middleware/authMiddleware";
import { UserRole } from "../config/generated/prisma/client";

const router = Router();

router.post("/", authorizeRoles([UserRole.WORKER]), createProductionHandler);

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
  authorizeRoles([UserRole.ACCOUNTANT, UserRole.ADMIN]),
  getAllProductionHandler,
);

router.get(
  "/admin/overview",
  authorizeRoles([UserRole.ADMIN]),
  getProductionAdminOverviewHandler,
);

export default router;
