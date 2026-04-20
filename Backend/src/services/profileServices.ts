import { prisma } from "../config/lib/prisma";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const picturesDir = path.resolve(__dirname, "../../prisma/pictures");

type ServiceResult<T> = { status: number; message?: string; data?: T };

const PROFILE_SELECT = {
  id: true,
  fullName: true,
  username: true,
  email: true,
  phone: true,
  role: true,
  profileImage: true,
  isActive: true,
  shiftId: true,
  bio: true,
  jobTitle: true,
  department: true,
  dateOfBirth: true,
  address: true,
  linkedIn: true,
  skills: true,
  profileCompleted: true,
  createdAt: true,
  userDocuments: {
    select: {
      id: true,
      fileName: true,
      filePath: true,
      fileSize: true,
      mimeType: true,
      documentType: true,
      title: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" as const },
  },
};

export const getMyProfile = async (
  userId: number,
): Promise<ServiceResult<unknown>> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: PROFILE_SELECT,
  });

  if (!user) return { status: 404, message: "User not found" };
  return { status: 200, data: user };
};

export const updateMyProfile = async (
  userId: number,
  payload: {
    bio?: string;
    jobTitle?: string;
    department?: string;
    dateOfBirth?: string;
    address?: string;
    linkedIn?: string;
    skills?: string;
    phone?: string;
    fullName?: string;
  },
): Promise<ServiceResult<unknown>> => {
  const data: Record<string, unknown> = {};

  if (payload.fullName !== undefined) data.fullName = payload.fullName.trim();
  if (payload.phone !== undefined) data.phone = payload.phone.trim() || null;
  if (payload.bio !== undefined) data.bio = payload.bio.trim() || null;
  if (payload.jobTitle !== undefined) data.jobTitle = payload.jobTitle.trim() || null;
  if (payload.department !== undefined) data.department = payload.department.trim() || null;
  if (payload.address !== undefined) data.address = payload.address.trim() || null;
  if (payload.linkedIn !== undefined) data.linkedIn = payload.linkedIn.trim() || null;
  if (payload.skills !== undefined) data.skills = payload.skills || null;
  if (payload.dateOfBirth !== undefined) {
    data.dateOfBirth = payload.dateOfBirth ? new Date(payload.dateOfBirth) : null;
  }

  // Mark profile as completed when key fields are filled
  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...data,
      profileCompleted: true,
    },
    select: PROFILE_SELECT,
  });

  return { status: 200, data: updated };
};

export const updateProfilePhoto = async (
  userId: number,
  file: Express.Multer.File,
): Promise<ServiceResult<unknown>> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { profileImage: true },
  });

  if (!user) return { status: 404, message: "User not found" };

  // Delete old photo if it exists
  if (user.profileImage) {
    const oldPath = path.join(picturesDir, user.profileImage);
    if (fs.existsSync(oldPath)) {
      fs.unlinkSync(oldPath);
    }
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { profileImage: file.filename },
    select: PROFILE_SELECT,
  });

  return { status: 200, data: updated };
};

export const uploadDocument = async (
  userId: number,
  file: Express.Multer.File,
  title: string,
  documentType: string,
): Promise<ServiceResult<unknown>> => {
  const validTypes = ["CV", "CERTIFICATE", "OTHER"];
  const type = validTypes.includes(documentType?.toUpperCase())
    ? documentType.toUpperCase()
    : "OTHER";

  const doc = await prisma.userDocument.create({
    data: {
      userId,
      fileName: file.originalname,
      filePath: file.filename,
      fileSize: file.size,
      mimeType: file.mimetype,
      documentType: type,
      title: title?.trim() || file.originalname,
    },
  });

  return { status: 201, data: doc };
};

export const deleteDocument = async (
  userId: number,
  documentId: number,
): Promise<ServiceResult<{ message: string }>> => {
  const doc = await prisma.userDocument.findUnique({
    where: { id: documentId },
  });

  if (!doc) return { status: 404, message: "Document not found" };
  if (doc.userId !== userId) return { status: 403, message: "Forbidden" };

  // Delete file from disk
  const filePath = path.join(picturesDir, doc.filePath);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  await prisma.userDocument.delete({ where: { id: documentId } });
  return { status: 200, data: { message: "Document deleted" } };
};
