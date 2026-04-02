# Quality Checks API

Base path: /quality-checks

## POST /quality-checks
- Access: ENGINEER, ADMIN
- Body:
  - machineId (required, positive integer)
  - shiftId (optional if user has assigned shift)
  - capsStatus (optional)
  - preformStatus (optional)
  - notes (optional)
- Rule:
  - at least one of capsStatus, preformStatus, or notes is required
- Notes:
  - if capsStatus or preformStatus is FAIL, automatic QUALITY_ISSUE notifications are created for admins

## GET /quality-checks/me
- Access: ENGINEER, ADMIN

## GET /quality-checks/all
- Access: ACCOUNTANT, ADMIN

## Examples

Create quality check:

POST /quality-checks
{
  "machineId": 3,
  "capsStatus": "PASS",
  "preformStatus": "FAIL",
  "notes": "Neck finish issue"
}

Response:

{
  "id": 64,
  "machineId": 3,
  "capsStatus": "PASS",
  "preformStatus": "FAIL",
  "createdAt": "2026-04-02T12:00:00.000Z"
}
