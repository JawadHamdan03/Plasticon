import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import {
  getAllInvoices, getInvoiceById, createInvoice,
  updateInvoice, recordInvoicePayment, deleteInvoice, confirmReceiptInvoice,
  attachInvoiceFile,
} from "../services/invoiceServices";

export const getAllInvoicesHandler = async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await getAllInvoices();
    res.status(result.status).json(result.data);
  } catch {
    res.status(500).json({ message: "Failed to fetch invoices" });
  }
};

export const getInvoiceByIdHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ message: "Invalid id" }); return; }
    const result = await getInvoiceById(id);
    if (result.message) { res.status(result.status).json({ message: result.message }); return; }
    res.status(result.status).json(result.data);
  } catch {
    res.status(500).json({ message: "Failed to fetch invoice" });
  }
};

export const createInvoiceHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const createdById = req.user?.id;
    if (!createdById) { res.status(401).json({ message: "Not authorized" }); return; }
    const result = await createInvoice(createdById, req.body as Record<string, unknown>);
    if (result.message) { res.status(result.status).json({ message: result.message }); return; }
    res.status(result.status).json(result.data);
  } catch {
    res.status(500).json({ message: "Failed to create invoice" });
  }
};

export const updateInvoiceHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ message: "Invalid id" }); return; }
    const result = await updateInvoice(id, req.body as Record<string, unknown>);
    if (result.message) { res.status(result.status).json({ message: result.message }); return; }
    res.status(result.status).json(result.data);
  } catch {
    res.status(500).json({ message: "Failed to update invoice" });
  }
};

export const deleteInvoiceHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ message: "Invalid id" }); return; }
    const result = await deleteInvoice(id);
    res.status(result.status).json({ message: result.message });
  } catch {
    res.status(500).json({ message: "Failed to delete invoice" });
  }
};

export const confirmReceiptInvoiceHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ message: "Invalid id" }); return; }
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ message: "Not authorized" }); return; }
    const result = await confirmReceiptInvoice(id, userId as number);
    if (result.message && result.status !== 200) { res.status(result.status).json({ message: result.message }); return; }
    res.status(result.status).json(result.data);
  } catch {
    res.status(500).json({ message: "Failed to confirm receipt" });
  }
};

export const uploadInvoiceFileHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ message: "Invalid id" }); return; }
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) { res.status(400).json({ message: "No file uploaded" }); return; }
    const result = await attachInvoiceFile(id, `pictures/${file.filename}`);
    if (result.message && result.status !== 200) { res.status(result.status).json({ message: result.message }); return; }
    res.status(result.status).json(result.data);
  } catch {
    res.status(500).json({ message: "Failed to upload file" });
  }
};

export const recordInvoicePaymentHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ message: "Invalid id" }); return; }
    const result = await recordInvoicePayment(id, req.body as { paymentStatus?: string });
    if (result.message) { res.status(result.status).json({ message: result.message }); return; }
    res.status(result.status).json(result.data);
  } catch {
    res.status(500).json({ message: "Failed to record payment" });
  }
};
