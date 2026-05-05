import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import {
  createRegistrationRequest,
  getRegistrationRequests,
  approveRegistrationRequest,
  rejectRegistrationRequest,
} from "../services/registrationRequestService";

export const requestAccessHandler = async (req: Request, res: Response) => {
  try {
    const result = await createRegistrationRequest(req.body);
    if (result.message && result.status !== 201) {
      res.status(result.status).json({ message: result.message });
      return;
    }
    res.status(result.status).json(result.data);
  } catch (err) {
    console.error("requestAccess error:", err);
    res.status(500).json({ message: "Failed to submit request" });
  }
};

export const listRegistrationRequestsHandler = async (req: Request, res: Response) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const result = await getRegistrationRequests(status);
    res.status(result.status).json(result.data);
  } catch (err) {
    console.error("listRegistrationRequests error:", err);
    res.status(500).json({ message: "Failed to load requests" });
  }
};

export const approveRegistrationRequestHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const adminId = req.user?.id;
    if (!adminId) { res.status(401).json({ message: "Not authorized" }); return; }
    const requestId = Number(req.params.id);
    const { role, reviewNote, shiftId } = req.body as { role?: string; reviewNote?: string; shiftId?: number | null };
    if (!role) { res.status(400).json({ message: "role is required" }); return; }
    const result = await approveRegistrationRequest(requestId, adminId, role, reviewNote, shiftId ?? null);
    if (result.message && result.status !== 200) {
      res.status(result.status).json({ message: result.message });
      return;
    }
    res.status(result.status).json(result.data);
  } catch (err) {
    console.error("approveRegistrationRequest error:", err);
    res.status(500).json({ message: "Failed to approve request" });
  }
};

export const rejectRegistrationRequestHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const adminId = req.user?.id;
    if (!adminId) { res.status(401).json({ message: "Not authorized" }); return; }
    const requestId = Number(req.params.id);
    const { reviewNote } = req.body as { reviewNote?: string };
    const result = await rejectRegistrationRequest(requestId, adminId, reviewNote);
    if (result.message && result.status !== 200) {
      res.status(result.status).json({ message: result.message });
      return;
    }
    res.status(result.status).json(result.data);
  } catch (err) {
    console.error("rejectRegistrationRequest error:", err);
    res.status(500).json({ message: "Failed to reject request" });
  }
};
