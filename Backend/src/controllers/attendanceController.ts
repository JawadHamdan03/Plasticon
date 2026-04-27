import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import {
  checkIn,
  checkOut,
  createAttendanceForUser as createAttendanceForUserService,
  deleteAttendance as deleteAttendanceService,
  getAllAttendances as getAllAttendancesService,
  getMyAttendances as getMyAttendancesService,
  updateAttendance as updateAttendanceService,
} from "../services/attendanceServices";

export const createAttendanceForUserHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const adminId = req.user?.id;
    if (!adminId) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    const userId = Number(req.body.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
      res.status(400).json({ message: "userId must be a positive integer" });
      return;
    }

    const { checkIn: checkInRaw, checkOut: checkOutRaw, shiftId } = req.body as {
      checkIn?: string;
      checkOut?: string | null;
      shiftId?: number | null;
    };

    const result = await createAttendanceForUserService(adminId, {
      userId,
      checkIn: checkInRaw ?? "",
      checkOut: checkOutRaw,
      shiftId: shiftId !== undefined ? (shiftId === null ? null : Number(shiftId)) : undefined,
    });

    if (result.message && result.status !== 201) {
      res.status(result.status).json({ message: result.message });
      return;
    }

    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Create attendance for user error:", error);
    res.status(500).json({ message: "Failed to create attendance record" });
  }
};

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

export const getAllAttendances = async (req: Request, res: Response) => {
  try {
    const date =
      typeof req.query.date === "string" ? req.query.date.trim() : undefined;
    const shiftIdRaw =
      typeof req.query.shiftId === "string"
        ? req.query.shiftId.trim()
        : undefined;
    const userIdRaw =
      typeof req.query.userId === "string"
        ? req.query.userId.trim()
        : undefined;

    let shiftId: number | undefined;
    if (shiftIdRaw) {
      const parsedShiftId = Number(shiftIdRaw);
      if (!Number.isInteger(parsedShiftId) || parsedShiftId <= 0) {
        res.status(400).json({ message: "shiftId must be a positive integer" });
        return;
      }

      shiftId = parsedShiftId;
    }

    let userId: number | undefined;
    if (userIdRaw) {
      const parsedUserId = Number(userIdRaw);
      if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) {
        res.status(400).json({ message: "userId must be a positive integer" });
        return;
      }

      userId = parsedUserId;
    }

    if (shiftIdRaw && shiftId === undefined) {
      res.status(400).json({ message: "shiftId must be a positive integer" });
      return;
    }

    if (userIdRaw && userId === undefined) {
      res.status(400).json({ message: "userId must be a positive integer" });
      return;
    }

    if (date && Number.isNaN(new Date(date).getTime())) {
      res.status(400).json({ message: "date must be a valid date value" });
      return;
    }

    const result = await getAllAttendancesService({ date, shiftId, userId });
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

export const deleteAttendance = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const deletedById = req.user?.id;
    if (!deletedById) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: "id must be a positive integer" });
      return;
    }

    const result = await deleteAttendanceService(id, deletedById);
    if (result.message && result.status !== 200) {
      res.status(result.status).json({ message: result.message });
      return;
    }

    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Delete attendance error:", error);
    res.status(500).json({ message: "Failed to delete attendance" });
  }
};
