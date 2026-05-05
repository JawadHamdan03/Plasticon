import { Router } from "express";
import {
  requestAccessHandler,
  listRegistrationRequestsHandler,
  approveRegistrationRequestHandler,
  rejectRegistrationRequestHandler,
} from "../controllers/registrationRequestController";
import { authorizeRoles } from "../middleware/authMiddleware";
import { UserRole } from "../config/generated/prisma/client";

const router = Router();

// Public — anyone can submit
router.post("/", requestAccessHandler);

// Admin only
router.get("/", authorizeRoles([UserRole.ADMIN]), listRegistrationRequestsHandler);
router.patch("/:id/approve", authorizeRoles([UserRole.ADMIN]), approveRegistrationRequestHandler);
router.patch("/:id/reject", authorizeRoles([UserRole.ADMIN]), rejectRegistrationRequestHandler);

export default router;
