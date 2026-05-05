import { prisma } from "../config/lib/prisma";

type ServiceResult<T> = {
  status: number;
  message?: string;
  data?: T;
};

export const getAllReconciliations = async (): Promise<ServiceResult<unknown>> => {
  try {
    const reconciliations = await prisma.bankReconciliation.findMany({
      include: {
        reconciledBy: { select: { id: true, fullName: true, username: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return { status: 200, data: reconciliations };
  } catch (error) {
    console.error("Get all reconciliations error:", error);
    return { status: 500, message: "Failed to fetch reconciliations" };
  }
};

export const createReconciliation = async (
  reconciledById: number,
  payload: any,
): Promise<ServiceResult<unknown>> => {
  try {
    const { accountName, bankBalance, bookBalance, reconciled, notes } = payload;

    if (!accountName || bankBalance === undefined || bookBalance === undefined) {
      return { status: 400, message: "Missing required fields" };
    }

    const reconciliation = await prisma.bankReconciliation.create({
      data: {
        accountName,
        bankBalance,
        bookBalance,
        reconciled: reconciled || false,
        notes: notes || null,
        reconciledById,
      },
      include: {
        reconciledBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    return { status: 201, data: reconciliation };
  } catch (error) {
    console.error("Create reconciliation error:", error);
    return { status: 500, message: "Failed to create reconciliation" };
  }
};

export const updateReconciliation = async (
  id: number,
  payload: any,
): Promise<ServiceResult<unknown>> => {
  try {
    const reconciliation = await prisma.bankReconciliation.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!reconciliation) {
      return { status: 404, message: "Reconciliation not found" };
    }

    const updated = await prisma.bankReconciliation.update({
      where: { id },
      data: {
        ...(payload.bankBalance !== undefined && { bankBalance: payload.bankBalance }),
        ...(payload.bookBalance !== undefined && { bookBalance: payload.bookBalance }),
        ...(payload.reconciled !== undefined && { reconciled: payload.reconciled }),
        ...(payload.notes !== undefined && { notes: payload.notes }),
      },
      include: {
        reconciledBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    return { status: 200, data: updated };
  } catch (error) {
    console.error("Update reconciliation error:", error);
    return { status: 500, message: "Failed to update reconciliation" };
  }
};

export const deleteReconciliation = async (
  id: number,
): Promise<ServiceResult<unknown>> => {
  try {
    const reconciliation = await prisma.bankReconciliation.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!reconciliation) {
      return { status: 404, message: "Reconciliation not found" };
    }

    await prisma.bankReconciliation.delete({ where: { id } });
    return { status: 200, message: "Reconciliation deleted successfully" };
  } catch (error) {
    console.error("Delete reconciliation error:", error);
    return { status: 500, message: "Failed to delete reconciliation" };
  }
};
