# ADMIN Role — Documentation

## Role Summary
The Admin has **read access to all data** across every module. The Admin does **not** add/edit/delete production records, maintenance reports, financial entries, or engineer inputs — those are done by their respective roles. The Admin manages system configuration, users, and organizational structure.

## Permissions Matrix
| Module | View | Create | Edit | Delete |
|---|---|---|---|---|
| Users | ✅ | ✅ | ✅ | ✅ (soft) |
| Shifts | ✅ | ✅ | ✅ | ✅ |
| Machines | ✅ | ✅ | ✅ | — |
| Production | ✅ | ❌ | ❌ | ❌ |
| Maintenance | ✅ | ❌ | ❌ | ❌ |
| Quality Checks | ✅ | ❌ | ❌ | ❌ |
| Spare Parts | ✅ | ❌ | ❌ | ❌ |
| Machine Health | ✅ | ❌ | ❌ | ❌ |
| Financial Data | ✅ | ❌ | ❌ | ❌ |
| Payroll | ✅ | ✅ (confirm) | ✅ | — |
| Attendance | ✅ | — | — | — |
| Audit Logs | ✅ | — | — | — |
| Settings | ✅ | ✅ | ✅ | — |
| Notifications | ✅ | — | — | — |
| Supplier Mgmt | ✅ | ❌ | ❌ | ❌ |
| Performance | ✅ | ✅ | ✅ | ✅ |
| Maintenance Cost | ✅ | ❌ | ❌ | ❌ |

## Navigation Sections
### Overview
- **Dashboard** — KPI summary: production totals, attendance, revenue, active alerts
- **Analytics** — Charts and trend analysis across all departments

### Management
- **Users** — Create/edit workers, engineers, accountants. Assign shifts. Set roles. Deactivate accounts.
- **Shifts** — Define shift names and time windows used across production, attendance, and maintenance.
- **Machines** — Register machines with type (CAP/PREFORM/etc.), track status (operational/maintenance/broken).

### Operations
- **Production** — View all production records with daily report (Caps cartons, Preform boxes, material usage). Filter by date range.
- **Attendance** — View all employee check-in/check-out records. Review late/overtime minutes.
- **Payroll** — Review and confirm payroll calculations. View salary configs per role.
- **Snapshots** — View machine counter readings submitted by workers.
- **Electricity** — View electricity readings per shift.

### Finance (Read-Only)
- Financial Dashboard, Invoices, Expenses, Reports, Payables, Receivables, Budgets, Tax, Reconciliation, Cost Analysis, Approvals, Inventory, Purchases, Sales — all visible but no mutation.

### Engineering (Read-Only)
- Quality Checks, Maintenance, Machine Health, Maintenance Schedule, Spare Parts, Equipment Lifecycle, Production Analytics, Quality Trends, Technical Documentation, Calibration, Work Orders, Equipment Transfer — all visible.

### System
- **Audit Logs** — Full action history: who did what and when.
- **Settings** — System-wide configuration (quality check intervals, report schedules, production piece counts).
- **Notifications** — View and manage in-app alerts.
- **Chat** — Participate in group messaging.

## Key Workflows
1. **Onboarding a new worker**: Users → New User → set role=WORKER, assign shift
2. **Starting a new shift**: Shifts → Create shift → assign workers
3. **Registering a machine**: Machines → Add machine → set type (must include "CAP" or "PREFORM" for production classification)
4. **Reviewing daily production**: Production → view daily report table (Admin sees all records and the daily breakdown by shift)
5. **Confirming payroll**: Payroll Admin → review hours → Confirm
6. **Auditing an action**: Audit Logs → filter by user or action type
