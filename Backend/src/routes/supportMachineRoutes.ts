import { Router } from "express";
import { authorizeRoles } from "../middleware/authMiddleware";
import { UserRole } from "../config/generated/prisma/client";
import { upload } from "../utils/uploadHandler";
import {
  createReadingHandler,
  getMyReadingsHandler,
  getAllReadingsHandler,
  deleteReadingHandler,
} from "../controllers/supportMachineController";

const router = Router();

router.post(
  "/",
  authorizeRoles([UserRole.ENGINEER, UserRole.WORKER]),
  upload.single("image"),
  createReadingHandler,
);

router.get(
  "/mine",
  authorizeRoles([UserRole.ENGINEER, UserRole.WORKER]),
  getMyReadingsHandler,
);

router.get(
  "/",
  authorizeRoles([UserRole.ADMIN]),
  getAllReadingsHandler,
);

router.delete(
  "/:id",
  authorizeRoles([UserRole.ENGINEER, UserRole.WORKER, UserRole.ADMIN]),
  deleteReadingHandler,
);

export default router;
