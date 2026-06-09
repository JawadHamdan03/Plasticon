import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import {
  getAllCustomerReturns, createCustomerReturn, updateCustomerReturn, deleteCustomerReturn,
} from "../services/customerReturnServices";

export const getAllCustomerReturnsHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { from, to, productType } = req.query as Record<string, string | undefined>;
    const result = await getAllCustomerReturns({ from, to, productType });
    res.status(result.status).json(result.data ?? { message: result.message });
  } catch {
    res.status(500).json({ message: "Failed to fetch customer returns" });
  }
};

export const createCustomerReturnHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const recordedById = req.user?.id;
    if (!recordedById) { res.status(401).json({ message: "Not authorized" }); return; }
    const invoicePdf = (req.file as Express.Multer.File | undefined)?.filename ?? null;
    const result = await createCustomerReturn(recordedById, { ...req.body as Record<string, unknown>, invoicePdf });
    if (result.message && result.status !== 201) { res.status(result.status).json({ message: result.message }); return; }
    res.status(result.status).json(result.data);
  } catch {
    res.status(500).json({ message: "Failed to create customer return" });
  }
};

export const updateCustomerReturnHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ message: "Invalid id" }); return; }
    const invoicePdf = (req.file as Express.Multer.File | undefined)?.filename ?? undefined;
    const result = await updateCustomerReturn(id, { ...req.body as Record<string, unknown>, ...(invoicePdf ? { invoicePdf } : {}) });
    if (result.message && result.status !== 200) { res.status(result.status).json({ message: result.message }); return; }
    res.status(result.status).json(result.data);
  } catch {
    res.status(500).json({ message: "Failed to update customer return" });
  }
};

export const deleteCustomerReturnHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ message: "Invalid id" }); return; }
    const result = await deleteCustomerReturn(id);
    res.status(result.status).json({ message: result.message });
  } catch {
    res.status(500).json({ message: "Failed to delete customer return" });
  }
};
