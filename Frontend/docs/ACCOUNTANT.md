# ACCOUNTANT Role — Documentation

## Role Summary
The Accountant manages all financial operations: invoicing, expenses, budgets, payables, receivables, tax, reconciliation, and HR payroll. The Accountant also reviews engineer inventory reports and sets unit prices. The Accountant can **view all financial data** and **create/edit/delete their own entries**.

## Permissions Matrix
| Module | View | Create | Edit | Delete |
|---|---|---|---|---|
| Financial Dashboard | ✅ | — (read KPIs) | ✅ (targets) | — |
| Invoices | ✅ | ✅ | ✅ | ✅ |
| Expenses | ✅ | ✅ | ✅ | ✅ |
| Financial Reports | ✅ | ✅ | ✅ | ✅ |
| Supplier Payables | ✅ | ✅ | ✅ | ✅ |
| Customer Receivables | ✅ | ✅ | ✅ | ✅ |
| Budget Planning | ✅ | ✅ | ✅ | ✅ |
| Tax Compliance | ✅ | ✅ | ✅ | ✅ |
| Bank Reconciliation | ✅ | ✅ | ✅ | ✅ |
| Cost Analysis | ✅ | ✅ | ✅ | ✅ |
| Approval Workflows | ✅ | ✅ | ✅ | ✅ |
| Inventory | ✅ | — | ✅ (prices) | — |
| Purchases | ✅ | — | — | — |
| Sales | ✅ | — | — | — |
| Reports | ✅ | — | — | — |
| Attendance (all) | ✅ | — | — | — |
| Payroll (all) | ✅ | ✅ (confirm) | ✅ | — |
| Parts Pricing | ✅ | ✅ | ✅ | — |
| Supplier Management | ✅ | ✅ | ✅ | ✅ |
| Maintenance Costs | ✅ | — | — | — |
| Performance Scores | ✅ | ✅ | ✅ | ✅ |
| Raw Material Alerts | ✅ (receive) | — | — | — |
| My Attendance | ✅ | — | — | — |
| My Payroll | ✅ | — | — | — |

## Navigation Sections

### Overview
- **Dashboard** — General summary
- **Reports** — Cross-department reports

### Finance

#### Financial Dashboard (`/accountant/financial-dashboard`)
- KPI cards: Total Revenue, Total Expenses, Net Profit (margin), Cash Balance.
- Progress bars show performance vs configured targets.
- **Targets button** (Accountant only) — set Revenue Target, Expense Limit, Profit Margin Target.
- Refresh button to reload live data.
- Error banner displays if the API call fails.

#### Invoices (`/accountant/invoices`)
- Create, edit, delete customer invoices.
- Fields: Customer, Invoice Number, Amount, Due Date, Payment Status (Pending/Paid/Overdue/Cancelled).
- Filter by payment status. Overdue invoices highlighted.

#### Expenses (`/accountant/expenses`)
- Submit and track expense claims.
- Fields: Category (Materials/Utilities/Maintenance/Travel/Other), Amount, Description, Receipt, Status.
- Approve or reject pending expenses.

#### Financial Reports (`/accountant/financial-reports`)
- Generate P&L, Balance Sheet, Cash Flow reports.
- Attach PDF exports. Filter by period.

#### Supplier Payables (`/accountant/payables`)
- Track amounts owed to suppliers.
- Fields: Supplier, Amount, Due Date, Status (Pending/Paid/Overdue), Notes.

#### Customer Receivables (`/accountant/receivables`)
- Track amounts owed by customers.
- Fields: Customer, Amount, Due Date, Status, Notes.

#### Budget Planning (`/accountant/budgets`)
- Set monthly budgets per category (Materials, Utilities, Maintenance, etc.).
- Track allocated vs. spent. Alerts when over budget.

#### Tax Compliance (`/accountant/tax`)
- Log tax filings: VAT, Income Tax, Payroll Tax.
- Fields: Filing Type, Due Date, Amount, Status (Pending/Filed/Paid).

#### Bank Reconciliation (`/accountant/reconciliation`)
- Match bank statements with book records.
- Fields: Account Name, Bank Balance, Book Balance, Reconciled (checkbox), Notes.

#### Cost Analysis (`/accountant/cost-analysis`)
- Break down costs by category with percentage of total.
- Period-based analysis (monthly).

#### Approval Workflows (`/accountant/approvals`)
- Manage approval workflow definitions.
- Fields: Workflow Name, Status (Active/Draft/Inactive), Approver count.

#### Supplier Management (`/accountant/suppliers`)
- Full CRUD for suppliers with extended info: contact person, phone, email, address, website, category, lead time, rating (1–5), notes.
- View purchase history per supplier.
- Filter by category or rating.

### HR
- **Attendance** — View all employee attendance records
- **Payroll** — Review and confirm salary calculations for all employees

### Personal
- **My Attendance** — personal attendance history
- **My Payroll** — personal salary summary
- **Notifications** — alerts for overdue invoices, low material stock, budget exceeded
- **Chat** — group messaging

## Key Workflows
1. **Paying a supplier invoice**: Supplier Payables → find record → Edit → set Status=PAID
2. **Approving an expense**: Expenses → find pending → Edit → set Status=APPROVED
3. **Monthly reporting**: Financial Reports → Generate → select period → attach PDF
4. **Pricing engineer parts**: Parts Inventory → select submitted inventory → set price per item
5. **Setting financial targets**: Financial Dashboard → Targets button → set revenue/expense/margin targets → Save
6. **Reconciling bank account**: Bank Reconciliation → New → enter bank balance and book balance → check Reconciled
