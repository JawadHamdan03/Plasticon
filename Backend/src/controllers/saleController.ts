import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import {
  createSale,
  getAllSales,
  getMySales,
  getSalesAdminOverview,
} from "../services/saleServices";

export const createSaleHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    const result = await createSale(userId, req.body ?? {});

    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }

    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Create sale error:", error);
    res.status(500).json({ message: "Failed to create sale" });
  }
};

export const getAllSalesHandler = async (
  _req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const result = await getAllSales();
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Get all sales error:", error);
    res.status(500).json({ message: "Failed to fetch sales" });
  }
};

export const getMySalesHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    const result = await getMySales(userId);
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Get my sales error:", error);
    res.status(500).json({ message: "Failed to fetch my sales" });
  }
};

export const getSalesAdminOverviewHandler = async (
  _req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const result = await getSalesAdminOverview();
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Get sales admin overview error:", error);
    res.status(500).json({ message: "Failed to fetch sales overview" });
  }
};
