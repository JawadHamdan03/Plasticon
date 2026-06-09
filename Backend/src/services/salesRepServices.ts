import { prisma } from "../config/lib/prisma";
import { QuotationStatus } from "../config/generated/prisma/client";

type ServiceResult<T> = { status: number; data?: T; message?: string };

// ─── Customers ───────────────────────────────────────────────────────────────

export const getMyCustomers = async (repId: number): Promise<ServiceResult<unknown>> => {
  const customers = await prisma.customer.findMany({
    where: { assignedSalesRepId: repId, deletedAt: null },
    include: {
      quotations: { orderBy: { createdAt: "desc" }, take: 1 },
      visits:     { orderBy: { visitDate:  "desc" }, take: 1 },
    },
    orderBy: { name: "asc" },
  });
  return { status: 200, data: customers };
};

export const getAllCustomersForSalesRep = async (): Promise<ServiceResult<unknown>> => {
  const customers = await prisma.customer.findMany({
    where: { deletedAt: null },
    select: {
      id: true, name: true, phone: true, email: true, address: true, assignedSalesRepId: true,
      assignedSalesRep: { select: { id: true, fullName: true } },
    },
    orderBy: { name: "asc" },
  });
  return { status: 200, data: customers };
};

export const createCustomer = async (
  name: string,
  phone?: string,
  email?: string,
  address?: string,
  assignedSalesRepId?: number,
): Promise<ServiceResult<unknown>> => {
  const customer = await prisma.customer.create({
    data: {
      name: name.trim(),
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      address: address?.trim() || null,
      assignedSalesRepId: assignedSalesRepId || null,
    },
  });
  return { status: 201, data: customer };
};

export const assignCustomerToRep = async (
  customerId: number,
  repId: number,
): Promise<ServiceResult<unknown>> => {
  const customer = await prisma.customer.update({
    where: { id: customerId },
    data:  { assignedSalesRepId: repId },
  });
  return { status: 200, data: customer };
};

// ─── Quotations ──────────────────────────────────────────────────────────────

type QuotationItemPayload = {
  productType:  string;
  size:         string;
  quantity:     number;
  pricePerUnit: number;
};

type CreateQuotationPayload = {
  customerId:  number;
  notes?:      string;
  validUntil?: string;
  items:       QuotationItemPayload[];
};

export const createQuotation = async (
  payload: CreateQuotationPayload,
  createdById: number,
): Promise<ServiceResult<unknown>> => {
  const totalAmount = payload.items.reduce(
    (sum, item) => sum + item.quantity * item.pricePerUnit,
    0,
  );

  const quotation = await prisma.quotation.create({
    data: {
      customerId:  payload.customerId,
      createdById,
      notes:       payload.notes ?? null,
      validUntil:  payload.validUntil ? new Date(payload.validUntil) : null,
      totalAmount,
      items: {
        create: payload.items.map((i) => ({
          productType:  i.productType,
          size:         i.size,
          quantity:     i.quantity,
          pricePerUnit: i.pricePerUnit,
        })),
      },
    },
    include: { items: true, customer: { select: { id: true, name: true } } },
  });
  return { status: 201, data: quotation };
};

