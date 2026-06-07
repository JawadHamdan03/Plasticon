import { prisma } from "../config/lib/prisma";
import { Prisma } from "../config/generated/prisma/client";

type ServiceResult<T> = { status: number; message?: string; data?: T };

const INVOICE_INCLUDE = {
  customer: { select: { id: true, name: true, phone: true, email: true } },
  createdBy: { select: { id: true, fullName: true, username: true } },
} as const;

export const getAllInvoices = async (): Promise<ServiceResult<unknown>> => {
  try {
    const invoices = await prisma.invoice.findMany({
      include: INVOICE_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
    return { status: 200, data: invoices };
  } catch (error) {
    console.error("Get all invoices error:", error);
    return { status: 500, message: "Failed to fetch invoices" };
  }
};

export const getInvoiceById = async (id: number): Promise<ServiceResult<unknown>> => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: INVOICE_INCLUDE,
    });
    if (!invoice) return { status: 404, message: "Invoice not found" };
    return { status: 200, data: invoice };
  } catch (error) {
    console.error("Get invoice by id error:", error);
    return { status: 500, message: "Failed to fetch invoice" };
  }
};

export const createInvoice = async (
  createdById: number,
  payload: Record<string, unknown>,
): Promise<ServiceResult<unknown>> => {
  try {
    const {
      customerId: rawCustomerId, customerName,
      invoiceNumber, totalAmount, dueDate,
      // Extended fields
      issueDate, currency, subtotal, taxAmount, notes, lineItems, aiExtracted,
      vendorName, vendorPhone, vendorEmail, vendorAddress,
      customerPhone, customerEmail, customerAddress,
      // Shipment / Receipt
      invoiceType, driverName, departureTime,
    } = payload as {
      customerId?: number; customerName?: string;
      invoiceNumber?: string; totalAmount?: number; dueDate?: string;
      issueDate?: string; currency?: string; subtotal?: number; taxAmount?: number;
      notes?: string; lineItems?: string; aiExtracted?: boolean;
      vendorName?: string; vendorPhone?: string; vendorEmail?: string; vendorAddress?: string;
      customerPhone?: string; customerEmail?: string; customerAddress?: string;
      invoiceType?: string; driverName?: string; departureTime?: string;
    };

    if (!invoiceNumber || !totalAmount || totalAmount <= 0 || !dueDate) {
      return { status: 400, message: "invoiceNumber, totalAmount and dueDate are required" };
    }

    const parsedDue = new Date(dueDate);
    if (isNaN(parsedDue.getTime())) {
      return { status: 400, message: `Invalid dueDate: "${dueDate}"` };
    }

    let resolvedCustomerId = rawCustomerId as number | undefined;

    if (!resolvedCustomerId && customerName) {
      let customer = await prisma.customer.findFirst({ where: { name: customerName.trim() } });
      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            name: customerName.trim(),
            ...(customerPhone ? { phone: customerPhone } : {}),
            ...(customerEmail ? { email: customerEmail } : {}),
          },
        });
      }
      resolvedCustomerId = customer.id;
    }

    if (!resolvedCustomerId) {
      return { status: 400, message: "Customer is required" };
    }

    const customer = await prisma.customer.findUnique({
      where: { id: resolvedCustomerId },
      select: { id: true },
    });
    if (!customer) return { status: 404, message: "Customer not found" };

    const invoice = await prisma.invoice.create({
      data: {
        customerId: resolvedCustomerId,
        createdById,
        invoiceNumber,
        totalAmount,
        dueDate: parsedDue,
        paymentStatus: "PENDING",
        // Extended
        issueDate: issueDate ? new Date(issueDate) : null,
        currency: currency ?? "USD",
        subtotal: subtotal ?? null,
        taxAmount: taxAmount ?? null,
        notes: notes ?? null,
        lineItems: lineItems ?? null,
        aiExtracted: aiExtracted ?? false,
        vendorName: vendorName ?? null,
        vendorPhone: vendorPhone ?? null,
        vendorEmail: vendorEmail ?? null,
        vendorAddress: vendorAddress ?? null,
        customerPhone: customerPhone ?? null,
        customerEmail: customerEmail ?? null,
        customerAddress: customerAddress ?? null,
        invoiceType: invoiceType ?? "REGULAR",
        driverName: driverName ?? null,
        departureTime: departureTime ? new Date(departureTime) : null,
      },
      include: INVOICE_INCLUDE,
    });

    return { status: 201, data: invoice };
  } catch (error) {
    console.error("Create invoice error:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") return { status: 409, message: "An invoice with this number already exists" };
      return { status: 500, message: `DB error ${error.code}: ${error.message}` };
    }
    if (error instanceof Prisma.PrismaClientValidationError) {
      return { status: 500, message: `Validation error: ${error.message.split("\n").slice(-3).join(" ")}` };
    }
    const msg = error instanceof Error ? error.message : String(error);
    return { status: 500, message: `Failed to create invoice: ${msg}` };
  }
};

