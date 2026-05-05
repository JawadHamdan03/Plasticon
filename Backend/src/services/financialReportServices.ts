import { prisma } from "../config/lib/prisma";

type ServiceResult<T> = {
  status: number;
  message?: string;
  data?: T;
};

export const getAllReports = async (): Promise<ServiceResult<unknown>> => {
  try {
    const reports = await prisma.financialReport.findMany({
      include: {
        generatedBy: { select: { id: true, fullName: true, username: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return { status: 200, data: reports };
  } catch (error) {
    console.error("Get all reports error:", error);
    return { status: 500, message: "Failed to fetch reports" };
  }
};

export const createReport = async (
  generatedById: number,
  payload: any,
): Promise<ServiceResult<unknown>> => {
  try {
    const { title, reportType, period, pdfPath } = payload;

    if (!title || !reportType || !period) {
      return { status: 400, message: "Missing required fields" };
    }

    const report = await prisma.financialReport.create({
      data: {
        title,
        reportType,
        period,
        pdfPath: pdfPath || null,
        generatedById,
      },
      include: {
        generatedBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    return { status: 201, data: report };
  } catch (error) {
    console.error("Create report error:", error);
    return { status: 500, message: "Failed to create report" };
  }
};

export const updateReport = async (
  id: number,
  payload: any,
): Promise<ServiceResult<unknown>> => {
  try {
    const report = await prisma.financialReport.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!report) {
      return { status: 404, message: "Report not found" };
    }

    const updated = await prisma.financialReport.update({
      where: { id },
      data: {
        ...(payload.title && { title: payload.title }),
        ...(payload.reportType && { reportType: payload.reportType }),
        ...(payload.period && { period: payload.period }),
        ...(payload.pdfPath !== undefined && { pdfPath: payload.pdfPath }),
      },
      include: {
        generatedBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    return { status: 200, data: updated };
  } catch (error) {
    console.error("Update report error:", error);
    return { status: 500, message: "Failed to update report" };
  }
};

export const deleteReport = async (
  id: number,
): Promise<ServiceResult<unknown>> => {
  try {
    const report = await prisma.financialReport.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!report) {
      return { status: 404, message: "Report not found" };
    }

    await prisma.financialReport.delete({ where: { id } });
    return { status: 200, message: "Report deleted successfully" };
  } catch (error) {
    console.error("Delete report error:", error);
    return { status: 500, message: "Failed to delete report" };
  }
};
