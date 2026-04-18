import { prisma } from "../config/lib/prisma";

type ServiceResult<T> = {
  status: number;
  message?: string;
  data?: T;
};

export const getAllAnalyses = async (): Promise<ServiceResult<unknown>> => {
  try {
    const analyses = await prisma.costAnalysis.findMany({
      orderBy: { period: "desc" },
    });
    return { status: 200, data: analyses };
  } catch (error) {
    console.error("Get all analyses error:", error);
    return { status: 500, message: "Failed to fetch analyses" };
  }
};

export const createAnalysis = async (
  payload: any,
): Promise<ServiceResult<unknown>> => {
  try {
    const { category, cost, percentage, period, notes } = payload;

    if (!category || !cost || cost <= 0 || !period) {
      return { status: 400, message: "Missing required fields" };
    }

    const analysis = await prisma.costAnalysis.create({
      data: {
        category,
        cost,
        percentage: percentage || 0,
        period,
        notes: notes || null,
      },
    });

    return { status: 201, data: analysis };
  } catch (error) {
    console.error("Create analysis error:", error);
    return { status: 500, message: "Failed to create analysis" };
  }
};

export const updateAnalysis = async (
  id: number,
  payload: any,
): Promise<ServiceResult<unknown>> => {
  try {
    const analysis = await prisma.costAnalysis.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!analysis) {
      return { status: 404, message: "Analysis not found" };
    }

    const updated = await prisma.costAnalysis.update({
      where: { id },
      data: {
        ...(payload.cost !== undefined && { cost: payload.cost }),
        ...(payload.percentage !== undefined && { percentage: payload.percentage }),
        ...(payload.category && { category: payload.category }),
        ...(payload.notes !== undefined && { notes: payload.notes }),
      },
    });

    return { status: 200, data: updated };
  } catch (error) {
    console.error("Update analysis error:", error);
    return { status: 500, message: "Failed to update analysis" };
  }
};

export const deleteAnalysis = async (
  id: number,
): Promise<ServiceResult<unknown>> => {
  try {
    const analysis = await prisma.costAnalysis.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!analysis) {
      return { status: 404, message: "Analysis not found" };
    }

    await prisma.costAnalysis.delete({ where: { id } });
    return { status: 200, message: "Analysis deleted successfully" };
  } catch (error) {
    console.error("Delete analysis error:", error);
    return { status: 500, message: "Failed to delete analysis" };
  }
};
