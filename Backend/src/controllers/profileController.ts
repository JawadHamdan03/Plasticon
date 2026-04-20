import type { Request, Response } from "express";
import {
  getMyProfile,
  updateMyProfile,
  updateProfilePhoto,
  uploadDocument,
  deleteDocument,
} from "../services/profileServices.js";

export const getMyProfileHandler = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }
  const result = await getMyProfile(Number(userId));
  res.status(result.status).json(result.data ?? { message: result.message });
};

export const updateMyProfileHandler = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }
  const result = await updateMyProfile(Number(userId), req.body);
  res.status(result.status).json(result.data ?? { message: result.message });
};

export const updateProfilePhotoHandler = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }
  if (!req.file) { res.status(400).json({ message: "No file uploaded" }); return; }
  const result = await updateProfilePhoto(Number(userId), req.file);
  res.status(result.status).json(result.data ?? { message: result.message });
};

export const uploadDocumentHandler = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }
  if (!req.file) { res.status(400).json({ message: "No file uploaded" }); return; }
  const { title, documentType } = req.body as { title?: string; documentType?: string };
  const result = await uploadDocument(Number(userId), req.file, title ?? "", documentType ?? "OTHER");
  res.status(result.status).json(result.data ?? { message: result.message });
};

export const deleteDocumentHandler = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }
  const result = await deleteDocument(Number(userId), Number(req.params.id));
  res.status(result.status).json(result.data ?? { message: result.message });
};
