import { prisma } from "../config/lib/prisma";

type ServiceResult<T> = {
  status: number;
  message?: string;
  data?: T;
};

export const getAllInvoices = async (): Promise<ServiceResult<unknown>> => {
  try {
    const invoices = await prisma.invoice.findMany({
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true } },
        createdBy: { select: { id: true, fullName: true, username: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return { status: 200, data: invoices };
  } catch (error) {
    console.error("Get all invoices error:", error);
    return { status: 500, message: "Failed to fetch invoices" };
  }
};

export const createInvoice = async (
  createdById: number,
  payload: any,
): Promise<ServiceResult<unknown>> => {
  try {
    const { customerId, invoiceNumber, totalAmount, dueDate } = payload;

    if (!customerId || !invoiceNumber || !totalAmount || totalAmount <= 0 || !dueDate) {
      return { status: 400, message: "Missing required fields" };
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true },
    });

    if (!customer) {
      return { status: 404, message: "Customer not found" };
    }

    const invoice = await prisma.invoice.create({
      data: {
        customerId,
        createdById,
        invoiceNumber,
        totalAmount,
        dueDate: new Date(dueDate),
        paymentStatus: "PENDING",
      },
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true } },
        createdBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    return { status: 201, data: invoice };
  } catch (error) {
    console.error("Create invoice error:", error);
    return { status: 500, message: "Failed to create invoice" };
  }
};

export const deleteInvoice = async (
  id: number,
): Promise<ServiceResult<unknown>> => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!invoice) {
      return { status: 404, message: "Invoice not found" };
    }

    await prisma.invoice.delete({ where: { id } });
    return { status: 200, message: "Invoice deleted successfully" };
  } catch (error) {
    console.error("Delete invoice error:", error);
    return { status: 500, message: "Failed to delete invoice" };
  }
};

export const recordInvoicePayment = async (
  id: number,
  payload: any,
): Promise<ServiceResult<unknown>> => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!invoice) {
      return { status: 404, message: "Invoice not found" };
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        paymentStatus: payload.paymentStatus || "PAID",
        paymentRecordedAt: new Date(),
      },
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true } },
        createdBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    return { status: 200, data: updated };
  } catch (error) {
    console.error("Record invoice payment error:", error);
    return { status: 500, message: "Failed to record invoice payment" };
  }
};
