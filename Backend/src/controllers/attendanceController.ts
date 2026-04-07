import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import {
  checkIn,
  checkOut,
  getAllAttendances as getAllAttendancesService,
  getMyAttendances as getMyAttendancesService,
  updateAttendance as updateAttendanceService,
} from "../services/attendanceServices";

export const checkInHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    const result = await checkIn(userId);

    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }

    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Check-in error:", error);
    res.status(500).json({ message: "Failed to check in" });
  }
};

export const checkOutHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    const result = await checkOut(userId);

    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }

    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Check-out error:", error);
    res.status(500).json({ message: "Failed to check out" });
  }
};

export const getMyAttendances = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    const result = await getMyAttendancesService(userId);
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Get my attendances error:", error);
    res.status(500).json({ message: "Failed to fetch attendances" });
  }
};

export const getAllAttendances = async (_req: Request, res: Response) => {
  try {
    const result = await getAllAttendancesService();
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Get all attendances error:", error);
    res.status(500).json({ message: "Failed to fetch attendances" });
  }
};

export const updateAttendance = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: "id must be a positive integer" });
      return;
    }

    const result = await updateAttendanceService(id, req.body ?? {});

    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }

    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Update attendance error:", error);
    res.status(500).json({ message: "Failed to update attendance" });
  }
};
