import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import {
  getAllFilings,
  createFiling,
  updateFiling,
  deleteFiling,
} from "../services/taxFilingServices";

export const getAllFilingsHandler = async (
  _req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const result = await getAllFilings();
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Get filings error:", error);
    res.status(500).json({ message: "Failed to fetch filings" });
  }
};

export const createFilingHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const filedById = req.user?.id;
    if (!filedById) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    const result = await createFiling(filedById, req.body);
    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Create filing error:", error);
    res.status(500).json({ message: "Failed to create filing" });
  }
};

export const updateFilingHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: "id must be a positive integer" });
      return;
    }

    const result = await updateFiling(id, req.body);
    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Update filing error:", error);
    res.status(500).json({ message: "Failed to update filing" });
  }
};

export const deleteFilingHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: "id must be a positive integer" });
      return;
    }

    const result = await deleteFiling(id);
    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }
    res.status(200).json({ message: "Filing deleted successfully" });
  } catch (error) {
    console.error("Delete filing error:", error);
    res.status(500).json({ message: "Failed to delete filing" });
  }
};
