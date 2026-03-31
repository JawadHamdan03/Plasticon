# AuditLog Service Integration Guide

## Overview

The AuditLog service provides comprehensive audit logging for all sensitive operations in the Plasticon application. It tracks who performed what action, on which entity, and what changes were made.

## Quick Start

### 1. Basic Usage in Services

Import the audit helpers:

```typescript
import { auditAsync, getChangedFields } from "./auditHelper";
import { AuditAction, AuditEntityType } from "./auditServices";
```

### 2. Log Operations (Fire-and-Forget Pattern)

For simple operations, use `auditAsync` which doesn't wait for logging to complete:

```typescript
// User deletion example
export const deleteUser = async (id: number, deletedByUserId?: number) => {
  const user = await prisma.user.findUnique({ where: { id } });
  
  // Perform the operation
  await prisma.user.update({
    where: { id },
    data: { deletedAt: new Date() } // Soft delete
  });

  // Log the audit (async, non-blocking)
  auditAsync(
    deletedByUserId,
    AuditAction.USER_DELETED,
    AuditEntityType.USER,
    id,
    { fullName: user.fullName, username: user.username }
  );
};
```

### 3. Track Changes

Use `getChangedFields()` to automatically detect what changed:

```typescript
export const updateUser = async (id: number, updateData: any, updatedByUserId?: number) => {
  const oldUser = await prisma.user.findUnique({ where: { id } });
  
  // Perform update
  const newUser = await prisma.user.update({
    where: { id },
    data: updateData
  });

  // Detect changes
  const changes = getChangedFields(oldUser, newUser);

  // Log with changes
  auditAsync(
    updatedByUserId,
    AuditAction.USER_UPDATED,
    AuditEntityType.USER,
    id,
    changes
  );
};
```

## Available Audit Actions

### User Management
- `USER_CREATED` - New user created
- `USER_UPDATED` - User details modified
- `USER_DELETED` - User deleted (soft delete)
- `USER_ROLE_CHANGED` - User role changed
- `USER_STATUS_CHANGED` - User active status changed

### Payroll
- `PAYROLL_CREATED` - Payroll record created
- `PAYROLL_UPDATED` - Payroll record modified
- `PAYROLL_DELETED` - Payroll record deleted

### Inventory
- `INVENTORY_IN` - Materials received
- `INVENTORY_OUT` - Materials used
- `INVENTORY_ADJUSTED` - Inventory correction

### Purchases
- `PURCHASE_CREATED` - Purchase order created
- `PURCHASE_UPDATED` - Purchase order modified
- `PURCHASE_DELETED` - Purchase order deleted

### Sales
- `SALE_CREATED` - Sale record created
- `SALE_UPDATED` - Sale record modified
- `SALE_DELETED` - Sale record deleted

### Production
- `PRODUCTION_RECORD_CREATED` - Production record created
- `PRODUCTION_RECORD_UPDATED` - Production record modified
- `PRODUCTION_RECORD_DELETED` - Production record deleted

### Machine Operations
- `MACHINE_STATUS_CHANGED` - Machine status changed
- `MACHINE_CREATED` - Machine created
- `MACHINE_UPDATED` - Machine modified
- `MACHINE_DELETED` - Machine deleted

### Maintenance
- `MAINTENANCE_CREATED` - Maintenance record created
- `MAINTENANCE_UPDATED` - Maintenance record modified
- `MAINTENANCE_DELETED` - Maintenance record deleted

### Quality Checks
- `QUALITY_CHECK_CREATED` - Quality check created
- `QUALITY_CHECK_UPDATED` - Quality check modified
- `QUALITY_CHECK_DELETED` - Quality check deleted

### Attendance
- `ATTENDANCE_CHECKED_IN` - Employee checked in
- `ATTENDANCE_CHECKED_OUT` - Employee checked out
- `ATTENDANCE_UPDATED` - Attendance record modified

### Settings
- `SYSTEM_SETTINGS_UPDATED` - System settings changed
- `PRODUCTION_SETTINGS_UPDATED` - Production settings changed

### Chat/Communication
- `CHAT_GROUP_CREATED` - Chat group created
- `CHAT_GROUP_DELETED` - Chat group deleted
- `CHAT_MEMBER_ADDED` - User added to chat group
- `CHAT_MEMBER_REMOVED` - User removed from chat group

### Authentication
- `LOGIN` - User logged in
- `LOGOUT` - User logged out
- `PASSWORD_CHANGED` - User changed password

## API Endpoints

### Get Audit Logs (Admin only)
```
GET /audit/logs?userId=X&entityType=User&entityId=Y&action=USER_CREATED&limit=50&offset=0
```

