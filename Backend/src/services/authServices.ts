import { Response } from "express";
import { $Enums, User } from "../config/generated/prisma/client";
import { prisma } from "../config/lib/prisma";
import {
  hashPassword,
  generateToken,
  generateActionToken,
  verifyActionToken,
} from "../utils/authServices";
import bcrypt from "bcrypt";
import { auditAsync } from "./auditHelper";
import { AuditAction, AuditEntityType } from "./auditServices";
import { isSmtpConfigured, sendEmail } from "../utils/emailService";

export type RegisterBody = {
  nationalId?: string;
  fullName?: string;
  username?: string;
  phone?: string;
  email?: string;
  password?: string;
  idImage?: string;
  profileImage?: string;
  role?: $Enums.UserRole;
  shiftId?: number | string;
};

type ServiceResult<T> = {
  status: number;
  message?: string;
  data?: T;
};

const appBaseUrl = process.env.APP_BASE_URL || "http://localhost:5173";

const buildVerifyEmailLink = (token: string) =>
  `${appBaseUrl}/verify-email?token=${encodeURIComponent(token)}`;

const buildResetPasswordLink = (token: string) =>
  `${appBaseUrl}/reset-password?token=${encodeURIComponent(token)}`;

const sendEmailSafely = async (params: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}) => {
  try {
    await sendEmail(params);
    return true;
  } catch (error) {
    console.error("email delivery failed:", error);
    return false;
  }
};

const usernamePattern = /^[A-Za-z0-9_]{3,30}$/;
const nationalIdPattern = /^\d{9}$/;
const phonePattern = /^\d{10}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const registerUser = async (
  body: RegisterBody,
): Promise<ServiceResult<{ user: unknown }>> => {
  const nationalId = body.nationalId?.trim();
  const fullName = body.fullName?.trim();
  const username = body.username?.trim();
  const phone = body.phone?.trim();
  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  const idImage = body.idImage;
  const profileImage = body.profileImage;
  const role = body.role;
  const parsedShiftId =
    body.shiftId === undefined || body.shiftId === null || body.shiftId === ""
      ? null
      : Number(body.shiftId);

  if (!nationalId || !fullName || !username || !email || !password || !role) {
    return {
      status: 400,
      message:
        "nationalId, fullName, username, email, password, and role are required",
    };
  }

  if (!nationalIdPattern.test(nationalId)) {
    return { status: 400, message: "nationalId must be exactly 9 digits" };
  }

  if (!usernamePattern.test(username)) {
    return {
      status: 400,
      message:
        "username must be 3-30 characters and contain only letters, numbers, or underscore",
    };
  }

  if (phone && !phonePattern.test(phone)) {
    return { status: 400, message: "phone number must be exactly 10 digits" };
  }

  if (email && !emailPattern.test(email)) {
    return { status: 400, message: "Invalid email format" };
  }

  if (password.length < 8) {
    return { status: 400, message: "Password must be at least 8 characters" };
  }

  if (!Object.values($Enums.UserRole).includes(role)) {
    return { status: 400, message: "Invalid role" };
  }

  if (parsedShiftId !== null && !Number.isInteger(parsedShiftId)) {
    return { status: 400, message: "shiftId must be a valid integer" };
  }

  if (parsedShiftId !== null) {
    const shiftExists = await prisma.shift.findUnique({
      where: { id: parsedShiftId },
      select: { id: true },
    });

    if (!shiftExists) {
      return { status: 400, message: "shiftId is invalid" };
    }
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ nationalId }, { username }, ...(email ? [{ email }] : [])],
    },
  });

  if (existingUser) {
    return { status: 409, message: "User already exists" };
  }

  const hashedPassword = await hashPassword(password);

  const shouldRequireEmailVerification = Boolean(isSmtpConfigured);

  const user = await prisma.user.create({
    data: {
      nationalId,
      fullName,
      username,
      phone: phone || null,
      email: email || null,
      password: hashedPassword,
      idImage: idImage || null,
      profileImage: profileImage || null,
      role,
      shiftId: parsedShiftId,
      isActive: shouldRequireEmailVerification ? false : true,
    },
    select: {
      id: true,
      nationalId: true,
      fullName: true,
      username: true,
      phone: true,
      email: true,
      idImage: true,
      profileImage: true,
      role: true,
      shiftId: true,
      isActive: true,
      createdAt: true,
    },
  });

  auditAsync(user.id, AuditAction.USER_CREATED, AuditEntityType.USER, user.id, {
    role: user.role,
  });

  if (user.email && shouldRequireEmailVerification) {
    const token = generateActionToken(user.id, "verify-email", "24h");
    const verifyUrl = buildVerifyEmailLink(token);

    const emailSent = await sendEmailSafely({
      to: user.email,
      subject: "Verify your Plasticon account",
      text: `Welcome to Plasticon. Verify your email using this link: ${verifyUrl}`,
      html: `<p>Welcome to Plasticon.</p><p>Please verify your email by clicking <a href="${verifyUrl}">here</a>.</p>`,
    });

    if (!emailSent) {
      await prisma.user.update({
        where: { id: user.id },
        data: { isActive: true },
      });
    }
  }

  return { status: 201, data: { user } };
};

