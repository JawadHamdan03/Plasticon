import { NextFunction, Request, Response, Router } from "express";
import {
  registerHandler,
  loginHandler,
  logoutHandler,
  verifyEmailHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
} from "../controllers/authController";
import { authorizeRoles } from "../middleware/authMiddleware";
import { UserRole } from "../config/generated/prisma/enums";
import { upload } from "../utils/uploadHandler";

const router = Router();

const handleRegisterUpload = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  upload.single("profileImage")(req, res, (error: unknown) => {
    if (error) {
      res.status(400).json({
        message:
          error instanceof Error
            ? error.message
            : "Invalid profile image upload",
      });
      return;
    }

    next();
  });
};

router.post(
  "/register",
  authorizeRoles([UserRole.ADMIN]),
  handleRegisterUpload,
  registerHandler,
);

router.post("/login", loginHandler);
router.get("/verify-email", verifyEmailHandler);
router.post("/forgot-password", forgotPasswordHandler);
router.post("/reset-password", resetPasswordHandler);

router.post(
  "/logout",
  authorizeRoles([
    UserRole.WORKER,
    UserRole.ENGINEER,
    UserRole.ACCOUNTANT,
    UserRole.ADMIN,
    UserRole.SALES_REP,
  ]),
  logoutHandler,
);

export default router;
