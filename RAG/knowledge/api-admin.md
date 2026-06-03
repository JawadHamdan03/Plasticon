# Plasticon API — Admin Endpoints

## Users & Auth
- GET    /users/all                         — list all users
- GET    /users/{id}                        — user detail
- POST   /auth/register                     — create user
- PATCH  /users/{id}                        — update role / active status
- DELETE /users/{id}                        — soft-delete user
- GET    /registration-requests             — pending self-registrations
- PATCH  /registration-requests/{id}/approve
- PATCH  /registration-requests/{id}/reject

## Attendance (Admin)
- GET    /attendance/all                    — all check-ins
- PATCH  /attendance/{id}/approve          — approve attendance record

## Payroll (Admin)
- GET    /payroll                           — all payroll records
- POST   /payroll/daily/calculate-date     — calculate daily payroll for a date
- POST   /payroll/monthly/calculate        — calculate monthly payroll
- GET    /payroll/daily                    — list daily records
- GET    /payroll/monthly                  — list monthly summaries
- GET    /payroll/user-salaries            — per-user salary overrides
- PUT    /payroll/user-salaries/{id}       — update individual salary
- GET    /payroll/salary-config            — role-based salary + deduction rules
- PUT    /payroll/salary-config            — update salary config
- GET    /electricity/kwh-price            — current kWh price
- POST   /electricity/kwh-price            — set new kWh price

## Machines & Shifts
- GET/POST/PUT/DELETE  /machines           — machine CRUD
- GET/POST/PUT/DELETE  /shifts             — shift CRUD

## Production (Admin)
- GET    /production/all                   — all production records
- GET    /production/admin/overview        — aggregated overview (supports ?fromDate=&toDate=)

## Maintenance (Admin)
- GET    /maintenance                      — all maintenance records
- GET    /maintenance/work-orders          — all work orders

## Settings & System
- GET    /audit-logs                       — full audit log (who did what, when)
- GET/PUT /settings                        — factory settings, notification rules
- POST   /notifications/broadcast          — send notification to all / by shift / by role
- GET    /settings/snapshots              — all machine snapshots (admin view)

## Finance (Admin override)
- GET    /financial/dashboard
- GET    /invoices
- GET    /expenses
- GET    /financial-reports/pl?fromDate=&toDate=
- GET    /financial-reports/cashflow?month=YYYY-MM
- GET    /budgets
- GET    /tax-filings
- GET    /bank-reconciliations
- GET    /supplier-payables
- GET    /customer-receivables
- GET    /cost-analysis
- GET    /approval-workflows/pending

## Dashboard Analytics
- GET    /dashboard/analytics
  Returns: totalUsers, activeUsers, totalMachines, operationalMachines, productionToday, lowStockItems

## AI Tools (Admin exclusive)
- POST   /ai/anomaly-detection             — detect production anomalies across machines
- POST   /ai/shift-handover                — auto-generate shift handover notes
- POST   /ai/worker-coaching               — generate worker performance coaching reports
