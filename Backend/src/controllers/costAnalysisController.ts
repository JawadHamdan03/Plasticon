import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import {
  getAllAnalyses,
  createAnalysis,
  updateAnalysis,
  deleteAnalysis,
} from "../services/costAnalysisServices";

export const getAllAnalysesHandler = async (
  _req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const result = await getAllAnalyses();
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Get analyses error:", error);
    res.status(500).json({ message: "Failed to fetch analyses" });
  }
};

export const createAnalysisHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const result = await createAnalysis(req.body);
    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Create analysis error:", error);
    res.status(500).json({ message: "Failed to create analysis" });
  }
};

export const updateAnalysisHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: "id must be a positive integer" });
      return;
    }

    const result = await updateAnalysis(id, req.body);
    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Update analysis error:", error);
    res.status(500).json({ message: "Failed to update analysis" });
  }
};

export const deleteAnalysisHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: "id must be a positive integer" });
      return;
    }

    const result = await deleteAnalysis(id);
    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }
    res.status(200).json({ message: "Analysis deleted successfully" });
  } catch (error) {
    console.error("Delete analysis error:", error);
    res.status(500).json({ message: "Failed to delete analysis" });
  }
};
