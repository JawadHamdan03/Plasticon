import { prisma } from "../config/lib/prisma";
import { UserRole } from "../config/generated/prisma/client";
import {
  hashPassword,
  generateActionToken,
} from "../utils/authServices";
import { isSmtpConfigured, sendEmail } from "../utils/emailService";
import { dispatchAutoNotification } from "./notificationServices";
import {
  emitNotificationToUser,
  emitNotificationUnreadCountUpdate,
} from "../config/socket";
import { sendPushToUsers } from "./pushService";

const appBaseUrl = process.env.APP_BASE_URL || "http://localhost:5173";

type ServiceResult<T> = { status: number; message?: string; data?: T };

export const createRegistrationRequest = async (body: {
  fullName: string;
  email: string;
  phone?: string;
  message?: string;
}): Promise<ServiceResult<unknown>> => {
  const email = body.email?.trim().toLowerCase();
  const fullName = body.fullName?.trim();

  if (!fullName || !email) {
    return { status: 400, message: "Full name and email are required" };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: 400, message: "Invalid email format" };
  }

  const existing = await prisma.registrationRequest.findFirst({
    where: { email, status: "PENDING" },
  });
  if (existing) {
    return { status: 409, message: "A pending request for this email already exists" };
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return { status: 409, message: "An account with this email already exists" };
  }

  const request = await prisma.registrationRequest.create({
    data: {
      fullName,
      email,
      phone: body.phone?.trim() || null,
      message: body.message?.trim() || null,
    },
  });

  // Notify all admins (DB + web socket + mobile push)
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", isActive: true, deletedAt: null },
    select: { id: true },
  });

  if (admins.length > 0) {
    const adminIds = admins.map(a => a.id);
    const notifTitle = "New Registration Request";
    const notifMessage = `${fullName} (${email}) is requesting access to the system.`;

    const notes = await prisma.$transaction(
      adminIds.map(userId =>
        prisma.notification.create({
          data: { userId, title: notifTitle, message: notifMessage, type: "REGISTRATION_REQUEST" },
        }),
      ),
    );

    notes.forEach(n => {
      emitNotificationToUser(n.userId, n);
      emitNotificationUnreadCountUpdate(n.userId, { refresh: true });
    });

    sendPushToUsers(adminIds, notifTitle, notifMessage, { type: "REGISTRATION_REQUEST" }).catch(() => undefined);
  }

  return { status: 201, data: { id: request.id, message: "Request submitted successfully" } };
};

export const getRegistrationRequests = async (status?: string): Promise<ServiceResult<unknown>> => {
  const where = status && ["PENDING", "APPROVED", "REJECTED"].includes(status)
    ? { status: status as "PENDING" | "APPROVED" | "REJECTED" }
    : undefined;

  const requests = await prisma.registrationRequest.findMany({
    where,
    include: {
      reviewedBy: { select: { id: true, fullName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return { status: 200, data: requests };
};

export const approveRegistrationRequest = async (
  requestId: number,
  adminId: number,
  role: string,
  reviewNote?: string,
  shiftId?: number | null,
): Promise<ServiceResult<unknown>> => {
  const request = await prisma.registrationRequest.findUnique({ where: { id: requestId } });
  if (!request) return { status: 404, message: "Request not found" };
  if (request.status !== "PENDING") return { status: 400, message: "Request already processed" };

  if (!Object.values(UserRole).includes(role as UserRole)) {
    return { status: 400, message: "Invalid role" };
  }

  const existingUser = await prisma.user.findUnique({ where: { email: request.email } });
  if (existingUser) {
    await prisma.registrationRequest.update({
      where: { id: requestId },
      data: { status: "APPROVED", role: role as UserRole, reviewNote: reviewNote || null, reviewedById: adminId, reviewedAt: new Date() },
    });
    return { status: 400, message: "User with this email already exists" };
  }

  // Build a unique username from email prefix
  const baseUsername = request.email.split("@")[0].replace(/[^A-Za-z0-9_]/g, "").slice(0, 20) || "user";
  let username = baseUsername;
  let attempt = 0;
  while (await prisma.user.findUnique({ where: { username } })) {
    attempt++;
    username = `${baseUsername}${attempt}`;
  }

  // Build a unique nationalId placeholder
  let nationalId = String(Date.now()).slice(-9);
  while (await prisma.user.findUnique({ where: { nationalId } })) {
    nationalId = String(Date.now() + Math.floor(Math.random() * 1000)).slice(-9);
  }

  const tempPassword = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  const hashedPassword = await hashPassword(tempPassword);

  const newUser = await prisma.user.create({
    data: {
      fullName: request.fullName,
      email: request.email,
      phone: request.phone || null,
      username,
      nationalId,
      password: hashedPassword,
      role: role as UserRole,
      isActive: true,
      shiftId: shiftId ?? null,
    },
  });

  // Update request
  await prisma.registrationRequest.update({
    where: { id: requestId },
    data: {
      status: "APPROVED",
      role: role as UserRole,
      reviewNote: reviewNote || null,
      reviewedById: adminId,
      reviewedAt: new Date(),
    },
  });

  // Send set-password email
  const token = generateActionToken(newUser.id, "reset-password", "48h");
  const setPasswordUrl = `${appBaseUrl}/reset-password?token=${encodeURIComponent(token)}&setup=1`;

  const emailBody = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
      <h2 style="color:#f97316">Welcome to Plasticon! 🎉</h2>
      <p>Hi <strong>${request.fullName}</strong>,</p>
      <p>Your access request has been <strong>approved</strong>. Your account has been created with the role: <strong>${role}</strong>.</p>
      <p>Please click the button below to set your password and activate your account:</p>
      <a href="${setPasswordUrl}" style="display:inline-block;padding:.75rem 1.5rem;background:#f97316;color:#fff;border-radius:8px;text-decoration:none;font-weight:700;margin:1rem 0">
        Set My Password
      </a>
      <p style="font-size:.85rem;color:#64748b">This link expires in 48 hours. If you didn't request this, please ignore this email.</p>
    </div>
  `;

  let setPasswordUrlDebug: string | undefined;
  if (isSmtpConfigured) {
    try {
      await sendEmail({
        to: request.email,
        subject: "Your Plasticon account is ready — set your password",
        text: `Your account has been approved. Set your password here: ${setPasswordUrl}`,
        html: emailBody,
      });
    } catch {
      setPasswordUrlDebug = setPasswordUrl;
    }
  } else {
    setPasswordUrlDebug = setPasswordUrl;
  }

  return {
    status: 200,
    data: {
      message: "Request approved and account created",
      userId: newUser.id,
      ...(setPasswordUrlDebug ? { setPasswordUrl: setPasswordUrlDebug } : {}),
    },
  };
};

export const rejectRegistrationRequest = async (
  requestId: number,
  adminId: number,
  reviewNote?: string,
): Promise<ServiceResult<unknown>> => {
  const request = await prisma.registrationRequest.findUnique({ where: { id: requestId } });
  if (!request) return { status: 404, message: "Request not found" };
  if (request.status !== "PENDING") return { status: 400, message: "Request already processed" };

  await prisma.registrationRequest.update({
    where: { id: requestId },
    data: {
      status: "REJECTED",
      reviewNote: reviewNote || null,
      reviewedById: adminId,
      reviewedAt: new Date(),
    },
  });

  return { status: 200, data: { message: "Request rejected" } };
};
