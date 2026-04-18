import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import {
  getAllReports,
  createReport,
  updateReport,
  deleteReport,
} from "../services/financialReportServices";

export const getAllReportsHandler = async (
  _req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const result = await getAllReports();
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Get reports error:", error);
    res.status(500).json({ message: "Failed to fetch reports" });
  }
};

export const createReportHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const generatedById = req.user?.id;
    if (!generatedById) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    const result = await createReport(generatedById, req.body);
    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Create report error:", error);
    res.status(500).json({ message: "Failed to create report" });
  }
};

export const updateReportHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: "id must be a positive integer" });
      return;
    }

    const result = await updateReport(id, req.body);
    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Update report error:", error);
    res.status(500).json({ message: "Failed to update report" });
  }
};

export const deleteReportHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: "id must be a positive integer" });
      return;
    }

    const result = await deleteReport(id);
    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }
    res.status(200).json({ message: "Report deleted successfully" });
  } catch (error) {
    console.error("Delete report error:", error);
    res.status(500).json({ message: "Failed to delete report" });
  }
};