Query Parameters:
- `userId` - Filter by user who performed action
- `entityType` - Filter by entity type
- `entityId` - Filter by specific entity
- `action` - Filter by action type
- `limit` - Results per page (default: 50, max: 100)
- `offset` - Pagination offset (default: 0)
- `startDate` - ISO date string
- `endDate` - ISO date string

### Get Entity Audit History (Admin only)
```
GET /audit/entity/:entityType/:entityId?limit=20
```

Returns all changes to a specific entity.

### Get User's Audit History
```
GET /audit/user/:userId?limit=50
```

Admin can view anyone's history; users can only view their own.

### Get Audit Summary (Admin only)
```
GET /audit/summary?days=7
```

Returns statistics for the past N days (max: 90).

### Cleanup Old Logs (Admin only)
```
POST /audit/cleanup
Body: { "daysToKeep": 90 }
```

Deletes audit logs older than the specified number of days.

## Integration Checklist

To add audit logging to a service, follow these steps:

- [ ] Import audit helpers and types
- [ ] Identify sensitive operations (CREATE, UPDATE, DELETE)
- [ ] Add `auditAsync()` calls after each operation
- [ ] Use `getChangedFields()` for UPDATE operations
- [ ] Include userId from request context
- [ ] Test audit logs are appearing in database

## Example: Complete Service Integration

```typescript
import { auditAsync, getChangedFields } from "./auditHelper";
import { AuditAction, AuditEntityType } from "./auditServices";

export const payrollServices = {
  // Create payroll
  async createPayroll(userId: number, payload: any, createdByUserId?: number) {
    const payroll = await prisma.payroll.create({
      data: {
        userId,
        month: payload.month,
        totalHours: payload.totalHours,
        overtimeHours: payload.overtimeHours,
        baseSalary: payload.baseSalary,
        overtimeSalary: payload.overtimeSalary,
        totalSalary: payload.totalSalary,
      },
    });

    auditAsync(
      createdByUserId,
      AuditAction.PAYROLL_CREATED,
      AuditEntityType.PAYROLL,
      payroll.id,
      { month: payload.month, totalSalary: payload.totalSalary }
    );

    return payroll;
  },

  // Update payroll
  async updatePayroll(id: number, payload: any, updatedByUserId?: number) {
    const oldPayroll = await prisma.payroll.findUnique({ where: { id } });
    
    const updatedPayroll = await prisma.payroll.update({
      where: { id },
      data: payload,
    });

    const changes = getChangedFields(oldPayroll, updatedPayroll);

    auditAsync(
      updatedByUserId,
      AuditAction.PAYROLL_UPDATED,
      AuditEntityType.PAYROLL,
      id,
      changes
    );

    return updatedPayroll;
  },

  // Delete payroll
  async deletePayroll(id: number, deletedByUserId?: number) {
    const payroll = await prisma.payroll.findUnique({ where: { id } });
    
    await prisma.payroll.delete({ where: { id } });

    auditAsync(
      deletedByUserId,
      AuditAction.PAYROLL_DELETED,
      AuditEntityType.PAYROLL,
      id,
      { month: payroll?.month }
    );
  },
};
```

## Best Practices

1. **Always include userId** - Pass the user ID from the request context so audits show who performed the action
2. **Log before validation fails** - Consider logging failed operations too
3. **Use Fire-and-Forget** - Use `auditAsync()` to avoid blocking responses
4. **Track meaningful changes** - Only include fields that actually matter
5. **Soft delete first** - Mark records as deleted before hard deletes
6. **Regular cleanup** - Run the cleanup endpoint periodically to manage log size
7. **Monitor audit logs** - Review audit summary regularly for security

## Database Cleanup

To prevent the audit log from growing indefinitely, schedule periodic cleanup:

```typescript
// Delete logs older than 90 days
POST /audit/cleanup
Body: { "daysToKeep": 90 }
```

Or implement a cron job:

```typescript
// In a scheduler service
setInterval(() => {
  auditServices.cleanupOldAuditLogs(90).catch(console.error);
}, 24 * 60 * 60 * 1000); // Daily
```

## Next Steps

Continue integrating audit logging into these services:

1. **payrollServices.ts** - Payroll calculations and approvals
2. **inventoryServices.ts** - Inventory transactions
3. **purchaseServices.ts** - Purchase orders
4. **saleServices.ts** - Sales records
5. **maintenanceServices.ts** - Machine maintenance
6. **qualityServices.ts** - Quality checks
7. **attendanceServices.ts** - Attendance tracking
8. **settingsServices.ts** - System and production settings
