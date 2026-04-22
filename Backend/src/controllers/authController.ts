import { Request, Response } from "express";
import fs from "fs/promises";
import {
  loginUser,
  logoutUser,
  requestPasswordReset,
  resetPasswordByToken,
  registerUser,
  verifyEmailByToken,
  type RegisterBody,
} from "../services/authServices";
import { type AuthenticatedRequest } from "../middleware/authMiddleware";

export const registerHandler = async (req: Request, res: Response) => {
  try {
    if (!req.body) {
      res.status(400).json({ message: "Request body is required" });
      return;
    }

    const body = req.body as RegisterBody;
    // Store relative path to the image only if an image is uploaded
    if (req.file) {
      body.profileImage = `prisma/pictures/${req.file.filename}`;
    }
    const result = await registerUser(body);

    if (result.message) {
      if (req.file) {
        await fs.unlink(req.file.path).catch(() => undefined);
      }
      res.status(result.status).json({ message: result.message });
      return;
    }

    res.status(result.status).json(result.data);
  } catch (error) {
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => undefined);
    }
    console.error("Register error:", error);
    res.status(500).json({ message: "Failed to register user" });
  }
};

export const loginHandler = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const result = await loginUser(email, password, res);

    if (result.message) {
      res.status(result.status).send({ error: result.message });
      return;
    }

    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Login error:", error);
    const maybePrismaError = error as { code?: string };
    if (
      maybePrismaError?.code === "P1000" ||
      maybePrismaError?.code === "P1001"
    ) {
      res.status(503).json({
        message:
          "Database connection is unavailable. Check DATABASE_URL credentials and retry.",
      });
      return;
    }

    res.status(500).json({ message: "Failed to login" });
  }
};

export const logoutHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const result = logoutUser(res, req.user?.id);
  res.status(result.status).send(result.data);
};

export const verifyEmailHandler = async (req: Request, res: Response) => {
  const token = typeof req.query.token === "string" ? req.query.token : "";
  const result = await verifyEmailByToken(token);

  if (result.message) {
    res.status(result.status).json({ message: result.message });
    return;
  }

  res.status(result.status).json(result.data);
};

export const forgotPasswordHandler = async (req: Request, res: Response) => {
  const email = typeof req.body?.email === "string" ? req.body.email : "";
  const result = await requestPasswordReset(email);

  if (result.message) {
    res.status(result.status).json({ message: result.message });
    return;
  }

  res.status(result.status).json(result.data);
};

export const resetPasswordHandler = async (req: Request, res: Response) => {
  const token = typeof req.body?.token === "string" ? req.body.token : "";
  const newPassword =
    typeof req.body?.newPassword === "string" ? req.body.newPassword : "";

  const result = await resetPasswordByToken(token, newPassword);

  if (result.message) {
    res.status(result.status).json({ message: result.message });
    return;
  }

  res.status(result.status).json(result.data);
};
