import { prisma } from "../config/lib/prisma";

type ServiceResult<T> = {
  status: number;
  message?: string;
  data?: T;
};

export const getAllFilings = async (): Promise<ServiceResult<unknown>> => {
  try {
    const filings = await prisma.taxFiling.findMany({
      include: {
        filedBy: { select: { id: true, fullName: true, username: true } },
      },
      orderBy: { dueDate: "asc" },
    });
    return { status: 200, data: filings };
  } catch (error) {
    console.error("Get all filings error:", error);
    return { status: 500, message: "Failed to fetch filings" };
  }
};

export const createFiling = async (
  filedById: number,
  payload: any,
): Promise<ServiceResult<unknown>> => {
  try {
    const { filingType, dueDate, amount, status } = payload;

    if (!filingType || !dueDate || !amount || amount <= 0) {
      return { status: 400, message: "Missing required fields" };
    }

    const filing = await prisma.taxFiling.create({
      data: {
        filingType,
        dueDate: new Date(dueDate),
        amount,
        status: status || "PENDING",
        filedById,
      },
      include: {
        filedBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    return { status: 201, data: filing };
  } catch (error) {
    console.error("Create filing error:", error);
    return { status: 500, message: "Failed to create filing" };
  }
};

export const updateFiling = async (
  id: number,
  payload: any,
): Promise<ServiceResult<unknown>> => {
  try {
    const filing = await prisma.taxFiling.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!filing) {
      return { status: 404, message: "Filing not found" };
    }

    const updated = await prisma.taxFiling.update({
      where: { id },
      data: {
        ...(payload.amount !== undefined && { amount: payload.amount }),
        ...(payload.dueDate && { dueDate: new Date(payload.dueDate) }),
        ...(payload.status && { status: payload.status }),
        ...(payload.filingType && { filingType: payload.filingType }),
      },
      include: {
        filedBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    return { status: 200, data: updated };
  } catch (error) {
    console.error("Update filing error:", error);
    return { status: 500, message: "Failed to update filing" };
  }
};

export const deleteFiling = async (
  id: number,
): Promise<ServiceResult<unknown>> => {
  try {
    const filing = await prisma.taxFiling.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!filing) {
      return { status: 404, message: "Filing not found" };
    }

    await prisma.taxFiling.delete({ where: { id } });
    return { status: 200, message: "Filing deleted successfully" };
  } catch (error) {
    console.error("Delete filing error:", error);
    return { status: 500, message: "Failed to delete filing" };
  }
};
