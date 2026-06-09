import { NextFunction, Request, Response, Router } from "express";
import { authorizeRoles } from "../middleware/authMiddleware.js";
import { UserRole } from "../config/generated/prisma/enums.js";
import { upload, uploadInvoice } from "../utils/uploadHandler.js";
import {
  getMyProfileHandler,
  updateMyProfileHandler,
  updateProfilePhotoHandler,
  uploadDocumentHandler,
  deleteDocumentHandler,
} from "../controllers/profileController.js";

const router = Router();

const ALL_ROLES = [UserRole.ADMIN, UserRole.ENGINEER, UserRole.ACCOUNTANT, UserRole.WORKER, UserRole.SALES_REP];

const handlePhotoUpload = (req: Request, res: Response, next: NextFunction) => {
  upload.single("photo")(req, res, (err: unknown) => {
    if (err) {
      res.status(400).json({ message: err instanceof Error ? err.message : "Upload error" });
      return;
    }
    next();
  });
};

const handleDocumentUpload = (req: Request, res: Response, next: NextFunction) => {
  uploadInvoice.single("document")(req, res, (err: unknown) => {
    if (err) {
      res.status(400).json({ message: err instanceof Error ? err.message : "Upload error" });
      return;
    }
    next();
  });
};

router.get("/me", authorizeRoles(ALL_ROLES), getMyProfileHandler);
router.put("/me", authorizeRoles(ALL_ROLES), updateMyProfileHandler);
router.post("/me/photo", authorizeRoles(ALL_ROLES), handlePhotoUpload, updateProfilePhotoHandler);
router.post("/me/documents", authorizeRoles(ALL_ROLES), handleDocumentUpload, uploadDocumentHandler);
router.delete("/me/documents/:id", authorizeRoles(ALL_ROLES), deleteDocumentHandler);

export default router;
