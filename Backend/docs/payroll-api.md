# Payroll API

Base path: /payroll

## POST /payroll/calculate
- Access: ACCOUNTANT, ADMIN
- Body:
  - userId (required, positive integer)
  - month (required, YYYY-MM)
  - hourlyRate (required, zero or positive number)
  - overtimeRate (required, zero or positive number)
- Rules:
  - cannot create duplicate payroll for same user + month
  - requires completed attendance records for that month
- Notes:
  - creates PAYROLL_READY notification for target user

## GET /payroll
- Access: ACCOUNTANT, ADMIN

## GET /payroll/me
- Access: WORKER, ENGINEER, ACCOUNTANT, ADMIN

## GET /payroll/:id
- Access: ACCOUNTANT, ADMIN
- Params:
  - id (positive integer)

## DELETE /payroll/:id
- Access: ADMIN
- Params:
  - id (positive integer)

## Examples

Calculate payroll:

POST /payroll/calculate
{
  "userId": 5,
  "month": "2026-03",
  "hourlyRate": 12,
  "overtimeRate": 18
}

Response:

{
  "id": 42,
  "userId": 5,
  "month": "2026-03",
  "totalHours": 184,
  "overtimeHours": 12,
  "totalSalary": 2280
}

Get my payrolls:

GET /payroll/me
