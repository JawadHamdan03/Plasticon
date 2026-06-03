# Plasticon API — Accountant Endpoints

## Financial Dashboard
- GET    /financial/dashboard
  Returns: revenue, paidRevenue, expenses, approvedExpenses, profit, profitMargin,
           cashBalance, salesRevenue, rawMaterialCost, electricityCost, salaryCost,
           netProfit, netProfitMargin, targets (revenueTarget, expenseLimit, profitMarginTarget)
- PUT    /financial/settings              — update targets

## Expense Tracking
- GET    /expenses                        — all expenses
- POST   /expenses                        — submit expense
- PATCH  /expenses/{id}/approve          — approve expense
- DELETE /expenses/{id}
  Categories: RAW_MATERIALS | UTILITIES | MAINTENANCE | SALARIES | TRANSPORT | PACKAGING | SUPPLIES | ADMIN | OTHER

## Invoice Management
- GET/POST  /invoices
- PATCH     /invoices/{id}/payment       — update payment status
- DELETE    /invoices/{id}
  Payment statuses: PENDING | PAID | OVERDUE

## Financial Reports
- GET    /financial-reports/pl?fromDate=&toDate=   — profit & loss
- GET    /financial-reports/cashflow?month=YYYY-MM — cash flow
- GET    /financial-reports/summary

## Supplier Payables
- GET/POST  /supplier-payables
- PATCH     /supplier-payables/{id}
  Statuses: PENDING | PAID | OVERDUE

## Customer Receivables
- GET/POST  /customer-receivables
- PATCH     /customer-receivables/{id}

## Budget Planning
- GET/POST  /budgets
- PUT       /budgets/{id}
- DELETE    /budgets/{id}

## Tax Compliance
- GET/POST  /tax-filings
- PUT/DELETE /tax-filings/{id}

## Bank Reconciliation
- GET/POST  /bank-reconciliations
- PUT       /bank-reconciliations/{id}

## Cost Analysis
- GET    /cost-analysis
- GET    /cost-analysis/breakdown?month=YYYY-MM

## Approval Workflows
- GET    /approval-workflows/pending
- POST   /approval-workflows/{id}/approve
- POST   /approval-workflows/{id}/reject

## Supplier Management
- GET/POST  /suppliers
- PUT/DELETE /suppliers/{id}
- GET    /purchases/all                   — supplier purchase history

## Employee Performance (read-only)
- GET    /performance                     — attendance + production stats per employee

## Shared Endpoints Available to Accountants
- GET    /payroll/me                      — own payroll
- GET    /reports
- GET    /inventory/materials
- GET    /sales/all
- GET    /purchases/all
- GET    /maintenance-costs
