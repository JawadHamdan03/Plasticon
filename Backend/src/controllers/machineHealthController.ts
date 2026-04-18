import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import {
  getAllMachineHealthRecords,
  getMachineHealthHistory,
  createMachineHealthRecord,
} from "../services/machineHealthServices";

export const getAllMachineHealthHandler = async (
  _req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const result = await getAllMachineHealthRecords();
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Get all machine health error:", error);
    res.status(500).json({ message: "Failed to fetch machine health records" });
  }
};

export const getMachineHealthHistoryHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const machineId = Number(req.params.machineId);
    if (!Number.isInteger(machineId) || machineId <= 0) {
      res.status(400).json({ message: "machineId must be a positive integer" });
      return;
    }

    const result = await getMachineHealthHistory(machineId);
    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Get machine health history error:", error);
    res.status(500).json({ message: "Failed to fetch machine health history" });
  }
};

export const createMachineHealthRecordHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const recordedById = req.user?.id;
    if (!recordedById) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    const result = await createMachineHealthRecord(recordedById, req.body);
    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Create machine health record error:", error);
    res.status(500).json({ message: "Failed to create machine health record" });
  }
};