export const updateInvoice = async (
  id: number,
  payload: Record<string, unknown>,
): Promise<ServiceResult<unknown>> => {
  try {
    const invoice = await prisma.invoice.findUnique({ where: { id }, select: { id: true } });
    if (!invoice) return { status: 404, message: "Invoice not found" };

    const {
      invoiceNumber, totalAmount, dueDate, issueDate, currency, subtotal, taxAmount,
      notes, lineItems, vendorName, vendorPhone, vendorEmail, vendorAddress,
      customerPhone, customerEmail, customerAddress, customerName,
      driverName, departureTime,
    } = payload as Record<string, string | number | boolean | undefined>;

    // Resolve customer update if name provided
    let customerId: number | undefined;
    if (typeof customerName === "string" && customerName.trim()) {
      let c = await prisma.customer.findFirst({ where: { name: customerName.trim() } });
      if (!c) c = await prisma.customer.create({ data: { name: customerName.trim() } });
      customerId = c.id;
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        ...(invoiceNumber !== undefined ? { invoiceNumber: String(invoiceNumber) } : {}),
        ...(totalAmount !== undefined ? { totalAmount: Number(totalAmount) } : {}),
        ...(dueDate !== undefined ? { dueDate: new Date(String(dueDate)) } : {}),
        ...(issueDate !== undefined ? { issueDate: issueDate ? new Date(String(issueDate)) : null } : {}),
        ...(currency !== undefined ? { currency: String(currency) } : {}),
        ...(subtotal !== undefined ? { subtotal: subtotal !== null ? Number(subtotal) : null } : {}),
        ...(taxAmount !== undefined ? { taxAmount: taxAmount !== null ? Number(taxAmount) : null } : {}),
        ...(notes !== undefined ? { notes: String(notes) } : {}),
        ...(lineItems !== undefined ? { lineItems: String(lineItems) } : {}),
        ...(vendorName !== undefined ? { vendorName: String(vendorName) } : {}),
        ...(vendorPhone !== undefined ? { vendorPhone: String(vendorPhone) } : {}),
        ...(vendorEmail !== undefined ? { vendorEmail: String(vendorEmail) } : {}),
        ...(vendorAddress !== undefined ? { vendorAddress: String(vendorAddress) } : {}),
        ...(customerPhone !== undefined ? { customerPhone: String(customerPhone) } : {}),
        ...(customerEmail !== undefined ? { customerEmail: String(customerEmail) } : {}),
        ...(customerAddress !== undefined ? { customerAddress: String(customerAddress) } : {}),
        ...(customerId !== undefined ? { customerId } : {}),
        ...(driverName !== undefined ? { driverName: String(driverName) } : {}),
        ...(departureTime !== undefined ? { departureTime: departureTime ? new Date(String(departureTime)) : null } : {}),
      },
      include: INVOICE_INCLUDE,
    });

    return { status: 200, data: updated };
  } catch (error) {
    console.error("Update invoice error:", error);
    return { status: 500, message: "Failed to update invoice" };
  }
};

export const deleteInvoice = async (id: number): Promise<ServiceResult<unknown>> => {
  try {
    const invoice = await prisma.invoice.findUnique({ where: { id }, select: { id: true } });
    if (!invoice) return { status: 404, message: "Invoice not found" };
    await prisma.invoice.delete({ where: { id } });
    return { status: 200, message: "Invoice deleted successfully" };
  } catch (error) {
    console.error("Delete invoice error:", error);
    return { status: 500, message: "Failed to delete invoice" };
  }
};

export const confirmReceiptInvoice = async (
  id: number,
  confirmerUserId: number,
): Promise<ServiceResult<unknown>> => {
  try {
    const invoice = await prisma.invoice.findUnique({ where: { id }, select: { id: true, invoiceType: true } });
    if (!invoice) return { status: 404, message: "Invoice not found" };
    if (invoice.invoiceType !== "RECEIPT") return { status: 400, message: "Only RECEIPT invoices can be confirmed" };

    const confirmer = await prisma.user.findUnique({ where: { id: confirmerUserId }, select: { fullName: true, username: true } });
    const confirmerName = confirmer?.fullName ?? confirmer?.username ?? `User #${confirmerUserId}`;

    const updated = await prisma.invoice.update({
      where: { id },
      data: { confirmedAt: new Date(), confirmedByName: confirmerName },
      include: INVOICE_INCLUDE,
    });
    return { status: 200, data: updated };
  } catch (error) {
    console.error("Confirm receipt invoice error:", error);
    return { status: 500, message: "Failed to confirm receipt" };
  }
};

export const attachInvoiceFile = async (
  id: number,
  filePath: string,
): Promise<ServiceResult<unknown>> => {
  try {
    const invoice = await prisma.invoice.findUnique({ where: { id }, select: { id: true } });
    if (!invoice) return { status: 404, message: "Invoice not found" };
    const updated = await prisma.invoice.update({
      where: { id },
      data: { invoicePath: filePath },
      include: INVOICE_INCLUDE,
    });
    return { status: 200, data: updated };
  } catch (error) {
    console.error("Attach invoice file error:", error);
    return { status: 500, message: "Failed to attach file" };
  }
};

export const recordInvoicePayment = async (
  id: number,
  payload: { paymentStatus?: string },
): Promise<ServiceResult<unknown>> => {
  try {
    const invoice = await prisma.invoice.findUnique({ where: { id }, select: { id: true } });
    if (!invoice) return { status: 404, message: "Invoice not found" };

    const updated = await prisma.invoice.update({
      where: { id },
      data: { paymentStatus: payload.paymentStatus ?? "PAID", paymentRecordedAt: new Date() },
      include: INVOICE_INCLUDE,
    });
    return { status: 200, data: updated };
  } catch (error) {
    console.error("Record invoice payment error:", error);
    return { status: 500, message: "Failed to record invoice payment" };
  }
};
