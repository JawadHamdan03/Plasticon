import { Router } from "express";
import {
  getUsers,
  getUserById,
  deleteUser,
  updateUser,
  updateUserRole,
} from "../controllers/userController";
import { authorizeRoles } from "../middleware/authMiddleware";
import { UserRole } from "../config/generated/prisma/client";

const router = Router();

router.get("/all", authorizeRoles([UserRole.ADMIN, UserRole.ACCOUNTANT]), getUsers);
router.get("/:id", authorizeRoles([UserRole.ADMIN]), getUserById);
router.put("/:id", authorizeRoles([UserRole.ADMIN]), updateUser);
router.put("/:id/role", authorizeRoles([UserRole.ADMIN]), updateUserRole);
router.delete("/:id", authorizeRoles([UserRole.ADMIN]), deleteUser);

export default router;
