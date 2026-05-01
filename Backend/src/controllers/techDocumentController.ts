import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import {
  getAllTechDocuments,
  createTechDocument,
  incrementDownloadCount,
  deleteTechDocument,
} from "../services/techDocumentServices";

export const getAllTechDocumentsHandler = async (
  _req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const result = await getAllTechDocuments();
    if (result.message && result.status !== 200) {
      res.status(result.status).json({ message: result.message });
      return;
    }
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Get all tech documents error:", error);
    res.status(500).json({ message: "Failed to fetch tech documents" });
  }
};

export const createTechDocumentHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const uploadedById = req.user?.id;
    if (!uploadedById) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    const { title, category, description } = req.body;

    const file = req.file;
    const fileName = file?.originalname ?? undefined;
    const filePath = file?.filename ?? undefined;
    const fileSize = file?.size ?? undefined;
    const mimeType = file?.mimetype ?? undefined;

    const result = await createTechDocument(
      uploadedById,
      title,
      category,
      description,
      fileName,
      filePath,
      fileSize,
      mimeType,
    );

    if (result.message && result.status !== 201) {
      res.status(result.status).json({ message: result.message });
      return;
    }
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Create tech document error:", error);
    res.status(500).json({ message: "Failed to create tech document" });
  }
};

export const incrementDownloadCountHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: "id must be a positive integer" });
      return;
    }

    const result = await incrementDownloadCount(id);
    if (result.message && result.status !== 200) {
      res.status(result.status).json({ message: result.message });
      return;
    }
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Increment download count error:", error);
    res.status(500).json({ message: "Failed to update download count" });
  }
};

export const deleteTechDocumentHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: "id must be a positive integer" });
      return;
    }

    const result = await deleteTechDocument(id);
    if (result.message && result.status !== 200) {
      res.status(result.status).json({ message: result.message });
      return;
    }
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Delete tech document error:", error);
    res.status(500).json({ message: "Failed to delete tech document" });
  }
};
