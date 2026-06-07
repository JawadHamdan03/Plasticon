# Role Context & Prompts

## Overview

Every chat request carries information about **who is asking** and **what they can see**. The RAG system uses this to:
1. Inject a role-specific system prompt that sets the AI's behavior
2. Enrich the user's message with real-time factory data for operational queries

```
POST /api/chat  { message, userId, role, sessionId }
  → roleContextMiddleware        ← fetch user context from backend
  → selectSystemPrompt(role)     ← pick the right prompt template
  → enrichMessageWithLiveData()  ← optionally prepend live factory stats
  → runAgent(enrichedMessage, systemPrompt)
  → { answer, role }
```

---

## `roleContextMiddleware` — `middleware/roleContext.js`

Runs before every chat handler. Calls the main backend to load the current user's operational context:

```javascript
export async function roleContextMiddleware(req, res, next) {
  const { userId, role } = req.body ?? {};

  // Default empty context
  req.userContext = {
    user: null,
    shiftName: null,
    attendanceStatus: "Unknown",
    pendingMaintenance: [],
    notifications: [],
    today: new Date().toISOString().split("T")[0],
    role: role ?? "general",
  };

  if (!userId) return next();  // anonymous request — skip enrichment

  const ctx = await getUserContext(userId);  // GET /api/rag-context?userId=X on main backend

  req.userContext.user              = ctx.user ?? null;
  req.userContext.shiftName         = ctx.user?.shift?.name ?? null;
  req.userContext.pendingMaintenance = ctx.maintenance ?? [];
  req.userContext.notifications     = ctx.notifications ?? [];

  // Human-readable attendance status
  if (ctx.attendance?.checkIn) {
    const time = new Date(ctx.attendance.checkIn).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    req.userContext.attendanceStatus = `Checked in at ${time}`;
  } else {
    req.userContext.attendanceStatus = "Not checked in today";
  }

  next();  // context is non-fatal — chat continues even if backend call fails
}
```

**What context is loaded:**

| Field | Source |
|---|---|
| `user` | User profile (name, role, department) |
| `shiftName` | User's assigned shift name |
| `attendanceStatus` | Whether checked in today and at what time |
| `pendingMaintenance` | Open maintenance requests assigned to this engineer |
| `notifications` | Recent unread notifications |
| `today` | Current date string YYYY-MM-DD |

---

## Role-Specific System Prompts — `prompts/`

Each role has a dedicated prompt file. The prompt factory function receives the live context and embeds it:

### `worker.js`

```javascript
export function workerSystemPrompt(context) {
  return `
You are a helpful assistant for ${context.user?.fullName ?? "a factory worker"} at Plasticon plastic factory.

Current status:
- Shift: ${context.shiftName ?? "Not assigned"}
- Attendance: ${context.attendanceStatus}
- Today: ${context.today}

Your job is to help the worker with:
- Daily production logging (pieces, cartons)
- Electricity meter readings
- Raw material consumption
- Machine stop reporting
- Shift handover notes
- Attendance check-in and check-out

Always answer in simple, clear language. If the worker asks in Arabic, respond in Arabic.
Do not discuss financial data, payroll specifics, or management decisions.
  `;
}
```

### `engineer.js`

```javascript
export function engineerSystemPrompt(context) {
  const maintenanceSummary = context.pendingMaintenance.length > 0
    ? context.pendingMaintenance.map(m => `- ${m.machine?.name}: ${m.downtimeReason}`).join("\n")
    : "No pending maintenance";

  return `
You are a technical assistant for ${context.user?.fullName ?? "an engineer"} at Plasticon.

Current status:
- Attendance: ${context.attendanceStatus}
- Today: ${context.today}
- Pending maintenance items:
${maintenanceSummary}

You can help with:
- Machine health analysis and diagnostics
- Maintenance scheduling and procedures
- Spare parts lookup and requests
- Quality check procedures
- Technical documentation search (always use the search tool)
- Production analytics interpretation

When asked about machine manuals, procedures, or technical specs — always search the knowledge base first.
  `;
}
```

### `accountant.js`

```javascript
export function accountantSystemPrompt(context) {
  return `
You are a financial assistant for ${context.user?.fullName ?? "an accountant"} at Plasticon.

You can help with:
- Expense categorization and approval workflows
- Invoice data extraction and verification
- Payroll calculation questions
- Budget tracking and variance analysis
- Supplier payment scheduling
- Tax filing and compliance
- Bank reconciliation
- Cost analysis and reporting

