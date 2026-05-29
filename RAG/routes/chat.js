import { Router } from "express";
import { roleContextMiddleware } from "../middleware/roleContext.js";
import { workerSystemPrompt } from "../prompts/worker.js";
import { engineerSystemPrompt } from "../prompts/engineer.js";
import { supervisorSystemPrompt } from "../prompts/supervisor.js";
import { adminSystemPrompt } from "../prompts/admin.js";
import { accountantSystemPrompt } from "../prompts/accountant.js";
import { generalSystemPrompt } from "../prompts/general.js";
import { runAgent } from "../agent.js";
import { getProductionContext } from "../services/backendAPI.js";

const router = Router();

// Keywords that indicate the user is asking about live production/operational data
const LIVE_DATA_KEYWORDS =
  /production|shift|electricity|maintenance|incident|summary|report|tonight|machine|downtime|صباح|مساء|ليل|إنتاج|صيانة|آلة|توقف|كهرباء/i;

// Extract a YYYY-MM-DD date from free text if present
const DATE_RE = /(\d{4}-\d{2}-\d{2})/;

// Extract a shift name from free text
const SHIFT_RE = /\b(morning|evening|night|صباح|مساء|ليل)\b/i;

function selectSystemPrompt(role, context) {
  switch ((role ?? "").toLowerCase()) {
    case "worker":      return workerSystemPrompt(context);
    case "engineer":    return engineerSystemPrompt(context);
    case "supervisor":  return supervisorSystemPrompt(context);
    case "admin":       return adminSystemPrompt(context);
    case "accountant":  return accountantSystemPrompt(context);
    default:            return generalSystemPrompt();
  }
}

// For admin/supervisor queries that mention production/shift keywords,
// fetch live backend data and prepend it to the message so GPT-4o has real numbers.
async function enrichMessageWithLiveData(message, role, context) {
  const needsLiveData =
    (role === "admin" || role === "supervisor" || role === "engineer") &&
    LIVE_DATA_KEYWORDS.test(message);

  if (!needsLiveData) return message;

  try {
    const dateMatch = message.match(DATE_RE);
    const shiftMatch = message.match(SHIFT_RE);
    const date  = dateMatch  ? dateMatch[1]  : context.today;
    const shift = shiftMatch ? shiftMatch[1] : null;

    const prodCtx = await getProductionContext(date, shift);
    const { summary, attendances, maintenances } = prodCtx;

    const staffNames = [
      ...new Set((attendances ?? []).map((a) => a.user?.fullName).filter(Boolean)),
    ];

    const incidents = (maintenances ?? [])
      .map(
        (m) =>
          `${m.machine?.name ?? `Machine #${m.machineId}`}: ${m.reportText ?? m.downtimeReason} (${m.downtimeMinutes ?? 0} min downtime)`
      )
      .join("; ") || "None recorded";

    return `${message}

[LIVE FACTORY DATA — ${date}, shift: ${shift ?? "all"}]
• Total pieces produced : ${summary.totalPieces.toLocaleString()}
• Total cartons         : ${summary.totalCartons.toLocaleString()}
• Total downtime        : ${summary.totalDowntime} minutes
• Electricity           : ${summary.totalKwh.toFixed(2)} kWh | Cost: ${summary.totalElecCost.toFixed(2)} ILS
• Staff on shift        : ${staffNames.length ? staffNames.join(", ") : "No attendance records found"}
• Maintenance incidents : ${incidents}`;
  } catch (err) {
    console.warn("[chat] Could not enrich with live production data:", err.message);
    return message; // non-fatal — continue without live data
  }
}

// POST /api/chat  (replaces the inline handler in index.js)
// Body: { message, sessionId?, userId?, role? }
router.post("/", roleContextMiddleware, async (req, res) => {
  try {
    const { message, sessionId, userId, role } = req.body ?? {};

    if (!message) return res.status(400).json({ error: "Message required" });

    const context   = req.userContext;
    const resolvedRole = (role ?? context?.role ?? "general").toLowerCase();

    // Build role-specific system prompt injected with live context
    const systemPrompt = selectSystemPrompt(resolvedRole, context);

    // Optionally enrich the user's message with live backend numbers
    const enrichedMessage = await enrichMessageWithLiveData(message, resolvedRole, context);

    // Use a stable session ID per user+role so memory is preserved
    const thread = sessionId ?? `${userId ?? "anon"}-${resolvedRole}`;

    const result = await runAgent({ message: enrichedMessage, sessionId: thread, systemPrompt });

    const output = result?.output ?? result?.text ?? "";

    if (!output.trim()) {
      return res.json({
        answer: "I couldn't generate a response. Please try rephrasing your question.",
        role: resolvedRole,
      });
    }

    res.json({ answer: output, role: resolvedRole, userId: userId ?? null });
  } catch (err) {
    console.error("[chat] Error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
