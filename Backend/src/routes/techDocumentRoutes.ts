import { Router } from "express";
import { UserRole } from "../config/generated/prisma/client";
import { authorizeRoles } from "../middleware/authMiddleware";
import { uploadDoc } from "../utils/uploadHandler";
import {
  getAllTechDocumentsHandler,
  createTechDocumentHandler,
  incrementDownloadCountHandler,
  deleteTechDocumentHandler,
} from "../controllers/techDocumentController";

const router = Router();

const allRoles = authorizeRoles([
  UserRole.ENGINEER,
  UserRole.ADMIN,
  UserRole.ACCOUNTANT,
  UserRole.WORKER,
]);
const engineerAdmin = authorizeRoles([UserRole.ENGINEER, UserRole.ADMIN]);
const adminOnly = authorizeRoles([UserRole.ADMIN]);

// GET / — all authenticated roles: get all documents
router.get("/", allRoles, getAllTechDocumentsHandler);

// POST / — ENGINEER, ADMIN: upload document (multipart: title, category, description + optional file)
router.post(
  "/",
  engineerAdmin,
  uploadDoc.single("file"),
  createTechDocumentHandler,
);

// PATCH /:id/download — any authenticated: increment download count
router.patch("/:id/download", allRoles, incrementDownloadCountHandler);

// DELETE /:id — ADMIN: delete document
router.delete("/:id", adminOnly, deleteTechDocumentHandler);

export default router;
