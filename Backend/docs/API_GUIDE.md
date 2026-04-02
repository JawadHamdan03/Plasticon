# Plasticon Backend API Guide

This file documents all currently mounted HTTP APIs in the backend.

## Base URL

- Local: http://localhost:8080

## Authentication

Most endpoints require JWT auth.

Send either:
- Authorization header: Bearer <token>
- Cookie auth (jwt cookie)

## Roles

- WORKER
- ENGINEER
- ACCOUNTANT
- ADMIN

## Static Files

### GET /pictures/:fileName
- Access: Public
- Description: Serves files from prisma/pictures

## Auth APIs (/auth)

### POST /auth/register
- Access: ADMIN
- Content type: multipart/form-data
- Body fields:
  - nationalId (required)
  - fullName (required)
  - username (required)
  - password (required)
  - role (required)
  - phone (optional)
  - email (optional)
  - idImage (optional)
  - profileImage (optional file upload)
  - shiftId (optional)
- Notes:
  - role must be a valid UserRole
  - unique check covers nationalId, username, and optional email

### POST /auth/login
- Access: Public
- Body:
  - email
  - password
- Returns:
  - name
  - email
  - token

### POST /auth/logout
- Access: WORKER, ENGINEER, ACCOUNTANT, ADMIN
- Description: clears jwt cookie/token session

## User APIs (/users)

### GET /users/all
- Access: ADMIN
- Description: list all users

### GET /users/:id
- Access: ADMIN
- Params:
  - id (number)

### DELETE /users/:id
- Access: ADMIN
- Params:
  - id (number)

## Settings APIs (/settings)

### GET /settings/production
- Access: ADMIN
- Description: list production settings

### PUT /settings/production/:productType
- Access: ADMIN
- Params:
  - productType (valid ProductType)
- Body:
  - piecesPerCarton (positive integer)

### GET /settings/system
- Access: ADMIN
- Description: get current system settings

### PUT /settings/system
- Access: ADMIN
- Body (all required):
  - qualityCheckIntervalMinutes (positive number)
  - qualityCheckReminderMinutes (zero or positive number)
  - inventoryAuditFrequency (valid InventoryAuditFrequency)
  - shiftEndReminderMinutes (positive number)
  - weeklyReportDayOfWeek (1-7)
  - weeklyReportTime (HH:mm)
  - monthlyReportDayOfMonth (1-31)
  - monthlyReportTime (HH:mm)

## Attendance APIs (/attendance)

### POST /attendance/check-in
- Access: WORKER, ENGINEER, ACCOUNTANT, ADMIN
- Body: none
- Notes:
  - blocks early check-in before shift start
  - blocks duplicate open/today shift records

### POST /attendance/check-out
- Access: WORKER, ENGINEER, ACCOUNTANT, ADMIN
- Body: none
- Notes:
  - blocks early check-out before shift end
  - requires an open attendance

### GET /attendance/me
- Access: WORKER, ENGINEER, ACCOUNTANT, ADMIN
- Description: current user's attendance history

### GET /attendance/all
- Access: ADMIN
- Description: all attendance records

## Production APIs (/production)

### POST /production
- Access: WORKER, ENGINEER, ADMIN
- Body:
  - machineId (required, positive integer)
  - cartonsCount (required, zero or positive integer)
  - shiftId (optional if user has assigned shift)
  - hourSlot (optional; auto-generated if omitted)
  - rawHdpeUsed (optional, zero or positive number)
  - rawLdpeUsed (optional, zero or positive number)
  - rawPetUsed (optional, zero or positive number)
  - adhesiveUsed (optional, zero or positive number)
  - emptyBagsUsed (optional, zero or positive number)
  - colorUsed (optional, zero or positive number)
  - downtimeReason (optional)
  - downtimeMinutes (optional, zero or positive number)
  - notes (optional)
- Notes:
  - requires machine and shift existence
  - requires production setting for mapped product type

### GET /production/me
- Access: WORKER, ENGINEER, ACCOUNTANT, ADMIN
- Description: current user's production records

### GET /production/all
- Access: ACCOUNTANT, ADMIN
- Description: all production records

## Maintenance APIs (/maintenance)