export const getMyQuotations = async (repId: number): Promise<ServiceResult<unknown>> => {
  const quotations = await prisma.quotation.findMany({
    where:   { createdById: repId },
    include: { items: true, customer: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return { status: 200, data: quotations };
};

export const getAllQuotations = async (): Promise<ServiceResult<unknown>> => {
  const quotations = await prisma.quotation.findMany({
    include: {
      items:     true,
      customer:  { select: { id: true, name: true } },
      createdBy: { select: { id: true, fullName: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return { status: 200, data: quotations };
};

export const updateQuotationStatus = async (
  id: number,
  status: QuotationStatus,
  repId: number,
  isAdmin: boolean,
  rejectionNote?: string,
): Promise<ServiceResult<unknown>> => {
  const existing = await prisma.quotation.findUnique({ where: { id } });
  if (!existing) return { status: 404, message: "Quotation not found" };
  if (!isAdmin && existing.createdById !== repId)
    return { status: 403, message: "Access denied" };

  const updated = await prisma.quotation.update({
    where: { id },
    data:  {
      status,
      rejectionNote: status === "REJECTED" ? (rejectionNote ?? null) : null,
    },
    include: { items: true, customer: { select: { id: true, name: true } } },
  });
  return { status: 200, data: updated };
};

export const deleteQuotation = async (
  id: number,
  repId: number,
  isAdmin: boolean,
): Promise<ServiceResult<unknown>> => {
  const existing = await prisma.quotation.findUnique({ where: { id } });
  if (!existing) return { status: 404, message: "Quotation not found" };
  if (!isAdmin && existing.createdById !== repId)
    return { status: 403, message: "Access denied" };

  await prisma.quotationItem.deleteMany({ where: { quotationId: id } });
  await prisma.quotation.delete({ where: { id } });
  return { status: 200, data: { message: "Deleted" } };
};

// ─── Customer Visits ─────────────────────────────────────────────────────────

type CreateVisitPayload = {
  customerId:  number;
  visitDate:   string;
  outcome?:    string;
  notes?:      string;
  nextVisitAt?: string;
};

export const createCustomerVisit = async (
  payload: CreateVisitPayload,
  loggedById: number,
): Promise<ServiceResult<unknown>> => {
  const visit = await prisma.customerVisit.create({
    data: {
      customerId:  payload.customerId,
      loggedById,
      visitDate:   new Date(payload.visitDate),
      outcome:     payload.outcome ?? null,
      notes:       payload.notes   ?? null,
      nextVisitAt: payload.nextVisitAt ? new Date(payload.nextVisitAt) : null,
    },
    include: { customer: { select: { id: true, name: true } } },
  });
  return { status: 201, data: visit };
};

export const getMyVisits = async (repId: number): Promise<ServiceResult<unknown>> => {
  const visits = await prisma.customerVisit.findMany({
    where:   { loggedById: repId },
    include: { customer: { select: { id: true, name: true } } },
    orderBy: { visitDate: "desc" },
  });
  return { status: 200, data: visits };
};

export const getAllVisits = async (): Promise<ServiceResult<unknown>> => {
  const visits = await prisma.customerVisit.findMany({
    include: {
      customer:  { select: { id: true, name: true } },
      loggedBy:  { select: { id: true, fullName: true } },
    },
    orderBy: { visitDate: "desc" },
  });
  return { status: 200, data: visits };
};

export const deleteCustomerVisit = async (
  id: number,
  repId: number,
  isAdmin: boolean,
): Promise<ServiceResult<unknown>> => {
  const existing = await prisma.customerVisit.findUnique({ where: { id } });
  if (!existing) return { status: 404, message: "Visit not found" };
  if (!isAdmin && existing.loggedById !== repId)
    return { status: 403, message: "Access denied" };

  await prisma.customerVisit.delete({ where: { id } });
  return { status: 200, data: { message: "Deleted" } };
};

// ─── Sales Targets ───────────────────────────────────────────────────────────

export const upsertSalesTarget = async (
  repId: number,
  month: number,
  year: number,
  targetAmount: number,
  notes?: string,
): Promise<ServiceResult<unknown>> => {
  const target = await prisma.salesTarget.upsert({
    where:  { repId_month_year: { repId, month, year } },
    update: { targetAmount, notes: notes ?? null },
    create: { repId, month, year, targetAmount, notes: notes ?? null },
  });
  return { status: 200, data: target };
};

export const getMySalesTargets = async (repId: number): Promise<ServiceResult<unknown>> => {
  const targets = await prisma.salesTarget.findMany({
    where:   { repId },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
  return { status: 200, data: targets };
};

export const getAllSalesTargets = async (): Promise<ServiceResult<unknown>> => {
  const targets = await prisma.salesTarget.findMany({
    include: { rep: { select: { id: true, fullName: true } } },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
  return { status: 200, data: targets };
};

export const updateTargetAchieved = async (
  id: number,
  achievedAmount: number,
): Promise<ServiceResult<unknown>> => {
  const target = await prisma.salesTarget.update({
    where: { id },
    data:  { achievedAmount },
  });
  return { status: 200, data: target };
};

// ─── Dashboard Summary ───────────────────────────────────────────────────────

export const getSalesRepDashboard = async (repId: number, isPrivileged = false): Promise<ServiceResult<unknown>> => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year  = now.getFullYear();

  if (isPrivileged) {
    // Admin/Accountant: aggregate totals across ALL reps
    const [customerCount, quotations, visits, targets] = await Promise.all([
      prisma.customer.count({ where: { deletedAt: null } }),
      prisma.quotation.findMany({
        select:  { id: true, status: true, totalAmount: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take:    10,
      }),
      prisma.customerVisit.findMany({
        include: { customer: { select: { id: true, name: true } } },
        orderBy: { visitDate: "desc" },
        take:    10,
      }),
      prisma.salesTarget.findMany({
        where:   { month, year },
        include: { rep: { select: { id: true, fullName: true } } },
      }),
    ]);
    const totalQuotationValue = quotations.reduce((s, q) => s + q.totalAmount, 0);
    const acceptedCount       = quotations.filter((q) => q.status === "ACCEPTED").length;
    const totalTarget         = targets.reduce((s, t) => s + t.targetAmount, 0);
    const totalAchieved       = targets.reduce((s, t) => s + t.achievedAmount, 0);
    return {
      status: 200,
      data: {
        customerCount,
        totalQuotationValue,
        acceptedQuotations: acceptedCount,
        recentQuotations: quotations,
        recentVisits: visits,
        currentTarget: totalTarget > 0 ? { targetAmount: totalTarget, achievedAmount: totalAchieved } : null,
      },
    };
  }

  const [customerCount, quotations, visits, target] = await Promise.all([
    prisma.customer.count({ where: { assignedSalesRepId: repId, deletedAt: null } }),
    prisma.quotation.findMany({
      where:   { createdById: repId },
      select:  { id: true, status: true, totalAmount: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take:    5,
    }),
    prisma.customerVisit.findMany({
      where:   { loggedById: repId },
      include: { customer: { select: { id: true, name: true } } },
      orderBy: { visitDate: "desc" },
      take:    5,
    }),
    prisma.salesTarget.findUnique({
      where: { repId_month_year: { repId, month, year } },
    }),
  ]);

  const totalQuotationValue = quotations.reduce((s, q) => s + q.totalAmount, 0);
  const acceptedCount = quotations.filter((q) => q.status === "ACCEPTED").length;

  return {
    status: 200,
    data: {
      customerCount,
      totalQuotationValue,
      acceptedQuotations: acceptedCount,
      recentQuotations: quotations,
      recentVisits: visits,
      currentTarget: target,
    },
  };
};
