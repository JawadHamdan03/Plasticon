import { getUserContext } from "../services/backendAPI.js";

// Attaches enriched user context to req.userContext before chat handlers run.
// If userId is missing or backend call fails, falls back to minimal context gracefully.
export async function roleContextMiddleware(req, res, next) {
  const { userId, role } = req.body ?? {};

  req.userContext = {
    user: null,
    shiftName: null,
    machineName: null,
    attendanceStatus: "Unknown",
    pendingMaintenance: [],
    notifications: [],
    today: new Date().toISOString().split("T")[0],
    role: role ?? "general",
  };

  if (!userId) return next();

  try {
    const ctx = await getUserContext(userId);

    req.userContext.user = ctx.user ?? null;
    req.userContext.shiftName = ctx.user?.shift?.name ?? null;
    req.userContext.pendingMaintenance = ctx.maintenance ?? [];
    req.userContext.notifications = ctx.notifications ?? [];

    if (ctx.attendance) {
      const checkIn = ctx.attendance.checkIn
        ? new Date(ctx.attendance.checkIn).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
        : null;
      req.userContext.attendanceStatus = checkIn
        ? `Checked in at ${checkIn}`
        : "Not yet checked in today";
    } else {
      req.userContext.attendanceStatus = "Not checked in today";
    }
  } catch (err) {
    // Non-fatal — log and continue with empty context
    console.warn(`roleContext: could not fetch context for userId=${userId}:`, err.message);
  }

  next();
}