### POST /maintenance
- Access: ENGINEER, ADMIN
- Body:
  - machineId (required, positive integer)
  - partsUsed (required)
  - shiftId (optional if user has assigned shift)
  - downtimeMinutes (optional, zero or positive number)
  - reportText (optional)
  - imagePath (optional)
- Notes:
  - if downtimeMinutes >= 60, automatic MAINTENANCE_URGENT notifications are created for admins

### GET /maintenance/me
- Access: ENGINEER, ADMIN

### GET /maintenance/all
- Access: ACCOUNTANT, ADMIN

## Quality Check APIs (/quality-checks)

### POST /quality-checks
- Access: ENGINEER, ADMIN
- Body:
  - machineId (required, positive integer)
  - shiftId (optional if user has assigned shift)
  - capsStatus (optional)
  - preformStatus (optional)
  - notes (optional)
- Rules:
  - at least one of capsStatus, preformStatus, notes is required
- Notes:
  - if capsStatus or preformStatus is FAIL, automatic QUALITY_ISSUE notifications are created for admins

### GET /quality-checks/me
- Access: ENGINEER, ADMIN

### GET /quality-checks/all
- Access: ACCOUNTANT, ADMIN

## Inventory APIs (/inventory)

### POST /inventory/transactions
- Access: ACCOUNTANT, ADMIN
- Body:
  - materialId (required, positive integer)
  - type (required, valid InventoryType: IN or OUT)
  - quantity (required, positive number)
  - referenceType (required, valid ReferenceType)
  - referenceId (optional)
- Notes:
  - OUT checks available stock before deduction

### GET /inventory/transactions/all
- Access: ACCOUNTANT, ADMIN

### GET /inventory/transactions/me
- Access: ACCOUNTANT, ADMIN

### GET /inventory/materials
- Access: ACCOUNTANT, ADMIN
- Description: current raw material stock snapshot

## Purchase APIs (/purchases)

### POST /purchases
- Access: ACCOUNTANT, ADMIN
- Body:
  - supplierId (required, positive integer)
  - invoiceImage (required)
  - date (optional, valid date)
  - totalAmount (optional; auto-computed from items if omitted)
  - items (required, non-empty array)
- Each item:
  - materialId (required, positive integer)
  - quantity (required, positive number)
  - pricePerUnit (required, zero or positive number)
- Notes:
  - purchase creates Inventory IN transactions and increases stock

### GET /purchases/all
- Access: ACCOUNTANT, ADMIN

### GET /purchases/me
- Access: ACCOUNTANT, ADMIN

## Sales APIs (/sales)

### POST /sales
- Access: ACCOUNTANT, ADMIN
- Body:
  - customerId (required, positive integer)
  - invoiceImage (required)
  - date (optional, valid date)
  - totalAmount (optional; auto-computed from items if omitted)
  - items (required, non-empty array)
- Each item:
  - machineType (required)
  - size (required)
  - quantity (required, positive number)
  - pricePerUnit (required, zero or positive number)

### GET /sales/all
- Access: ACCOUNTANT, ADMIN

### GET /sales/me
- Access: ACCOUNTANT, ADMIN

## Report APIs (/reports)

### GET /reports/production/weekly
- Access: ACCOUNTANT, ADMIN
- Query:
  - date (optional, valid date)
- Returns:
  - weekly totals + breakdown by day, shift, machine

### GET /reports/sales/monthly
- Access: ACCOUNTANT, ADMIN
- Query:
  - month (optional, YYYY-MM)
- Returns:
  - monthly totals + breakdown by customer/day

### GET /reports/inventory/snapshot
- Access: ACCOUNTANT, ADMIN
- Query:
  - lowStockThreshold (optional, default 50)
- Returns:
  - totals + low stock items + last transaction per material

## Chat APIs (/chat)

### POST /chat/groups
- Access: WORKER, ENGINEER, ACCOUNTANT, ADMIN
- Body:
  - name (required)
  - description (optional)
  - memberIds (optional array of user IDs)

### GET /chat/groups
- Access: WORKER, ENGINEER, ACCOUNTANT, ADMIN
- Description: groups for current user with unread counts and last message

### GET /chat/groups/unread-counts
- Access: WORKER, ENGINEER, ACCOUNTANT, ADMIN
- Description: unread counts per group for current user

