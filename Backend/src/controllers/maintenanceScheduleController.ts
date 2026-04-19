import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import {
  getAllMaintenanceSchedules,
  createMaintenanceSchedule,
  updateMaintenanceSchedule,
  deleteMaintenanceSchedule,
} from "../services/maintenanceScheduleServices";

export const getAllMaintenanceSchedulesHandler = async (
  _req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const result = await getAllMaintenanceSchedules();
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Get maintenance schedules error:", error);
    res.status(500).json({ message: "Failed to fetch maintenance schedules" });
  }
};

export const createMaintenanceScheduleHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const createdById = req.user?.id;
    if (!createdById) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    const result = await createMaintenanceSchedule(createdById, req.body);
    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Create maintenance schedule error:", error);
    res.status(500).json({ message: "Failed to create maintenance schedule" });
  }
};

export const updateMaintenanceScheduleHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: "id must be a positive integer" });
      return;
    }

    const result = await updateMaintenanceSchedule(id, req.body);
    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Update maintenance schedule error:", error);
    res.status(500).json({ message: "Failed to update maintenance schedule" });
  }
};

export const deleteMaintenanceScheduleHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: "id must be a positive integer" });
      return;
    }
    const result = await deleteMaintenanceSchedule(id);
    if (result.message && result.status !== 200) {
      res.status(result.status).json({ message: result.message });
      return;
    }
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Delete maintenance schedule error:", error);
    res.status(500).json({ message: "Failed to delete maintenance schedule" });
  }
};
