import { Router, type Request, type Response } from "express";
import { registerHandler, loginHandler, logoutHandler } from "../controllers/authController";
import { authorizeRoles } from "../middleware/authMiddleware";
import { UserRole } from "../config/generated/prisma/enums";
import { upload } from "../utils/uploadHandler";

const router = Router();

router.post("/register", authorizeRoles([UserRole.ADMIN]), upload.single('profileImage'), registerHandler);

router.post("/login", loginHandler);

router.post("/logout", authorizeRoles([UserRole.WORKER, UserRole.ENGINEER, UserRole.ACCOUNTANT, UserRole.ADMIN]), logoutHandler);




export default router;