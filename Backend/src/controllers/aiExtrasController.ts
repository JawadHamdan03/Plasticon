import type { Request, Response } from "express";
import OpenAI from "openai";
import { prisma } from "../config/lib/prisma";
import type { AuthenticatedRequest } from "../middleware/authMiddleware.js";

function getClient(): OpenAI {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set");
  return new OpenAI({ apiKey: key });
}

async function gpt(system: string, user: string): Promise<string> {
  const client = getClient();
  const res = await client.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 2048,
    temperature: 0.3,
    messages: [
      { role: "system", content: system },
      { role: "user",   content: user   },
    ],
  });
  return res.choices[0]?.message?.content?.trim() ?? "";
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. PRODUCTION ANOMALY DETECTION
// POST /ai/detect-anomalies  body: { date?, days? }
// ─────────────────────────────────────────────────────────────────────────────
export const detectAnomalies = async (req: Request, res: Response): Promise<void> => {
  try {
    const days = Math.min(Number(req.body.days ?? 7), 30);
    const end   = new Date(); end.setHours(23, 59, 59, 999);
    const start = new Date(); start.setDate(start.getDate() - days); start.setHours(0, 0, 0, 0);

    const records = await prisma.productionRecord.findMany({
      where: { createdAt: { gte: start, lte: end } },
      include: {
        user:    { select: { fullName: true, role: true } },
        machine: { select: { name: true, status: true } },
        shift:   { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    if (records.length === 0) {
      res.json({ anomalies: [], summary: "No production records found for the selected period.", recordCount: 0 });
      return;
    }

    // Compute per-machine averages
    const machineStats: Record<number, { totalPieces: number; count: number; totalDowntime: number }> = {};
    for (const r of records) {
      if (r.machineId == null) continue;
      if (!machineStats[r.machineId]) machineStats[r.machineId] = { totalPieces: 0, count: 0, totalDowntime: 0 };
      machineStats[r.machineId].totalPieces  += r.totalPieces ?? 0;
      machineStats[r.machineId].totalDowntime += r.downtimeMinutes ?? 0;
      machineStats[r.machineId].count++;
    }
    const machineAvg: Record<number, { avgPieces: number; avgDowntime: number }> = {};
    for (const [id, s] of Object.entries(machineStats)) {
      machineAvg[Number(id)] = {
        avgPieces:   s.count > 0 ? s.totalPieces  / s.count : 0,
        avgDowntime: s.count > 0 ? s.totalDowntime / s.count : 0,
      };
    }

    // Flag anomalies
    const flagged = records.filter((r) => {
      if (r.machineId == null) return false;
      const avg = machineAvg[r.machineId];
      if (!avg) return false;
      const lowOutput   = avg.avgPieces   > 0 && (r.totalPieces ?? 0)   < avg.avgPieces   * 0.75;
      const highDowntime = avg.avgDowntime > 0 && (r.downtimeMinutes ?? 0) > avg.avgDowntime * 2 && (r.downtimeMinutes ?? 0) > 30;
      const zeroOutput  = (r.totalPieces ?? 0) === 0 && avg.avgPieces > 50;
      return lowOutput || highDowntime || zeroOutput;
    }).slice(0, 30);

    // Build data block for GPT
    const dataBlock = [
      `Analysis period: last ${days} days (${records.length} records)`,
      `\nFlagged records (${flagged.length}):`,
      ...flagged.map((r, i) => {
        const avg = r.machineId ? machineAvg[r.machineId] : null;
        return `${i + 1}. ${new Date(r.createdAt).toLocaleDateString()} | ` +
          `Machine: ${r.machine?.name ?? "?"} (${r.machine?.status}) | ` +
          `Shift: ${r.shift?.name ?? "?"} | Worker: ${r.user?.fullName ?? "?"} | ` +
          `Pieces: ${r.totalPieces} (avg: ${avg ? Math.round(avg.avgPieces) : "?"}) | ` +
          `Downtime: ${r.downtimeMinutes ?? 0} min | Reason: ${r.downtimeReason ?? "None"}`;
      }),
    ].join("\n");

    const summary = await gpt(
      `You are a production analyst for a plastic manufacturing factory.
Analyze the flagged production anomalies and return a clear, structured report.

Format your response exactly like this:

## Production Anomaly Report — Last ${days} Days

**Summary**
One paragraph overview of findings.

**Flagged Anomalies**
For each anomaly: what happened, on which machine, when, and how serious it is.

**Root Cause Assessment**
Most likely causes for the patterns observed.

**Recommended Actions**
Numbered list of specific actions for management.

Be concise and practical. Respond in English or Arabic based on the data language.`,
      dataBlock
    );

    res.json({
      anomalies: flagged.map((r) => ({
        id:            r.id,
        date:          r.createdAt,
        machineName:   r.machine?.name   ?? "Unknown",
        machineStatus: r.machine?.status ?? "Unknown",
        shiftName:     r.shift?.name     ?? "Unknown",
        workerName:    r.user?.fullName  ?? "Unknown",
        totalPieces:   r.totalPieces,
        avgPieces:     r.machineId ? Math.round(machineAvg[r.machineId]?.avgPieces ?? 0) : 0,
        downtimeMinutes: r.downtimeMinutes ?? 0,
        downtimeReason:  r.downtimeReason  ?? null,
      })),
      summary,
      recordCount: records.length,
      period: { days, start: start.toISOString(), end: end.toISOString() },
    });
  } catch (err) {
    console.error("detectAnomalies error:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to detect anomalies" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. MAINTENANCE REPORT GENERATOR
// POST /ai/maintenance-report  body: { machineId, whatWasDone, partsUsed, durationMinutes, issueFound, additionalNotes }
// ─────────────────────────────────────────────────────────────────────────────
export const generateMaintenanceReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      machineId, whatWasDone, partsUsed,
      durationMinutes, issueFound, additionalNotes,
    } = req.body as {
      machineId?: number; whatWasDone?: string; partsUsed?: string;
      durationMinutes?: number; issueFound?: string; additionalNotes?: string;
    };

    if (!whatWasDone?.trim()) {
      res.status(400).json({ error: "whatWasDone is required" });
      return;
    }

    // Fetch machine info if provided
    let machineInfo = "Not specified";
    let machineHistory = "";
    if (machineId) {
      const machine = await prisma.machine.findUnique({
        where: { id: machineId },
        select: { name: true, type: true, status: true },
      });
      if (machine) machineInfo = `${machine.name} (${machine.type}) — Status: ${machine.status}`;

      const lastMaint = await prisma.maintenance.findFirst({
        where: { machineId },
        orderBy: { createdAt: "desc" },
        select: { reportText: true, partsUsed: true, downtimeMinutes: true, createdAt: true },
      });
      if (lastMaint) {
        machineHistory = `Last maintenance: ${new Date(lastMaint.createdAt).toLocaleDateString()} | Parts: ${lastMaint.partsUsed} | Downtime: ${lastMaint.downtimeMinutes ?? 0} min`;
      }
    }

    const engineerName = (req as AuthenticatedRequest).user
      ? await prisma.user.findUnique({ where: { id: (req as AuthenticatedRequest).user!.id }, select: { fullName: true } }).then(u => u?.fullName ?? "Engineer")
      : "Engineer";

    const input = [
      `Machine: ${machineInfo}`,
      machineHistory ? `Machine History: ${machineHistory}` : "",
      `Work performed: ${whatWasDone}`,
      partsUsed        ? `Parts used: ${partsUsed}` : "",
      durationMinutes  ? `Duration: ${durationMinutes} minutes` : "",
      issueFound       ? `Issue found: ${issueFound}` : "",
      additionalNotes  ? `Additional notes: ${additionalNotes}` : "",
      `Engineer: ${engineerName}`,
      `Date: ${new Date().toLocaleDateString()}`,
    ].filter(Boolean).join("\n");

    const report = await gpt(
      `You are a technical writer for a plastic manufacturing factory.
Generate a professional, formal maintenance report based on the engineer's input.

Format exactly as follows:

## Maintenance Report
**Date:** [date]
**Engineer:** [name]
**Machine:** [machine name and type]

### Issue Description
Describe what problem or scheduled maintenance was addressed.

### Work Performed
Step-by-step description of what was done.

### Parts & Materials Used
List all parts and consumables used.

### Duration
Total time spent.

### Findings
Any issues discovered during the work.

### Recommendations
Any follow-up actions, monitoring suggestions, or parts to order.

### Status After Maintenance
Current condition of the machine.

Keep it professional and detailed. Write in the same language the engineer used.`,
      input
    );

    res.json({ report, generatedAt: new Date().toISOString(), engineerName });
  } catch (err) {
    console.error("generateMaintenanceReport error:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to generate report" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. SHIFT HANDOVER SUMMARY
// POST /ai/shift-handover  body: { date?, shiftId? }
// ─────────────────────────────────────────────────────────────────────────────
export const generateShiftHandover = async (req: Request, res: Response): Promise<void> => {
  try {
    const { date, shiftId } = req.body as { date?: string; shiftId?: number };

    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const productionWhere: Record<string, unknown> = { createdAt: { gte: targetDate, lt: nextDay } };
    if (shiftId) productionWhere.shiftId = shiftId;

    const [production, maintenances, attendances, electricity, shift] = await Promise.all([
      prisma.productionRecord.findMany({
        where: productionWhere,
        include: {
          user:    { select: { fullName: true } },
          machine: { select: { name: true, status: true } },
          shift:   { select: { name: true } },
        },
        take: 200,
      }),
      prisma.maintenance.findMany({
        where: { createdAt: { gte: targetDate, lt: nextDay }, ...(shiftId ? { shiftId } : {}) },
        include: {
          machine:  { select: { name: true, status: true } },
          engineer: { select: { fullName: true } },
        },
        take: 50,
      }),
      prisma.attendance.findMany({
        where: { createdAt: { gte: targetDate, lt: nextDay } },
        include: { user: { select: { fullName: true, role: true } } },
        take: 100,
      }),
      prisma.electricityReading.findMany({
        where: { date: { gte: targetDate, lt: nextDay }, ...(shiftId ? { shiftId } : {}) },
        include: { shift: { select: { name: true } } },
        take: 20,
      }),
      shiftId ? prisma.shift.findUnique({ where: { id: shiftId }, select: { name: true } }) : null,
    ]);

    const totalPieces  = production.reduce((s, r) => s + (r.totalPieces ?? 0), 0);
    const totalDowntime = production.reduce((s, r) => s + (r.downtimeMinutes ?? 0), 0);
    const totalKwh     = electricity.reduce((s, r) => s + (r.consumption ?? 0), 0);
    const staffNames   = [...new Set(attendances.map((a) => `${a.user?.fullName ?? "?"} (${a.user?.role ?? "?"})`))];

    // Machines with issues (status not OPERATIONAL or maintenance done today)
    const machinesWithIssues = [
      ...new Set([
        ...maintenances.map((m) => `${m.machine?.name ?? "?"}: ${m.reportText ?? m.downtimeReason ?? "maintenance performed"} — by ${m.engineer?.fullName ?? "?"}`),
        ...production.filter((r) => r.machine?.status !== "OPERATIONAL" && r.machine?.status != null)
                     .map((r) => `${r.machine!.name}: status is ${r.machine!.status}`),
      ]),
    ];

    const dataBlock = `
Date: ${targetDate.toLocaleDateString()}
Shift: ${shift?.name ?? (shiftId ? `Shift #${shiftId}` : "All shifts")}

PRODUCTION:
- Total pieces: ${totalPieces.toLocaleString()}
- Total downtime: ${totalDowntime} minutes
- Records: ${production.length}

ELECTRICITY:
- Total consumption: ${totalKwh.toFixed(2)} kWh

STAFF PRESENT (${attendances.length}):
${staffNames.slice(0, 20).join("\n") || "No attendance records"}

MACHINES WITH ISSUES:
${machinesWithIssues.length ? machinesWithIssues.join("\n") : "None"}

MAINTENANCE PERFORMED:
${maintenances.length ? maintenances.map((m) => `- ${m.machine?.name}: ${m.reportText ?? "No details"} (${m.downtimeMinutes ?? 0} min)`).join("\n") : "None"}
`.trim();

    const handover = await gpt(
      `You are a shift supervisor at a plastic manufacturing factory.
Generate a clear, practical shift handover note for the INCOMING shift supervisor.
They need to know what happened and what requires their attention immediately.

Format exactly like this:

## Shift Handover — [Date] | [Shift Name]

### What We Accomplished
Key production achievements this shift.

### Staff & Attendance
Who was present, any notable absences.

### Machine Status
Current state of each machine — especially any issues or machines that need watching.

### Pending Issues (Action Required)
Urgent items the next shift MUST address.

### Maintenance & Incidents
What maintenance was done, any incidents.

### Electricity & Resources
Consumption summary.

### Notes for Next Shift
Anything else the incoming team should know.

Be concise and direct — this is read at shift change, not in a meeting.`,
      dataBlock
    );

    res.json({
      handover,
      stats: { totalPieces, totalDowntime, totalKwh, staffCount: attendances.length, machinesWithIssues: machinesWithIssues.length },
      date: targetDate.toISOString().split("T")[0],
      shift: shift?.name ?? "All shifts",
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("generateShiftHandover error:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to generate handover" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. WORKER PERFORMANCE COACHING
// POST /ai/worker-coaching  body: { workerId, days? }
// ─────────────────────────────────────────────────────────────────────────────
export const generateWorkerCoaching = async (req: Request, res: Response): Promise<void> => {
  try {
    const { workerId, days: rawDays } = req.body as { workerId?: number; days?: number };

    if (!workerId) {
      res.status(400).json({ error: "workerId is required" });
      return;
    }

    const days  = Math.min(Number(rawDays ?? 30), 90);
    const end   = new Date(); end.setHours(23, 59, 59, 999);
    const start = new Date(); start.setDate(start.getDate() - days); start.setHours(0, 0, 0, 0);

    const [worker, attendances, production] = await Promise.all([
      prisma.user.findUnique({
        where: { id: workerId },
        select: { fullName: true, role: true, jobTitle: true, department: true, createdAt: true },
      }),
      prisma.attendance.findMany({
        where: { userId: workerId, createdAt: { gte: start, lte: end } },
        include: { shift: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      }),
      prisma.productionRecord.findMany({
        where: { userId: workerId, createdAt: { gte: start, lte: end } },
        include: { machine: { select: { name: true } }, shift: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    if (!worker) {
      res.status(404).json({ error: "Worker not found" });
      return;
    }

    // Compute stats
    const totalShifts   = attendances.length;
    const lateShifts    = attendances.filter((a) => (a.lateMinutes ?? 0) > 0).length;
    const totalLate     = attendances.reduce((s, a) => s + (a.lateMinutes ?? 0), 0);
    const noCheckout    = attendances.filter((a) => !a.checkOut).length;
    const totalPieces   = production.reduce((s, r) => s + (r.totalPieces ?? 0), 0);
    const totalDowntime = production.reduce((s, r) => s + (r.downtimeMinutes ?? 0), 0);
    const avgPiecesPerShift = totalShifts > 0 ? Math.round(totalPieces / totalShifts) : 0;
    const avgDowntimePerShift = totalShifts > 0 ? Math.round(totalDowntime / totalShifts) : 0;

    // Downtime reasons breakdown
    const downtimeReasons: Record<string, number> = {};
    for (const r of production) {
      if (r.downtimeReason && (r.downtimeMinutes ?? 0) > 0) {
        downtimeReasons[r.downtimeReason] = (downtimeReasons[r.downtimeReason] ?? 0) + (r.downtimeMinutes ?? 0);
      }
    }

    const dataBlock = `
Worker: ${worker.fullName}
Role: ${worker.role} | Job Title: ${worker.jobTitle ?? "Not set"} | Department: ${worker.department ?? "Not set"}
Analysis Period: Last ${days} days (${start.toLocaleDateString()} – ${end.toLocaleDateString()})

ATTENDANCE:
- Shifts attended: ${totalShifts}
- Late arrivals: ${lateShifts} (${totalShifts > 0 ? Math.round(lateShifts / totalShifts * 100) : 0}%)
- Total late minutes: ${totalLate}
- Missing check-out: ${noCheckout} times

PRODUCTION OUTPUT:
- Total pieces produced: ${totalPieces.toLocaleString()}
- Average pieces/shift: ${avgPiecesPerShift}
- Total production records: ${production.length}

DOWNTIME:
- Total downtime: ${totalDowntime} minutes
- Average downtime/shift: ${avgDowntimePerShift} minutes
- Reasons breakdown: ${Object.entries(downtimeReasons).map(([k, v]) => `${k}: ${v} min`).join(", ") || "None recorded"}
`.trim();

    const coaching = await gpt(
      `You are a factory HR manager and performance coach.
Generate a constructive, respectful performance coaching report for a factory worker.
The goal is to help the worker improve, not to criticize.

Format exactly like this:

## Performance Coaching Report
**Worker:** [name]
**Period:** [date range]
**Role:** [role]

### Performance Summary
Overall assessment in 2-3 sentences.

### Strengths
What the worker is doing well — be specific.

### Areas for Improvement
Be constructive and specific. Focus on behaviors, not personality.

### Attendance Analysis
Honest assessment of attendance and punctuality.

### Production Analysis
Output and efficiency assessment.

### Coaching Recommendations
3-5 specific, actionable recommendations for improvement.

### Goals for Next Month
2-3 measurable goals to set with the worker.

Keep the tone respectful and motivating. This report will be shared with the worker.`,
      dataBlock
    );

    res.json({
      coaching,
      worker: { id: workerId, fullName: worker.fullName, role: worker.role },
      stats: { totalShifts, lateShifts, totalLate, noCheckout, totalPieces, avgPiecesPerShift, totalDowntime, avgDowntimePerShift },
      period: { days, start: start.toISOString(), end: end.toISOString() },
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("generateWorkerCoaching error:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to generate coaching report" });
  }
};
