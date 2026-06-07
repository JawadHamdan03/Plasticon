import { type Response } from "express";
import { type AuthenticatedRequest } from "../middleware/authMiddleware";
import {
  createSupportMachineReading,
  getMyReadings,
  getAllReadings,
  deleteSupportMachineReading,
} from "../services/supportMachineServices";

export const createReadingHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user!.id;
    const file = (req as any).file as Express.Multer.File | undefined;
    const imagePath = file ? `prisma/pictures/${file.filename}` : null;

    const result = await createSupportMachineReading(userId, {
      ...req.body,
      imagePath,
    });

    if (result.message && result.status !== 201) {
      res.status(result.status).json({ message: result.message });
      return;
    }
    res.status(result.status).json(result.data);
  } catch (err) {
    console.error("createReadingHandler error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getMyReadingsHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user!.id;
    const result = await getMyReadings(userId);
    res.status(result.status).json(result.data);
  } catch (err) {
    console.error("getMyReadingsHandler error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getAllReadingsHandler = async (
  _req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const result = await getAllReadings();
    res.status(result.status).json(result.data);
  } catch (err) {
    console.error("getAllReadingsHandler error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteReadingHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: "Invalid id" });
      return;
    }

    const userId = req.user!.id;
    const isAdmin = (req.user as any).role === "ADMIN";

    const result = await deleteSupportMachineReading(id, userId, isAdmin);

    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }
    res.status(result.status).send();
  } catch (err) {
    console.error("deleteReadingHandler error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};
