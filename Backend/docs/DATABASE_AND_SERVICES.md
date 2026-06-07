# Database & Service Layer

## Database: Prisma ORM

The backend uses **Prisma** with a PostgreSQL database. The schema is defined in `prisma/schema.prisma` and contains **57 models** covering every domain of the factory management system.

### Prisma Client Singleton — `src/config/lib/prisma.ts`

```typescript
import { PrismaClient } from "../generated/prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ log: ["error"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

Every service imports `prisma` from this file. A single instance is reused across all requests to avoid connection pool exhaustion.

---

## Model Groups

### Users & HR

| Model | Key Fields | Relationships |
|---|---|---|
| `User` | id, fullName, email, hashedPassword, role, shiftId, isActive, deletedAt | → Shift, Attendance, Notification, PushToken |
| `Shift` | id, name, startTime, endTime | → User[], Attendance[] |
| `Attendance` | id, userId, shiftId, checkIn, checkOut | → User, Shift |
| `AttendanceSetting` | workHoursPerDay, overtimeRate | — |
| `EmployeePerformance` | userId, score, quarter, year, notes | → User |

### Production & Quality

| Model | Key Fields | Relationships |
|---|---|---|
| `ProductionRecord` | id, machineId, userId, shiftId, pieces, cartons, date | → Machine, User, Shift |
| `QualityCheck` | id, machineId, userId, status, defectCount | → Machine, User |
| `RawMaterial` | id, name, quantity, unit, minStock | → RawMaterialAlert[] |
| `InventoryTransaction` | id, rawMaterialId, type, quantity, refType | → RawMaterial |

### Machines & Maintenance

| Model | Key Fields | Relationships |
|---|---|---|
| `Machine` | id, name, status, location | → ProductionRecord[], Maintenance[] |
| `Maintenance` | id, machineId, userId, downtimeReason, downtimeMinutes, partsUsed | → Machine, User |
| `MachineHealthRecord` | id, machineId, efficiency, oilLevel, temperature | → Machine |
| `MaintenanceSchedule` | id, machineId, type, nextDue, interval | → Machine |
| `MaintenanceCost` | id, maintenanceId, sparesUsedCost, laborCost | → Maintenance |
| `SparePart` | id, name, quantity, minStock | — |
| `SparePartRequest` | id, maintenanceId, sparePartId, quantity, status | → Maintenance, SparePart |
| `TechDocument` | id, title, category, fileUrl, downloadCount | — |

### Financial & Accounting

| Model | Key Fields | Relationships |
|---|---|---|
| `Expense` | id, title, amount, category, status, submittedById | → User |
| `Invoice` | id, supplierId, totalAmount, status, pdfPath | → Supplier, InvoiceAnalysis |
| `InvoiceAnalysis` | id, invoiceId, extractedData (JSON) | → Invoice |
| `Payroll` | id, userId, month, year, baseSalary, deductions, net | → User |
| `DailyPayroll` | id, userId, date, hoursWorked, dailyRate | → User |
| `SalaryConfig` | userId, baseSalary, rateType, allowances | → User |
| `BudgetPlan` | id, title, totalBudget, spent, category | — |
| `TaxFiling` | id, period, totalTax, status, filedById | → User |
| `BankReconciliation` | id, accountName, bankBalance, bookBalance, reconciled | → User |
| `CostAnalysis` | id, category, amount, description, date | — |
| `CustomerReceivable` | id, customerId, amount, dueDate, isPaid | → Customer |
| `SupplierPayable` | id, supplierId, amount, dueDate, isPaid | → Supplier |
| `FinancialReport` | id, title, reportType, period, pdfPath | — |
| `FinancialSetting` | taxRate, currencySymbol | — |

### Procurement & Sales

| Model | Key Fields | Relationships |
|---|---|---|
| `Supplier` | id, name, contactEmail, rating, leadTimeDays | → Purchase[], Invoice[] |
| `Purchase` | id, supplierId, totalAmount, status | → Supplier, PurchaseItem[] |
| `PurchaseItem` | id, purchaseId, rawMaterialId, quantity, unitPrice | → Purchase, RawMaterial |
| `Customer` | id, name, email, phone | → Sale[], CustomerReceivable[] |
| `Sale` | id, customerId, totalAmount, date | → Customer, SaleItem[] |
| `SaleItem` | id, saleId, productType, quantity, unitPrice | → Sale |

### Communication & System

| Model | Key Fields | Relationships |
|---|---|---|
| `Notification` | id, userId, title, message, type, isRead | → User |
| `PushToken` | id, userId, token | → User |
| `ChatGroup` | id, name, createdAt | → GroupMember[], GroupMessage[] |
| `GroupMember` | groupId, userId | → ChatGroup, User |
| `GroupMessage` | id, groupId, senderId, content | → ChatGroup, User |
| `AuditLog` | id, userId, action, entity, entityId, before, after | → User |
| `RegistrationRequest` | id, email, role, status, adminNote | — |
| `SystemSetting` | key, value | — |
| `ApprovalWorkflow` | id, title, steps (JSON), status | — |

---

## Service Layer Pattern

Every service file follows the same pattern:

```typescript
// maintenanceServices.ts
import { prisma } from "../config/lib/prisma";
import { auditHelper } from "./auditHelper";
import { emitNotificationToUser } from "../config/socket";

export async function createMaintenance(data, actorId) {
  const record = await prisma.maintenance.create({ data });

  // Audit trail
  await auditHelper.log(actorId, "CREATE", "Maintenance", record.id, null, record);

  // Notify relevant users
  const engineers = await prisma.user.findMany({ where: { role: "ENGINEER" } });
  for (const eng of engineers) {
    const notif = await prisma.notification.create({ ... });
    emitNotificationToUser(eng.id, notif);
  }

  return record;
}
```

Services are the only layer that touches Prisma. Controllers call services; services never call controllers.

---

## Audit System — `services/auditHelper.ts`

Every significant create, update, or delete operation writes an `AuditLog` entry:

```typescript
auditHelper.log(
  actorId: number,       // who performed the action
  action: "CREATE" | "UPDATE" | "DELETE",
  entity: string,        // table name (e.g. "Maintenance")
  entityId: number,      // record id
  before: object | null, // state before (null for creates)
  after: object | null,  // state after (null for deletes)
)
```

Admins can view the full audit trail at `/admin/audit-logs`.

---

## Soft Delete Pattern

Users are soft-deleted: `deletedAt` is set to the current timestamp instead of removing the row. Active queries always filter with:

```typescript
prisma.user.findMany({
  where: { isActive: true, deletedAt: null }
})
```

This preserves referential integrity for all historical attendance, payroll, and production records.

---

## File Uploads — `utils/uploadHandler.ts`

Uses **multer** with disk storage:
- Files saved to `prisma/pictures/` with a timestamp-random filename
- Served statically from `/pictures/:filename`
- Used by: profile photos, tech documents, invoice PDFs, spare part images

```
POST /profile/photo  →  multer saves file  →  profileController stores path  →  user.photoPath updated
```

---

## Electricity & Readings

```
ElectricityReading    id, machineId, userId, shiftId, kwhStart, kwhEnd, date
ElectricityKwhPrice   id, pricePerKwh, effectiveFrom
MachineReading        id, machineId, readingValue, readingType, recordedAt
```

Electricity cost is computed on-the-fly: `(kwhEnd - kwhStart) × currentKwhPrice`.
