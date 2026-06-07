import { Router } from "express";
import { UserRole } from "../config/generated/prisma/client";
import { authorizeRoles } from "../middleware/authMiddleware";
import { upload } from "../utils/uploadHandler";
import {
  getAllSparePartRequestsHandler,
  getMySparePartRequestsHandler,
  createSparePartRequestHandler,
  updateSparePartRequestHandler,
  setSparePartPriceHandler,
  markSparePartReceivedHandler,
  deleteSparePartRequestHandler,
} from "../controllers/sparePartRequestController";

const router = Router();

const engineerOnly = authorizeRoles([UserRole.ENGINEER, UserRole.ADMIN]);
const adminAccountant = authorizeRoles([UserRole.ADMIN, UserRole.ACCOUNTANT]);
const adminOnly = authorizeRoles([UserRole.ADMIN]);

// GET /mine — ENGINEER: get own requests
router.get("/mine", engineerOnly, getMySparePartRequestsHandler);

// GET / — ADMIN, ACCOUNTANT: get all requests
router.get("/", adminAccountant, getAllSparePartRequestsHandler);

// POST / — ENGINEER: create request (multipart: partName, machineId, quantity, notes + optional photo)
router.post(
  "/",
  engineerOnly,
  upload.single("photo"),
  createSparePartRequestHandler,
);

// PATCH /:id — ENGINEER: update own pending request
router.patch("/:id", engineerOnly, updateSparePartRequestHandler);

// PATCH /:id/price — ACCOUNTANT, ADMIN: set unit price
router.patch("/:id/price", adminAccountant, setSparePartPriceHandler);

// PATCH /:id/received — ENGINEER: mark as received (own requests only)
router.patch("/:id/received", engineerOnly, markSparePartReceivedHandler);

// DELETE /:id — ADMIN: delete request
router.delete("/:id", adminOnly, deleteSparePartRequestHandler);

export default router;
