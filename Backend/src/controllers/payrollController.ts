import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import {
  calculatePayroll,
  getPayrollAdminOverview,
  getAllPayrolls,
  getMyPayrolls,
  getPayrollById,
  updatePayroll,
  deletePayroll,
  getSalaryConfigs,
  updateSalaryConfig,
  calculateDailyPayroll,
  calculateDailyPayrollsForDate,
  confirmDailyPayroll,
  getDailyPayrollsForAccountant,
  getMyDailyPayrolls,
} from "../services/payrollServices";

export const calculatePayrollHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const calculatedById = req.user?.id;
    if (!calculatedById) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    const result = await calculatePayroll(calculatedById, req.body);

    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }

    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Calculate payroll error:", error);
    res.status(500).json({ message: "Failed to calculate payroll" });
  }
};

export const getAllPayrollsHandler = async (
  _req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const result = await getAllPayrolls();
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Get all payrolls error:", error);
    res.status(500).json({ message: "Failed to fetch payrolls" });
  }
};

export const getMyPayrollsHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    const result = await getMyPayrolls(userId);
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Get my payrolls error:", error);
    res.status(500).json({ message: "Failed to fetch payrolls" });
  }
};

export const getPayrollByIdHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: "id must be a positive integer" });
      return;
    }

    const result = await getPayrollById(id);

    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }

    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Get payroll by id error:", error);
    res.status(500).json({ message: "Failed to fetch payroll" });
  }
};

export const deletePayrollHandler = async (
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

    const result = await deletePayroll(id, deletedById);

    if (result.message && result.status !== 200) {
      res.status(result.status).json({ message: result.message });
      return;
    }

    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Delete payroll error:", error);
    res.status(500).json({ message: "Failed to delete payroll" });
  }
};

export const updatePayrollHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const updatedById = req.user?.id;
    if (!updatedById) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: "id must be a positive integer" });
      return;
    }

    const result = await updatePayroll(id, req.body ?? {}, updatedById);

    if (result.message && result.status !== 200) {
      res.status(result.status).json({ message: result.message });
      return;
    }

    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Update payroll error:", error);
    res.status(500).json({ message: "Failed to update payroll" });
  }
};

export const getPayrollAdminOverviewHandler = async (
  _req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const result = await getPayrollAdminOverview();
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Get payroll admin overview error:", error);
    res.status(500).json({ message: "Failed to fetch payroll overview" });
  }
};

export const getSalaryConfigsHandler = async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await getSalaryConfigs();
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Get salary configs error:", error);
    res.status(500).json({ message: "Failed to fetch salary configs" });
  }
};

export const updateSalaryConfigHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updatedById = req.user?.id;
    if (!updatedById) { res.status(401).json({ message: "Not authorized" }); return; }
    const { role, monthlySalary } = req.body;
    const result = await updateSalaryConfig(role, Number(monthlySalary), updatedById);
    if (result.message && result.status !== 200) { res.status(result.status).json({ message: result.message }); return; }
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Update salary config error:", error);
    res.status(500).json({ message: "Failed to update salary config" });
  }
};

export const calculateDailyPayrollHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const calculatedById = req.user?.id;
    if (!calculatedById) { res.status(401).json({ message: "Not authorized" }); return; }
    const attendanceId = Number(req.body.attendanceId);
    if (!Number.isInteger(attendanceId) || attendanceId <= 0) {
      res.status(400).json({ message: "attendanceId must be a positive integer" }); return;
    }
    const result = await calculateDailyPayroll(attendanceId, calculatedById);
    if (result.message && result.status !== 201) { res.status(result.status).json({ message: result.message }); return; }
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Calculate daily payroll error:", error);
    res.status(500).json({ message: "Failed to calculate daily payroll" });
  }
};

export const confirmDailyPayrollHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const confirmedById = req.user?.id;
    if (!confirmedById) { res.status(401).json({ message: "Not authorized" }); return; }
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ message: "id must be a positive integer" }); return; }
    const result = await confirmDailyPayroll(id, confirmedById);
    if (result.message && result.status !== 200) { res.status(result.status).json({ message: result.message }); return; }
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Confirm daily payroll error:", error);
    res.status(500).json({ message: "Failed to confirm daily payroll" });
  }
};

export const getDailyPayrollsHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const dateStr = req.query.date as string | undefined;
    const result = await getDailyPayrollsForAccountant(dateStr);
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Get daily payrolls error:", error);
    res.status(500).json({ message: "Failed to fetch daily payrolls" });
  }
};

export const calculateDailyPayrollsForDateHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const calculatedById = req.user?.id;
    if (!calculatedById) { res.status(401).json({ message: "Not authorized" }); return; }
    const dateStr = req.body.date as string | undefined;
    if (!dateStr) { res.status(400).json({ message: "date is required (format: YYYY-MM-DD)" }); return; }
    const result = await calculateDailyPayrollsForDate(dateStr, calculatedById);
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Calculate daily payrolls for date error:", error);
    res.status(500).json({ message: "Failed to calculate payrolls" });
  }
};

export const getMyDailyPayrollsHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ message: "Not authorized" }); return; }
    const month = req.query.month as string | undefined;
    const result = await getMyDailyPayrolls(userId, month);
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Get my daily payrolls error:", error);
    res.status(500).json({ message: "Failed to fetch daily payrolls" });
  }
};
