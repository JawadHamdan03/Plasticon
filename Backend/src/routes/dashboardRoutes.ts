import { Router } from "express";
import { dashboardController } from "../controllers/dashboardController";
import { authorizeRoles } from "../middleware/authMiddleware";
import { UserRole } from "../config/generated/prisma/client";

const router = Router();

router.get(
  "/overview",
  authorizeRoles([UserRole.ADMIN]),
  dashboardController.getOverviewHandler,
);

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

router.get(
  "/charts",
  authorizeRoles([UserRole.ADMIN]),
  dashboardController.getChartsHandler,
);

export default router;