### GET /chat/groups/:groupId
- Access: WORKER, ENGINEER, ACCOUNTANT, ADMIN
- Params:
  - groupId (positive integer)
- Notes:
  - requester must be a member of the group

### POST /chat/groups/:groupId/members
- Access: WORKER, ENGINEER, ACCOUNTANT, ADMIN
- Body:
  - userId (required, positive integer)
  - role (optional GroupRole; defaults to MEMBER)
- Notes:
  - only group admin can add members

### DELETE /chat/groups/:groupId/members/:userId
- Access: WORKER, ENGINEER, ACCOUNTANT, ADMIN
- Notes:
  - only group admin can remove members
  - admin cannot remove self
  - group creator cannot be removed

### POST /chat/groups/:groupId/messages
- Access: WORKER, ENGINEER, ACCOUNTANT, ADMIN
- Body:
  - content (required, 1-2000 chars)
- Notes:
  - requester must be group member
  - triggers chat socket events + automatic CHAT_MESSAGE notifications for other group members

### GET /chat/groups/:groupId/messages
- Access: WORKER, ENGINEER, ACCOUNTANT, ADMIN
- Query:
  - limit (optional, default 30, max 100)
  - cursor (optional message id for pagination)

### PATCH /chat/groups/:groupId/mark-as-read
- Access: WORKER, ENGINEER, ACCOUNTANT, ADMIN
- Description: marks group messages as read for current user

## Audit APIs (/audit)

### GET /audit/logs
- Access: ADMIN
- Query:
  - userId
  - entityType
  - entityId
  - action
  - limit (default 50, max 100)
  - offset (default 0)
  - startDate
  - endDate

### GET /audit/summary
- Access: ADMIN
- Query:
  - days (default 7, max 90)

### GET /audit/entity/:entityType/:entityId
- Access: ADMIN
- Query:
  - limit (default 20, max 100)

### GET /audit/user/:userId
- Intended access: ADMIN or the same user
- Query:
  - limit (default 50, max 100)

### POST /audit/cleanup
- Access: ADMIN
- Body:
  - daysToKeep (positive integer, default 90)

## Payroll APIs (/payroll)

### POST /payroll/calculate
- Access: ACCOUNTANT, ADMIN
- Body:
  - userId (required, positive integer)
  - month (required, YYYY-MM)
  - hourlyRate (required, zero or positive number)
  - overtimeRate (required, zero or positive number)
- Rules:
  - cannot create duplicate payroll for same user + month
  - requires completed attendance records for month
- Notes:
  - automatically creates PAYROLL_READY notification to target user

### GET /payroll
- Access: ACCOUNTANT, ADMIN
- Description: list all payroll records

### GET /payroll/me
- Access: WORKER, ENGINEER, ACCOUNTANT, ADMIN
- Description: current user's payroll records

### GET /payroll/:id
- Access: ACCOUNTANT, ADMIN
- Params:
  - id (positive integer)

### DELETE /payroll/:id
- Access: ADMIN
- Params:
  - id (positive integer)

## Notification APIs (/notifications)

For full details and examples, see the dedicated notification guide in the repository root.

### GET /notifications
- Access: WORKER, ENGINEER, ACCOUNTANT, ADMIN
- Query:
  - page (optional, default 1)
  - limit (optional, default 20, max 100)
  - isRead (optional true/false)
  - type (optional NotificationType)

### GET /notifications/unread-count
- Access: WORKER, ENGINEER, ACCOUNTANT, ADMIN

### PATCH /notifications/:id/read
- Access: WORKER, ENGINEER, ACCOUNTANT, ADMIN
- Notes:
  - id must be positive integer
  - user can only mark own notification

### PATCH /notifications/read-all
- Access: WORKER, ENGINEER, ACCOUNTANT, ADMIN

### POST /notifications
- Access: ADMIN
- Body:
  - title (required)
  - message (required)
  - type (required NotificationType)
  - userId (optional)
  - userIds (optional)
  - chatGroupId (optional)
  - machineId (optional)
  - productionId (optional)
- Rules:
  - at least one target user is required via userId or userIds

## Error Patterns

Common responses used across APIs:
- 400: validation error or bad input
- 401: missing/invalid auth
- 403: role/membership access denied
- 404: resource not found
- 409: conflict (for example duplicate/already exists)
- 500: internal server error
