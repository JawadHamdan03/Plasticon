import { Router } from "express";
import { UserRole } from "../config/generated/prisma/client";
import { authorizeRoles } from "../middleware/authMiddleware";
import { uploadDocFields } from "../utils/uploadHandler";
import {
  getAllTechDocumentsHandler,
  createTechDocumentHandler,
  incrementDownloadCountHandler,
  updateTechDocumentHandler,
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

// POST / — ENGINEER, ADMIN: upload document (multipart: title, category, description + optional file + optional images[])
router.post("/", engineerAdmin, uploadDocFields, createTechDocumentHandler);

// PATCH /:id/download — any authenticated: increment download count
router.patch("/:id/download", allRoles, incrementDownloadCountHandler);

// PATCH /:id — ENGINEER, ADMIN: edit title/category/description
router.patch("/:id", engineerAdmin, updateTechDocumentHandler);

// DELETE /:id — ENGINEER, ADMIN: delete document
router.delete("/:id", engineerAdmin, deleteTechDocumentHandler);

export default router;
