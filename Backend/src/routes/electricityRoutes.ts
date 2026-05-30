import { Router } from "express";
import { UserRole } from "../config/generated/prisma/client";
import { authorizeRoles } from "../middleware/authMiddleware";
import {
  createReadingHandler,
  deleteReadingHandler,
  getCurrentKwhPriceHandler,
  getKwhPriceHistoryHandler,
  getReadingsHandler,
  getReportHandler,
  setKwhPriceHandler,
  updateReadingHandler,
} from "../controllers/electricityController";
import { upload } from "../utils/uploadHandler";

const router = Router();

// kWh price — admin only for write, all authenticated for read
router.get("/kwh-price", authorizeRoles([UserRole.WORKER, UserRole.ENGINEER, UserRole.ACCOUNTANT, UserRole.ADMIN]), getCurrentKwhPriceHandler);
router.get("/kwh-price/history", authorizeRoles([UserRole.ADMIN, UserRole.ACCOUNTANT]), getKwhPriceHistoryHandler);
router.post("/kwh-price", authorizeRoles([UserRole.ADMIN]), setKwhPriceHandler);

// Readings
router.post("/readings", authorizeRoles([UserRole.WORKER, UserRole.ENGINEER, UserRole.ADMIN]), upload.single("image"), createReadingHandler);
router.get("/readings", authorizeRoles([UserRole.WORKER, UserRole.ENGINEER, UserRole.ACCOUNTANT, UserRole.ADMIN]), getReadingsHandler);
router.patch("/readings/:id", authorizeRoles([UserRole.ADMIN]), updateReadingHandler);
router.delete("/readings/:id", authorizeRoles([UserRole.WORKER, UserRole.ENGINEER, UserRole.ADMIN]), deleteReadingHandler);

// Report — admin + accountant
router.get("/report", authorizeRoles([UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.ENGINEER]), getReportHandler);

export default router;
