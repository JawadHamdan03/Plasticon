import { Request, Response } from "express";
import {
  getAllShifts,
  createShift,
  updateShift,
  deleteShift,
} from "../services/shiftsServices";

export const shiftsController = {
  getAllShiftsHandler: async (req: Request, res: Response) => {
    const result = await getAllShifts();
    res
      .status(result.status)
      .json(result.message ? { message: result.message } : result.data);
  },

  createShiftHandler: async (req: Request, res: Response) => {
    const { name, startTime, endTime } = req.body;

    if (!name || !startTime || !endTime) {
      res
        .status(400)
        .json({ message: "name, startTime, and endTime are required" });
      return;
    }

    const result = await createShift(name, startTime, endTime);
    res
      .status(result.status)
      .json(result.message ? { message: result.message } : result.data);
  },

  updateShiftHandler: async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, startTime, endTime } = req.body;

    const result = await updateShift(Number(id), name, startTime, endTime);
    res
      .status(result.status)
      .json(result.message ? { message: result.message } : result.data);
  },

  deleteShiftHandler: async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = await deleteShift(Number(id));
    res
      .status(result.status)
      .json(result.message ? { message: result.message } : { success: true });
  },
};
