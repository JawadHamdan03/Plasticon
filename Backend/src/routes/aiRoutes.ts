import { Router } from "express";
import multer from "multer";
import { authorizeRoles } from "../middleware/authMiddleware.js";
import { extractInvoice } from "../controllers/aiController.js";
import {
  detectAnomalies,
  generateMaintenanceReport,
  generateShiftHandover,
  generateWorkerCoaching,
} from "../controllers/aiExtrasController.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only images (JPEG, PNG, WebP, GIF) and PDFs are allowed"));
  },
});

const router = Router();

// POST /ai/invoice-extract  — ADMIN and ACCOUNTANT only
router.post(
  "/invoice-extract",
  authorizeRoles(["ADMIN", "ACCOUNTANT"]),
  upload.single("file"),
  extractInvoice,
);

// POST /ai/detect-anomalies  — ADMIN and ENGINEER
router.post(
  "/detect-anomalies",
  authorizeRoles(["ADMIN", "ENGINEER"]),
  detectAnomalies,
);

// POST /ai/maintenance-report  — ENGINEER only (also ADMIN)
router.post(
  "/maintenance-report",
  authorizeRoles(["ENGINEER", "ADMIN"]),
  generateMaintenanceReport,
);

// POST /ai/shift-handover  — ADMIN only
router.post(
  "/shift-handover",
  authorizeRoles(["ADMIN"]),
  generateShiftHandover,
);

// POST /ai/worker-coaching  — ADMIN only
router.post(
  "/worker-coaching",
  authorizeRoles(["ADMIN"]),
  generateWorkerCoaching,
);

export default router;
