# Audit API

Base path: /audit

## GET /audit/logs
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

## GET /audit/summary
- Access: ADMIN
- Query:
  - days (default 7, max 90)

## GET /audit/entity/:entityType/:entityId
- Access: ADMIN
- Query:
  - limit (default 20, max 100)

## GET /audit/user/:userId
- Access:
  - ADMIN or same user
- Query:
  - limit (default 50, max 100)

## POST /audit/cleanup
- Access: ADMIN
- Body:
  - daysToKeep (positive integer, default 90)

## Examples

Filtered logs:

GET /audit/logs?entityType=Payroll&action=PAYROLL_CREATED&limit=20&offset=0

Summary:

GET /audit/summary?days=30

Entity history:

GET /audit/entity/Purchase/120?limit=25

Cleanup:

POST /audit/cleanup
{
  "daysToKeep": 120
}
