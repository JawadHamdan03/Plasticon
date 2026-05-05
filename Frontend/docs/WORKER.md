# WORKER Role — Documentation

## Role Summary
The Worker is responsible for daily production data entry, machine counter readings, electricity readings, and reporting production issues. Workers have the most focused interface — only the tools they need for shift work are shown.

## Permissions Matrix
| Module | View | Create | Edit | Delete |
|---|---|---|---|---|
| Production | ✅ (own) | ✅ | ❌ | ❌ |
| Machine Readings | ✅ (own) | ✅ | ❌ | ❌ |
| Electricity Readings | ✅ (own) | ✅ | ❌ | ❌ |
| Machine Stops | ✅ (own) | ✅ | ❌ | ❌ |
| Daily Checklist | ✅ (own) | ✅ | ✅ | — |
| Material Waste | ✅ (own) | ✅ | ❌ | ❌ |
| Daily Targets | ✅ (own) | — | — | — |
| Kaizen Ideas | ✅ (own) | ✅ | ❌ | ❌ |
| Quality Issues | ✅ (own) | ✅ | ❌ | ❌ |
| Micro Stops | ✅ (own) | ✅ | ❌ | ❌ |
| Electricity Alerts | ✅ (own) | ✅ | ❌ | ❌ |
| My Attendance | ✅ | — | — | — |
| My Payroll | ✅ | — | — | — |
| Notifications | ✅ | — | — | — |
| Chat | ✅ | ✅ | — | — |

## Navigation Sections

### Dashboard
General summary showing today's production totals and attendance status.

### Work Tools

#### Production (`/production`)
- **Two separate entry cards per shift:**
  - **Preform Card**: Select a PREFORM-type machine, select shift, enter Working Cavities (1–72, default 72), Boxes Count. Live total = Boxes × Cavities. Enter HDPE used (kg), LDPE used (kg), Color used (kg).
  - **Caps Card**: Select a CAPS-type machine, select shift, enter Cartons Count (each carton = 6,000 pcs). Live total = Cartons × 6,000. Enter HDPE used (kg), LDPE used (kg), Color used (kg).
- Submit each card independently. Records are saved to the worker's production log.

#### Readings (`/worker/snapshots`)
- Submit machine counter start/end readings per shift.
- Upload a photo of the machine display as proof.

#### Machine Stops (`/worker/tools?tab=stops`)
- Log unplanned machine stops: reason, duration, machine affected.
- Feeds into downtime reporting for engineers.

#### Daily Checklist (`/worker/tools?tab=checklist`)
- Complete a pre-shift safety and readiness checklist.
- Check off items (lubricant, guards, temperature, etc.).

#### Material Waste (`/worker/tools?tab=waste`)
- Report material waste incidents: material type, quantity, reason.
- Used by engineers and accountants to track waste trends.

#### Daily Targets (`/worker/tools?tab=target`)
- View assigned production targets for the current shift.
- Set by the Admin/Engineer and visible to the worker.

#### Kaizen Ideas (`/worker/tools?tab=kaizen`)
- Submit improvement suggestions.
- Fields: Title, Description, Expected Benefit.
- Used in employee performance scoring.

#### Quality Issues (`/worker/tools?tab=quality`)
- Report quality defects found during production.
- Fields: Machine, Issue Type, Severity.
- Escalated to the engineer for resolution.

#### Micro Stops (`/worker/tools?tab=micro`)
- Log brief machine interruptions (< 5 min) that aren't full downtime.
- Used in OEE calculations.

#### Electricity Alerts (`/worker/tools?tab=anomaly`)
- Flag abnormal electricity readings (spikes, drops).

### Personal
- **My Attendance** — view personal check-in/out history, late minutes, overtime
- **My Payroll** — monthly pay summary: base + overtime
- **Notifications** — alerts about production targets, shift reminders
- **Chat** — group messaging with team and management

## Key Workflows
1. **Start of shift**: Dashboard → check target → Readings → submit machine counters
2. **Every production run**: Production → Preform card (enter boxes + cavities) → Save. Then Caps card (enter cartons) → Save.
3. **Machine stops during shift**: Worker Tools → Machine Stops → log stop → Save
4. **End of shift**: Electricity Readings → submit electricity counter → Daily Checklist → complete all items
5. **Reporting a quality defect**: Worker Tools → Quality Issues → describe issue → Save (engineer is notified)
6. **Submitting a kaizen idea**: Worker Tools → Kaizen Ideas → write idea → Save

## Notes
- Workers **cannot** edit or delete submitted production records — this ensures data integrity for management reporting.
- Production records are **immediately visible** to Admin and Engineer after submission.
- Workers only see **their own records** — no cross-worker data visibility.
