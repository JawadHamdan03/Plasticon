# Quick Reference: Adding Audit Logging to Services

## 1-Minute Setup

Add these two lines to any service file:

```typescript
import { auditAsync, getChangedFields } from "./auditHelper";
import { AuditAction, AuditEntityType } from "./auditServices";
```

## Common Patterns

### Pattern 1: Log Simple Creation
```typescript
const record = await prisma.payroll.create({ data });
auditAsync(userId, AuditAction.PAYROLL_CREATED, AuditEntityType.PAYROLL, record.id, { month: data.month });
```

### Pattern 2: Track Changes on Update
```typescript
const oldRecord = await prisma.payroll.findUnique({ where: { id } });
const newRecord = await prisma.payroll.update({ where: { id }, data });
const changes = getChangedFields(oldRecord, newRecord);
auditAsync(userId, AuditAction.PAYROLL_UPDATED, AuditEntityType.PAYROLL, id, changes);
```

### Pattern 3: Log Deletion
```typescript
const record = await prisma.payroll.findUnique({ where: { id } });
await prisma.payroll.delete({ where: { id } });
auditAsync(userId, AuditAction.PAYROLL_DELETED, AuditEntityType.PAYROLL, id, { month: record?.month });
```

### Pattern 4: Track Before/After
```typescript
const oldStatus = record.status;
const newRecord = await prisma.machine.update({ where: { id }, data: { status } });
auditAsync(userId, AuditAction.MACHINE_STATUS_CHANGED, AuditEntityType.MACHINE, id, { 
  oldStatus, 
  newStatus: status 
});
```

## Services to Update

Priority order:

1. **payrollServices.ts** - High sensitivity (salary changes)
2. **inventoryServices.ts** - Critical (stock adjustments)
3. **purchaseServices.ts** - Financial (purchase orders)
4. **saleServices.ts** - Financial (sales records)
5. **maintenanceServices.ts** - Operational (machine downtime)
6. **qualityServices.ts** - Quality assurance
7. **attendanceServices.ts** - HR records
8. **settingsServices.ts** - System configuration changes

## Code Review Checklist

- [ ] Imported auditAsync and getChangedFields
- [ ] Imported AuditAction and AuditEntityType enums
- [ ] Added audit logs after CREATE operations
- [ ] Added audit logs after UPDATE operations
- [ ] Used getChangedFields() for UPDATE tracking
- [ ] Added audit logs after DELETE operations
- [ ] Included meaningful data in changes object
- [ ] Tests still pass: `npm test`
- [ ] Dev server starts: `npm run dev`

## Testing Your Integration

1. Start dev server: `npm run dev`
2. Make a request that triggers the operation
3. Query audit logs:
   ```bash
   curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
        "http://localhost:8080/audit/logs?entityType=Payroll&limit=5"
   ```
4. Verify the audit log entry appears
5. Check that changes are captured correctly

## Config Reference

```typescript
// Full auditAsync signature
auditAsync(
  userId: number | undefined,           // Who did it
  action: AuditAction | string,         // What was done
  entityType: AuditEntityType | string, // What was modified
  entityId?: number,                    // Which record
  changes?: Record<string, any> | null  // What changed
): void;

// getChangedFields signature
getChangedFields(oldObject: any, newObject: any): Record<string, any> | null;
// Returns: { fieldName: { before: oldValue, after: newValue } }
// Returns null if no changes
```

## Real-World Examples

### Update Payroll
```typescript
export const updatePayroll = async (id: number, updateData: any, userId: number) => {
  const oldPayroll = await prisma.payroll.findUnique({ where: { id } });
  
  const newPayroll = await prisma.payroll.update({
    where: { id },
    data: updateData
  });

  const changes = getChangedFields(oldPayroll, newPayroll);
  auditAsync(userId, AuditAction.PAYROLL_UPDATED, AuditEntityType.PAYROLL, id, changes);
  
  return newPayroll;
};
```

### Inventory Transaction
```typescript
export const recordInventoryTransaction = async (
  materialId: number,
  type: 'IN' | 'OUT',
  quantity: number,
  userId: number
) => {
  const transaction = await prisma.inventoryTransaction.create({
    data: { materialId, type, quantity, createdById: userId }
  });

  const action = type === 'IN' ? AuditAction.INVENTORY_IN : AuditAction.INVENTORY_OUT;
  auditAsync(userId, action, AuditEntityType.INVENTORY_TRANSACTION, transaction.id, {
    quantity,
    materialId
  });

  return transaction;
};
```

### Machine Status Change
```typescript
export const changeMachineStatus = async (
  machineId: number,
  newStatus: MachineStatus,
  changedBy: number
) => {
  const oldMachine = await prisma.machine.findUnique({ where: { id: machineId } });
  
  const updatedMachine = await prisma.machine.update({
    where: { id: machineId },
    data: { 
      status: newStatus,
      statusChangedBy: changedBy,
      statusChangedAt: new Date()
    }
  });

  auditAsync(changedBy, AuditAction.MACHINE_STATUS_CHANGED, AuditEntityType.MACHINE, machineId, {
    oldStatus: oldMachine?.status,
    newStatus
  });

  return updatedMachine;
};
```

## Performance Tips

✅ Use auditAsync() - doesn't block responses
✅ Include only relevant fields in changes object
✅ Validate data before logging
✅ Let the system auto-cleanup old logs
✅ Add database indexes: userId, entityType, entityId, createdAt

❌ Don't use auditWrapper() for high-frequency operations (check-in/out)
❌ Don't log sensitive data (passwords, API keys)
❌ Don't wait for audit logs to complete

## Database Queries

See recent audit logs:
```sql
SELECT * FROM "AuditLog" 
ORDER BY "createdAt" DESC 
LIMIT 100;
```

Audit logs by user:
```sql
SELECT * FROM "AuditLog" 
WHERE "userId" = 1
ORDER BY "createdAt" DESC;
```

Audit logs by entity:
```sql
SELECT * FROM "AuditLog"
WHERE "entityType" = 'Payroll' AND "entityId" = 42
ORDER BY "createdAt" DESC;
```

## Support

For questions refer to: `AUDIT_INTEGRATION_GUIDE.md`
Full implementation details: `AUDIT_IMPLEMENTATION_SUMMARY.md`
Source code: `src/services/auditServices.ts`
