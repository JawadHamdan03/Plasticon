import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import {
  getAllWorkflows,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
} from "../services/approvalWorkflowServices";

export const getAllWorkflowsHandler = async (
  _req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const result = await getAllWorkflows();
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Get workflows error:", error);
    res.status(500).json({ message: "Failed to fetch workflows" });
  }
};

export const createWorkflowHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const createdById = req.user?.id;
    if (!createdById) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    const result = await createWorkflow(createdById, req.body);
    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Create workflow error:", error);
    res.status(500).json({ message: "Failed to create workflow" });
  }
};

export const updateWorkflowHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: "id must be a positive integer" });
      return;
    }

    const result = await updateWorkflow(id, req.body);
    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Update workflow error:", error);
    res.status(500).json({ message: "Failed to update workflow" });
  }
};

export const deleteWorkflowHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: "id must be a positive integer" });
      return;
    }

    const result = await deleteWorkflow(id);
    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }
    res.status(200).json({ message: "Workflow deleted successfully" });
  } catch (error) {
    console.error("Delete workflow error:", error);
    res.status(500).json({ message: "Failed to delete workflow" });
  }
};