export const loginUser = async (
  email: string,
  password: string,
  res: Response,
): Promise<
  ServiceResult<{
    name: string;
    email: string | null;
    token: string;
    role: $Enums.UserRole;
    profileImage: string | null;
  }>
> => {
  const normalizedEmail = email?.trim().toLowerCase();

  if (!normalizedEmail || !password) {
    return { status: 400, message: "Email and password are required" };
  }

  const user = (await prisma.user.findFirst({
    where: { email: normalizedEmail },
  })) as User;

  if (!user) {
    return { status: 401, message: "invalid email or password" };
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    return { status: 401, message: "invalid email or password" };
  }

  if (!user.isActive) {
    if (!isSmtpConfigured) {
      await prisma.user.update({
        where: { id: user.id },
        data: { isActive: true },
      });
    } else {
      return {
        status: 403,
        message: "Please verify your email before logging in",
      };
    }
  }

  const refreshedUser = (await prisma.user.findUnique({
    where: { id: user.id },
  })) as User;

  if (!refreshedUser) {
    return {
      status: 401,
      message: "invalid email or password",
    };
  }

  const token = generateToken(refreshedUser.id, res);

  auditAsync(
    refreshedUser.id,
    AuditAction.LOGIN,
    AuditEntityType.USER,
    refreshedUser.id,
  );

  return {
    status: 200,
    data: {
      name: refreshedUser.fullName,
      email: refreshedUser.email,
      token,
      role: refreshedUser.role,
      profileImage: refreshedUser.profileImage,
    },
  };
};

export const verifyEmailByToken = async (
  token: string,
): Promise<ServiceResult<{ message: string }>> => {
  if (!token) {
    return { status: 400, message: "Verification token is required" };
  }

  try {
    const decoded = verifyActionToken(token, "verify-email");
    const user = await prisma.user.findUnique({
      where: { id: Number(decoded.id) },
      select: { id: true, email: true, isActive: true },
    });

    if (!user) {
      return { status: 404, message: "User not found" };
    }

    if (user.isActive) {
      return { status: 200, data: { message: "Email already verified" } };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { isActive: true },
    });

    return { status: 200, data: { message: "Email verified successfully" } };
  } catch {
    return { status: 400, message: "Invalid or expired verification token" };
  }
};

export const requestPasswordReset = async (
  email: string,
): Promise<ServiceResult<{ message: string }>> => {
  if (!email) {
    return { status: 400, message: "Email is required" };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, email: true },
  });

  if (!user) {
    console.log("forgot-password: no account matched the requested email");
  }

  if (user?.email) {
    if (!isSmtpConfigured) {
      console.log("forgot-password: SMTP not configured — reset link not sent for user", user.id);
    } else {
      const token = generateActionToken(user.id, "reset-password", "1h");
      const resetUrl = buildResetPasswordLink(token);

      const emailSent = await sendEmailSafely({
        to: user.email,
        subject: "Reset your Plasticon password",
        text: `Reset your password using this link: ${resetUrl}`,
        html: `<p>You requested a password reset.</p><p>Use this link to continue: <a href="${resetUrl}">Reset password</a></p>`,
      });

      console.log("forgot-password: reset flow executed", { userId: user.id, emailSent });
    }
  }

  return {
    status: 200,
    data: {
      message:
        "If an account with this email exists, a password reset link has been sent.",
    },
  };
};

export const resetPasswordByToken = async (
  token: string,
  newPassword: string,
): Promise<ServiceResult<{ message: string }>> => {
  if (!token || !newPassword) {
    return { status: 400, message: "Token and new password are required" };
  }

  if (newPassword.length < 8) {
    return { status: 400, message: "Password must be at least 8 characters" };
  }

  try {
    const decoded = verifyActionToken(token, "reset-password");
    const userId = Number(decoded.id);
    const hashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { status: 200, data: { message: "Password reset successfully" } };
  } catch {
    return { status: 400, message: "Invalid or expired reset token" };
  }
};

export const logoutUser = (
  res: Response,
  userId?: number,
): ServiceResult<{ message: string }> => {
  res.cookie("authToken", "", {
    httpOnly: true,
    expires: new Date(0),
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  if (userId) {
    auditAsync(userId, AuditAction.LOGOUT, AuditEntityType.USER, userId);
  }

  return { status: 200, data: { message: "logged out successfully" } };
};
