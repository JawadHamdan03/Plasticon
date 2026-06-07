# Role-Based Routing & Access Control

## How Routes Are Protected

Every route in `App.tsx` is wrapped in one of three guard components. The guards read the current user's role from `AuthContext` and either render the page or redirect.

---

## Guard 1 — `ProtectedRoute`

Allows any authenticated user regardless of role.

```typescript
// Any logged-in user can visit their profile
<Route path="/profile" element={
  <ProtectedRoute>
    <ProfilePage />
  </ProtectedRoute>
} />
```

**Logic:**
```
if (!user) → redirect to /login
else → render children
```

Used for: `/dashboard`, `/profile`, `/chat`, `/attendance`, `/my-payroll`, `/ai/*` (all AI tools).

---

## Guard 2 — `AdminOnlyRoute`

Allows only users with `role === "ADMIN"`.

```typescript
<Route path="/admin/users" element={
  <AdminOnlyRoute>
    <UsersAdminPage />
  </AdminOnlyRoute>
} />
```

**Logic:**
```
if (!user) → redirect to /login
if (user.role !== "ADMIN") → redirect to /dashboard
else → render children
```

Used for: all `/admin/*` routes (user management, shift management, machine management, audit logs, registration requests, etc.)

---

## Guard 3 — `RoleProtectedRoute`

Allows any role in the provided `allowedRoles` array.

```typescript
<Route path="/accountant/financial-dashboard" element={
  <RoleProtectedRoute allowedRoles={["ACCOUNTANT", "ADMIN"]}>
    <FinancialDashboard />
  </RoleProtectedRoute>
} />
```

**Logic:**
```
if (!user) → redirect to /login
if (!allowedRoles.includes(user.role)) → redirect to /dashboard
else → render children
```

---

## Complete Role → Route Mapping

### Routes available to ALL authenticated users (ProtectedRoute)
```
/dashboard
/profile
/chat
/attendance
/my-payroll
/notifications
/ai                  AI Hub
/ai/invoice-extract  Invoice extraction
/ai/assistant        RAG Assistant
```

### WORKER only
```
/worker/hub          Worker daily hub
/worker/snapshots    Worker snapshots (readings)
/worker/tools        Worker tool set
```

### WORKER + ENGINEER
```
/electricity         Electricity recording
```

### ENGINEER + ADMIN
```
/maintenance                        Maintenance reports
/quality-checks                     Quality inspections
/engineer/inventory                 Engineer inventory
/engineer/machines                  Machine health dashboard
/engineer/maintenance-schedule      Preventive maintenance
/engineer/spare-parts               Spare parts management
/engineer/equipment-lifecycle       Equipment lifecycle
/engineer/production-analytics      Production analytics
/engineer/quality-trends            Quality trend reports
/engineer/documentation             Technical documentation
/engineer/calibration               Equipment calibration
/engineer/work-orders               Work orders
/engineer/equipment-transfer        Equipment transfer log
/engineer/raw-material-alerts       Raw material alerts
/ai/anomaly-detection               AI anomaly detection
/ai/maintenance-report              AI maintenance report
```

### ENGINEER + ADMIN + ACCOUNTANT
```
/engineer/maintenance-costs         Maintenance cost records
```

### ACCOUNTANT + ADMIN
```
/accountant/financial-dashboard     Financial KPI dashboard
/accountant/expenses                Expense tracking
/accountant/invoices                Invoice management
/accountant/financial-reports       Periodic reports
/accountant/payables                Supplier payables
/accountant/receivables             Customer receivables
/accountant/budgets                 Budget planning
/accountant/tax                     Tax compliance
/accountant/reconciliation          Bank reconciliation
/accountant/cost-analysis           Cost analysis
/accountant/approvals               Approval workflows
/accountant/suppliers               Supplier management
/accountant/performance             Employee performance
/accountant/parts-pricing           Spare parts pricing
/admin/attendance                   Attendance management
/admin/payroll                      Payroll management
/inventory                          Inventory stock
/purchases                          Purchases
/sales                              Sales
/reports                            Financial reports
```

### ADMIN only
```
/admin                Admin panel home
/admin/users          User management
/admin/settings       System settings
/admin/shifts         Shift management
/admin/machines       Machine management
/admin/audit-logs     Audit trail
/admin/snapshots      Worker snapshots overview
/admin/worker-records All worker records
/admin/machine-stops  Machine stop log
/admin/dashboard-analytics  Analytics
/admin/engineer       Engineer overview
/admin/registration-requests  Pending user requests
/ai/shift-handover    AI shift handover report
/ai/worker-coaching   AI worker coaching
```

### ADMIN + ENGINEER + ACCOUNTANT
```
/admin/settings/electricity  Electricity price settings
```

### ADMIN + ACCOUNTANT + ENGINEER
```
/warehouse            Warehouse view
```

---

## In-Page Role Checks

Beyond routing, individual pages also check the user's role to show/hide controls:

```typescript
const { user } = useAuth();
const isAdmin = user?.role === "ADMIN";
const isEngineer = user?.role === "ENGINEER";

// Admin sees all records but cannot add/edit (read-only supervisor view)
{!isAdmin && (
  <Button onClick={openNew}>Add Report</Button>
)}

// Edit/delete buttons hidden from admin
{!isAdmin && (
  <button onClick={() => openEdit(r)}><Pencil /></button>
)}
```

This pattern appears across accountant and engineer pages: Admin can view all data as a supervisor but cannot create or modify records — that is the accountant's or engineer's responsibility.

---

## AppScaffold Navigation Filtering

The sidebar in `AppScaffold.tsx` renders only the navigation items appropriate for the logged-in user's role. The nav config is an array of items each with an optional `roles` filter:

```typescript
{ label: "Maintenance",  path: "/maintenance",  roles: ["ENGINEER", "ADMIN", "WORKER"] }
{ label: "Financial",    path: "/accountant/financial-dashboard", roles: ["ACCOUNTANT", "ADMIN"] }
```

Items without a `roles` array are shown to all authenticated users.
