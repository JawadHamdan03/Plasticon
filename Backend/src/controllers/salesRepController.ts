import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import { QuotationStatus } from "../config/generated/prisma/client";
import {
  getMyCustomers,
  getAllCustomersForSalesRep,
  createCustomer,
  assignCustomerToRep,
  createQuotation,
  getMyQuotations,
  getAllQuotations,
  updateQuotationStatus,
  deleteQuotation,
  createCustomerVisit,
  getMyVisits,
  getAllVisits,
  deleteCustomerVisit,
  upsertSalesTarget,
  getMySalesTargets,
  getAllSalesTargets,
  updateTargetAchieved,
  getSalesRepDashboard,
} from "../services/salesRepServices";

// ─── Dashboard ───────────────────────────────────────────────────────────────

export const getDashboard = async (req: AuthenticatedRequest, res: Response) => {
  const isPrivileged = req.user!.role === "ADMIN" || req.user!.role === "ACCOUNTANT";
  const result = await getSalesRepDashboard(req.user!.id, isPrivileged);
  res.status(result.status).json(result.data);
};

// ─── Customers ───────────────────────────────────────────────────────────────

export const getCustomers = async (req: AuthenticatedRequest, res: Response) => {
  const role = req.user!.role;
  const seeAll = role === "ADMIN" || role === "ACCOUNTANT";
  const result = seeAll ? await getAllCustomersForSalesRep() : await getMyCustomers(req.user!.id);
  res.status(result.status).json(result.data);
};

export const createCustomerHandler = async (req: AuthenticatedRequest, res: Response) => {
  const { name, phone, email, address, repId } = req.body;
  if (!name?.trim()) { res.status(400).json({ message: "name is required" }); return; }
  const result = await createCustomer(name, phone, email, address, repId ? Number(repId) : undefined);
  if (result.message) { res.status(result.status).json({ message: result.message }); return; }
  res.status(result.status).json(result.data);
};

export const assignCustomer = async (req: AuthenticatedRequest, res: Response) => {
  const customerId = Number(req.params.id);
  const repId      = Number(req.body.repId ?? req.user!.id);
  const result     = await assignCustomerToRep(customerId, repId);
  if (result.message) { res.status(result.status).json({ message: result.message }); return; }
  res.status(result.status).json(result.data);
};

// ─── Quotations ──────────────────────────────────────────────────────────────

export const createQuotationHandler = async (req: AuthenticatedRequest, res: Response) => {
  const result = await createQuotation(req.body, req.user!.id);
  if (result.message) { res.status(result.status).json({ message: result.message }); return; }
  res.status(result.status).json(result.data);
};

export const getQuotations = async (req: AuthenticatedRequest, res: Response) => {
  const role = req.user!.role;
  const seeAll = role === "ADMIN" || role === "ACCOUNTANT";
  const result = seeAll ? await getAllQuotations() : await getMyQuotations(req.user!.id);
  res.status(result.status).json(result.data);
};

export const patchQuotationStatus = async (req: AuthenticatedRequest, res: Response) => {
  const id     = Number(req.params.id);
  const status = req.body.status as QuotationStatus;
  if (!status) { res.status(400).json({ message: "status required" }); return; }

  const isPrivileged = req.user!.role === "ADMIN" || req.user!.role === "ACCOUNTANT";
  const rejectionNote = typeof req.body.rejectionNote === "string" ? req.body.rejectionNote.trim() || undefined : undefined;
  const result = await updateQuotationStatus(id, status, req.user!.id, isPrivileged, rejectionNote);
  if (result.message) { res.status(result.status).json({ message: result.message }); return; }
  res.status(result.status).json(result.data);
};

export const deleteQuotationHandler = async (req: AuthenticatedRequest, res: Response) => {
  const result = await deleteQuotation(
    Number(req.params.id), req.user!.id, req.user!.role === "ADMIN",
  );
  if (result.message) { res.status(result.status).json({ message: result.message }); return; }
  res.status(result.status).json(result.data);
};

// ─── Visits ──────────────────────────────────────────────────────────────────

export const createVisitHandler = async (req: AuthenticatedRequest, res: Response) => {
  const result = await createCustomerVisit(req.body, req.user!.id);
  if (result.message) { res.status(result.status).json({ message: result.message }); return; }
  res.status(result.status).json(result.data);
};

export const getVisits = async (req: AuthenticatedRequest, res: Response) => {
  const role = req.user!.role;
  const seeAll = role === "ADMIN" || role === "ACCOUNTANT";
  const result = seeAll ? await getAllVisits() : await getMyVisits(req.user!.id);
  res.status(result.status).json(result.data);
};

export const deleteVisitHandler = async (req: AuthenticatedRequest, res: Response) => {
  const result = await deleteCustomerVisit(
    Number(req.params.id), req.user!.id, req.user!.role === "ADMIN",
  );
  if (result.message) { res.status(result.status).json({ message: result.message }); return; }
  res.status(result.status).json(result.data);
};

// ─── Targets ─────────────────────────────────────────────────────────────────

export const upsertTarget = async (req: AuthenticatedRequest, res: Response) => {
  const { month, year, targetAmount, notes, repId } = req.body;
  const resolvedRepId = req.user!.role === "ADMIN" && repId ? Number(repId) : req.user!.id;
  const result = await upsertSalesTarget(
    resolvedRepId, Number(month), Number(year), Number(targetAmount), notes,
  );
  if (result.message) { res.status(result.status).json({ message: result.message }); return; }
  res.status(result.status).json(result.data);
};

export const getTargets = async (req: AuthenticatedRequest, res: Response) => {
  const role = req.user!.role;
  const seeAll = role === "ADMIN" || role === "ACCOUNTANT";
  const result = seeAll ? await getAllSalesTargets() : await getMySalesTargets(req.user!.id);
  res.status(result.status).json(result.data);
};

export const patchTargetAchieved = async (req: AuthenticatedRequest, res: Response) => {
  const result = await updateTargetAchieved(
    Number(req.params.id), Number(req.body.achievedAmount),
  );
  if (result.message) { res.status(result.status).json({ message: result.message }); return; }
  res.status(result.status).json(result.data);
};
