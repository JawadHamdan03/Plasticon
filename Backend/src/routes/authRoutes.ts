import { Router, type Request, type Response } from "express";
import { registerHandler, loginHandler, logoutHandler } from "../controllers/authController";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware";
import { UserRole } from "../config/generated/prisma/enums";

const router = Router();

router.post("/register", authMiddleware, authorizeRoles([UserRole.ADMIN]), registerHandler);

router.post("/login", loginHandler);

router.post("/logout", logoutHandler);




export default router;