import { Request, Response } from "express";
import {
  getAllMachines,
  createMachine,
  updateMachine,
  updateMachineStatus,
  deleteMachine,
} from "../services/machinesServices";

export const machinesController = {
  getAllMachinesHandler: async (req: Request, res: Response) => {
    const result = await getAllMachines();
    res
      .status(result.status)
      .json(result.message ? { message: result.message } : result.data);
  },

  createMachineHandler: async (req: Request, res: Response) => {
    const { name, type } = req.body;

    if (!name || !type) {
      res.status(400).json({ message: "name and type are required" });
      return;
    }

    const result = await createMachine(name, type);
    res
      .status(result.status)
      .json(result.message ? { message: result.message } : result.data);
  },

  updateMachineHandler: async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, type, status } = req.body;

    const result = await updateMachine(Number(id), {
      name,
      type,
      status,
    });

    res
      .status(result.status)
      .json(result.message ? { message: result.message } : result.data);
  },

  updateMachineStatusHandler: async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      res.status(400).json({ message: "status is required" });
      return;
    }

    const result = await updateMachineStatus(Number(id), status);
    res
      .status(result.status)
      .json(result.message ? { message: result.message } : result.data);
  },

  deleteMachineHandler: async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = await deleteMachine(Number(id));
    res
      .status(result.status)
      .json(result.message ? { message: result.message } : { success: true });
  },
};
