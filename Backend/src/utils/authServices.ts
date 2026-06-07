import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import { Response } from "express";

const BCRYPT_SALT_ROUNDS = 12;

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
};

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error("JWT_SECRET is missing");
}

export const generateToken = (userId: number, res: Response) => {
  const payload = { id: userId };
  const token = jwt.sign(payload, jwtSecret, { expiresIn: "7d", algorithm: "HS256" });
  res.cookie("authToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 1000 * 60 * 60 * 24 * 7,
  });
  return token;
};

type AuthAction = "verify-email" | "reset-password";

type ActionTokenPayload = {
  id: number;
  purpose: AuthAction;
};

export const generateActionToken = (
  userId: number,
  purpose: AuthAction,
  expiresIn: SignOptions["expiresIn"],
) => {
  const payload: ActionTokenPayload = { id: userId, purpose };
  return jwt.sign(payload, jwtSecret, { expiresIn, algorithm: "HS256" });
};

export const verifyActionToken = (
  token: string,
  expectedPurpose: AuthAction,
) => {
  const decoded = jwt.verify(token, jwtSecret, { algorithms: ["HS256"] }) as ActionTokenPayload;

  if (decoded.purpose !== expectedPurpose) {
    throw new Error("Invalid token purpose");
  }

  return decoded;
};
