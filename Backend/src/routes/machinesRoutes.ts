import { Router } from "express";
import { machinesController } from "../controllers/machinesController";
import { authorizeRoles } from "../middleware/authMiddleware";
import { UserRole } from "../config/generated/prisma/client";

const router = Router();

router.get(
  "/",
  authorizeRoles([UserRole.ADMIN, UserRole.ENGINEER, UserRole.WORKER]),
  machinesController.getAllMachinesHandler,
);

router.post(
  "/",
  authorizeRoles([UserRole.ADMIN]),
  machinesController.createMachineHandler,
);

router.put(
  "/:id",
  authorizeRoles([UserRole.ADMIN]),
  machinesController.updateMachineHandler,
);

router.put(
  "/:id/status",
  authorizeRoles([UserRole.ADMIN]),
  machinesController.updateMachineStatusHandler,
);

router.delete(
  "/:id",
  authorizeRoles([UserRole.ADMIN]),
  machinesController.deleteMachineHandler,
);

export default router;
