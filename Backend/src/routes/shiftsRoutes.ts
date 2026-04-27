import { Router } from "express";
import { shiftsController } from "../controllers/shiftsController";
import { authorizeRoles } from "../middleware/authMiddleware";
import { UserRole } from "../config/generated/prisma/client";

const router = Router();

router.get(
  "/",
  authorizeRoles([UserRole.ADMIN, UserRole.ENGINEER, UserRole.WORKER, UserRole.ACCOUNTANT]),
  shiftsController.getAllShiftsHandler,
);

router.post(
  "/",
  authorizeRoles([UserRole.ADMIN]),
  shiftsController.createShiftHandler,
);

router.put(
  "/:id",
  authorizeRoles([UserRole.ADMIN]),
  shiftsController.updateShiftHandler,
);

router.delete(
  "/:id",
  authorizeRoles([UserRole.ADMIN]),
  shiftsController.deleteShiftHandler,
);

export default router;