Be precise with numbers. When discussing financial data, always clarify the currency (ILS - Israeli Shekel).
  `;
}
```

### `admin.js`

```javascript
export function adminSystemPrompt(context) {
  return `
You are an operations assistant for ${context.user?.fullName ?? "the factory admin"} at Plasticon.

You have the broadest access context. You can discuss:
- Production performance and trends
- Workforce attendance and payroll
- Machine status and maintenance backlog
- Financial summaries and KPIs
- Quality metrics and defect rates
- Electricity consumption and costs
- All operational departments

When you ask about live production data for a specific date or shift,
the system will automatically inject real factory numbers into your question.
  `;
}
```

---

## `enrichMessageWithLiveData()` — Live Data Injection

For **admin, engineer, and supervisor** roles, if the message mentions operational keywords (production, shift, electricity, maintenance, machine, etc.), the system fetches real-time data from the main backend and prepends it to the message:

```javascript
const LIVE_DATA_KEYWORDS =
  /production|shift|electricity|maintenance|machine|downtime|
   صباح|مساء|ليل|إنتاج|صيانة|آلة|كهرباء/i;

async function enrichMessageWithLiveData(message, role, context) {
  const needsLiveData =
    (role === "admin" || role === "supervisor" || role === "engineer") &&
    LIVE_DATA_KEYWORDS.test(message);

  if (!needsLiveData) return message;

  const date  = extractDate(message)  ?? context.today;
  const shift = extractShift(message) ?? null;

  const { summary, attendances, maintenances } = await getProductionContext(date, shift);

  return `${message}

[LIVE FACTORY DATA — ${date}, shift: ${shift ?? "all"}]
• Total pieces produced : ${summary.totalPieces.toLocaleString()}
• Total cartons         : ${summary.totalCartons.toLocaleString()}
• Total downtime        : ${summary.totalDowntime} minutes
• Electricity           : ${summary.totalKwh.toFixed(2)} kWh | Cost: ${summary.totalElecCost.toFixed(2)} ILS
• Staff on shift        : ${staffNames.join(", ") || "No attendance records"}
• Maintenance incidents : ${incidentSummary || "None recorded"}`;
}
```

**Why this works:** GPT-4o receives the user's question plus the real factory numbers in the same message. The model can then answer "what was the production last night?" with actual data instead of guessing.

**Date/shift extraction:** The system scans the message for date patterns (`2025-01-15`) and shift keywords (`morning`, `evening`, `night`, `صباح`, `مساء`, `ليل`).

---

## Session Thread IDs

Each user-role pair gets a stable session thread:

```javascript
const thread = sessionId ?? `${userId ?? "anon"}-${resolvedRole}`;
// Examples:
// "42-engineer"     → Engineer user #42's conversation history
// "15-accountant"   → Accountant user #15's conversation history
// "anon-general"    → Anonymous user fallback
```

This means:
- Conversation history is preserved across page refreshes (as long as the server is running)
- Engineers and accountants with the same userId have separate histories (different roles = different context = different threads)
- In-memory `MemorySaver` — history is lost on server restart

---

## Complete Chat Request Flow

```
1. Client: POST /api/chat
   { message: "How many pieces did we produce last night?",
     userId: 1, role: "admin", sessionId: "1-admin" }

2. roleContextMiddleware:
   → GET /api/rag-context?userId=1  (main backend)
   → req.userContext = { user: Ahmad, shiftName: "Night", attendanceStatus: "Checked in at 22:00", ... }

3. selectSystemPrompt("admin", context):
   → adminSystemPrompt(context) → "You are an operations assistant for Ahmad..."

4. enrichMessageWithLiveData(message, "admin", context):
   → LIVE_DATA_KEYWORDS matches "pieces" + "night"
   → shift = "night", date = context.today
   → GET /production-summary?date=2025-01-15&shift=night  (main backend)
   → appends live production numbers to the message

5. runAgent({
     message: "How many pieces...  [LIVE FACTORY DATA...] • Total pieces: 14,250",
     sessionId: "1-admin",
     systemPrompt: "You are an operations assistant for Ahmad..."
   })
   → LangChain agent + GPT-4o
   → agent decides: live data already in message, no tool call needed
   → generates: "Last night the factory produced 14,250 pieces across 3 active machines..."

6. Response: { answer: "Last night the factory produced 14,250 pieces...", role: "admin" }
```
