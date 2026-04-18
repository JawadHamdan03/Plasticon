import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import {
  getAllInvoices,
  createInvoice,
  recordInvoicePayment,
} from "../services/invoiceServices";

export const getAllInvoicesHandler = async (
  _req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const result = await getAllInvoices();
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Get invoices error:", error);
    res.status(500).json({ message: "Failed to fetch invoices" });
  }
};

export const createInvoiceHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const createdById = req.user?.id;
    if (!createdById) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    const result = await createInvoice(createdById, req.body);
    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Create invoice error:", error);
    res.status(500).json({ message: "Failed to create invoice" });
  }
};

export const recordInvoicePaymentHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: "id must be a positive integer" });
      return;
    }

    const result = await recordInvoicePayment(id, req.body);
    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Record invoice payment error:", error);
    res.status(500).json({ message: "Failed to record invoice payment" });
  }
};
