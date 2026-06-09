import { prisma } from "../config/lib/prisma";

type ServiceResult<T> = { status: number; message?: string; data?: T };

const RETURN_INCLUDE = {
  customer: { select: { id: true, name: true } },
  recordedBy: { select: { id: true, fullName: true } },
} as const;

export const getAllCustomerReturns = async (filters: {
  from?: string;
  to?: string;
  productType?: string;
}): Promise<ServiceResult<unknown>> => {
  try {
    const where: Record<string, unknown> = {};
    if (filters.productType) where.productType = filters.productType;
    if (filters.from || filters.to) {
      where.returnDate = {
        ...(filters.from ? { gte: new Date(filters.from) } : {}),
        ...(filters.to ? { lte: new Date(filters.to) } : {}),
      };
    }
    const returns = await prisma.customerReturn.findMany({
      where,
      include: RETURN_INCLUDE,
      orderBy: { returnDate: "desc" },
    });
    return { status: 200, data: returns };
  } catch (error) {
    console.error("Get customer returns error:", error);
    return { status: 500, message: "Failed to fetch customer returns" };
  }
};

export const createCustomerReturn = async (
  recordedById: number,
  payload: Record<string, unknown>,
): Promise<ServiceResult<unknown>> => {
  try {
    const { customerName, customerId, productType, quantity, returnDate, notes, invoicePdf } = payload;

    if (!customerName || typeof customerName !== "string")
      return { status: 400, message: "customerName is required" };
    if (!productType || !["CAPS", "PREFORM", "OTHER"].includes(String(productType)))
      return { status: 400, message: "productType must be CAPS, PREFORM, or OTHER" };
    if (!quantity || Number(quantity) <= 0)
      return { status: 400, message: "quantity must be > 0" };
    if (!returnDate)
      return { status: 400, message: "returnDate is required" };

    const created = await prisma.customerReturn.create({
      data: {
        customerName: customerName.trim(),
        ...(customerId ? { customerId: Number(customerId) } : {}),
        productType: String(productType),
        quantity: Number(quantity),
        returnDate: new Date(String(returnDate)),
        notes: notes ? String(notes).trim() : null,
        invoicePdf: invoicePdf ? String(invoicePdf) : null,
        recordedById,
      },
      include: RETURN_INCLUDE,
    });
    return { status: 201, data: created };
  } catch (error) {
    console.error("Create customer return error:", error);
    return { status: 500, message: "Failed to create customer return" };
  }
};

export const updateCustomerReturn = async (
  id: number,
  payload: Record<string, unknown>,
): Promise<ServiceResult<unknown>> => {
  try {
    const existing = await prisma.customerReturn.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return { status: 404, message: "Return record not found" };

    const { customerName, productType, quantity, returnDate, notes, invoicePdf } = payload;
    const updated = await prisma.customerReturn.update({
      where: { id },
      data: {
        ...(customerName ? { customerName: String(customerName).trim() } : {}),
        ...(productType ? { productType: String(productType) } : {}),
        ...(quantity !== undefined ? { quantity: Number(quantity) } : {}),
        ...(returnDate ? { returnDate: new Date(String(returnDate)) } : {}),
        ...(notes !== undefined ? { notes: notes ? String(notes).trim() : null } : {}),
        ...(invoicePdf !== undefined ? { invoicePdf: String(invoicePdf) } : {}),
      },
      include: RETURN_INCLUDE,
    });
    return { status: 200, data: updated };
  } catch (error) {
    console.error("Update customer return error:", error);
    return { status: 500, message: "Failed to update customer return" };
  }
};

export const deleteCustomerReturn = async (id: number): Promise<ServiceResult<unknown>> => {
  try {
    const existing = await prisma.customerReturn.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return { status: 404, message: "Return record not found" };
    await prisma.customerReturn.delete({ where: { id } });
    return { status: 200, message: "Deleted successfully" };
  } catch (error) {
    console.error("Delete customer return error:", error);
    return { status: 500, message: "Failed to delete customer return" };
  }
};
