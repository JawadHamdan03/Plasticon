import { Router } from "express";
import { ChatOpenAI } from "@langchain/openai";
import { getProductionContext } from "../services/backendAPI.js";
import { cacheGet, cacheSet } from "../services/cache.js";

const router = Router();

const SUMMARY_PROMPT = `You are a factory production analyst for Plasticon, a plastic manufacturing factory.
Analyze the provided production data and generate a clear, structured report.

Return your response in this exact format:

## Production Summary — {date} | Shift: {shift}

**Overview**
- Total pieces produced: X
- Total cartons: X
- Total downtime: X minutes

**Electricity**
- Consumption: X kWh
- Cost: X ILS

**Staff on Shift**
List names and roles

**Maintenance Incidents**
List any machine issues, durations, reasons

**Performance Analysis**
- Assessment of the shift performance
- Any anomalies detected (unusually high downtime, low output, etc.)

**Recommendations**
- Actionable items for next shift or management

Keep numbers precise. If data is missing for a section, say "No data available".
Respond in the same language as the request (Arabic or English).`;

async function generateSummaryWithGPT(prodCtx, date, shift) {
  const model = new ChatOpenAI({ model: "gpt-4o", temperature: 0.2 });

  const { summary, production, electricity, maintenances, attendances } = prodCtx;

  const staffList = [
    ...new Set((attendances ?? []).map((a) => `${a.user?.fullName ?? "Unknown"} (${a.user?.role ?? "?"})`)  ),
  ].join("\n  - ") || "No attendance records";

  const incidentList = (maintenances ?? [])
    .map(
      (m) =>
        `Machine: ${m.machine?.name ?? `#${m.machineId}`} | Engineer: ${m.engineer?.fullName ?? "Unknown"} | ` +
        `Downtime: ${m.downtimeMinutes ?? 0} min | Reason: ${m.downtimeReason ?? "N/A"} | Notes: ${m.reportText ?? "None"}`
    )
    .join("\n  - ") || "None";

  const electricityDetail = (electricity ?? [])
    .map((e) => `  Shift "${e.shift?.name ?? "?"}": ${e.consumption?.toFixed(2)} kWh @ ${e.kwhPriceSnap} ILS/kWh = ${e.shiftCost?.toFixed(2)} ILS`)
    .join("\n") || "  No electricity records";

  const dataBlock = `
DATE: ${date}
SHIFT: ${shift ?? "All shifts"}

TOTALS:
- Total pieces: ${summary.totalPieces.toLocaleString()}
- Total cartons: ${summary.totalCartons.toLocaleString()}
- Total downtime: ${summary.totalDowntime} minutes
- Electricity: ${summary.totalKwh.toFixed(2)} kWh | Total cost: ${summary.totalElecCost.toFixed(2)} ILS

ELECTRICITY BREAKDOWN:
${electricityDetail}

STAFF PRESENT (${(attendances ?? []).length} records):
  - ${staffList}

MAINTENANCE INCIDENTS (${(maintenances ?? []).length}):
  - ${incidentList}

PRODUCTION RECORDS COUNT: ${(production ?? []).length}
`.trim();

  const response = await model.invoke([
    { role: "system", content: SUMMARY_PROMPT },
    { role: "user",   content: `Analyze this factory data and generate a report:\n\n${dataBlock}` },
  ]);

  return (response.content ?? "").toString().trim();
}

// POST /api/production-summary
// Body: { date?: "YYYY-MM-DD", shift?: "morning|evening|night", department?: string }
router.post("/", async (req, res) => {
  try {
    const { date, shift, department } = req.body ?? {};

    const resolvedDate  = date  ?? new Date().toISOString().split("T")[0];
    const resolvedShift = shift ?? null;

    // Check cache first (5-min TTL via cache.js)
    const cacheKey = `summary:${resolvedDate}:${resolvedShift ?? "all"}:${department ?? "all"}`;
    const cached   = cacheGet(cacheKey);
    if (cached) {
      return res.json({ ...cached, fromCache: true });
    }

    // Fetch live production data from main backend
    let prodCtx;
    try {
      prodCtx = await getProductionContext(resolvedDate, resolvedShift);
    } catch (fetchErr) {
      return res.status(502).json({
        error: `Could not reach main backend: ${fetchErr.message}`,
      });
    }

    // Generate AI summary
    const aiSummary = await generateSummaryWithGPT(prodCtx, resolvedDate, resolvedShift);

    const payload = {
      date:       resolvedDate,
      shift:      resolvedShift ?? "all",
      department: department    ?? "all",
      rawData:    prodCtx,
      summary:    aiSummary,
      generatedAt: new Date().toISOString(),
    };

    cacheSet(cacheKey, payload);

    return res.json({ ...payload, fromCache: false });
  } catch (err) {
    console.error("[production-summary] Error:", err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
