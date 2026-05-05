import { prisma } from "../config/lib/prisma";

type ServiceResult<T> = {
  status: number;
  message?: string;
  data?: T;
};

export const getAllWorkflows = async (): Promise<ServiceResult<unknown>> => {
  try {
    const workflows = await prisma.approvalWorkflow.findMany({
      include: {
        createdBy: { select: { id: true, fullName: true, username: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return { status: 200, data: workflows };
  } catch (error) {
    console.error("Get all workflows error:", error);
    return { status: 500, message: "Failed to fetch workflows" };
  }
};

export const createWorkflow = async (
  createdById: number,
  payload: any,
): Promise<ServiceResult<unknown>> => {
  try {
    const { workflowName, status, itemsCount, approverCount } = payload;

    if (!workflowName || !status) {
      return { status: 400, message: "Missing required fields" };
    }

    const workflow = await prisma.approvalWorkflow.create({
      data: {
        workflowName,
        status,
        itemsCount: itemsCount || 0,
        approverCount: approverCount || 0,
        createdById,
      },
      include: {
        createdBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    return { status: 201, data: workflow };
  } catch (error) {
    console.error("Create workflow error:", error);
    return { status: 500, message: "Failed to create workflow" };
  }
};

export const updateWorkflow = async (
  id: number,
  payload: any,
): Promise<ServiceResult<unknown>> => {
  try {
    const workflow = await prisma.approvalWorkflow.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!workflow) {
      return { status: 404, message: "Workflow not found" };
    }

    const updated = await prisma.approvalWorkflow.update({
      where: { id },
      data: {
        ...(payload.status && { status: payload.status }),
        ...(payload.itemsCount !== undefined && { itemsCount: payload.itemsCount }),
        ...(payload.approverCount !== undefined && { approverCount: payload.approverCount }),
        ...(payload.workflowName && { workflowName: payload.workflowName }),
      },
      include: {
        createdBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    return { status: 200, data: updated };
  } catch (error) {
    console.error("Update workflow error:", error);
    return { status: 500, message: "Failed to update workflow" };
  }
};

export const deleteWorkflow = async (
  id: number,
): Promise<ServiceResult<unknown>> => {
  try {
    const workflow = await prisma.approvalWorkflow.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!workflow) {
      return { status: 404, message: "Workflow not found" };
    }

    await prisma.approvalWorkflow.delete({ where: { id } });
    return { status: 200, message: "Workflow deleted successfully" };
  } catch (error) {
    console.error("Delete workflow error:", error);
    return { status: 500, message: "Failed to delete workflow" };
  }
};
