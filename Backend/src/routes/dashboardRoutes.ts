import { Router } from "express";
import { dashboardController } from "../controllers/dashboardController";
import { authorizeRoles } from "../middleware/authMiddleware";
import { UserRole } from "../config/generated/prisma/client";

const router = Router();

router.get(
  "/analytics",
  authorizeRoles([UserRole.ADMIN]),
  dashboardController.getAnalyticsHandler,
);

router.get(
  "/stats",
  authorizeRoles([UserRole.ADMIN]),
  dashboardController.getQuickStatsHandler,
);

export default router;
